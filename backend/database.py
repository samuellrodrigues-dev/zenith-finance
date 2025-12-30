from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# --- CORREÇÃO DE SEGURANÇA ---
# Tenta pegar a URL. Se vier Vazia ou None, usa o SQLite local de emergência.
db_url = os.getenv("DATABASE_URL")
if not db_url:
    db_url = "sqlite:///./finance.db"

# Correção extra: O Render as vezes usa "postgres://" mas o Python quer "postgresql://"
if db_url and db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

engine = create_engine(db_url)
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