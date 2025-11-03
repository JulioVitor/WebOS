// Gerenciamento de Loja - JavaScript

// CONFIGURAÇÃO DE API (usando a mesma base do auth.js)
const API_BASE = 'http://localhost:8001';
const API_BASE_URL = `${API_BASE}/api`;

// =============================================
// FUNÇÕES DE AUTENTICAÇÃO (compatível com session-manager.js)
// =============================================

function getSessionToken() {
    return localStorage.getItem('session_token');
}

function getAuthHeaders() {
    const token = getSessionToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': token || ''
    };
}

// Função para fazer requisições autenticadas
async function fetchAutenticado(url, options = {}) {
    const token = getSessionToken();
    
    if (!token) {
        console.error('❌ Usuário não autenticado');
        window.location.href = '../login/login.html';
        throw new Error('Usuário não autenticado');
    }
    
    const config = {
        ...options,
        headers: {
            ...getAuthHeaders(),
            ...options.headers
        }
    };
    
    console.log(`🌐 Fazendo requisição autenticada para: ${url}`);
    
    const response = await fetch(url, config);
    
    if (response.status === 401) {
        console.log('🔐 Sessão expirada ou inválida');
        window.session_manager.logout();
        throw new Error('Sessão expirada');
    }
    
    return response;
}

// =============================================
// FUNÇÕES PRINCIPAIS
// =============================================

async function carregarDadosLoja() {
    try {
        console.log('📊 Carregando dados da loja...');
        
        const response = await fetchAutenticado(`${API_BASE_URL}/dashboard/estatisticas`);
        
        if (!response.ok) {
            throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }
        
        const dados = await response.json();
        
        document.getElementById('total-produtos').textContent = dados.totalProdutos || '0';
        document.getElementById('vendas-mes').textContent = `R$ ${(dados.vendasMes || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        document.getElementById('os-andamento').textContent = dados.osAndamento || '0';
        document.getElementById('estoques-baixos').textContent = dados.estoquesBaixos || '0';
        
        console.log('✅ Dados reais carregados:', dados);
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados reais, usando dados simulados:', error);
        // Dados simulados em caso de erro
        document.getElementById('total-produtos').textContent = '156';
        document.getElementById('vendas-mes').textContent = 'R$ 8.745,00';
        document.getElementById('os-andamento').textContent = '23';
        document.getElementById('estoques-baixos').textContent = '7';
    }
}

async function carregarProdutos() {
    try {
        console.log('📦 Carregando produtos da API...');
        
        const response = await fetchAutenticado(`${API_BASE_URL}/produtos`);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP! status: ${response.status}`);
        }
        
        const data = await response.json();
        const produtos = data.produtos;
        const tbody = document.getElementById('tabela-produtos');
        tbody.innerHTML = '';
        
        if (produtos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="no-data">Nenhum produto cadastrado</td>
                </tr>
            `;
            console.log('ℹ️ Nenhum produto encontrado no banco');
            return;
        }
        
        produtos.forEach(produto => {
            const tr = document.createElement('tr');
            
            // Determinar status baseado no estoque_atual
            let statusClass, statusText;
            if (produto.estoque_atual === 0) {
                statusClass = 'stock-out';
                statusText = 'Esgotado';
            } else if (produto.estoque_atual <= produto.estoque_minimo) {
                statusClass = 'stock-low';
                statusText = 'Baixo';
            } else if (produto.estoque_atual <= produto.estoque_minimo * 2) {
                statusClass = 'stock-medium';
                statusText = 'Médio';
            } else {
                statusClass = 'stock-high';
                statusText = 'Alto';
            }
            
            tr.innerHTML = `
                <td>${produto.codigo_barras || 'N/A'}</td>
                <td>${produto.nome}</td>
                <td>${produto.categoria || 'Sem categoria'}</td>
                <td>${produto.estoque_atual}</td>
                <td>R$ ${parseFloat(produto.preco_venda).toFixed(2)}</td>
                <td class="${statusClass}">${statusText}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn-action btn-edit" onclick="editarProduto(${produto.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="excluirProduto(${produto.id})" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(tr);
        });
        
        console.log(`✅ ${produtos.length} produtos carregados da API`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar produtos da API, usando dados simulados:', error);
        carregarProdutosSimulados();
    }
}

function carregarProdutosSimulados() {
    // Dados simulados em caso de erro
    const produtos = [
        { 
            id: 1, 
            codigo_barras: 'CAP001', 
            nome: 'Capinha iPhone 15 - Transparente', 
            categoria: 'Capinhas', 
            estoque_atual: 42, 
            estoque_minimo: 5,
            preco_venda: 49.90
        },
        { 
            id: 2, 
            codigo_barras: 'PEL008', 
            nome: 'Película Samsung S23 - Cristal', 
            categoria: 'Películas', 
            estoque_atual: 15, 
            estoque_minimo: 10,
            preco_venda: 29.90
        },
        { 
            id: 3, 
            codigo_barras: 'FON012', 
            nome: 'Fone Bluetooth TWS - Preto', 
            categoria: 'Fones', 
            estoque_atual: 3, 
            estoque_minimo: 5,
            preco_venda: 89.90
        },
        { 
            id: 4, 
            codigo_barras: 'CAR005', 
            nome: 'Carregador Rápido 25W - USB-C', 
            categoria: 'Carregadores', 
            estoque_atual: 0, 
            estoque_minimo: 5,
            preco_venda: 59.90
        }
    ];
    
    const tbody = document.getElementById('tabela-produtos');
    tbody.innerHTML = '';
    
    produtos.forEach(produto => {
        const tr = document.createElement('tr');
        
        let statusClass, statusText;
        if (produto.estoque_atual === 0) {
            statusClass = 'stock-out';
            statusText = 'Esgotado';
        } else if (produto.estoque_atual <= produto.estoque_minimo) {
            statusClass = 'stock-low';
            statusText = 'Baixo';
        } else if (produto.estoque_atual <= produto.estoque_minimo * 2) {
            statusClass = 'stock-medium';
            statusText = 'Médio';
        } else {
            statusClass = 'stock-high';
            statusText = 'Alto';
        }
        
        tr.innerHTML = `
            <td>${produto.codigo_barras}</td>
            <td>${produto.nome}</td>
            <td>${produto.categoria}</td>
            <td>${produto.estoque_atual}</td>
            <td>R$ ${produto.preco_venda.toFixed(2)}</td>
            <td class="${statusClass}">${statusText}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-action btn-edit" onclick="editarProduto(${produto.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="excluirProduto(${produto.id})" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    console.log('✅ Dados simulados carregados');
}

async function salvarProduto() {
    const form = document.getElementById('form-produto');
    
    if (!form.checkValidity()) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }
    
    try {
        const produtoData = {
            codigo_barras: document.getElementById('produto-codigo').value,
            nome: document.getElementById('produto-nome').value,
            categoria: document.getElementById('produto-categoria').value,
            estoque_atual: parseFloat(document.getElementById('produto-estoque').value),
            estoque_minimo: parseFloat(document.getElementById('produto-estoque-min').value),
            preco_custo: parseFloat(document.getElementById('produto-preco-custo').value),
            preco_venda: parseFloat(document.getElementById('produto-preco-venda').value),
            descricao: document.getElementById('produto-descricao').value,
            marca: '',
            ativo: true
        };
        
        console.log('💾 Tentando salvar produto:', produtoData);
        
        const response = await fetchAutenticado(`${API_BASE_URL}/produtos`, {
            method: 'POST',
            body: JSON.stringify(produtoData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Erro ao salvar produto');
        }
        
        const resultado = await response.json();
        
        alert('✅ Produto salvo com sucesso!');
        document.getElementById('modal-produto').style.display = 'none';
        form.reset();
        
        // Recarregar lista
        carregarProdutos();
        carregarDadosLoja();
        
    } catch (error) {
        console.error('❌ Erro ao salvar produto:', error);
        alert('❌ Erro ao salvar produto: ' + error.message);
    }
}

// =============================================
// EVENT LISTENERS E INICIALIZAÇÃO
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Gerenciamento de Loja inicializado');

    // Verificar se sessionManager está disponível
    if (!window.session_manager) {
        console.error('❌ session_manager não encontrado');
        return;
    }

    // Elementos do DOM
    const modal = document.getElementById('modal-produto');
    const btnNovoProduto = document.getElementById('btn-novo-produto');
    const btnSalvarProduto = document.getElementById('btn-salvar-produto');
    const btnCancelar = document.getElementById('btn-cancelar');
    const closeBtn = document.querySelector('.close');

    function abrirusuarios() {
        console.log("🛒 Abrindo Gerenciamento de usuarios...");
        window.location.href = 'cadUser.html'; 
    }

    function abrirestoque() {
        console.log("🛒 Abrindo Gerenciamento de estoque...");
        window.location.href = '../pages/estoque.html'; 
    }

    function abrirfechamento_caixa() {
        console.log("🛒 Abrindo Fechamento de Caixa...");
        window.location.href = 'fechamento_caixa.html'; 
    }

    function abrirRelatorios() {
        console.log("🛒 Abrindo Relatórios...");
        window.location.href = 'relatorios.html'; 
    }

    function abrirConfiguracoes() {
        console.log("🛒 Abrindo Configurações...");
        window.location.href = 'configuracoes.html'; 
    }



    const btngerenciar_estoque= document.getElementById('btngerenciar_estoque');
    if (btngerenciar_estoque) {
        btngerenciar_estoque.addEventListener('click', abrirestoque);
        console.log("✅ Botão Gerenciar Estoque configurado");
    } else {
        console.log("❌ Botão Gerenciar Estoque não encontrado");
    }
    
    const btngerenciar_usuarios = document.getElementById('btngerenciar_usuarios');
    if (btngerenciar_usuarios) {
        btngerenciar_usuarios.addEventListener('click', abrirusuarios);
        console.log("✅ Botão Gerenciar Usuarios configurado");
    } else {
        console.log("❌ Botão Gerenciar Usuarios não encontrado");
    }

    const btn_fe= document.getElementById('btn_fe');
    if (btn_fe) {
        btn_fe.addEventListener('click',abrirRelatorios);
        console.log("✅ Botão Relatorios Configurados");
    } else {
        console.log("❌ Botão Relatorios não encontrado");
    }


     const btn_configuracoes = document.getElementById('btn_configuracoes');
    if (btn_configuracoes) {
        btn_configuracoes.addEventListener('click', abrirConfiguracoes);
        console.log("✅ Botão Abrir Configurações configurado");
    } else {
        console.log("❌ Botão Abri Configurações não encontrado");
    }

    const btn_fechamento = document.getElementById('btn_fechamento');
    if (btn_fechamento) {
        btn_fechamento.addEventListener('click', abrirfechamento_caixa);
        console.log("✅ Botão Abrir Fechamento de Caixa configurado");
    } else {
        console.log("❌ Botão Abrir Fechamento de Caixa não encontrado");
    }

    // Configurar botão de logout
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.session_manager.logout();
        });
    }

    // Abrir modal
    btnNovoProduto.addEventListener('click', () => {
        modal.style.display = 'block';
    });
    
    // Fechar modal
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    btnCancelar.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    // Fechar modal clicando fora
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Salvar produto
    btnSalvarProduto.addEventListener('click', salvarProduto);
    
    // Carregar dados iniciais
    carregarDadosLoja();
    carregarProdutos();
});

// =============================================
// FUNÇÕES GLOBAIS PARA EDIÇÃO/EXCLUSÃO
// =============================================

async function editarProduto(id) {
    try {
        console.log(`✏️ Editando produto ID: ${id}`);
        
        // Buscar dados do produto
        const response = await fetchAutenticado(`${API_BASE_URL}/produtos/${id}`);
        
        if (!response.ok) {
            throw new Error('Erro ao carregar dados do produto');
        }
        
        const produto = await response.json();
        
        // Preencher formulário com dados do produto
        document.getElementById('produto-codigo').value = produto.codigo_barras || '';
        document.getElementById('produto-nome').value = produto.nome;
        document.getElementById('produto-categoria').value = produto.categoria || '';
        document.getElementById('produto-estoque').value = produto.estoque_atual;
        document.getElementById('produto-estoque-min').value = produto.estoque_minimo;
        document.getElementById('produto-preco-custo').value = produto.preco_custo;
        document.getElementById('produto-preco-venda').value = produto.preco_venda;
        document.getElementById('produto-descricao').value = produto.descricao || '';
        
        // Alterar botão para atualizar
        const btnSalvar = document.getElementById('btn-salvar-produto');
        btnSalvar.textContent = 'Atualizar Produto';
        btnSalvar.onclick = () => atualizarProduto(id);
        
        // Abrir modal
        document.getElementById('modal-produto').style.display = 'block';
        
    } catch (error) {
        console.error('❌ Erro ao editar produto:', error);
        alert('❌ Erro ao carregar dados do produto.');
    }
}

async function atualizarProduto(id) {
    try {
        const produtoData = {
            codigo_barras: document.getElementById('produto-codigo').value,
            nome: document.getElementById('produto-nome').value,
            categoria: document.getElementById('produto-categoria').value,
            estoque_atual: parseFloat(document.getElementById('produto-estoque').value),
            estoque_minimo: parseFloat(document.getElementById('produto-estoque-min').value),
            preco_custo: parseFloat(document.getElementById('produto-preco-custo').value),
            preco_venda: parseFloat(document.getElementById('produto-preco-venda').value),
            descricao: document.getElementById('produto-descricao').value,
            marca: '',
            ativo: true
        };
        
        console.log(`🔄 Atualizando produto ID: ${id}`, produtoData);
        
        const response = await fetchAutenticado(`${API_BASE_URL}/produtos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(produtoData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Erro ao atualizar produto');
        }
        
        alert('✅ Produto atualizado com sucesso!');
        document.getElementById('modal-produto').style.display = 'none';
        document.getElementById('form-produto').reset();
        
        // Restaurar botão salvar
        const btnSalvar = document.getElementById('btn-salvar-produto');
        btnSalvar.textContent = 'Salvar Produto';
        btnSalvar.onclick = salvarProduto;
        
        // Recarregar lista
        carregarProdutos();
        carregarDadosLoja();
        
    } catch (error) {
        console.error('❌ Erro ao atualizar produto:', error);
        alert('❌ Erro ao atualizar produto: ' + error.message);
    }
}

async function excluirProduto(id) {
    if (!confirm('⚠️ Tem certeza que deseja excluir este produto?')) {
        return;
    }
    
    try {
        console.log(`🗑️ Excluindo produto ID: ${id}`);
        
        const response = await fetchAutenticado(`${API_BASE_URL}/produtos/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Erro ao excluir produto');
        }
        
        alert('✅ Produto excluído com sucesso!');
        carregarProdutos();
        carregarDadosLoja();
        
    } catch (error) {
        console.error('❌ Erro ao excluir produto:', error);
        alert('❌ Erro ao excluir produto: ' + error.message);
    }
}

// =============================================
// CSS DINÂMICO
// =============================================

const style = document.createElement('style');
style.textContent = `
    .stock-high { color: #27ae60; font-weight: bold; }
    .stock-medium { color: #f39c12; font-weight: bold; }
    .stock-low { color: #e74c3c; font-weight: bold; }
    .stock-out { color: #95a5a6; font-weight: bold; }
    
    .table-actions {
        display: flex;
        gap: 5px;
    }
    
    .btn-action {
        background: none;
        border: none;
        cursor: pointer;
        padding: 5px;
        border-radius: 4px;
        transition: background 0.3s;
    }
    
    .btn-edit { color: #3498db; }
    .btn-edit:hover { background: #ebf5fb; }
    
    .btn-delete { color: #e74c3c; }
    .btn-delete:hover { background: #fdedec; }
`;
document.head.appendChild(style);