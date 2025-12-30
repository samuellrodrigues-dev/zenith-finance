import google.generativeai as genai
import os
from dotenv import load_dotenv

# Carrega a chave do arquivo .env
load_dotenv()
chave = os.getenv("GEMINI_API_KEY")
print(f"Testando com a chave: {chave[:5]}... (oculta)")

genai.configure(api_key=chave)

print("\n🔍 Perguntando ao Google quais modelos eu posso usar...")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"✅ Disponível: {m.name}")
except Exception as e:
    print(f"❌ Erro total: {e}")