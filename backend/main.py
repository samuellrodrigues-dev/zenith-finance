import os
import requests
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from datetime import datetime
from database import SessionLocal, Transaction
import google.generativeai as genai # Import do Google
import json

load_dotenv()

app = FastAPI()

# --- CONFIGURAÇÃO DA IA ---
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# A LINHA QUE ESTAVA FALTANDO OU NO LUGAR ERRADO:
model = genai.GenerativeModel('gemini-flash-latest') 

# --- FUNÇÃO QUE USA A IA ---
def ask_ai(message):
    try:
        # Aqui o código usa a variável 'model' que criamos ali em cima
        prompt = f"""
        Analise a seguinte mensagem de gasto financeiro: "{message}"
        Extraia:
        1. O valor (numérico, use ponto para decimais).
        2. Uma descrição curta (ex: "Almoço", "Uber").
        3. A categoria (Escolha uma: Alimentação, Transporte, Lazer, Casa, Contas, Investimento, Saúde, Outros).
        
        Responda APENAS um JSON neste formato, sem crase nem markdown:
        {{"amount": 0.0, "description": "...", "category": "..."}}
        """
        response = model.generate_content(prompt) # <--- O erro acontecia aqui!
        return json.loads(response.text)
    except Exception as e:
        print(f"Erro na IA: {e}")
        return None

# --- DIAGNÓSTICO (Aparece no terminal ao iniciar) ---
DATABASE_URL = os.getenv("DATABASE_URL")
print(f"📂 Diretório atual: {os.getcwd()}")
if os.path.exists(".env"):
    print("✅ Arquivo .env ENCONTRADO!")
else:
    print("❌ Arquivo .env NÃO encontrado! Verifique se ele está na pasta 'backend'.")

if DATABASE_URL:
    print(f"🔗 Banco configurado: {DATABASE_URL.split('@')[0]}... (senha oculta)")
else:
    print("⚠️ DATABASE_URL está VAZIA ou não foi lida!")

# --- CONFIGURAÇÕES ---
TOKEN = "8533795323:AAE3pbZwZGi9LAMHAxSSeWltcOjyKoMm5WY"
ADMIN_USER = "Youngbae"
ADMIN_PASS = "72163427"

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Zenith API está online! 🚀"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELOS ---
class TransactionCreate(BaseModel):
    description: str
    amount: float
    category: str
    date: str

class InvestmentCreate(BaseModel):
    asset: str
    amount: float
    date: str

class TransactionUpdate(BaseModel):
    description: str
    amount: float
    category: str

class InvestmentUpdate(BaseModel):
    asset: str
    amount: float

class LoginData(BaseModel):
    username: str
    password: str

# --- CONEXÃO COM O BANCO ---
def get_db_connection():
    if not DATABASE_URL:
        # Se falhar, tenta fallback para SQLite para não travar o app (Modo de Segurança)
        print("⚠️ Usando SQLite de emergência pois o MySQL não foi configurado.")
        return create_engine("sqlite:///./fallback.db").raw_connection()
    
    engine = create_engine(DATABASE_URL)
    return engine.raw_connection()

def init_db():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                description TEXT NOT NULL,
                amount REAL NOT NULL,
                date TEXT,
                category TEXT
            );
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS investments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                asset TEXT NOT NULL,
                amount REAL NOT NULL,
                date TEXT
            );
        ''')
        conn.commit()
        cursor.close()
        conn.close()
        print("✅ Banco de Dados Inicializado!")
    except Exception as e:
        print(f"❌ Erro ao conectar no DB: {e}")

# Inicializa
init_db()

# --- FUNÇÕES AUXILIARES ---
def enviar_mensagem(chat_id, texto):
    try: requests.post(f"https://api.telegram.org/bot{TOKEN}/sendMessage", json={"chat_id": chat_id, "text": texto})
    except: pass

def detectar_categoria(texto):
    texto = texto.lower()
    if any(x in texto for x in ["uber", "99", "gasolina", "estacionamento", "onibus", "metro"]): return "Transporte"
    if any(x in texto for x in ["pizza", "ifood", "restaurante", "mercado", "lanche", "almoco", "jantar"]): return "Alimentação"
    if any(x in texto for x in ["luz", "agua", "internet", "aluguel", "condominio"]): return "Casa"
    if any(x in texto for x in ["cinema", "jogo", "viagem", "netflix", "spotify"]): return "Lazer"
    if any(x in texto for x in ["salario", "freela", "venda", "pix"]): return "Renda"
    return "Outros"

# --- ROTAS ---
@app.post("/login")
def login(data: LoginData):
    if data.username == ADMIN_USER and data.password == ADMIN_PASS:
        return {"status": "success", "token": "acesso_liberado"}
    raise HTTPException(status_code=401, detail="Negado")

@app.get("/dashboard")
def get_dashboard(month: str = None):
    if not month: month = datetime.now().strftime("%Y-%m")
    conn = get_db_connection(); cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM transactions WHERE date LIKE %s ORDER BY date DESC, id DESC", (f"{month}%",))
    transactions = [{"id": r[0], "description": r[1], "amount": r[2], "date": r[3], "category": r[4]} for r in cursor.fetchall()]
    
    cursor.execute("SELECT * FROM investments WHERE date LIKE %s ORDER BY date DESC, id DESC", (f"{month}%",))
    investments_month = [{"id": r[0], "asset": r[1], "amount": r[2], "date": r[3]} for r in cursor.fetchall()]

    cursor.execute("SELECT * FROM investments")
    investments_global = [{"id": r[0], "amount": r[2]} for r in cursor.fetchall()]
    
    cursor.close(); conn.close()
    
    ganhos = sum(t["amount"] for t in transactions if t["amount"] > 0)
    gastos = sum(t["amount"] for t in transactions if t["amount"] < 0)
    investido_mes = sum(i["amount"] for i in investments_month)
    investido_global = sum(i["amount"] for i in investments_global)
    
    cats = {}
    if investido_mes > 0: cats["Investimentos"] = investido_mes
    for t in transactions:
        if t["amount"] < 0:
            c = t["category"]
            cats[c] = cats.get(c, 0) + abs(t["amount"])

    return {
        "balance": ganhos + gastos - investido_mes,
        "expenses": gastos,
        "invested_month": investido_mes,
        "invested_global": investido_global,
        "transactions": transactions,
        "investments": investments_month,
        "categories": cats,
        "current_month": month
    }

@app.post("/transactions")
def create_transaction(t: TransactionCreate):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("INSERT INTO transactions (description, amount, category, date) VALUES (%s, %s, %s, %s)", (t.description, t.amount, t.category, t.date))
    conn.commit(); cursor.close(); conn.close()
    return {"status": "created"}

@app.post("/investments")
def create_investment(i: InvestmentCreate):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("INSERT INTO investments (asset, amount, date) VALUES (%s, %s, %s)", (i.asset, i.amount, i.date))
    conn.commit(); cursor.close(); conn.close()
    return {"status": "created"}

@app.put("/transactions/{item_id}")
def update_transaction(item_id: int, t: TransactionUpdate):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("UPDATE transactions SET description = %s, amount = %s, category = %s WHERE id = %s", (t.description, t.amount, t.category, item_id))
    conn.commit(); cursor.close(); conn.close(); return {"status": "updated"}

@app.put("/investments/{item_id}")
def update_investment(item_id: int, i: InvestmentUpdate):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("UPDATE investments SET asset = %s, amount = %s WHERE id = %s", (i.asset, i.amount, item_id))
    conn.commit(); cursor.close(); conn.close(); return {"status": "updated"}

@app.delete("/transactions/{item_id}")
def delete_transaction(item_id: int):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("DELETE FROM transactions WHERE id = %s", (item_id,))
    conn.commit(); cursor.close(); conn.close(); return {"status": "deleted"}

@app.delete("/investments/{item_id}")
def delete_investment(item_id: int):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("DELETE FROM investments WHERE id = %s", (item_id,))
    conn.commit(); cursor.close(); conn.close(); return {"status": "deleted"}

@app.post("/webhook")
async def telegram_webhook(request: Request):
    try:
        data = await request.json()
        # Pega a mensagem do Telegram (se existir)
        message = data.get("message", {}).get("text", "")
        chat_id = data.get("message", {}).get("chat", {}).get("id")

        if not message or not chat_id:
            return {"status": "ignored"}

        # --- AQUI A MÁGICA ACONTECE! ---
        print(f"Mensagem recebida: {message}")
        ai_result = ask_ai(message) # Pergunta pro Gemini

        if ai_result:
            # Se a IA entendeu, salvamos no banco!
            new_transaction = Transaction(
                description=ai_result['description'],
                amount=float(ai_result['amount']) * -1, # Negativo pois é gasto
                category=ai_result['category'],
                date=datetime.now().strftime("%Y-%m-%d")
            )
            
            db = SessionLocal()
            db.add(new_transaction)
            db.commit()
            db.close()

            # Responde pro usuário no Telegram
            resposta = f"✅ Anotado!\n📝 {ai_result['description']}\n💰 R$ {ai_result['amount']}\n📂 {ai_result['category']}"
            requests.post(f"https://api.telegram.org/bot{os.getenv('TOKEN')}/sendMessage", json={"chat_id": chat_id, "text": resposta})
        else:
            # Se a IA não entendeu
            requests.post(f"https://api.telegram.org/bot{os.getenv('TOKEN')}/sendMessage", json={"chat_id": chat_id, "text": "🤔 Não entendi o valor. Tente 'Gastei 50 em pizza'"})

        return {"status": "ok"}
        
    except Exception as e:
        print(f"Erro no webhook: {e}")
        return {"status": "error"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)