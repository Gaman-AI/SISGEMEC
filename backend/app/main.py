from fastapi import FastAPI
import os
from dotenv import load_dotenv, find_dotenv

# Carga el .env de forma robusta y sobreescribe variables si ya existían
load_dotenv(find_dotenv(), override=True)

app = FastAPI(title="SISGEMEC API (setup)")

@app.get("/health")
def health_check():
    supabase_url = os.getenv("SUPABASE_URL")
    anon = os.getenv("SUPABASE_ANON_KEY")
    return {
        "status": "ok",
        "supabase_url_set": bool(supabase_url),
        "anon_key_len": len(anon) if anon else 0
    }
