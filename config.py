import os

class Config:
    # Configurações da API
    API_TITLE = "API de Recomendação de Carros Portugal"
    API_VERSION = "1.0.0"
    
    # Configurações CORS
    CORS_ORIGINS = [
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://*.github.io",
        "https://carros-portugal.vercel.app",
        "*"  # Em desenvolvimento
    ]
    
    # Caminho do ficheiro CSV
    CSV_PATH = "carros_pt_50.csv"
    
    # Configurações de cache
    CACHE_TIMEOUT = 300  # 5 minutos
    
    @staticmethod
    def get_cors_origins():
        """Retorna origens CORS baseado no ambiente."""
        if os.getenv("RAILWAY_ENVIRONMENT"):
            return ["https://*.github.io", "https://*.vercel.app"]
        return Config.CORS_ORIGINS