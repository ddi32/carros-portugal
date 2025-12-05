// Configurações
const API_URL = 'http://localhost:8000'; // Altere para o URL da sua API

// Elementos DOM
let currentMode = 'comparar';
let tiposDisponiveis = [];
let combustiveisDisponiveis = [];

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    // Configurar navegação entre modos
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchMode(btn.dataset.mode);
        });
    });
    
    // Inicializar sliders
    initSliders();
    
    // Carregar dados iniciais
    loadInitialData();
    
    // Configurar eventos dos formulários
    document.getElementById('compararForm').addEventListener('submit', handleComparar);
    document.getElementById('encontrarForm').addEventListener('submit', handleEncontrar);
    
    // Inicializar com modo comparar
    switchMode('comparar');
});

function switchMode(mode) {
    currentMode = mode;
    
    // Atualizar botões
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    // Mostrar conteúdo correspondente
    document.querySelectorAll('.mode-content').forEach(content => {
        content.classList.toggle('active', content.id === `${mode}Mode`);
    });
    
    // Limpar resultados anteriores
    clearResults();
}

async function loadInitialData() {
    try {
        // Carregar tipos de carro
        const tiposResponse = await fetch(`${API_URL}/tipos`);
        const tiposData = await tiposResponse.json();
        tiposDisponiveis = tiposData.tipos;
        
        // Preencher checkboxes de tipos
        const tiposContainer = document.getElementById('tiposContainer');
        tiposDisponiveis.forEach(tipo => {
            const div = document.createElement('div');
            div.className = 'checkbox-item';
            div.innerHTML = `
                <input type="checkbox" id="tipo-${tipo}" value="${tipo}">
                <label for="tipo-${tipo}">${tipo}</label>
            `;
            tiposContainer.appendChild(div);
        });
        
        // Carregar combustíveis
        const combResponse = await fetch(`${API_URL}/combustiveis`);
        const combData = await combResponse.json();
        combustiveisDisponiveis = combData.combustiveis;
        
        // Preencher checkboxes de combustíveis
        const combContainer = document.getElementById('combustiveisContainer');
        combustiveisDisponiveis.forEach(comb => {
            const div = document.createElement('div');
            div.className = 'checkbox-item';
            div.innerHTML = `
                <input type="checkbox" id="comb-${comb}" value="${comb}">
                <label for="comb-${comb}">${comb}</label>
            `;
            combContainer.appendChild(div);
        });
        
        // Configurar autocomplete para modelo 1
        setupAutocomplete('modelo1');
        setupAutocomplete('modelo2');
        setupAutocomplete('modelo3');
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showAlert('error', 'Erro ao carregar dados iniciais');
    }
}

function setupAutocomplete(inputId) {
    const input = document.getElementById(inputId);
    const datalist = document.createElement('datalist');
    datalist.id = `${inputId}-list`;
    input.after(datalist);
    input.setAttribute('list', datalist.id);
    
    input.addEventListener('input', async function() {
        const busca = this.value;
        if (busca.length < 2) return;
        
        try {
            const response = await fetch(`${API_URL}/modelos?busca=${encodeURIComponent(busca)}`);
            const data = await response.json();
            
            datalist.innerHTML = '';
            data.modelos.forEach(modelo => {
                const option = document.createElement('option');
                option.value = modelo.id;
                option.textContent = `${modelo.Marca} ${modelo.Modelo} (${modelo.Ano})`;
                datalist.appendChild(option);
            });
        } catch (error) {
            console.error('Erro na busca:', error);
        }
    });
}

function initSliders() {
    // Sliders de prioridade
    const sliders = document.querySelectorAll('input[type="range"]');
    sliders.forEach(slider => {
        // Atualizar valor exibido
        const valueDisplay = slider.nextElementSibling;
        if (valueDisplay && valueDisplay.classList.contains('slider-value')) {
            valueDisplay.textContent = slider.value;
            
            slider.addEventListener('input', function() {
                valueDisplay.textContent = this.value;
            });
        }
    });
}

async function handleComparar(e) {
    e.preventDefault();
    
    const modelo1 = document.getElementById('modelo1').value;
    const modelo2 = document.getElementById('modelo2').value;
    const modelo3 = document.getElementById('modelo3').value;
    
    // Validar que pelo menos 2 modelos foram selecionados
    const modelos = [modelo1, modelo2, modelo3].filter(m => m.trim() !== '');
    if (modelos.length < 2) {
        showAlert('error', 'Selecione pelo menos 2 modelos para comparar');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/comparar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ modelos: modelos })
        });
        
        const data = await response.json();
        
        if (data.comparacao && data.comparacao.length > 0) {
            displayComparacao(data.comparacao);
        } else {
            showAlert('info', 'Nenhum resultado encontrado');
        }
    } catch (error) {
        console.error('Erro na comparação:', error);
        showAlert('error', 'Erro ao comparar modelos');
    } finally {
        showLoading(false);
    }
}

async function handleEncontrar(e) {
    e.preventDefault();
    
    // Coletar filtros
    const precoMax = document.getElementById('precoMax').value || null;
    const bagageiraMin = document.getElementById('bagageiraMin').value || null;
    const consumoMax = document.getElementById('consumoMax').value || null;
    
    // Coletar tipos selecionados
    const tiposSelecionados = Array.from(
        document.querySelectorAll('#tiposContainer input[type="checkbox"]:checked')
    ).map(cb => cb.value);
    
    // Coletar combustíveis selecionados
    const combustiveisSelecionados = Array.from(
        document.querySelectorAll('#combustiveisContainer input[type="checkbox"]:checked')
    ).map(cb => cb.value);
    
    // Coletar extras selecionados
    const extrasSelecionados = Array.from(
        document.querySelectorAll('#extrasContainer input[type="checkbox"]:checked')
    ).map(cb => cb.value);
    
    // Perfil e prioridades
    const perfil = document.getElementById('perfil').value;
    const prioridadeConsumo = parseFloat(document.getElementById('prioridadeConsumo').value);
    const prioridadeDesempenho = parseFloat(document.getElementById('prioridadeDesempenho').value);
    const prioridadeEspaco = parseFloat(document.getElementById('prioridadeEspaco').value);
    
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
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/recomendar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(filtros)
        });
        
        const data = await response.json();
        
        if (data.resultados && data.resultados.length > 0) {
            displayRecomendacoes(data);
        } else {
            showAlert('info', 'Nenhum carro encontrado com os filtros selecionados');
        }
    } catch (error) {
        console.error('Erro na recomendação:', error);
        showAlert('error', 'Erro ao buscar recomendações');
    } finally {
        showLoading(false);
    }
}

function displayComparacao(carros) {
    const resultsDiv = document.getElementById('compararResults');
    resultsDiv.style.display = 'block';
    
    // Criar tabela de comparação
    let html = `
        <div class="alert alert-info">
            Comparando ${carros.length} modelos
        </div>
        <div class="table-responsive">
            <table class="comparison-table">
                <thead>
                    <tr>
                        <th>Característica</th>
                        ${carros.map(carro => `<th>${carro.Marca} ${carro.Modelo}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
    `;
    
    // Definir características a comparar
    const caracteristicas = [
        { label: 'Preço (€)', key: 'Preço Indicativo (€)', format: v => `${v.toLocaleString('pt-PT')} €` },
        { label: 'Ano', key: 'Ano' },
        { label: 'Tipo', key: 'Tipo' },
        { label: 'Potência (cv)', key: 'Potência (cv)' },
        { label: 'Consumo (l/100km)', key: 'Consumo (l/100km)', format: v => `${v}` },
        { label: '0-100 km/h (s)', key: '0-100 km/h (s)', format: v => `${v}s` },
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
            
            if (carac.format && typeof value !== 'string') {
                value = carac.format(value);
            }
            
            html += `<td>${value}</td>`;
        });
        
        html += '</tr>';
    });
    
    // Adicionar extras
    const extras = ['Airbag', 'AC', 'CC', 'Sensores', 'Teto Solar', 'Navegador'];
    extras.forEach(extra => {
        html += `<tr><td><strong>${extra}</strong></td>`;
        
        carros.forEach(carro => {
            const temExtra = carro[extra] === true || carro[extra] === 'TRUE';
            html += `<td>${temExtra ? '✓' : '✗'}</td>`;
        });
        
        html += '</tr>';
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    resultsDiv.innerHTML = html;
    
    // Destacar melhor valor para cada característica
    highlightBestValues(carros, caracteristicas);
}

function highlightBestValues(carros, caracteristicas) {
    // Para cada característica, encontrar o melhor valor
    caracteristicas.forEach((carac, idx) => {
        const rows = document.querySelectorAll('.comparison-table tbody tr');
        const row = rows[idx];
        
        if (row) {
            const cells = row.querySelectorAll('td:not(:first-child)');
            const values = Array.from(cells).map(cell => {
                const text = cell.textContent;
                const num = parseFloat(text.replace(/[^\d.,]/g, '').replace(',', '.'));
                return isNaN(num) ? null : num;
            });
            
            // Determinar se maior ou menor é melhor
            const isBetterHigher = !['Consumo (l/100km)', '0-100 km/h (s)'].includes(carac.key);
            
            // Encontrar melhor valor
            let bestIndex = 0;
            if (isBetterHigher) {
                let max = -Infinity;
                values.forEach((val, i) => {
                    if (val !== null && val > max) {
                        max = val;
                        bestIndex = i;
                    }
                });
            } else {
                let min = Infinity;
                values.forEach((val, i) => {
                    if (val !== null && val < min) {
                        min = val;
                        bestIndex = i;
                    }
                });
            }
            
            // Destacar célula
            if (cells[bestIndex]) {
                cells[bestIndex].classList.add('highlight');
            }
        }
    });
}

function displayRecomendacoes(data) {
    const resultsDiv = document.getElementById('encontrarResults');
    resultsDiv.style.display = 'block';
    
    let html = `
        <div class="alert alert-success">
            Encontrados ${data.total} carros que correspondem aos seus critérios
        </div>
        <div class="results-grid">
    `;
    
    data.resultados.forEach(carro => {
        html += `
            <div class="car-card">
                <div class="car-header">
                    <h3>${carro.Marca} ${carro.Modelo}</h3>
                    <div class="score-badge">Score: ${Math.round(carro.score_total || 0)}/100</div>
                </div>
                <div class="car-body">
                    <div class="car-spec">
                        <span class="spec-label">Preço:</span>
                        <span class="spec-value">${parseInt(carro['Preço Indicativo (€)']).toLocaleString('pt-PT')} €</span>
                    </div>
                    <div class="car-spec">
                        <span class="spec-label">Ano:</span>
                        <span class="spec-value">${carro.Ano}</span>
                    </div>
                    <div class="car-spec">
                        <span class="spec-label">Tipo:</span>
                        <span class="spec-value">${carro.Tipo}</span>
                    </div>
                    <div class="car-spec">
                        <span class="spec-label">Potência:</span>
                        <span class="spec-value">${carro['Potência (cv)']} cv</span>
                    </div>
                    <div class="car-spec">
                        <span class="spec-label">Consumo:</span>
                        <span class="spec-value">${carro['Consumo (l/100km)']} l/100km</span>
                    </div>
                    <div class="car-spec">
                        <span class="spec-label">0-100 km/h:</span>
                        <span class="spec-value">${carro['0-100 km/h (s)']}s</span>
                    </div>
                    <div class="car-spec">
                        <span class="spec-label">Bagageira:</span>
                        <span class="spec-value">${carro['Bagageira (l)']}L</span>
                    </div>
                    <div class="car-spec">
                        <span class="spec-label">Combustível:</span>
                        <span class="spec-value">${carro.Combustível}</span>
                    </div>
                    <div class="car-spec">
                        <span class="spec-label">Extras:</span>
                        <span class="spec-value">
                            ${['Airbag', 'AC', 'CC', 'Sensores', 'Teto Solar', 'Navegador']
                                .filter(extra => carro[extra])
                                .join(', ')}
                        </span>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    resultsDiv.innerHTML = html;
}

function showLoading(show) {
    const loadingDiv = document.querySelector('.loading');
    if (loadingDiv) {
        loadingDiv.style.display = show ? 'block' : 'none';
    }
}

function showAlert(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
    
    // Remover alerta após 5 segundos
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

function clearResults() {
    document.getElementById('compararResults').style.display = 'none';
    document.getElementById('encontrarResults').style.display = 'none';
}