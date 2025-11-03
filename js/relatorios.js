// Configurações da API
const API_BASE_URL = 'http://localhost:8001';
let sessionToken = localStorage.getItem('session_token');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

// Gráficos
let salesChart, productsChart, osStatusChart, paymentChart;

// Elementos DOM
const alertContainer = document.getElementById('alertContainer');
const reportPeriod = document.getElementById('reportPeriod');
const startDate = document.getElementById('startDate');
const endDate = document.getElementById('endDate');

// Funções de utilidade
function showAlert(message, type = 'success') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alertContainer.appendChild(alert);

    setTimeout(() => {
        alert.remove();
    }, 5000);
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('pt-BR');
}

function getStatusText(status) {
    const statusMap = {
        'pendente': 'Pendente',
        'andamento': 'Em Andamento', 
        'aguardando_pecas': 'Aguardando Peças',
        'concluida': 'Concluída',
        'entregue': 'Entregue',
        'cancelada': 'Cancelada'
    };
    return statusMap[status] || status;
}

async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Authorization': sessionToken,
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (response.status === 401) {
            localStorage.removeItem('session_token');
            localStorage.removeItem('currentUser');
            window.location.href = '../pages/login.html';
            return;
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Erro na requisição:', error);
        showAlert('Erro de conexão com o servidor', 'error');
        throw error;
    }
}

// Controle de período
reportPeriod.addEventListener('change', function () {
    const isCustom = this.value === 'custom';
    startDate.classList.toggle('hidden', !isCustom);
    endDate.classList.toggle('hidden', !isCustom);

    if (!isCustom) {
        setDefaultDates();
    }
});

function setDefaultDates() {
    const today = new Date();
    const period = reportPeriod.value;

    let start = new Date();
    let end = new Date();

    switch (period) {
        case 'today':
            break;
        case 'yesterday':
            start.setDate(today.getDate() - 1);
            end.setDate(today.getDate() - 1);
            break;
        case 'week':
            start.setDate(today.getDate() - 7);
            break;
        case 'month':
            start.setDate(today.getDate() - 30);
            break;
        case 'quarter':
            start.setDate(today.getDate() - 90);
            break;
        case 'year':
            start.setDate(today.getDate() - 365);
            break;
    }

    startDate.value = start.toISOString().split('T')[0];
    endDate.value = end.toISOString().split('T')[0];
}

// Carregar relatórios
async function loadReports() {
    try {
        showAlert('Carregando relatórios...');

        // Carregar dados do dashboard
        const stats = await apiCall('/api/dashboard/estatisticas');
        updateStatsCards(stats);

        // Carregar dados para gráficos
        const graficos = await apiCall('/api/dashboard/graficos?periodo=month');
        updateCharts(graficos);

        // Carregar vendas recentes
        const sales = await apiCall('/api/vendas?limite=50');
        updateSalesTable(sales.vendas || []);

        // Carregar OS recentes
        const os = await apiCall('/api/os?limite=50');
        updateOSTable(os.ordens || []);

        // Carregar estoque baixo
        const stock = await apiCall('/api/produtos?limite=100');
        updateStockTable(stock.produtos || []);

        showAlert('Relatórios carregados com sucesso!');
    } catch (error) {
        console.error('Erro ao carregar relatórios:', error);
        showAlert('Erro ao carregar relatórios', 'error');
    }
}

function updateCharts(graficos) {
    // Gráfico de vendas
    createSalesChart({
        labels: graficos.vendas_por_dia.map(item => formatDate(item.data)),
        values: graficos.vendas_por_dia.map(item => item.valor || 0)
    });
    
    // Gráfico de produtos mais vendidos
    createProductsChart({
        labels: graficos.produtos_mais_vendidos.map(item => item.produto),
        values: graficos.produtos_mais_vendidos.map(item => item.quantidade || 0)
    });
    
    // Gráfico de status OS
    createOSStatusChart({
        labels: graficos.os_por_status.map(item => getStatusText(item.status)),
        values: graficos.os_por_status.map(item => item.quantidade || 0)
    });
    
    // Gráfico de formas de pagamento
    createPaymentChart({
        labels: graficos.formas_pagamento.map(item => item.forma_pagamento),
        values: graficos.formas_pagamento.map(item => item.quantidade || 0)
    });
}

function updateStatsCards(stats) {
    document.getElementById('totalSales').textContent = formatCurrency(stats.vendasMes);
    document.getElementById('salesCount').textContent = stats.totalVendas || '0';
    document.getElementById('averageTicket').textContent = formatCurrency(stats.ticketMedio);
    document.getElementById('osInProgress').textContent = stats.osAndamento;
    document.getElementById('totalProducts').textContent = stats.totalProdutos;
    document.getElementById('lowStockInfo').textContent = `${stats.estoquesBaixos} com estoque baixo`;
    document.getElementById('activeClients').textContent = stats.totalClientes;
}

function updateSalesTable(sales) {
    const tbody = document.getElementById('salesTableBody');
    tbody.innerHTML = '';

    sales.forEach(sale => {
        const row = document.createElement('tr');
        row.innerHTML = `
                    <td>${sale.numero_venda || 'N/A'}</td>
                    <td>${formatDate(sale.data_venda)}</td>
                    <td>${sale.cliente || 'N/A'}</td>
                    <td>${sale.usuario_nome || 'N/A'}</td>
                    <td>${sale.total_itens || '0'}</td>
                    <td>${formatCurrency(sale.total_venda)}</td>
                    <td>${sale.forma_pagamento || 'N/A'}</td>
                `;
        tbody.appendChild(row);
    });
}

function updateOSTable(ordens) {
    const tbody = document.getElementById('osTableBody');
    tbody.innerHTML = '';

    ordens.forEach(os => {
        const statusClass = `status-${os.status}`;
        const statusText = getStatusText(os.status);

        const row = document.createElement('tr');
        row.innerHTML = `
                    <td>${os.numero_os}</td>
                    <td>${os.cliente_nome}</td>
                    <td>${os.marca} ${os.modelo}</td>
                    <td>${os.defeito_relatado}</td>
                    <td>${formatCurrency(os.orcamento)}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>${formatDate(os.data_entrada)}</td>
                    <td>${os.usuario_nome || 'N/A'}</td>
                `;
        tbody.appendChild(row);
    });
}

function updateStockTable(produtos) {
    const tbody = document.getElementById('stockTableBody');
    tbody.innerHTML = '';

    produtos.forEach(produto => {
        const status = produto.estoque_atual === 0 ? 'CRÍTICO' :
            produto.estoque_atual <= produto.estoque_minimo ? 'BAIXO' : 'NORMAL';
        const statusClass = status === 'CRÍTICO' ? 'status-inactive' :
            status === 'BAIXO' ? 'status-pending' : 'status-active';

        const row = document.createElement('tr');
        row.innerHTML = `
                    <td>${produto.nome}</td>
                    <td>${produto.categoria || 'N/A'}</td>
                    <td>${produto.estoque_atual}</td>
                    <td>${produto.estoque_minimo}</td>
                    <td>${formatCurrency(produto.preco_custo)}</td>
                    <td>${formatCurrency(produto.preco_venda)}</td>
                    <td><span class="status-badge ${statusClass}">${status}</span></td>
                `;
        tbody.appendChild(row);
    });
}

function getStatusText(status) {
    const statusMap = {
        'pendente': 'Pendente',
        'andamento': 'Em Andamento',
        'aguardando_pecas': 'Aguardando Peças',
        'concluida': 'Concluída',
        'entregue': 'Entregue',
        'cancelada': 'Cancelada'
    };
    return statusMap[status] || status;
}

// Gráficos
async function loadChartsData() {
    try {
        // Dados de vendas por dia (mock - substituir por API real)
        const salesData = {
            labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
            values: [1200, 1900, 1500, 2100, 1800, 2500, 2200]
        };

        // Produtos mais vendidos (mock)
        const productsData = {
            labels: ['Produto A', 'Produto B', 'Produto C', 'Produto D', 'Produto E'],
            values: [45, 35, 28, 22, 18]
        };

        // Status OS (mock)
        const osStatusData = {
            labels: ['Em Andamento', 'Concluída', 'Entregue', 'Aguardando Peças', 'Cancelada'],
            values: [15, 25, 18, 8, 2]
        };

        // Formas de pagamento (mock)
        const paymentData = {
            labels: ['Dinheiro', 'Cartão', 'PIX', 'Outros'],
            values: [35, 45, 15, 5]
        };

        createSalesChart(salesData);
        createProductsChart(productsData);
        createOSStatusChart(osStatusData);
        createPaymentChart(paymentData);

    } catch (error) {
        console.error('Erro ao carregar dados dos gráficos:', error);
    }
}

function createSalesChart(data) {
    const ctx = document.getElementById('salesChart').getContext('2d');

    if (salesChart) {
        salesChart.destroy();
    }

    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Vendas (R$)',
                data: data.values,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) {
                            return 'R$ ' + value;
                        }
                    }
                }
            }
        }
    });
}

function createProductsChart(data) {
    const ctx = document.getElementById('productsChart').getContext('2d');

    if (productsChart) {
        productsChart.destroy();
    }

    productsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Quantidade Vendida',
                data: data.values,
                backgroundColor: [
                    '#2ecc71', '#3498db', '#f39c12', '#e74c3c', '#9b59b6'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function createOSStatusChart(data) {
    const ctx = document.getElementById('osStatusChart').getContext('2d');

    if (osStatusChart) {
        osStatusChart.destroy();
    }

    osStatusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.values,
                backgroundColor: [
                    '#3498db', '#2ecc71', '#f39c12', '#e74c3c', '#95a5a6'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

function createPaymentChart(data) {
    const ctx = document.getElementById('paymentChart').getContext('2d');

    if (paymentChart) {
        paymentChart.destroy();
    }

    paymentChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.values,
                backgroundColor: [
                    '#2ecc71', '#3498db', '#f39c12', '#95a5a6'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

// Exportação
function openExportModal() {
    document.getElementById('exportModal').style.display = 'block';
}

function closeExportModal() {
    document.getElementById('exportModal').style.display = 'none';
}

document.getElementById('exportForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const format = document.getElementById('exportFormat').value;
    const type = document.getElementById('exportType').value;
    const period = document.getElementById('exportPeriod').value;

    try {
        showAlert(`Exportando relatório ${type} em formato ${format.toUpperCase()}...`);

        // Simular exportação
        setTimeout(() => {
            showAlert('Relatório exportado com sucesso!');
            closeExportModal();
        }, 2000);

    } catch (error) {
        showAlert('Erro ao exportar relatório', 'error');
    }
});

// Outras funções
async function generateFullReport() {
    const btnText = document.getElementById('generateReportText');
    const btnLoading = document.getElementById('generateReportLoading');

    btnText.classList.add('hidden');
    btnLoading.classList.remove('hidden');

    try {
        // Simular geração de relatório
        await new Promise(resolve => setTimeout(resolve, 3000));
        showAlert('Relatório completo gerado com sucesso!');
    } catch (error) {
        showAlert('Erro ao gerar relatório', 'error');
    } finally {
        btnText.classList.remove('hidden');
        btnLoading.classList.add('hidden');
    }
}

function printReports() {
    window.print();
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    if (!sessionToken){
        window.location.href = '../pages/login.html';
        return;
    }

    setDefaultDates();
    loadReports();

    // Verificar permissões
    if (currentUser.perfil !== 'admin') {
        // Ocultar algumas funcionalidades para não-admins
        document.querySelector('.actions-section').style.display = 'none';
    }
});

// Fechar modal ao clicar fora
window.onclick = function (event) {
    const modal = document.getElementById('exportModal');
    if (event.target === modal) {
        closeExportModal();
    }
}