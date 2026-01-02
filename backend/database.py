from sqlalchemy import create_engine, Column, Integer, String, Float, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# 1. Tenta pegar a URL do ambiente
db_url = os.getenv("DATABASE_URL")

# Limpeza básica
if db_url and not db_url.strip():
    db_url = None
elif db_url and db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# 2. TENTATIVA DE CONEXÃO BLINDADA COM TESTE REAL
try:
    if not db_url:
        raise ValueError("URL vazia")
    
    # Cria a engine provisória
    engine_test = create_engine(db_url)
    
    # --- O PULO DO GATO: TESTA SE CONECTA DE VERDADE ---
    with engine_test.connect() as conn:
        conn.execute(text("SELECT 1"))
    
    # Se passou daqui, o banco é real e funciona!
    engine = engine_test
    print(f"✅ Conectado no banco oficial: {db_url.split('@')[1].split('/')[0] if '@' in db_url else 'Cloud'}...")

except Exception as e:
    # SE DER QUALQUER ERRO (Endereço errado, banco caiu, senha errada...)
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