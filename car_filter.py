import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

# Modelos Pydantic para validação
class FiltrosRequest(BaseModel):
    preco_max: Optional[float] = None
    tipos: Optional[List[str]] = None
    combustiveis: Optional[List[str]] = None
    bagageira_min: Optional[float] = None
    consumo_max: Optional[float] = None
    extras_obrigatorios: Optional[List[str]] = None
    perfil: str = "equilibrado"
    prioridade_consumo: float = 1.0
    prioridade_desempenho: float = 1.0
    prioridade_espaco: float = 1.0

class CompararRequest(BaseModel):
    modelos: List[str]

class CarroFilterAPI:
    def __init__(self, csv_path: str = "carros.csv"):
        """Inicializa o sistema de recomendação."""
        self.df = pd.read_csv(csv_path)
        self._prepare_data()
        
    def _prepare_data(self):
        """Prepara os dados."""
        # Converter tipos
        numeric_cols = ['Ano', 'Potência (cv)', 'Consumo (l/100km)', 
                       '0-100 km/h (s)', 'Velocidade Max (km/h)', 
                       'Bagageira (l)', 'Preço Indicativo (€)']
        
        for col in numeric_cols:
            if col in self.df.columns:
                self.df[col] = pd.to_numeric(self.df[col], errors='coerce')
        
        # Criar coluna ID única
        self.df['id'] = self.df['Marca'] + ' ' + self.df['Modelo'] + ' ' + self.df['Ano'].astype(str)
    
    def buscar_modelos(self, busca: str = "") -> List[Dict]:
        """Busca modelos para autocomplete."""
        if busca:
            mask = self.df['id'].str.contains(busca, case=False, na=False)
            resultados = self.df[mask]
        else:
            resultados = self.df.head(20)
        
        return resultados[['id', 'Marca', 'Modelo', 'Ano', 'Tipo']].to_dict('records')
    
    def comparar_modelos(self, modelos_ids: List[str]) -> List[Dict]:
        """Compara 2-3 modelos específicos."""
        resultados = []
        for model_id in modelos_ids:
            carro = self.df[self.df['id'] == model_id]
            if not carro.empty:
                resultados.append(carro.iloc[0].to_dict())
        
        return resultados
    
    def recomendar_carros(self, filtros: FiltrosRequest) -> Dict[str, Any]:
        """Recomenda carros baseado nos filtros."""
        df_filtrado = self.df.copy()
        
        # Aplicar filtros
        if filtros.preco_max:
            df_filtrado = df_filtrado[df_filtrado['Preço Indicativo (€)'] <= filtros.preco_max]
        
        if filtros.tipos:
            mask = df_filtrado['Tipo'].isin(filtros.tipos)
            df_filtrado = df_filtrado[mask]
        
        if filtros.combustiveis:
            mask = df_filtrado['Combustível'].isin(filtros.combustiveis)
            df_filtrado = df_filtrado[mask]
        
        if filtros.bagageira_min:
            df_filtrado = df_filtrado[df_filtrado['Bagageira (l)'] >= filtros.bagageira_min]
        
        if filtros.consumo_max:
            df_filtrado = df_filtrado[df_filtrado['Consumo (l/100km)'] <= filtros.consumo_max]
        
        if filtros.extras_obrigatorios:
            for extra in filtros.extras_obrigatorios:
                if extra in df_filtrado.columns:
                    df_filtrado = df_filtrado[df_filtrado[extra] == True]
        
        # Calcular scores
        if len(df_filtrado) > 0:
            df_com_scores = self._calcular_scores(df_filtrado, filtros)
            
            # Ordenar por score
            df_com_scores = df_com_scores.sort_values('score_total', ascending=False)
            
            return {
                "total": len(df_com_scores),
                "resultados": df_com_scores.head(20).to_dict('records'),
                "filtros_aplicados": filtros.dict()
            }
        else:
            return {
                "total": 0,
                "resultados": [],
                "filtros_aplicados": filtros.dict()
            }
    
    def _calcular_scores(self, df: pd.DataFrame, filtros: FiltrosRequest) -> pd.DataFrame:
        """Calcula scores personalizados."""
        df_scored = df.copy()
        
        # Normalizar atributos
        def normalizar(coluna, invertido=False):
            if coluna not in df_scored.columns:
                return pd.Series([0] * len(df_scored), index=df_scored.index)
            
            valores = df_scored[coluna].fillna(df_scored[coluna].median())
            min_val = valores.min()
            max_val = valores.max()
            
            if max_val == min_val:
                return pd.Series([0.5] * len(df_scored), index=df_scored.index)
            
            if invertido:
                return (max_val - valores) / (max_val - min_val)
            else:
                return (valores - min_val) / (max_val - min_val)
        
        # Aplicar pesos baseados no perfil e prioridades
        if filtros.perfil == "personalizado":
            peso_consumo = filtros.prioridade_consumo
            peso_desempenho = filtros.prioridade_desempenho
            peso_espaco = filtros.prioridade_espaco
        else:
            # Pesos pré-definidos por perfil
            perfis = {
                "economico": {"consumo": 0.6, "desempenho": 0.2, "espaco": 0.2},
                "desportivo": {"consumo": 0.2, "desempenho": 0.6, "espaco": 0.2},
                "familia": {"consumo": 0.3, "desempenho": 0.2, "espaco": 0.5},
                "cidade": {"consumo": 0.5, "desempenho": 0.2, "espaco": 0.3},
                "estrada": {"consumo": 0.4, "desempenho": 0.4, "espaco": 0.2},
                "equilibrado": {"consumo": 0.33, "desempenho": 0.33, "espaco": 0.34}
            }
            pesos = perfis.get(filtros.perfil, perfis["equilibrado"])
            peso_consumo = pesos["consumo"]
            peso_desempenho = pesos["desempenho"]
            peso_espaco = pesos["espaco"]
        
        # Calcular componentes
        score_consumo = normalizar('Consumo (l/100km)', invertido=True) * peso_consumo
        
        # Desempenho: média de potência e aceleração
        score_potencia = normalizar('Potência (cv)', invertido=False) * (peso_desempenho * 0.6)
        score_aceleracao = normalizar('0-100 km/h (s)', invertido=True) * (peso_desempenho * 0.4)
        score_desempenho = score_potencia + score_aceleracao
        
        # Espaço: bagageira
        score_espaco = normalizar('Bagageira (l)', invertido=False) * peso_espaco
        
        # Score total
        df_scored['score_consumo'] = score_consumo
        df_scored['score_desempenho'] = score_desempenho
        df_scored['score_espaco'] = score_espaco
        df_scored['score_total'] = score_consumo + score_desempenho + score_espaco
        
        # Normalizar score total para 0-100
        if df_scored['score_total'].max() > df_scored['score_total'].min():
            df_scored['score_total'] = (
                (df_scored['score_total'] - df_scored['score_total'].min()) / 
                (df_scored['score_total'].max() - df_scored['score_total'].min()) * 100
            )
        
        return df_scored