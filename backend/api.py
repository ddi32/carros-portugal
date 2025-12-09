"""
API Carros Portugal - FastAPI Backend
Deploy: Render.com
Autor: Diogo Dias
"""

import os
from pathlib import Path
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json

# ==================== CONFIGURAÇÃO ====================
app = FastAPI(
    title="Carros Portugal API",
    description="API para comparação e recomendação de carros em Portugal",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configurar CORS para GitHub Pages e localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://ddi32.github.io",      # GitHub Pages
        "http://localhost:8000",        # Local dev
        "http://127.0.0.1:8000",        # Local dev
        "http://localhost:8080",        # Frontend local
        "http://127.0.0.1:8080",        # Frontend local
        "https://carros-portugal.vercel.app",  # Possível futuro deploy
        "*"                             # Temporário para testes
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# ==================== CARREGAR DADOS ====================
print("=" * 50)
print("🚀 Iniciando Carros Portugal API v2.0")
print("=" * 50)

# Listar diretório atual
current_dir = Path(__file__).parent
print(f"📂 Diretório atual: {current_dir}")
print(f"📁 Conteúdo do diretório: {os.listdir(current_dir)}")

# Procurar por arquivos de dados
data_files = []
possible_names = [
    "carros_pt_50.csv", "carros_pt_50.xlsx", "Carros pt 50.xlsx",
    "carros.csv", "dados.csv", "data.csv", "carros.xlsx"
]

for name in possible_names:
    # Verificar no diretório atual
    file_path = current_dir / name
    if file_path.exists():
        data_files.append(file_path)
    
    # Verificar no diretório pai
    parent_file = current_dir.parent / name
    if parent_file.exists():
        data_files.append(parent_file)

# Também procurar por extensão
for ext in ['.csv', '.xlsx', '.xls']:
    for file in current_dir.glob(f'*{ext}'):
        if file not in data_files:
            data_files.append(file)

print(f"🔍 {len(data_files)} arquivo(s) de dados encontrado(s):")
for f in data_files:
    print(f"   - {f}")

# Tentar carregar os dados
df = None
loaded_from = None

for data_file in data_files:
    try:
        print(f"\n📖 Tentando carregar: {data_file}")
        
        if str(data_file).endswith('.csv'):
            df = pd.read_csv(data_file, encoding='utf-8', delimiter=',')
        elif str(data_file).endswith(('.xlsx', '.xls')):
            df = pd.read_excel(data_file)
        else:
            continue
        
        # Verificar se tem dados
        if len(df) > 0:
            loaded_from = data_file
            print(f"✅ SUCESSO! Carregados {len(df)} registros")
            print(f"📊 Colunas disponíveis: {df.columns.tolist()}")
            break
        else:
            print(f"⚠️ Arquivo vazio: {data_file}")
            
    except Exception as e:
        print(f"❌ Erro ao carregar {data_file}: {str(e)[:100]}...")
        continue

# Se não carregou, criar dados de exemplo
if df is None or len(df) == 0:
    print("⚠️ Nenhum arquivo de dados válido encontrado. Criando dados de exemplo...")
    
    # Criar DataFrame de exemplo
    data = {
        'Marca': ['Volkswagen', 'Renault', 'Peugeot', 'BMW', 'Mercedes'],
        'Modelo': ['Golf', 'Clio', '208', 'Serie 3', 'Classe A'],
        'Ano': [2023, 2023, 2023, 2023, 2023],
        'Tipo': ['Hatchback', 'Hatchback', 'Hatchback', 'Sedan', 'Hatchback'],
        'Motor': ['1.0 TSI', '1.0 TCe', '1.2 PureTech', '2.0 Diesel', '1.3'],
        'Potencia': [110, 100, 100, 190, 136],
        'Consumo': [5.2, 5.0, 4.8, 4.5, 5.5],
        '0-100': [9.9, 11.0, 10.5, 7.5, 9.0],
        'Velocidade': [210, 195, 190, 240, 220],
        'Bagageira': [380, 300, 311, 480, 370],
        'Combustivel': ['Gasolina', 'Gasolina', 'Gasolina', 'Diesel', 'Gasolina'],
        'Preco': [28500, 19500, 21200, 45000, 35500],
        'Airbag': [True, True, True, True, True],
        'AC': [True, True, True, True, True],
        'Camera': [True, False, False, True, True],
        'GPS': [True, False, True, True, True],
        'ABS': [True, True, True, True, True],
        'ESP': [True, True, True, True, True],
        'Sensor': [True, False, False, True, True]
    }
    
    df = pd.DataFrame(data)
    loaded_from = "DADOS DE EXEMPLO"
    print("✅ Dados de exemplo criados com sucesso!")

print(f"\n🎉 API pronta! Dados carregados de: {loaded_from}")
print(f"📊 Total de carros: {len(df)}")
print("=" * 50)

# ==================== MODELOS PYDANTIC ====================
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

# ==================== ENDPOINTS ====================
@app.get("/")
def read_root():
    """Endpoint raiz - Status da API"""
    return {
        "api": "Carros Portugal API",
        "versao": "2.0.0",
        "status": "online",
        "carregado_de": str(loaded_from),
        "total_carros": len(df),
        "endpoints": {
            "raiz": "GET /",
            "tipos": "GET /tipos",
            "combustiveis": "GET /combustiveis",
            "modelos": "GET /modelos?q=termo",
            "comparar": "POST /comparar",
            "recomendar": "POST /recomendar",
            "docs": "GET /docs"
        },
        "mensagem": "API funcionando! Acesse /docs para documentação completa."
    }

@app.get("/health")
def health_check():
    """Health check para monitoramento"""
    return {"status": "healthy", "carros": len(df)}

@app.get("/tipos")
def get_tipos():
    """Lista todos os tipos de carro disponíveis"""
    if 'Tipo' not in df.columns:
        return {"tipos": []}
    tipos = sorted(df['Tipo'].dropna().unique().tolist())
    return {"tipos": tipos}

@app.get("/combustiveis")
def get_combustiveis():
    """Lista todos os tipos de combustível disponíveis"""
    if 'Combustivel' not in df.columns:
        return {"combustiveis": []}
    combustiveis = sorted(df['Combustivel'].dropna().unique().tolist())
    return {"combustiveis": combustiveis}

@app.get("/modelos")
def get_modelos(q: str = Query("", description="Termo para busca (marca ou modelo)")):
    """Busca modelos por termo (autocomplete)"""
    if df.empty:
        return {"modelos": []}
    
    resultados = df.copy()
    
    if q and q.strip():
        search_term = q.strip().lower()
        mask = (
            df['Marca'].astype(str).str.lower().str.contains(search_term) |
            df['Modelo'].astype(str).str.lower().str.contains(search_term) |
            (df['Marca'] + ' ' + df['Modelo']).str.lower().str.contains(search_term)
        )
        resultados = df[mask]
    
    # Limitar a 15 resultados
    resultados = resultados.head(15)
    
    modelos = []
    for idx, row in resultados.iterrows():
        # Garantir que todos os campos existem
        marca = row.get('Marca', '')
        modelo = row.get('Modelo', '')
        ano = row.get('Ano', '')
        preco = row.get('Preco', 0)
        
        modelos.append({
            "id": str(idx),
            "nome": f"{marca} {modelo} {ano}",
            "marca": marca,
            "modelo": modelo,
            "ano": int(ano) if pd.notna(ano) else 0,
            "preco": float(preco) if pd.notna(preco) else 0,
            "tipo": row.get('Tipo', ''),
            "combustivel": row.get('Combustivel', '')
        })
    
    return {"modelos": modelos, "total": len(modelos)}

@app.get("/carro/{carro_id}")
def get_carro(carro_id: str):
    """Obtém detalhes de um carro específico"""
    try:
        idx = int(carro_id)
        if 0 <= idx < len(df):
            carro = df.iloc[idx].to_dict()
            
            # Converter valores numpy/pandas para Python nativo
            for key, value in carro.items():
                if pd.isna(value):
                    carro[key] = None
                elif isinstance(value, (np.integer, np.floating)):
                    carro[key] = value.item()
            
            return carro
        else:
            raise HTTPException(status_code=404, detail="Carro não encontrado")
    except:
        raise HTTPException(status_code=400, detail="ID inválido")

@app.post("/comparar")
def comparar_carros(request: CompararRequest):
    """Compara 2-3 carros lado a lado"""
    if df.empty:
        raise HTTPException(status_code=500, detail="Base de dados não carregada")
    
    resultados = []
    
    for carro_id in request.modelos_ids[:3]:  # Máximo 3 carros
        try:
            idx = int(carro_id)
            if 0 <= idx < len(df):
                carro = df.iloc[idx].to_dict()
                
                # Converter para tipos nativos do Python
                carro_convertido = {}
                for key, value in carro.items():
                    if pd.isna(value):
                        carro_convertido[key] = None
                    elif hasattr(value, 'item'):  # numpy types
                        carro_convertido[key] = value.item()
                    else:
                        carro_convertido[key] = value
                
                # Adicionar ID
                carro_convertido['id'] = carro_id
                resultados.append(carro_convertido)
        except:
            continue
    
    if not resultados:
        raise HTTPException(status_code=404, detail="Nenhum carro válido encontrado")
    
    return {
        "comparacao": resultados,
        "total": len(resultados),
        "campos_comparados": list(resultados[0].keys()) if resultados else []
    }

@app.post("/recomendar")
def recomendar_carros(request: RecomendarRequest):
    """Recomenda carros baseado em filtros e perfil"""
    if df.empty:
        raise HTTPException(status_code=500, detail="Base de dados não carregada")
    
    # Começar com todos os carros
    filtered_df = df.copy()
    
    # Aplicar filtros
    filters_applied = []
    
    if request.preco_max and request.preco_max > 0:
        filtered_df = filtered_df[filtered_df['Preco'] <= request.preco_max]
        filters_applied.append(f"Preço ≤ €{request.preco_max}")
    
    if request.tipo and request.tipo.strip():
        filtered_df = filtered_df[filtered_df['Tipo'] == request.tipo.strip()]
        filters_applied.append(f"Tipo = {request.tipo}")
    
    if request.combustivel and request.combustivel.strip():
        filtered_df = filtered_df[filtered_df['Combustivel'] == request.combustivel.strip()]
        filters_applied.append(f"Combustível = {request.combustivel}")
    
    if request.bagageira_min and request.bagageira_min > 0:
        filtered_df = filtered_df[filtered_df['Bagageira'] >= request.bagageira_min]
        filters_applied.append(f"Bagageira ≥ {request.bagageira_min}L")
    
    if request.consumo_max and request.consumo_max > 0:
        filtered_df = filtered_df[filtered_df['Consumo'] <= request.consumo_max]
        filters_applied.append(f"Consumo ≤ {request.consumo_max}L/100km")
    
    # Filtros de extras
    if request.extras:
        for extra in request.extras:
            if extra in df.columns:
                filtered_df = filtered_df[filtered_df[extra] == True]
                filters_applied.append(f"Extra: {extra}")
    
    # Se não há carros após filtros
    if len(filtered_df) == 0:
        return {
            "recomendacoes": [],
            "filtros_aplicados": filters_applied,
            "total": 0,
            "mensagem": "Nenhum carro encontrado com os filtros aplicados"
        }
    
    # Sistema de scoring
    carros_com_score = []
    
    for idx, row in filtered_df.iterrows():
        score = 100.0  # Score base
        
        # Ajustar score baseado no perfil
        if request.perfil:
            if request.perfil == "economico":
                # Prioridade: baixo consumo, preço baixo
                consumo_norm = 1 - (row.get('Consumo', 10) / 20)  # Normalizar 0-20
                preco_norm = 1 - (row.get('Preco', 50000) / 100000)
                score *= (0.6 * consumo_norm + 0.4 * preco_norm) * 2
                
            elif request.perfil == "desportivo":
                # Prioridade: potência, aceleração
                potencia_norm = min(row.get('Potencia', 0) / 300, 1)
                aceleracao_norm = 1 - (row.get('0-100', 20) / 30)  # Menor tempo = melhor
                score *= (0.5 * potencia_norm + 0.5 * aceleracao_norm) * 2
                
            elif request.perfil == "familia":
                # Prioridade: espaço, segurança
                bagageira_norm = min(row.get('Bagageira', 0) / 1000, 1)
                extras_score = sum([
                    1 if row.get('Airbag', False) else 0,
                    1 if row.get('ABS', False) else 0,
                    1 if row.get('ESP', False) else 0
                ]) / 3
                score *= (0.6 * bagageira_norm + 0.4 * extras_score) * 2
                
            elif request.perfil == "cidade":
                # Prioridade: consumo, tamanho compacto
                consumo_norm = 1 - (row.get('Consumo', 10) / 15)
                tamanho_score = 1 if row.get('Tipo', '') in ['Hatchback', 'Compacto'] else 0.5
                score *= (0.7 * consumo_norm + 0.3 * tamanho_score) * 2
                
            elif request.perfil == "estrada":
                # Prioridade: conforto, autonomia
                velocidade_norm = min(row.get('Velocidade', 0) / 250, 1)
                extras_score = sum([
                    1 if row.get('AC', False) else 0,
                    1 if row.get('GPS', False) else 0
                ]) / 2
                score *= (0.5 * velocidade_norm + 0.5 * extras_score) * 2
        
        # Garantir que score está entre 0-100
        score = max(0, min(100, score))
        
        # Converter linha para dict
        carro_dict = row.to_dict()
        for key, value in carro_dict.items():
            if pd.isna(value):
                carro_dict[key] = None
            elif hasattr(value, 'item'):
                carro_dict[key] = value.item()
        
        carro_dict['id'] = str(idx)
        carro_dict['score'] = round(score, 2)
        
        carros_com_score.append(carro_dict)
    
    # Ordenar por score
    carros_com_score.sort(key=lambda x: x['score'], reverse=True)
    
    # Limitar a 10 resultados
    resultados_finais = carros_com_score[:10]
    
    return {
        "recomendacoes": resultados_finais,
        "filtros_aplicados": filters_applied,
        "total_encontrados": len(filtered_df),
        "total_recomendados": len(resultados_finais)
    }

@app.get("/debug/dados")
def debug_dados():
    """Endpoint de debug para verificar dados carregados"""
    sample = df.head(3).to_dict(orient='records') if not df.empty else []
    
    return {
        "carregado_de": str(loaded_from),
        "total_registros": len(df),
        "colunas": df.columns.tolist() if not df.empty else [],
        "tipos_colunas": {col: str(dtype) for col, dtype in df.dtypes.items()} if not df.empty else {},
        "amostra": sample
    }

# ==================== INICIALIZAÇÃO ====================
if __name__ == "__main__":
    import uvicorn
    print("\n⚡ Iniciando servidor...")
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )