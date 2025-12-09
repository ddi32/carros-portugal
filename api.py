# api.py corrigido para Render
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import pandas as pd
import json
from pathlib import Path
import os

app = FastAPI(title="Carros Portugal API", version="1.0.0")

# CORS configurado para GitHub Pages
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://ddi32.github.io",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Carregar dados
current_dir = Path(__file__).parent
csv_path = current_dir / "carros_pt_50.csv"

if not csv_path.exists():
    csv_path = current_dir / "backend" / "carros_pt_50.csv"

if not csv_path.exists():
    # Tentar caminho absoluto
    csv_path = Path("/opt/render/project/src/backend/carros_pt_50.csv")

try:
    df = pd.read_csv(csv_path)
    print(f"Dados carregados com sucesso! {len(df)} carros encontrados.")
except Exception as e:
    print(f"ERRO ao carregar CSV: {e}")
    # Criar DataFrame vazio para evitar crash
    df = pd.DataFrame()

# Endpoints
@app.get("/")
def read_root():
    return {
        "message": "Carros Portugal API",
        "status": "online",
        "carros_carregados": len(df),
        "versao": "1.0.0"
    }

@app.get("/tipos")
def get_tipos():
    tipos = df['Tipo'].unique().tolist() if not df.empty else []
    return {"tipos": tipos}

@app.get("/combustiveis")
def get_combustiveis():
    combustiveis = df['Combustivel'].unique().tolist() if not df.empty else []
    return {"combustiveis": combustiveis}

@app.get("/modelos")
def get_modelos(q: str = ""):
    if df.empty:
        return {"modelos": []}
    
    if q:
        mask = df['Modelo'].str.contains(q, case=False, na=False) | \
               df['Marca'].str.contains(q, case=False, na=False)
        resultados = df[mask].head(10)
    else:
        resultados = df.head(10)
    
    modelos = []
    for _, row in resultados.iterrows():
        modelos.append({
            "id": str(_),
            "nome": f"{row['Marca']} {row['Modelo']} {row['Ano']}",
            "marca": row['Marca'],
            "modelo": row['Modelo'],
            "ano": row['Ano'],
            "preco": row['Preco']
        })
    
    return {"modelos": modelos}

# Modelos Pydantic
class CompararRequest(BaseModel):
    modelos_ids: List[str]

class RecomendarRequest(BaseModel):
    preco_max: Optional[float] = None
    tipo: Optional[str] = None
    combustivel: Optional[str] = None
    bagageira_min: Optional[int] = None
    consumo_max: Optional[float] = None
    extras: Optional[List[str]] = None
    perfil: Optional[str] = None

@app.post("/comparar")
def comparar_carros(request: CompararRequest):
    if df.empty:
        raise HTTPException(status_code=500, detail="Dados não carregados")
    
    resultados = []
    for idx in request.modelos_ids:
        try:
            idx_int = int(idx)
            if 0 <= idx_int < len(df):
                carro = df.iloc[idx_int].to_dict()
                # Converter numpy types para Python nativo
                for key, value in carro.items():
                    if pd.isna(value):
                        carro[key] = None
                resultados.append(carro)
        except:
            continue
    
    return {"comparacao": resultados}

@app.post("/recomendar")
def recomendar_carros(request: RecomendarRequest):
    if df.empty:
        raise HTTPException(status_code=500, detail="Dados não carregados")
    
    # Aplicar filtros básicos
    filtered_df = df.copy()
    
    if request.preco_max:
        filtered_df = filtered_df[filtered_df['Preco'] <= request.preco_max]
    
    if request.tipo:
        filtered_df = filtered_df[filtered_df['Tipo'] == request.tipo]
    
    if request.combustivel:
        filtered_df = filtered_df[filtered_df['Combustivel'] == request.combustivel]
    
    if request.bagageira_min:
        filtered_df = filtered_df[filtered_df['Bagageira'] >= request.bagageira_min]
    
    if request.consumo_max:
        filtered_df = filtered_df[filtered_df['Consumo'] <= request.consumo_max]
    
    # Aplicar sistema de scoring simples
    carros_recomendados = []
    for idx, row in filtered_df.iterrows():
        score = 100
        
        # Penalizar por preço (quanto mais caro, menor score)
        if request.preco_max:
            preco_ratio = row['Preco'] / request.preco_max
            score *= (1 - (preco_ratio * 0.3))
        
        # Perfis pré-definidos
        if request.perfil == "economico":
            score *= (10 / row['Consumo'])  # Baixo consumo aumenta score
        elif request.perfil == "desportivo":
            score *= (row['Potencia'] / 200)  # Alta potência aumenta score
        elif request.perfil == "familia":
            score *= (row['Bagageira'] / 500)  # Bagageira grande aumenta score
        
        carros_recomendados.append({
            "id": str(idx),
            "score": round(score, 2),
            **row.to_dict()
        })
    
    # Ordenar por score
    carros_recomendados.sort(key=lambda x: x["score"], reverse=True)
    
    return {"recomendacoes": carros_recomendados[:10]}
