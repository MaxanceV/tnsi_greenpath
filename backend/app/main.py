# backend/app/main.py
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"status": "GreenPath Backend en ligne ! 🌍"}