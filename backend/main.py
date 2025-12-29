import uvicorn
import requests
import re
import sqlite3
from datetime import datetime
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

TOKEN = "8533795323:AAE3pbZwZGi9LAMHAxSSeWltcOjyKoMm5WY"
ADMIN_USER = "Youngbae"
ADMIN_PASS = "72163427"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELOS DE DADOS ---
class TransactionCreate(BaseModel):
    description: str
    amount: float
    category: str
    date: str  # Formato YYYY-MM-DD

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

def init_db():
    conn = sqlite3.connect('finance.db')
    cursor = conn.cursor()
    cursor.execute('''CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, description TEXT NOT NULL, amount REAL NOT NULL, date TEXT, category TEXT)''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS investments (id INTEGER PRIMARY KEY AUTOINCREMENT, asset TEXT NOT NULL, amount REAL NOT NULL, date TEXT)''')
    conn.commit()
    conn.close()

init_db()

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

@app.post("/login")
def login(data: LoginData):
    if data.username == ADMIN_USER and data.password == ADMIN_PASS:
        return {"status": "success", "token": "acesso_liberado"}
    raise HTTPException(status_code=401, detail="Negado")

@app.get("/dashboard")
def get_dashboard(month: str = None):
    if not month: month = datetime.now().strftime("%Y-%m")
    conn = sqlite3.connect('finance.db'); cursor = conn.cursor()
    
    # Buscas
    cursor.execute("SELECT * FROM transactions WHERE date LIKE ? ORDER BY date DESC, id DESC", (f"{month}%",))
    transactions = [{"id": r[0], "description": r[1], "amount": r[2], "date": r[3], "category": r[4]} for r in cursor.fetchall()]
    
    cursor.execute("SELECT * FROM investments WHERE date LIKE ? ORDER BY date DESC, id DESC", (f"{month}%",))
    investments_month = [{"id": r[0], "asset": r[1], "amount": r[2], "date": r[3]} for r in cursor.fetchall()]

    cursor.execute("SELECT * FROM investments")
    investments_global = [{"id": r[0], "amount": r[2]} for r in cursor.fetchall()]
    conn.close()
    
    # Cálculos
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

# --- ROTAS DE CRIAÇÃO MANUAL (NOVAS) ---
@app.post("/transactions")
def create_transaction(t: TransactionCreate):
    conn = sqlite3.connect('finance.db'); cursor = conn.cursor()
    cursor.execute("INSERT INTO transactions (description, amount, category, date) VALUES (?, ?, ?, ?)", 
                   (t.description, t.amount, t.category, t.date))
    conn.commit(); conn.close()
    return {"status": "created"}

@app.post("/investments")
def create_investment(i: InvestmentCreate):
    conn = sqlite3.connect('finance.db'); cursor = conn.cursor()
    cursor.execute("INSERT INTO investments (asset, amount, date) VALUES (?, ?, ?)", 
                   (i.asset, i.amount, i.date))
    conn.commit(); conn.close()
    return {"status": "created"}

# --- UPDATE E DELETE ---
@app.put("/transactions/{item_id}")
def update_transaction(item_id: int, t: TransactionUpdate):
    conn = sqlite3.connect('finance.db'); cursor = conn.cursor()
    cursor.execute("UPDATE transactions SET description = ?, amount = ?, category = ? WHERE id = ?", (t.description, t.amount, t.category, item_id))
    conn.commit(); conn.close(); return {"status": "updated"}

@app.put("/investments/{item_id}")
def update_investment(item_id: int, i: InvestmentUpdate):
    conn = sqlite3.connect('finance.db'); cursor = conn.cursor()
    cursor.execute("UPDATE investments SET asset = ?, amount = ? WHERE id = ?", (i.asset, i.amount, item_id))
    conn.commit(); conn.close(); return {"status": "updated"}

@app.delete("/transactions/{item_id}")
def delete_transaction(item_id: int):
    conn = sqlite3.connect('finance.db'); cursor = conn.cursor(); cursor.execute("DELETE FROM transactions WHERE id = ?", (item_id,)); conn.commit(); conn.close(); return {"status": "deleted"}

@app.delete("/investments/{item_id}")
def delete_investment(item_id: int):
    conn = sqlite3.connect('finance.db'); cursor = conn.cursor(); cursor.execute("DELETE FROM investments WHERE id = ?", (item_id,)); conn.commit(); conn.close(); return {"status": "deleted"}

# --- TELEGRAM ---
@app.post("/webhook")
async def receber_telegram(request: Request):
    data = await request.json()
    if "message" in data:
        chat_id = data["message"]["chat"]["id"]
        texto = data["message"].get("text", "")
        match = re.search(r'\d+(\.\d+)?', texto.replace(',', '.'))
        if match:
            valor = float(match.group())
            data_hoje = datetime.now().strftime("%Y-%m-%d")
            conn = sqlite3.connect('finance.db'); cursor = conn.cursor()
            if any(x in texto.lower() for x in ["investi", "aporte", "compra"]):
                cursor.execute("INSERT INTO investments (asset, amount, date) VALUES (?, ?, ?)", (texto, valor, data_hoje))
                msg = f"📈 Investimento: {texto}"
            else:
                eh_lucro = any(x in texto.lower() for x in ["recebi", "ganhei", "pix", "entrada"])
                valor_final = valor if eh_lucro else -valor
                cat = detectar_categoria(texto)
                cursor.execute("INSERT INTO transactions (description, amount, date, category) VALUES (?, ?, ?, ?)", (texto, valor_final, data_hoje, cat))
                msg = f"{'🚀' if eh_lucro else '💸'} {cat}: {texto}"
            conn.commit(); conn.close()
            enviar_mensagem(chat_id, msg)
    return {"ok": True}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)