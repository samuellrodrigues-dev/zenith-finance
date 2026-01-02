from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
import os

# 1. URL DO BANCO
db_url = os.getenv("DATABASE_URL")
if db_url and not db_url.strip(): db_url = None
elif db_url and db_url.startswith("postgres://"): db_url = db_url.replace("postgres://", "postgresql://", 1)

# 2. CONEXÃO
try:
    if not db_url: raise ValueError("URL vazia")
    engine_test = create_engine(db_url)
    with engine_test.connect() as conn: conn.execute(text("SELECT 1"))
    engine = engine_test
    print(f"✅ Conectado no banco oficial!")
except Exception as e:
    print(f"⚠️ Usando SQLite local ({e})")
    db_url = "sqlite:///./finance.db"
    engine = create_engine(db_url, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- TABELAS ---

class CreditCard(Base):
    __tablename__ = "credit_cards_v3"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50))
    limit_amount = Column(Float)
    expenses = relationship("Transaction", back_populates="card")

class Transaction(Base):
    __tablename__ = "transactions_v3"
    id = Column(Integer, primary_key=True, index=True)
    description = Column(String(255), index=True)
    amount = Column(Float)
    category = Column(String(255))
    type = Column(String(255))
    date = Column(String(50))
    card_id = Column(Integer, ForeignKey("credit_cards_v3.id"), nullable=True)
    card = relationship("CreditCard", back_populates="expenses")

class Investment(Base):
    __tablename__ = "investments_v3"
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(50))
    quantity = Column(Float)
    purchase_price = Column(Float)
    date = Column(String(50))

# --- NOVA TABELA DE METAS ---
class Goal(Base):
    __tablename__ = "goals"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))      # Ex: Viagem Europa
    target_amount = Column(Float)   # Ex: 20000.00
    current_amount = Column(Float)  # Ex: 1500.00 (Quanto já guardou)
    deadline = Column(String(50))   # Ex: 2026-12-31