from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from car_filter import CarroFilterAPI, FiltrosRequest, CompararRequest
import uvicorn

app = FastAPI(title="API de Recomendação de Carros PT")

# Configurar CORS para permitir frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, substituir pelo domínio do frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar o motor
motor = CarroFilterAPI("carros.csv")

@app.get("/")
async def root():
    return {"message": "API de Recomendação de Carros PT"}

@app.get("/modelos")
async def buscar_modelos(busca: str = ""):
    """Endpoint para autocomplete de modelos."""
    try:
        resultados = motor.buscar_modelos(busca)
        return {"modelos": resultados}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/comparar")
async def comparar(request: CompararRequest):
    """Compara 2-3 modelos."""
    try:
        if len(request.modelos) < 2 or len(request.modelos) > 3:
            raise HTTPException(status_code=400, detail="Selecione 2 ou 3 modelos")
        
        resultados = motor.comparar_modelos(request.modelos)
        return {"comparacao": resultados}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/recomendar")
async def recomendar(filtros: FiltrosRequest):
    """Recomenda carros baseado em filtros."""
    try:
        resultados = motor.recomendar_carros(filtros)
        return resultados
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tipos")
async def listar_tipos():
    """Lista todos os tipos de carro disponíveis."""
    try:
        tipos = motor.df['Tipo'].unique().tolist()
        return {"tipos": tipos}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/combustiveis")
async def listar_combustiveis():
    """Lista todos os tipos de combustível."""
    try:
        combustiveis = motor.df['Combustível'].unique().tolist()
        return {"combustiveis": combustiveis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)