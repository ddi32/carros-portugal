// Configurações da API
// ALTERE ESTA URL para o seu backend quando publicar
const API_URL = 'https://seu-backend.railway.app';
// Para produção: 'https://seu-backend.railway.app' ou 'https://seu-backend.onrender.com'

// Estado global
let tiposDisponiveis = [];
let combustiveisDisponiveis = [];

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('Recomendador de Carros Portugal - Inicializado');
    
    // Configurar eventos dos sliders
    initSliders();
    
    // Carregar dados iniciais
    loadInitialData();
    
    // Configurar autocomplete
    setupAutocomplete('modelo1');
    setupAutocomplete('modelo2');
    setupAutocomplete('modelo3');
});

// Funções de modo
function switchMode(mode) {
    // Atualizar botões
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    // Mostrar conteúdo
    document.querySelectorAll('.mode-content').forEach(content => {
        content.classList.toggle('active', content.id === `${mode}Mode`);
    });
    
    // Limpar resultados anteriores
    clearResults();
}

function togglePrioridades() {
    const perfil = document.getElementById('perfil').value;
    const prioritySliders = document.getElementById('prioritySliders');
    prioritySliders.style.display = perfil === 'personalizado' ? 'block' : 'none';
}

function initSliders() {
    // Atualizar valores exibidos dos sliders
    const sliders = document.querySelectorAll('input[type="range"]');
    sliders.forEach(slider => {
        const valueDisplay = slider.nextElementSibling;
        if (valueDisplay && valueDisplay.classList.contains('slider-value')) {
            slider.addEventListener('input', function() {
                valueDisplay.textContent = this.value;
            });
        }
    });
}

async function loadInitialData() {
    try {
        // Tentar carregar tipos e combustíveis da API
        console.log('A carregar dados iniciais...');
        
        // Se a API estiver disponível, carregar dados dinâmicos
        const response = await fetch(`${API_URL}/tipos`);
        if (response.ok) {
            const data = await response.json();
            tiposDisponiveis = data.tipos || [];
            preencherCheckboxes('tiposContainer', tiposDisponiveis, 'tipo');
        }
        
        // Carregar combustíveis
        const combResponse = await fetch(`${API_URL}/combustiveis`);
        if (combResponse.ok) {
            const combData = await combResponse.json();
            combustiveisDisponiveis = combData.combustiveis || [];
            preencherCheckboxes('combustiveisContainer', combustiveisDisponiveis, 'comb');
        }
        
    } catch (error) {
        console.log('API offline, usando dados estáticos...');
        // Dados estáticos de fallback
        tiposDisponiveis = ['SUV', 'Hatchback', 'Perua', 'Sedan', 'Cupê', 'MPV', 'Urbano'];
        combustiveisDisponiveis = ['Gasolina', 'Diesel', 'Elétrico', 'Híbrido'];
        
        preencherCheckboxes('tiposContainer', tiposDisponiveis, 'tipo');
        preencherCheckboxes('combustiveisContainer', combustiveisDisponiveis, 'comb');
    }
}

function preencherCheckboxes(containerId, itens, prefixo) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    itens.forEach(item => {
        const div = document.createElement('div');
        div.className = 'checkbox-item';
        div.innerHTML = `
            <input type="checkbox" id="${prefixo}-${item.replace(/\s+/g, '-')}" value="${item}">
            <label for="${prefixo}-${item.replace(/\s+/g, '-')}">${item}</label>
        `;
        container.appendChild(div);
    });
}

function setupAutocomplete(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const datalist = document.getElementById(`${inputId}-list`) || 
                     document.createElement('datalist');
    datalist.id = `${inputId}-list`;
    
    if (!document.getElementById(datalist.id)) {
        input.after(datalist);
    }
    
    input.setAttribute('list', datalist.id);
    
    input.addEventListener('input', async function() {
        const busca = this.value.trim();
        if (busca.length < 2) {
            datalist.innerHTML = '';
            return;
        }
        
        try {
            // Tentar buscar da API
            const response = await fetch(`${API_URL}/modelos?busca=${encodeURIComponent(busca)}`);
            if (response.ok) {
                const data = await response.json();
                datalist.innerHTML = '';
                
                if (data.modelos && data.modelos.length > 0) {
                    data.modelos.forEach(modelo => {
                        const option = document.createElement('option');
                        option.value = modelo.id || `${modelo.Marca} ${modelo.Modelo} ${modelo.Ano}`;
                        option.textContent = `${modelo.Marca} ${modelo.Modelo} (${modelo.Ano})`;
                        datalist.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.log('Erro na busca de modelos:', error);
        }
    });
}

// Modo Comparar
async function handleComparar(event) {
    event.preventDefault();
    
    const modelo1 = document.getElementById('modelo1').value.trim();
    const modelo2 = document.getElementById('modelo2').value.trim();
    const modelo3 = document.getElementById('modelo3').value.trim();
    
    // Validar
    const modelos = [modelo1, modelo2, modelo3].filter(m => m !== '');
    if (modelos.length < 2) {
        showAlert('compararResults', 'error', 'Selecione pelo menos 2 modelos para comparar.');
        return;
    }
    
    showLoading('loadingComparar', true);
    
    try {
        const response = await fetch(`${API_URL}/comparar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ modelos: modelos })
        });
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.comparacao && data.comparacao.length > 0) {
            displayComparacao(data.comparacao);
        } else {
            showAlert('compararResults', 'info', 'Nenhum resultado encontrado para os modelos selecionados.');
        }
    } catch (error) {
        console.error('Erro na comparação:', error);
        // Mostrar dados de exemplo se a API falhar
        displayComparacaoExemplo(modelos);
    } finally {
        showLoading('loadingComparar', false);
    }
}

function displayComparacao(carros) {
    const resultsDiv = document.getElementById('compararResults');
    resultsDiv.style.display = 'block';
    
    // Criar tabela de comparação
    let html = `
        <div class="alert alert-success">
            <h3><i class="fas fa-chart-bar"></i> Comparação de ${carros.length} Modelos</h3>
        </div>
        <div class="table-responsive">
            <table class="comparison-table">
                <thead>
                    <tr>
                        <th>Característica</th>
                        ${carros.map(carro => 
                            `<th>${carro.Marca || ''} ${carro.Modelo || ''}</th>`
                        ).join('')}
                    </tr>
                </thead>
                <tbody>
    `;
    
    // Características a comparar
    const caracteristicas = [
        { label: 'Preço (€)', key: 'Preço Indicativo (€)', format: v => v ? `${parseInt(v).toLocaleString('pt-PT')} €` : 'N/A' },
        { label: 'Ano', key: 'Ano' },
        { label: 'Tipo', key: 'Tipo' },
        { label: 'Potência (cv)', key: 'Potência (cv)' },
        { label: 'Consumo (l/100km)', key: 'Consumo (l/100km)', format: v => v ? `${v}` : 'N/A' },
        { label: '0-100 km/h (s)', key: '0-100 km/h (s)', format: v => v ? `${v}s` : 'N/A' },
        { label: 'Velocidade Máx (km/h)', key: 'Velocidade Max (km/h)' },
        { label: 'Bagageira (l)', key: 'Bagageira (l)' },
        { label: 'Combustível', key: 'Combustível' }
    ];
    
    // Adicionar características
    caracteristicas.forEach(carac => {
        html += `<tr><td><strong>${carac.label}</strong></td>`;
        
        carros.forEach(carro => {
            let value = carro[carac.key];
            if (value === undefined || value === null) value = 'N/A';
            
            if (carac.format && typeof value !== 'string' && value !== 'N/A') {
                try {
                    value = carac.format(value);
                } catch (e) {
                    value = 'N/A';
                }
            }
            
            html += `<td>${value}</td>`;
        });
        
        html += '</tr>';
    });
    
    // Extras
    const extras = ['Airbag', 'AC', 'CC', 'Sensores', 'Teto Solar', 'Navegador'];
    extras.forEach(extra => {
        html += `<tr><td><strong>${extra}</strong></td>`;
        
        carros.forEach(carro => {
            const temExtra = carro[extra] === true || carro[extra] === 'TRUE' || carro[extra] === true;
            html += `<td style="text-align:center;">${temExtra ? '✅' : '❌'}</td>`;
        });
        
        html += '</tr>';
    });
    
    html += `
                </tbody>
            </table>
        </div>
        <p class="note"><small><i class="fas fa-info-circle"></i> Valores destacados em azul são os melhores em cada categoria.</small></p>
    `;
    
    resultsDiv.innerHTML = html;
    
    // Destacar melhores valores
    highlightBestValues(carros, caracteristicas);
}

function displayComparacaoExemplo(modelos) {
    const resultsDiv = document.getElementById('compararResults');
    resultsDiv.style.display = 'block';
    
    const modelosExemplo = modelos.map((modelo, idx) => ({
        'Marca': modelo.split(' ')[0] || `Marca ${idx+1}`,
        'Modelo': modelo.split(' ').slice(1, -1).join(' ') || `Modelo ${idx+1}`,
        'Ano': 2023,
        'Preço Indicativo (€)': 25000 + (idx * 5000),
        'Potência (cv)': 120 + (idx * 30),
        'Consumo (l/100km)': (5.0 + (idx * 0.5)).toFixed(1),
        '0-100 km/h (s)': (9.0 - (idx * 0.5)).toFixed(1),
        'Velocidade Max (km/h)': 190 + (idx * 20),
        'Bagageira (l)': 300 + (idx * 50),
        'Combustível': ['Gasolina', 'Diesel', 'Híbrido'][idx] || 'Gasolina',
        'Airbag': true,
        'AC': true,
        'CC': idx > 0,
        'Sensores': idx > 0
    }));
    
    displayComparacao(modelosExemplo);
    
    showAlert('compararResults', 'info', 
        'Mostrando dados de exemplo. Configure o backend para dados reais.');
}

// Modo Encontrar
async function handleEncontrar(event) {
    event.preventDefault();
    
    // Coletar filtros
    const precoMax = document.getElementById('precoMax').value || null;
    const bagageiraMin = document.getElementById('bagageiraMin').value || null;
    const consumoMax = document.getElementById('consumoMax').value || null;
    
    // Coletar seleções
    const tiposSelecionados = getSelectedCheckboxes('tiposContainer');
    const combustiveisSelecionados = getSelectedCheckboxes('combustiveisContainer');
    const extrasSelecionados = getSelectedCheckboxes('extrasContainer');
    
    // Perfil e prioridades
    const perfil = document.getElementById('perfil').value;
    const prioridadeConsumo = parseFloat(document.getElementById('prioridadeConsumo').value) || 1;
    const prioridadeDesempenho = parseFloat(document.getElementById('prioridadeDesempenho').value) || 1;
    const prioridadeEspaco = parseFloat(document.getElementById('prioridadeEspaco').value) || 1;
    
    // Criar objeto de filtros
    const filtros = {
        preco_max: precoMax ? parseFloat(precoMax) : null,
        tipos: tiposSelecionados.length > 0 ? tiposSelecionados : null,
        combustiveis: combustiveisSelecionados.length > 0 ? combustiveisSelecionados : null,
        bagageira_min: bagageiraMin ? parseFloat(bagageiraMin) : null,
        consumo_max: consumoMax ? parseFloat(consumoMax) : null,
        extras_obrigatorios: extrasSelecionados.length > 0 ? extrasSelecionados : null,
        perfil: perfil,
        prioridade_consumo: prioridadeConsumo,
        prioridade_desempenho: prioridadeDesempenho,
        prioridade_espaco: prioridadeEspaco
    };
    
    showLoading('loadingEncontrar', true);
    
    try {
        const response = await fetch(`${API_URL}/recomendar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(filtros)
        });
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.resultados && data.resultados.length > 0) {
            displayRecomendacoes(data);
        } else {
            showAlert('encontrarResults', 'info', 
                'Nenhum carro encontrado com os filtros selecionados. Tente relaxar alguns critérios.');
        }
    } catch (error) {
        console.error('Erro na recomendação:', error);
        // Mostrar dados de exemplo
        displayRecomendacoesExemplo(filtros);
    } finally {
        showLoading('loadingEncontrar', false);
    }
}

function getSelectedCheckboxes(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    
    return Array.from(container.querySelectorAll('input[type="checkbox"]:checked'))
                .map(cb => cb.value);
}

function displayRecomendacoes(data) {
    const resultsDiv = document.getElementById('encontrarResults');
    resultsDiv.style.display = 'block';
    
    let html = `
        <div class="alert alert-success">
            <h3><i class="fas fa-check-circle"></i> Encontrados ${data.total} carros</h3>
            <p>Ordenados por relevância para o seu perfil.</p>
        </div>
        <div class="results-grid">
    `;
    
    data.resultados.forEach((carro, index) => {
        const score = carro.score_total ? Math.round(carro.score_total) : 85 - (index * 5);
        
        html += `
            <div class="car-card">
                <div class="car-header">
                    <h3>${carro.Marca || ''} ${carro.Modelo || ''}</h3>
                    <div class="score-badge">Relevância: ${score}/100</div>
                </div>
                <div class="car-body">
                    <div class="car-spec">
                        <span class="spec-label">Preço:</span>
                        <span class="spec-value">${carro['Preço Indicativo (€)'] ? parseInt(carro['Preço Indicativo (€)']).toLocaleString('pt-PT') + ' €' : 'N/A'}</span>
                    </div>
                    <div class="car-spec">
                        <span class="spec-label">Ano:</span>
                        <span class="spec-value">${carro.Ano || 'N/A'}</span>
                    </div>
                    <div class="car-spec">
                        <span class="spec-label">Tipo:</span>
                        <span class="spec-value">${carro.Tipo || 'N/A'}</span>
                    </div>
                    <div class="car-spec">
                        <span class="spec-label">Potência:</span>
                        <span class="spec-value">${carro['Potência (cv)'] || 'N/A'} cv</span>
                    </div>
                    <div class="car-spec">
                        <span class="spec-label">Consumo:</span>
                        <span class="spec-value">${carro['Consumo (l/100km)'] || 'N/A'} l/100km</span>
                    </div>
                    <div class="car-spec">
                        <span class="spec-label">0-100 km/h:</span>
                        <span class="spec-value">${carro['0-100 km/h (s)'] || 'N/A'}s</span>
                    </div>
                    <div class="car-spec">
                        <span class="spec-label">Bagageira:</span>
                        <span class="spec-value">${carro['Bagageira (l)'] || 'N/A'}L</span>
                    </div>
                    <div class="car-spec">
                        <span class="spec-label">Combustível:</span>
                        <span class="spec-value">${carro.Combustível || 'N/A'}</span>
                    </div>
                    <div class="car-spec">
                        <span class="spec-label">Extras:</span>
                        <span class="spec-value">
                            ${['Airbag', 'AC', 'CC', 'Sensores', 'Teto Solar', 'Navegador']
                                .filter(extra => carro[extra])
                                .join(', ') || 'Nenhum'}
                        </span>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    resultsDiv.innerHTML = html;
}

function displayRecomendacoesExemplo(filtros) {
    const carrosExemplo = [
        {
            'Marca': 'Volkswagen',
            'Modelo': 'Golf',
            'Ano': 2023,
            'Tipo': 'Hatchback',
            'Preço Indicativo (€)': 32000,
            'Potência (cv)': 150,
            'Consumo (l/100km)': 5.2,
            '0-100 km/h (s)': 8.5,
            'Velocidade Max (km/h)': 220,
            'Bagageira (l)': 380,
            'Combustível': 'Gasolina',
            'Airbag': true,
            'AC': true,
            'CC': true,
            'Sensores': true,
            'score_total': 92
        },
        {
            'Marca': 'Toyota',
            'Modelo': 'Corolla',
            'Ano': 2023,
            'Tipo': 'Perua',
            'Preço Indicativo (€)': 31900,
            'Potência (cv)': 122,
            'Consumo (l/100km)': 4.3,
            '0-100 km/h (s)': 10.9,
            'Velocidade Max (km/h)': 180,
            'Bagageira (l)': 598,
            'Combustível': 'Híbrido',
            'Airbag': true,
            'AC': true,
            'CC': true,
            'Sensores': true,
            'score_total': 88
        },
        {
            'Marca': 'Peugeot',
            'Modelo': '208',
            'Ano': 2023,
            'Tipo': 'Hatchback',
            'Preço Indicativo (€)': 21500,
            'Potência (cv)': 100,
            'Consumo (l/100km)': 4.5,
            '0-100 km/h (s)': 10.1,
            'Velocidade Max (km/h)': 190,
            'Bagageira (l)': 311,
            'Combustível': 'Gasolina',
            'Airbag': true,
            'AC': true,
            'CC': false,
            'Sensores': true,
            'score_total': 85
        }
    ];
    
    // Filtrar conforme filtros básicos
    const filtrados = carrosExemplo.filter(carro => {
        if (filtros.preco_max && carro['Preço Indicativo (€)'] > filtros.preco_max) return false;
        if (filtros.tipos && filtros.tipos.length > 0 && !filtros.tipos.includes(carro.Tipo)) return false;
        if (filtros.combustiveis && filtros.combustiveis.length > 0 && !filtros.combustiveis.includes(carro.Combustível)) return false;
        if (filtros.bagageira_min && carro['Bagageira (l)'] < filtros.bagageira_min) return false;
        if (filtros.consumo_max && carro['Consumo (l/100km)'] > filtros.consumo_max) return false;
        return true;
    });
    
    const dataExemplo = {
        total: filtrados.length,
        resultados: filtrados
    };
    
    displayRecomendacoes(dataExemplo);
    
    showAlert('encontrarResults', 'info', 
        'Mostrando dados de exemplo. Configure o backend para dados reais e filtros completos.');
}

// Funções auxiliares
function showLoading(elementId, show) {
    const loadingDiv = document.getElementById(elementId);
    if (loadingDiv) {
        loadingDiv.style.display = show ? 'block' : 'none';
    }
}

function showAlert(containerId, type, message) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `<p><i class="fas fa-${type === 'error' ? 'exclamation-triangle' : 
                                         type === 'success' ? 'check-circle' : 'info-circle'}"></i> ${message}</p>`;
    
    // Inserir no início do container
    if (container.firstChild) {
        container.insertBefore(alertDiv, container.firstChild);
    } else {
        container.appendChild(alertDiv);
    }
    
    // Remover após 5 segundos se não for erro
    if (type !== 'error') {
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

function highlightBestValues(carros, caracteristicas) {
    // Para cada característica, destacar o melhor valor
    caracteristicas.forEach((carac, idx) => {
        const rows = document.querySelectorAll('.comparison-table tbody tr');
        if (rows.length <= idx) return;
        
        const row = rows[idx];
        const cells = row.querySelectorAll('td:not(:first-child)');
        
        const values = Array.from(cells).map(cell => {
            const text = cell.textContent;
            // Extrair número do texto
            const numMatch = text.match(/[\d.,]+/);
            if (!numMatch) return null;
            
            const numStr = numMatch[0].replace(/[^\d.,]/g, '').replace(',', '.');
            const num = parseFloat(numStr);
            return isNaN(num) ? null : num;
        });
        
        // Determinar se maior ou menor é melhor
        const isBetterHigher = !['Consumo (l/100km)', '0-100 km/h (s)'].includes(carac.key);
        
        // Encontrar melhor valor
        let bestIndex = 0;
        let bestValue = values[0];
        
        values.forEach((val, i) => {
            if (val === null) return;
            
            if (isBetterHigher) {
                if (val > bestValue || bestValue === null) {
                    bestValue = val;
                    bestIndex = i;
                }
            } else {
                if (val < bestValue || bestValue === null) {
                    bestValue = val;
                    bestIndex = i;
                }
            }
        });
        
        // Destacar célula
        if (cells[bestIndex]) {
            cells[bestIndex].classList.add('highlight');
        }
    });
}

function clearResults() {
    document.getElementById('compararResults').style.display = 'none';
    document.getElementById('compararResults').innerHTML = '';
    document.getElementById('encontrarResults').style.display = 'none';
    document.getElementById('encontrarResults').innerHTML = '';
}

function limparComparar() {
    document.getElementById('compararForm').reset();
    clearResults();
}

function limparFiltros() {
    document.getElementById('encontrarForm').reset();
    document.getElementById('prioritySliders').style.display = 'none';
    clearResults();
}