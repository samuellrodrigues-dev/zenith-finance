import os
import requests
import json
import uvicorn
import yfinance as yf # <--- A NOVIDADE
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from datetime import datetime
from sqlalchemy import create_engine
from database import SessionLocal, Transaction, Investment, engine, Base
import google.generativeai as genai

# --- CONFIGURAÇÃO INICIAL ---
load_dotenv()
Base.metadata.create_all(bind=engine)

app = FastAPI()

# --- IA ---
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
try: model = genai.GenerativeModel('gemini-flash-latest')
except: model = genai.GenerativeModel('gemini-1.5-flash')

# --- CORS ---
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
    ticker: str     # Mudou de asset para ticker
    quantity: float # Mudou de amount para quantity
    price: float    # Preço pago na compra
    date: str

class TransactionUpdate(BaseModel):
    description: str
    amount: float
    category: str

class InvestmentUpdate(BaseModel):
    ticker: str
    quantity: float
    price: float

class LoginData(BaseModel):
    username: str
    password: str

# --- VARIÁVEIS ---
DATABASE_URL = os.getenv("DATABASE_URL")
TOKEN = os.getenv("TOKEN")
ADMIN_USER = "Youngbae"
ADMIN_PASS = "72163427"

# --- BANCO ---
def get_db_connection():
    if not DATABASE_URL: return create_engine("sqlite:///./finance.db").raw_connection()
    return create_engine(DATABASE_URL).raw_connection()

# --- IA AUXILIAR ---
def ask_ai(message):
    try:
        prompt = f"""
        Analise a seguinte mensagem de gasto: "{message}"
        Extraia: 1. Valor (numérico). 2. Descrição curta. 3. Categoria (Alimentação, Transporte, Lazer, Casa, Contas, Investimento, Saúde, Outros).
        Responda JSON: {{"amount": 0.0, "description": "...", "category": "..."}}
        """
        response = model.generate_content(prompt)
        clean_text = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(clean_text)
    except: return None

# --- ROTAS ---

@app.get("/")
def read_root():
    return {"message": "Zenith API com YFinance Online! 🚀"}

@app.post("/login")
def login(data: LoginData):
    if data.username == ADMIN_USER and data.password == ADMIN_PASS:
        return {"status": "success", "token": "acesso_liberado"}
    raise HTTPException(status_code=401, detail="Negado")

@app.get("/dashboard")
def get_dashboard(month: str = None):
    if not month: month = datetime.now().strftime("%Y-%m")
    
    conn = get_db_connection(); cursor = conn.cursor()
    
    # 1. TRANSAÇÕES (Igual antes)
    cursor.execute("SELECT id, description, amount, category, type, date FROM transactions_v2 WHERE date LIKE %s ORDER BY date DESC, id DESC", (f"{month}%",))
    transactions = [{"id": r[0], "description": r[1], "amount": r[2], "category": r[3], "type": r[4], "date": r[5]} for r in cursor.fetchall()]

    # 2. INVESTIMENTOS (AGORA COM CÁLCULO REAL)
    # Pegamos todos os investimentos do banco
    cursor.execute("SELECT id, ticker, quantity, purchase_price, date FROM investments_v2")
    raw_investments = cursor.fetchall() # [(id, 'BTC-USD', 0.5, 50000, date), ...]

    investments_data = []
    total_invested_brl = 0.0
    current_portfolio_value = 0.0

    # Se tiver investimentos, vamos buscar o preço atual
    if raw_investments:
        for r in raw_investments:
            inv_id, ticker, qty, price_paid, date = r
            total_invested_brl += (qty * price_paid) # Quanto gastei pra comprar

            # Busca cotação atual
            try:
                # Tenta pegar preço do Yahoo Finance
                stock = yf.Ticker(ticker)
                # Pega o preço mais recente (fast)
                history = stock.history(period="1d")
                if not history.empty:
                    current_price = history['Close'].iloc[-1]
                else:
                    current_price = price_paid # Fallback se falhar
            except:
                current_price = price_paid

            current_val = qty * current_price
            current_portfolio_value += current_val

            investments_data.append({
                "id": inv_id,
                "ticker": ticker,
                "quantity": qty,
                "purchase_price": price_paid,
                "current_price": current_price,
                "total_value": current_val,
                "profit": current_val - (qty * price_paid),
                "date": date
            })

    cursor.close(); conn.close()
    
    ganhos = sum(t["amount"] for t in transactions if t["amount"] > 0)
    gastos = sum(t["amount"] for t in transactions if t["amount"] < 0)
    
    cats = {}
    for t in transactions:
        if t["amount"] < 0:
            c = t["category"]
            cats[c] = cats.get(c, 0) + abs(t["amount"])

    return {
        "balance": ganhos + gastos, # Saldo apenas de conta corrente
        "expenses": gastos,
        "invested_total": total_invested_brl, # Quanto tirei do bolso
        "portfolio_value": current_portfolio_value, # Quanto vale hoje
        "transactions": transactions,
        "investments": investments_data, # Lista detalhada
        "categories": cats,
        "current_month": month
    }

@app.post("/transactions")
def create_transaction(t: TransactionCreate):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("INSERT INTO transactions_v2 (description, amount, category, date, type) VALUES (%s, %s, %s, %s, %s)", 
                   (t.description, t.amount, t.category, t.date, "despesa" if t.amount < 0 else "receita"))
    conn.commit(); cursor.close(); conn.close()
    return {"status": "created"}

@app.post("/investments")
def create_investment(i: InvestmentCreate):
    conn = get_db_connection(); cursor = conn.cursor()
    # Insere na tabela V2 com Ticker e Quantidade
    cursor.execute("INSERT INTO investments_v2 (ticker, quantity, purchase_price, date) VALUES (%s, %s, %s, %s)", 
                   (i.ticker.upper(), i.quantity, i.price, i.date))
    conn.commit(); cursor.close(); conn.close()
    return {"status": "created"}

@app.delete("/transactions/{item_id}")
def delete_transaction(item_id: int):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("DELETE FROM transactions_v2 WHERE id = %s", (item_id,))
    conn.commit(); cursor.close(); conn.close(); return {"status": "deleted"}

@app.delete("/investments/{item_id}")
def delete_investment(item_id: int):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("DELETE FROM investments_v2 WHERE id = %s", (item_id,))
    conn.commit(); cursor.close(); conn.close(); return {"status": "deleted"}

@app.post("/webhook")
async def telegram_webhook(request: Request):
    try:
        data = await request.json()
        message = data.get("message", {}).get("text", "")
        chat_id = data.get("message", {}).get("chat", {}).get("id")
        if not message or not chat_id: return {"status": "ignored"}

        print(f"Mensagem: {message}")
        ai_result = ask_ai(message)

        if ai_result:
            new_transaction = Transaction(
                description=ai_result['description'],
                amount=float(ai_result['amount']) * -1,
                category=ai_result['category'],
                type="despesa",
                date=datetime.now().strftime("%Y-%m-%d")
            )
            db = SessionLocal(); db.add(new_transaction); db.commit(); db.close()
            resposta = f"✅ Anotado!\n📝 {ai_result['description']}\n💰 R$ {ai_result['amount']}\n📂 {ai_result['category']}"
            requests.post(f"https://api.telegram.org/bot{TOKEN}/sendMessage", json={"chat_id": chat_id, "text": resposta})
        else:
            requests.post(f"https://api.telegram.org/bot{TOKEN}/sendMessage", json={"chat_id": chat_id, "text": "🤔 Não entendi."})
        return {"status": "ok"}
    except Exception as e:
        print(f"Erro no webhook: {e}")
        return {"status": "error"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)