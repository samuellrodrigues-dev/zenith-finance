import os
import requests
import json
import uvicorn
import yfinance as yf
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from datetime import datetime
from sqlalchemy import create_engine
from database import SessionLocal, Transaction, Investment, CreditCard, Goal, engine, Base
import google.generativeai as genai

# --- CONFIGURAÇÃO INICIAL ---
load_dotenv()

# Cria as tabelas no banco se não existirem
Base.metadata.create_all(bind=engine)

app = FastAPI()

# --- CONFIGURAÇÃO DA IA (GEMINI) ---
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
try:
    model = genai.GenerativeModel('gemini-1.5-flash')
except:
    model = genai.GenerativeModel('gemini-pro')

# --- CONFIGURAÇÃO DE CORS (Permitir acesso do Frontend) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELOS DE DADOS (Pydantic) ---

class CardCreate(BaseModel):
    name: str
    limit_amount: float

class TransactionCreate(BaseModel):
    description: str
    amount: float
    category: str
    date: str
    card_id: int = None  # Opcional

class InvestmentCreate(BaseModel):
    ticker: str
    quantity: float
    price: float
    date: str

class GoalCreate(BaseModel):
    name: str
    target: float
    current: float
    deadline: str

class ChatRequest(BaseModel):
    message: str

class LoginData(BaseModel):
    username: str
    password: str

# --- DEPENDÊNCIA DE BANCO ---
def get_db():
    return SessionLocal()

# ==========================================
# ROTAS DE METAS (NOVAS)
# ==========================================

@app.post("/goals")
def create_goal(g: GoalCreate):
    db = get_db()
    new_goal = Goal(
        name=g.name,
        target_amount=g.target,
        current_amount=g.current,
        deadline=g.deadline
    )
    db.add(new_goal)
    db.commit()
    db.close()
    return {"status": "created"}

@app.get("/goals")
def get_goals():
    db = get_db()
    goals = db.query(Goal).all()
    db.close()
    return goals

@app.put("/goals/{id}")
def update_goal_amount(id: int, data: dict):
    # Usado para "Depositar" dinheiro na meta
    db = get_db()
    goal = db.query(Goal).filter(Goal.id == id).first()
    if goal and "current" in data:
        goal.current_amount = float(data["current"])
        db.commit()
    db.close()
    return {"status": "updated"}

@app.delete("/goals/{id}")
def delete_goal(id: int):
    db = get_db()
    db.query(Goal).filter(Goal.id == id).delete()
    db.commit()
    db.close()
    return {"status": "deleted"}

# ==========================================
# ROTAS DE CARTÕES
# ==========================================

@app.post("/cards")
def create_card(c: CardCreate):
    db = get_db()
    new_card = CreditCard(name=c.name, limit_amount=c.limit_amount)
    db.add(new_card)
    db.commit()
    db.close()
    return {"status": "created"}

@app.get("/cards")
def get_cards():
    db = get_db()
    cards = db.query(CreditCard).all()
    result = []
    for c in cards:
        # Soma gastos vinculados a este cartão
        used = sum(t.amount for t in c.expenses) if c.expenses else 0
        result.append({
            "id": c.id,
            "name": c.name,
            "limit": c.limit_amount,
            "used": abs(used),
            "available": c.limit_amount - abs(used)
        })
    db.close()
    return result

# ==========================================
# ROTA DE INTELIGÊNCIA ARTIFICIAL (CHAT)
# ==========================================

@app.post("/chat")
def chat_with_ai(req: ChatRequest):
    db = get_db()
    # Coleta contexto para a IA
    transacoes = db.query(Transaction).all()
    investimentos = db.query(Investment).all()
    cartoes = db.query(CreditCard).all()
    metas = db.query(Goal).all()
    db.close()
    
    total_gasto = sum(t.amount for t in transacoes if t.amount < 0)
    
    # Monta o prompt
    prompt = f"""
    CONTEXTO FINANCEIRO DO USUÁRIO:
    - Gastos Totais Registrados: R$ {total_gasto:.2f}
    - Número de Investimentos: {len(investimentos)}
    - Cartões: {[c.name for c in cartoes]}
    - Metas de Economia: {[g.name for g in metas]}
    
    PERGUNTA DO USUÁRIO: "{req.message}"
    
    INSTRUÇÃO: Você é o Zenith AI, um consultor financeiro. 
    Seja curto, direto e use emojis. Responda com base nos dados acima.
    """
    
    try:
        response = model.generate_content(prompt)
        return {"response": response.text}
    except Exception as e:
        return {"response": "Meu cérebro está reiniciando... Tente novamente em instantes!"}

# ==========================================
# ROTAS PRINCIPAIS (DASHBOARD & TRANSAÇÕES)
# ==========================================

@app.get("/dashboard")
def get_dashboard(month: str = None):
    if not month:
        month = datetime.now().strftime("%Y-%m")
    
    conn = engine.raw_connection()
    cursor = conn.cursor()
    
    # 1. Busca Transações do Mês
    cursor.execute(
        "SELECT id, description, amount, category, type, date, card_id FROM transactions_v3 WHERE date LIKE %s ORDER BY date DESC", 
        (f"{month}%",)
    )
    transactions = [
        {"id": r[0], "description": r[1], "amount": r[2], "category": r[3], "type": r[4], "date": r[5], "card_id": r[6]} 
        for r in cursor.fetchall()
    ]

    # 2. Busca Investimentos e calcula valor atual (Yahoo Finance)
    cursor.execute("SELECT id, ticker, quantity, purchase_price, date FROM investments_v3")
    raw_investments = cursor.fetchall()
    
    investments_data = []
    total_invested_brl = 0.0
    current_portfolio_value = 0.0
    
    if raw_investments:
        for r in raw_investments:
            inv_id, ticker, qty, price_paid, date = r
            total_invested_brl += (qty * price_paid)

            # Busca cotação atual
            try:
                stock = yf.Ticker(ticker)
                history = stock.history(period="1d")
                if not history.empty:
                    current_price = history['Close'].iloc[-1]
                else:
                    current_price = price_paid
            except:
                current_price = price_paid

            current_val = qty * current_price
            current_portfolio_value += current_val

            investments_data.append({
                "id": inv_id,
                "ticker": ticker,
                "quantity": qty,
                "purchase_price": price_paid,
                "total_value": current_val,
                "profit": current_val - (qty * price_paid)
            })

    cursor.close()
    conn.close()
    
    # 3. Calcula Totais por Categoria
    cats = {}
    for t in transactions:
        if t["amount"] < 0:
            c = t["category"]
            cats[c] = cats.get(c, 0) + abs(t["amount"])

    return {
        "balance": sum(t["amount"] for t in transactions),
        "expenses": sum(t["amount"] for t in transactions if t["amount"] < 0),
        "invested_total": total_invested_brl,
        "portfolio_value": current_portfolio_value,
        "transactions": transactions,
        "investments": investments_data,
        "categories": cats
    }

@app.post("/transactions")
def create_transaction(t: TransactionCreate):
    db = get_db()
    
    # Lógica: Se for gasto, garante negativo. Se for Renda, garante positivo.
    final_amount = t.amount if t.amount < 0 else -t.amount
    if t.category in ["Renda", "Entrada"]:
        final_amount = abs(t.amount)
    
    new_t = Transaction(
        description=t.description,
        amount=final_amount,
        category=t.category,
        date=t.date,
        type="receita" if final_amount > 0 else "despesa",
        card_id=t.card_id
    )
    db.add(new_t)
    db.commit()
    db.close()
    return {"status": "created"}

@app.post("/investments")
def create_investment(i: InvestmentCreate):
    db = get_db()
    new_inv = Investment(
        ticker=i.ticker.upper(),
        quantity=i.quantity,
        purchase_price=i.price,
        date=i.date
    )
    db.add(new_inv)
    db.commit()
    db.close()
    return {"status": "created"}

@app.delete("/transactions/{id}")
def delete_transaction(id: int):
    db = get_db()
    db.query(Transaction).filter(Transaction.id == id).delete()
    db.commit()
    db.close()
    return {"status": "deleted"}

@app.delete("/investments/{id}")
def delete_investment(id: int):
    db = get_db()
    db.query(Investment).filter(Investment.id == id).delete()
    db.commit()
    db.close()
    return {"status": "deleted"}

# ==========================================
# ROTA DE LOGIN (SIMPLES)
# ==========================================

@app.post("/login")
def login(data: LoginData):
    if data.username == "Youngbae" and data.password == "72163427":
        return {"token": "access_granted_zenith_v3"}
    raise HTTPException(status_code=401, detail="Credenciais Inválidas")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)