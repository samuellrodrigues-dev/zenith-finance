from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# 1. Tenta pegar a URL do ambiente
db_url = os.getenv("DATABASE_URL")

# 2. Limpeza: Se for None ou Vazio, define como None real
if db_url and not db_url.strip():
    db_url = None

# 3. Correção para Postgres no Render (se existir)
if db_url and db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# 4. TENTATIVA DE CONEXÃO BLINDADA
try:
    if not db_url:
        raise ValueError("URL vazia")
    # Tenta criar a engine com a URL oficial
    engine = create_engine(db_url)
    print(f"✅ Conectado no banco oficial: {db_url.split('://')[0]}...")
except Exception as e:
    # SE DER QUALQUER ERRO, USA O SQLITE LOCAL
    print(f"⚠️ Erro na conexão ({e}). Usando SQLite local de emergência.")
    db_url = "sqlite:///./finance.db"
    engine = create_engine(db_url, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class Transaction(Base):
    __tablename__ = "transactions_v2"
    id = Column(Integer, primary_key=True, index=True)
    description = Column(String(255), index=True)
    amount = Column(Float)
    category = Column(String(255))
    type = Column(String(255))
    date = Column(String(50))

class Investment(Base):
    __tablename__ = "investments_v2"
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(50))
    quantity = Column(Float)
    purchase_price = Column(Float)
    date = Column(String(50))