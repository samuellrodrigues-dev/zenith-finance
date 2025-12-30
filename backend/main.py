import os
import requests
import json
import uvicorn
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from datetime import datetime
from sqlalchemy import create_engine
from database import SessionLocal, Transaction, engine, Base
import google.generativeai as genai

# --- CONFIGURAÇÃO INICIAL ---
load_dotenv()

# Cria as tabelas do SQLAlchemy (transactions_v2) se não existirem
Base.metadata.create_all(bind=engine)

app = FastAPI()

# --- CONFIGURAÇÃO DA IA ---
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Tenta usar o modelo mais compatível
try:
    model = genai.GenerativeModel('gemini-flash-latest')
except:
    model = genai.GenerativeModel('gemini-1.5-flash')

# --- CONFIGURAÇÃO DE ACESSO (CORS) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELOS DE DADOS (Pydantic) ---
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

# --- VARIÁVEIS DE AMBIENTE ---
DATABASE_URL = os.getenv("DATABASE_URL")
TOKEN = os.getenv("TOKEN")
ADMIN_USER = "Youngbae"
ADMIN_PASS = "72163427"

# --- FUNÇÃO DE CONEXÃO DIRETA (RAW SQL) ---
def get_db_connection():
    if not DATABASE_URL:
        # Fallback para SQLite local se não tiver URL
        return create_engine("sqlite:///./finance.db").raw_connection()
    
    # Cria uma engine temporária para executar SQL bruto
    temp_engine = create_engine(DATABASE_URL)
    return temp_engine.raw_connection()

# --- FUNÇÃO AUXILIAR DA IA ---
def ask_ai(message):
    try:
        prompt = f"""
        Analise a seguinte mensagem de gasto financeiro: "{message}"
        Extraia:
        1. O valor (numérico, use ponto para decimais).
        2. Uma descrição curta (ex: "Almoço", "Uber").
        3. A categoria (Escolha uma: Alimentação, Transporte, Lazer, Casa, Contas, Investimento, Saúde, Outros).
        
        Responda APENAS um JSON neste formato:
        {{"amount": 0.0, "description": "...", "category": "..."}}
        """
        response = model.generate_content(prompt)
        # Limpeza para garantir que venha apenas o JSON
        clean_text = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(clean_text)
    except Exception as e:
        print(f"Erro na IA: {e}")
        return None

# --- ROTAS DO SISTEMA ---

@app.get("/")
def read_root():
    return {"message": "Zenith API está online e atualizada! 🚀"}

@app.post("/login")
def login(data: LoginData):
    if data.username == ADMIN_USER and data.password == ADMIN_PASS:
        return {"status": "success", "token": "acesso_liberado"}
    raise HTTPException(status_code=401, detail="Negado")

@app.get("/dashboard")
def get_dashboard(month: str = None):
    if not month: month = datetime.now().strftime("%Y-%m")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Busca na tabela NOVA (transactions_v2) especificando colunas para evitar erros
    cursor.execute("SELECT id, description, amount, category, type, date FROM transactions_v2 WHERE date LIKE %s ORDER BY date DESC, id DESC", (f"{month}%",))
    raw_data = cursor.fetchall()
    
    transactions = []
    for r in raw_data:
        transactions.append({
            "id": r[0],
            "description": r[1],
            "amount": r[2],
            "category": r[3],
            "type": r[4],
            "date": r[5]
        })

    # Busca Investimentos (Tabela antiga 'investments')
    try:
        cursor.execute("SELECT id, asset, amount, date FROM investments WHERE date LIKE %s ORDER BY date DESC, id DESC", (f"{month}%",))
        investments_month = [{"id": r[0], "asset": r[1], "amount": r[2], "date": r[3]} for r in cursor.fetchall()]

        cursor.execute("SELECT id, asset, amount FROM investments")
        investments_global = [{"id": r[0], "amount": r[2]} for r in cursor.fetchall()]
    except:
        investments_month = []
        investments_global = []
    
    cursor.close()
    conn.close()
    
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
    # Insere na transactions_v2
    cursor.execute("INSERT INTO transactions_v2 (description, amount, category, date, type) VALUES (%s, %s, %s, %s, %s)", 
                   (t.description, t.amount, t.category, t.date, "despesa" if t.amount < 0 else "receita"))
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
    cursor.execute("UPDATE transactions_v2 SET description = %s, amount = %s, category = %s WHERE id = %s", (t.description, t.amount, t.category, item_id))
    conn.commit(); cursor.close(); conn.close(); return {"status": "updated"}

@app.put("/investments/{item_id}")
def update_investment(item_id: int, i: InvestmentUpdate):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("UPDATE investments SET asset = %s, amount = %s WHERE id = %s", (i.asset, i.amount, item_id))
    conn.commit(); cursor.close(); conn.close(); return {"status": "updated"}

@app.delete("/transactions/{item_id}")
def delete_transaction(item_id: int):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("DELETE FROM transactions_v2 WHERE id = %s", (item_id,))
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
        message = data.get("message", {}).get("text", "")
        chat_id = data.get("message", {}).get("chat", {}).get("id")

        if not message or not chat_id:
            return {"status": "ignored"}

        # --- AQUI A MÁGICA ACONTECE! ---
        print(f"Mensagem recebida: {message}")
        ai_result = ask_ai(message) # Pergunta pro Gemini

        if ai_result:
            # Se a IA entendeu, salvamos no banco!
            # Transaction agora mapeia para transactions_v2 (no database.py)
            new_transaction = Transaction(
                description=ai_result['description'],
                amount=float(ai_result['amount']) * -1, # Negativo pois é gasto
                category=ai_result['category'],
                type="despesa",
                date=datetime.now().strftime("%Y-%m-%d")
            )
            
            db = SessionLocal()
            db.add(new_transaction)
            db.commit()
            db.close()

            # Responde pro usuário no Telegram
            resposta = f"✅ Anotado!\n📝 {ai_result['description']}\n💰 R$ {ai_result['amount']}\n📂 {ai_result['category']}"
            requests.post(f"https://api.telegram.org/bot{TOKEN}/sendMessage", json={"chat_id": chat_id, "text": resposta})
        else:
            # Se a IA não entendeu
            requests.post(f"https://api.telegram.org/bot{TOKEN}/sendMessage", json={"chat_id": chat_id, "text": "🤔 Não entendi o valor. Tente 'Gastei 50 em pizza'"})

        return {"status": "ok"}
        
    except Exception as e:
        print(f"Erro no webhook: {e}")
        return {"status": "error"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)