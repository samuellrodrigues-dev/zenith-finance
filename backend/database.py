from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Pega o banco da nuvem (Render) ou usa local se não tiver
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./finance.db")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class Transaction(Base):
    # MUDAMOS O NOME PARA FORÇAR A CRIAÇÃO DE UMA TABELA NOVA COM A COLUNA DATE
    __tablename__ = "transactions_v2"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String(255), index=True)
    amount = Column(Float)
    category = Column(String(255))
    type = Column(String(255))
    date = Column(String(50)) # <--- AQUI ESTÁ A NOVIDADE!