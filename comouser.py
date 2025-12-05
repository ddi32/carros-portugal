# 1. Carregar dados
sistema = CarroFilterSystem('carros_portugal.csv')

# 2. Filtrar
carros_filtrados = sistema.filtrar_carros(
    preco_max=30000,
    tipo='SUV',
    combustivel='Híbrido',
    bagageira_min=400,
    extras_obrigatorios=['Airbag', 'AC', 'Sensores']
)

# 3. Calcular scores
resultados = sistema.calcular_score(perfil='familia')

# 4. Ou usar função única
top_carros = sistema.recomendar_carros(
    perfil='cidade',
    preco_max=25000,
    consumo_max=5.0,
    n_recomendacoes=5
)