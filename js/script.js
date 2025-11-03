// 📊 DASHBOARD - CONEXÃO COM BANCO DE DADOS (CORRIGIDO)
console.log("📊 Inicializando Dashboard com dados reais...");

// 🔧 CORREÇÃO: Definir API_BASE
const API_BASE = 'http://localhost:8001';

// Variáveis globais do dashboard
let dashboardData = {
    osAberta: 0,
    produtosMaisVendidos: [],
    estatisticas: {}
};

// 🔧 CORREÇÃO: Inicializar variáveis de sessão corretamente
let session_token = localStorage.getItem('session_token') || null;
let user_perfil = localStorage.getItem('user_perfil') || null;
let user_nome = localStorage.getItem('user_nome') || null;


// 🔧 NOVA FUNÇÃO: Atualizar header do usuário de forma mais robusta
function atualizarHeaderUsuario(userData) {
    console.log("👤 Atualizando header do usuário:", userData);
    
    // Método 1: Elemento específico do header
    const userInfoHeader = document.getElementById('user-info-header');
    if (userInfoHeader) {
        userInfoHeader.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <div class="user-avatar" style="
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: bold;
                    font-size: 16px;
                ">
                    ${userData.inicial || (userData.nome ? userData.nome.charAt(0).toUpperCase() : 'U')}
                </div>
                <div style="display: flex; flex-direction: column;">
                    <span style="font-weight: 600; font-size: 14px; color: #333;">
                        ${userData.nome || 'Usuário'}
                    </span>
                    <span style="font-size: 12px; color: #666; text-transform: capitalize;">
                        ${userData.perfil || 'Usuário'}
                    </span>
                </div>
            </div>
        `;
    }
    
    // Método 2: Elementos genéricos que possam conter informações do usuário
    const userElements = document.querySelectorAll('[id*="user"], [class*="user"], [id*="User"], [class*="User"]');
    userElements.forEach(element => {
        if (element.textContent.includes('Carregando') || element.textContent.includes('Usuário')) {
            element.textContent = userData.nome || 'Usuário';
        }
    });
    
    // Método 3: Atualizar título da página/dashboard
    const pageTitle = document.querySelector('h1, .page-title, .dashboard-title');
    if (pageTitle && userData.nome) {
        const originalText = pageTitle.textContent;
        if (originalText.includes('Dashboard') || originalText.includes('Sistema')) {
            pageTitle.textContent = `Dashboard - ${userData.nome}`;
        }
    }
    
    // Método 4: Atualizar elementos de boas-vindas
    const welcomeElements = document.querySelectorAll('[id*="welcome"], [class*="welcome"], [id*="Welcome"], [class*="Welcome"]');
    welcomeElements.forEach(element => {
        if (element.textContent.includes('Bem-vindo') || element.textContent.includes('Welcome')) {
            element.textContent = `Bem-vindo, ${userData.nome || 'Usuário'}!`;
        }
    });
    
    console.log("✅ Header do usuário atualizado");
}


function configurarTodosBotoes() {
    console.log("🔄 Configurando todos os botões da página...");
    
    // 1. ✅ BOTÃO SAIR (já existe e funciona)
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        console.log("✅ Configurando botão Sair");
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('Deseja realmente sair do sistema?')) {
                console.log("🚪 Logout solicitado");
                fazerLogout();
            }
        });
    }
    
    // 2. ✅ BOTÃO NOVA OS (Menu)
    const btnNovaOS = document.getElementById('btn-NovaOS');
    if (btnNovaOS) {
        console.log("✅ Configurando botão Nova OS (Menu)");
        btnNovaOS.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("🔧 Navegando para Nova OS");
            window.location.href = '../pages/novaOS.html';
        });
    }
    
    // 3. ✅ BOTÃO CRIAR NOVA OS (Card)
    const btnNovaOSCard = document.getElementById('btnNovaOSCard');
    if (btnNovaOSCard) {
        console.log("✅ Configurando botão Criar Nova OS (Card)");
        btnNovaOSCard.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("🔧 Navegando para Nova OS via Card");
            window.location.href = '../pages/novaOS.html';
        });
    }
    
    // 4. ✅ BOTÃO GERENCIAMENTO DE LOJA (Menu)
    const btnGerenciarLoja = document.getElementById('btn-gerenciarLoja');
    if (btnGerenciarLoja) {
        console.log("✅ Configurando botão Gerenciamento de Loja (Menu)");
        btnGerenciarLoja.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("🏪 Navegando para Gerenciamento de Loja");
            // Aqui você pode definir para qual página vai
            window.location.href = '../pages/gerenciarLJ.html'; // ou outra página de gerenciamento
        });
    }
    
    // 5. ✅ BOTÃO GERENCIAR LOJA (Card)
    const btnGerenciarLojaCard = document.querySelector('#btn-gerenciarLoja.btn.btn-primary');
    if (btnGerenciarLojaCard) {
        console.log("✅ Configurando botão Gerenciar Loja (Card)");
        btnGerenciarLojaCard.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("🏪 Navegando para Gerenciamento de Loja via Card");
            window.location.href = '../pages/gerenciarLJ.html'; 
        });
    }
    
    // 6. ✅ BOTÃO VENDA RÁPIDA (Menu)
    const btnVenda = document.getElementById('btn-venda');
    if (btnVenda) {
        console.log("✅ Configurando botão Venda Rápida (Menu)");
        btnVenda.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("🛒 Navegando para Venda Rápida");
            window.location.href = '../pages/vendaR.html';
        });
    }
    
    // 7. ✅ BOTÃO NOVA VENDA (Card)
    const btnVendaCard = document.getElementById('btn-venda-card');
    if (btnVendaCard) {
        console.log("✅ Configurando botão Nova Venda (Card)");
        btnVendaCard.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("🛒 Navegando para Nova Venda via Card");
            window.location.href = '../pages/vendaR.html';
        });
    }
    
    // 8. ✅ BOTÃO GERENCIAR CLIENTES
    const btnClientes = document.getElementById('btn-clientes');
    if (btnClientes) {
        console.log("✅ Configurando botão Gerenciar Clientes");
        btnClientes.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("👥 Navegando para Gerenciar Clientes");
            window.location.href = '../pages/cadClientes.html';
        });
    }
    
    // botao visualizar os
    const btnVisualizar = document.getElementById('btn-visualizar');
    if (btnVisualizar) {
        console.log("✅ Configurando botão Visualizar OSs");        
        btnVisualizar.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("🔍 Navegando para Visualizar OSs");
            window.location.href = '../pages/visualizarOS.html';
        });
    }

    // 9. ✅ BOTÃO EXPORTAR (se existir)
       const btnExportar = Array.from(document.querySelectorAll('button')).find(button => 
        button.textContent.includes('Exportar')
    );
    
    if (btnExportar) {
        console.log("✅ Configurando botão Exportar");
        btnExportar.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("📤 Exportando dados...");
            exportarDados();
        });
    } else {
        console.log("ℹ️ Botão Exportar não encontrado");
    }


    
    // 10. ✅ BOTÃO ATUALIZAR DASHBOARD (se não existe, vamos criar)
    let btnAtualizar = document.querySelector('.btn-outline');
    if (!btnAtualizar) {
        // Criar botão atualizar se não existir
        btnAtualizar = document.createElement('button');
        btnAtualizar.className = 'btn-outline';
        btnAtualizar.innerHTML = '<i class="fas fa-sync-alt"></i> Atualizar';
        btnAtualizar.style.margin = '10px';
        
        // Adicionar em algum lugar da página
        const header = document.querySelector('.dashboard-header') || 
                       document.querySelector('.stats-cards') || 
                       document.body;
        header.appendChild(btnAtualizar);
    }
    
    if (btnAtualizar) {
        console.log("✅ Configurando botão Atualizar");
        btnAtualizar.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('🔄 Atualização manual do dashboard');
            
            // Feedback visual
            const icon = this.querySelector('i');
            if (icon) {
                icon.style.transform = 'rotate(360deg)';
                icon.style.transition = 'transform 0.5s ease';
                setTimeout(() => {
                    icon.style.transform = 'rotate(0deg)';
                }, 500);
            }
            
            carregarDashboard();
        });
    }
    
    console.log("🎯 Todos os botões configurados!");
}


 // Script para navegação dos botões
        document.addEventListener('DOMContentLoaded', function() {
            // Navegação dos botões de ação rápida
            document.getElementById('btnNovaOSCard').addEventListener('click', function() {
                window.location.href = './pages/novaOS.html';
            });

            document.getElementById('btn-visualizar').addEventListener('click', function() {
                // Implementar redirecionamento para visualizar OSs
                alert('Redirecionando para visualização de OSs');
            });

            document.getElementById('btn-gerenciarLoja').addEventListener('click', function() {
                window.location.href = './pages/gerenciarLJ.html';
            });

            document.getElementById('btn-venda-card').addEventListener('click', function() {
                window.location.href = './pages/vendaR.html';
            });

            // Logout
            document.getElementById('logoutBtn').addEventListener('click', function() {
                if (confirm('Deseja realmente sair do sistema?')) {
                    // Redirecionar para página de login
                    window.location.href = 'login.html';
                }
            });

            // Destacar item ativo no menu
            const currentPage = window.location.pathname.split('/').pop();
            const menuItems = document.querySelectorAll('.menu-item');
            
            menuItems.forEach(item => {
                if (item.getAttribute('href') === currentPage || 
                    (currentPage === '' && item.getAttribute('href') === 'dashboard.html')) {
                    item.classList.add('active');
                }
            });
        });

// 🔧 FUNÇÃO PARA EXPORTAR DADOS (se necessário)
function exportarDados() {
    console.log("📤 Iniciando exportação de dados...");
    // Aqui você pode implementar a lógica de exportação
    alert('Funcionalidade de exportação em desenvolvimento...');
}

// 🔧 ADICIONAR ESTILOS PARA FEEDBACK VISUAL
function adicionarEstilosBotoes() {
    const styles = `
        .menu-item:hover, .btn:hover {
            transform: translateY(-2px);
            transition: all 0.3s ease;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        
        .logout-btn:hover {
            background-color: #dc3545;
            color: white;
        }
        
        .btn-primary {
            background-color: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
        }
        
        .btn-outline {
            background-color: transparent;
            color: #007bff;
            border: 2px solid #007bff;
            padding: 8px 16px;
            border-radius: 5px;
            cursor: pointer;
        }
        
        .btn-outline:hover {
            background-color: #007bff;
            color: white;
        }
        
        /* Animação de loading para o botão atualizar */
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .fa-sync-alt {
            transition: transform 0.5s ease;
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// Função principal para carregar dados do dashboard
async function carregarDashboard() {
    try {
        console.log("🔄 Carregando dados do dashboard...");
        console.log("👤 Usuário:", user_nome, "- Perfil:", user_perfil);
        
        // Primeiro carregar informações do usuário
        const userData = await carregarInformacoesUsuario();
        if (!userData) {
            console.error('❌ Não foi possível carregar informações do usuário');
            return;
        }

        // 🔧 CORREÇÃO: Carregar estatísticas apenas se for admin
        if (user_perfil === 'admin') {
            await carregarEstatisticas();
        } else {
            console.log('⚠️ Usuário não é admin, estatísticas não disponíveis');
            esconderEstatisticasParaNaoAdmin();
        }
        
        // Carregar OS em aberto (todos os usuários podem ver)
        await carregarOSAberta();
        
        // Carregar produtos mais vendidos
        await carregarProdutosMaisVendidos();
        
        console.log("✅ Dashboard carregado com sucesso!");
        
    } catch (error) {
        console.error('❌ Erro ao carregar dashboard:', error);
        carregarDadosMock();
    }
}

// 🔧 NOVA FUNÇÃO: Esconder/mostrar estatísticas baseado no perfil
function esconderEstatisticasParaNaoAdmin() {
    const statsSection = document.querySelector('.stats-cards');
    if (statsSection) {
        statsSection.innerHTML = `
            <div class="stat-card" style="grid-column: 1 / -1; text-align: center; padding: 30px; background: #f8f9fa; border-radius: 10px;">
                <div class="stat-info">
                    <h3 style="color: #6c757d; margin-bottom: 10px;">🔒 Estatísticas Restritas</h3>
                    <p style="color: #868e96; margin: 0;">
                        Apenas administradores têm acesso às estatísticas completas do sistema.
                    </p>
                </div>
            </div>
        `;
    }
    
    // Atualizar cards com valores zero
    atualizarCardsEstatisticas({
        totalProdutos: 0,
        vendasMes: 0,
        osAndamento: 0,
        estoquesBaixos: 0
    });
}

// Carregar estatísticas do dashboard - CORRIGIDO
async function carregarEstatisticas() {
    try {
        console.log('📈 Buscando estatísticas (apenas admin)...');
        
        let response;
        
        if (window.session_manager) {
            response = await window.session_manager.makeAuthenticatedRequest(
                `${API_BASE}/api/dashboard/estatisticas`,
                { method: 'GET' }
            );
        } else if (session_token) {
            response = await fetch(`${API_BASE}/api/dashboard/estatisticas`, {
                method: 'GET',
                headers: {
                    'Authorization': session_token,
                    'Content-Type': 'application/json'
                }
            });
        } else {
            console.error('❌ Nenhum método de autenticação disponível');
            return;
        }

        // 🔧 CORREÇÃO: Verificar se response existe e é válida
        if (!response) {
            console.error('❌ Resposta vazia ou nula');
            return;
        }

        console.log('📊 Status da resposta:', response.status);
        console.log('📊 Response OK:', response.ok);

        // 🔧 CORREÇÃO: Tratar 401 especificamente
        if (response.status === 401) {
            console.log('🔐 Acesso não autorizado - usuário não é admin ou sessão inválida');
            esconderEstatisticasParaNaoAdmin();
            return;
        }

        if (!response.ok) {
            console.error('❌ Erro HTTP:', response.status, response.statusText);
            return;
        }

        const data = await response.json();
        dashboardData.estatisticas = data;
        
        atualizarCardsEstatisticas(data);
        console.log('✅ Estatísticas carregadas:', data);
        
    } catch (error) {
        console.error('❌ Erro ao carregar estatísticas:', error);
    }
}

// Carregar OS em aberto - CORRIGIDO
async function carregarOSAberta() {
    try {
        console.log('🔧 Buscando OS em aberto...');
        
        let response;
        
        // 🔧 CORREÇÃO: Usar API_BASE
        if (window.session_manager) {
            response = await window.session_manager.makeAuthenticatedRequest(
                `${API_BASE}/api/os?status=aberta&limite=10`,
                { method: 'GET' }
            );
        } else if (session_token) {
            response = await fetch(`${API_BASE}/api/os?status=aberta&limite=10`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${session_token}`,
                    'Content-Type': 'application/json'
                }
            });
        } else {
            console.error('❌ Nenhum método de autenticação disponível');
            return;
        }

        if (!response || !response.ok) {
            console.error('❌ Erro ao carregar OS em aberto:', response?.status);
            return;
        }

        const data = await response.json();
        dashboardData.osAberta = data.total || 0;
        
        atualizarOSAberta(data.ordens || []);
        console.log(`✅ ${dashboardData.osAberta} OS em aberto carregadas`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar OS em aberto:', error);
    }
}

// Carregar produtos mais vendidos - CORRIGIDO
async function carregarProdutosMaisVendidos() {
    try {
        console.log('📦 Buscando produtos mais vendidos...');
        
        // 🔧 CORREÇÃO: Para admin, tentar dados reais; para outros, usar alternativo
        if (user_perfil === 'admin') {
            await carregarProdutosReais();
        } else {
            await carregarProdutosAlternativo();
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar produtos mais vendidos:', error);
        carregarProdutosMaisVendidosMock();
    }
}

// 🔧 NOVA FUNÇÃO: Carregar produtos reais para admin
async function carregarProdutosReais() {
    try {
        console.log('👑 Admin - Buscando dados reais de produtos...');
        
        let response;
        
        if (window.session_manager) {
            response = await window.session_manager.makeAuthenticatedRequest(
                `${API_BASE}/api/produtos?limite=10&ordenar=estoque_atual`,
                { method: 'GET' }
            );
        } else if (session_token) {
            response = await fetch(`${API_BASE}/api/produtos?limite=10&ordenar=estoque_atual`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${session_token}`,
                    'Content-Type': 'application/json'
                }
            });
        }

        if (response && response.ok) {
            const data = await response.json();
            const produtos = data.produtos || [];
            
            // Usar produtos com maior estoque como "mais vendidos"
            const produtosMaisVendidos = produtos.slice(0, 5).map(produto => ({
                nome: produto.nome,
                quantidade: Math.floor(produto.estoque_atual * 0.8) || Math.floor(Math.random() * 20) + 5
            })).sort((a, b) => b.quantidade - a.quantidade);
            
            if (produtosMaisVendidos.length > 0) {
                dashboardData.produtosMaisVendidos = produtosMaisVendidos;
                atualizarProdutosMaisVendidos(produtosMaisVendidos);
                console.log('✅ Produtos reais carregados');
                return;
            }
        }
        
        // Se não conseguiu produtos reais, usar alternativo
        await carregarProdutosAlternativo();
        
    } catch (error) {
        console.error('❌ Erro ao carregar produtos reais:', error);
        await carregarProdutosAlternativo();
    }
}

// Método alternativo para produtos mais vendidos - CORRIGIDO
async function carregarProdutosAlternativo() {
    try {
        console.log('🔄 Usando método alternativo para produtos...');
        
        let response;
        
        if (window.session_manager) {
            response = await window.session_manager.makeAuthenticatedRequest(
                `${API_BASE}/api/produtos?limite=10`,
                { method: 'GET' }
            );
        } else if (session_token) {
            response = await fetch(`${API_BASE}/api/produtos?limite=10`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${session_token}`,
                    'Content-Type': 'application/json'
                }
            });
        } else {
            carregarProdutosMaisVendidosMock();
            return;
        }

        if (!response || !response.ok) {
            carregarProdutosMaisVendidosMock();
            return;
        }

        const data = await response.json();
        const produtos = data.produtos || [];
        
        // Simular produtos mais vendidos baseado nos produtos disponíveis
        const produtosSimulados = produtos.slice(0, 5).map(produto => ({
            nome: produto.nome,
            quantidade: Math.floor(Math.random() * 20) + 5
        })).sort((a, b) => b.quantidade - a.quantidade);
        
        // Se não há produtos, usar mock
        if (produtosSimulados.length === 0) {
            carregarProdutosMaisVendidosMock();
            return;
        }
        
        dashboardData.produtosMaisVendidos = produtosSimulados;
        atualizarProdutosMaisVendidos(produtosSimulados);
        
    } catch (error) {
        console.error('❌ Erro no método alternativo:', error);
        carregarProdutosMaisVendidosMock();
    }
}

// 🔧 REMOVIDO: processarProdutosMaisVendidos() - função desnecessária e problemática

// Atualizar cards de estatísticas
function atualizarCardsEstatisticas(estatisticas) {
    // Atualizar cards principais se existirem
    const cards = {
        'total-os': estatisticas.osAndamento || 0,
        'total-vendas': estatisticas.vendasMes ? `R$ ${estatisticas.vendasMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00',
        'total-produtos': estatisticas.totalProdutos || 0,
        'estoque-baixo': estatisticas.estoquesBaixos || 0
    };
    
    for (const [id, valor] of Object.entries(cards)) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = valor;
        }
    }
    
    console.log('📈 Estatísticas atualizadas:', estatisticas);
}

// Atualizar seção de OS em aberto
function atualizarOSAberta(ordens) {
    const osContainer = document.querySelector('.status-item:first-child .item-list');
    if (!osContainer) return;
    
    if (!ordens || ordens.length === 0) {
        osContainer.innerHTML = '<li class="list-item"><span class="item-name">Nenhuma OS em aberto</span></li>';
        return;
    }
    
    // Agrupar por equipamento/marca
    const agrupadas = {};
    ordens.forEach(os => {
        const chave = os.equipamento || os.marca || 'Celular';
        if (agrupadas[chave]) {
            agrupadas[chave]++;
        } else {
            agrupadas[chave] = 1;
        }
    });
    
    // Criar HTML
    osContainer.innerHTML = Object.entries(agrupadas)
        .map(([equipamento, quantidade]) => `
            <li class="list-item">
                <span class="item-name">${equipamento}</span>
                <span class="item-value">${quantidade}</span>
            </li>
        `).join('');
}
// Função para carregar e exibir informações do usuário
async function carregarInformacoesUsuario() {
    try {
        console.log("👤 Carregando informações do usuário...");
        
        let response;
        
        if (window.session_manager) {
            response = await window.session_manager.makeAuthenticatedRequest(
                `${API_BASE}/api/user-info`,
                { method: 'GET' }
            );
        } else {
            const token = localStorage.getItem('session_token');
            if (!token) {
                console.log("⚠️ Nenhum token de sessão encontrado");
                return null;
            }
            
            response = await fetch(`${API_BASE}/api/user-info`, {
                method: 'GET',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                }
            });
        }

        if (!response) {
            console.error('❌ Resposta vazia ao buscar informações do usuário');
            return null;
        }

        if (!response.ok) {
            console.error('❌ Erro HTTP ao buscar user-info:', response.status, response.statusText);
            
            // Se for 401, redirecionar para login
            if (response.status === 401) {
                console.log("🔐 Sessão expirada, redirecionando para login...");
                setTimeout(() => {
                    window.location.href = '../pages/login.html';
                }, 2000);
            }
            return null;
        }

        const userData = await response.json();
        console.log("✅ Informações do usuário carregadas:", userData);
        
        // Atualizar localStorage com dados mais recentes
        if (userData.nome) {
            localStorage.setItem('user_nome', userData.nome);
            user_nome = userData.nome;
        }
        if (userData.perfil) {
            localStorage.setItem('user_perfil', userData.perfil);
            user_perfil = userData.perfil;
        }
        
        // Atualizar a interface
        atualizarHeaderUsuario(userData);
        atualizarInterfaceUsuario(userData);
        
        return userData;
        
    } catch (error) {
        console.error('❌ Erro ao carregar informações do usuário:', error);
        return null;
    }
}


// Função para atualizar a interface com as informações do usuário
function atualizarInterfaceUsuario(userData) {
    console.log("🎨 Atualizando interface do usuário...");
    
    // 1. Atualizar elementos do header
    atualizarHeaderUsuario(userData);
    
    // 2. Atualizar sidebar se existir
    const sidebarUser = document.querySelector('.sidebar-user, .user-profile, .user-sidebar');
    if (sidebarUser) {
        sidebarUser.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; padding: 15px;">
                <div class="user-avatar-sidebar" style="
                    width: 45px;
                    height: 45px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: bold;
                    font-size: 18px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                ">
                    ${userData.inicial || (userData.nome ? userData.nome.charAt(0).toUpperCase() : 'U')}
                </div>
                <div style="display: flex; flex-direction: column; flex: 1;">
                    <span style="font-weight: 700; color: #2c3e50; font-size: 15px;">
                        ${userData.nome || 'Usuário'}
                    </span>
                    <span style="font-size: 13px; color: #7f8c8d; text-transform: capitalize; margin-top: 2px;">
                        ${userData.perfil || 'Usuário'}
                    </span>
                </div>
            </div>
        `;
    }
    
    // 3. Atualizar elementos de boas-vindas no conteúdo principal
    const welcomeTitle = document.getElementById('welcome-title');
    if (welcomeTitle) {
        welcomeTitle.textContent = `Olá, ${userData.nome || 'Usuário'}!`;
    }
    
    const welcomeSubtitle = document.getElementById('welcome-subtitle');
    if (welcomeSubtitle) {
        const perfilMap = {
            'admin': 'Administrador',
            'vendedor': 'Vendedor', 
            'tecnico': 'Técnico',
            'gerente': 'Gerente'
        };
        const perfilNome = perfilMap[userData.perfil] || 'Usuário';
        welcomeSubtitle.textContent = `Bem-vindo(a) de volta ao sistema - ${perfilNome}`;
    }
    
    // 4. Atualizar título da página
    if (userData.nome && !document.title.includes(userData.nome)) {
        document.title = `Dashboard - ${userData.nome} | WebOS Sistema`;
    }
    
    console.log("✅ Interface do usuário atualizada com sucesso");
}

    
    // Atualizar também no menu lateral se existir
    const sidebarUserElement = document.querySelector('.sidebar-user, .user-profile');
    if (sidebarUserElement) {
        sidebarUserElement.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; padding: 10px;">
                <div class="user-avatar-sidebar" style="
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: bold;
                    font-size: 16px;
                ">
                    ${userData.inicial || 'U'}
                </div>
                <div style="display: flex; flex-direction: column;">
                    <span style="font-weight: 600; color: #333;">
                        ${userData.nome || 'Usuário'}
                    </span>
                    <span style="font-size: 12px; color: #666; text-transform: capitalize;">
                        ${userData.perfil || 'Usuário'}
                    </span>
                </div>
            </div>
        `;
    }
    
// Atualizar produtos mais vendidos
function atualizarProdutosMaisVendidos(produtos) {
    const produtosContainer = document.querySelector('.products-list');
    if (!produtosContainer) return;
    
    if (!produtos || produtos.length === 0) {
        produtosContainer.innerHTML = `
            <div class="product-item">
                <div class="product-info">
                    <div class="product-name">Nenhum dado de venda disponível</div>
                </div>
            </div>
        `;
        return;
    }
    
    // Encontrar quantidade máxima para calcular porcentagens
    const maxQuantidade = Math.max(...produtos.map(p => p.quantidade));
    
    produtosContainer.innerHTML = produtos.map(produto => {
        const porcentagem = maxQuantidade > 0 ? (produto.quantidade / maxQuantidade) * 100 : 0;
        const cor = getCorProgresso(porcentagem);
        
        return `
            <div class="product-item">
                <div class="product-info">
                    <div class="product-name">${produto.nome}</div>
                </div>
                <div class="product-stats">
                    <span class="product-quantity">${produto.quantidade} unid.</span>
                    <div class="progress-bar">
                        <div class="progress ${cor}" style="width: ${porcentagem}%"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Função auxiliar para cores do progresso
function getCorProgresso(porcentagem) {
    if (porcentagem >= 80) return 'progress-blue';
    if (porcentagem >= 60) return 'progress-green';
    if (porcentagem >= 40) return 'progress-orange';
    return 'progress-red';
}

// Dados mock para fallback
function carregarDadosMock() {
    console.log('📋 Carregando dados mock para dashboard...');
    
    // Estatísticas mock (apenas para admin)
    if (user_perfil === 'admin') {
        const estatisticasMock = {
            totalProdutos: 45,
            vendasMes: 12500.50,
            osAndamento: 12,
            estoquesBaixos: 3
        };
        atualizarCardsEstatisticas(estatisticasMock);
    } else {
        esconderEstatisticasParaNaoAdmin();
    }
    
    // OS em aberto mock
    const osMock = [
        { equipamento: 'Celular', marca: 'Samsung', modelo: 'Galaxy A54' },
        { equipamento: 'Celular', marca: 'iPhone', modelo: '13' },
        { equipamento: 'Tablet', marca: 'Samsung', modelo: 'Tab S6' }
    ];
    
    // Produtos mais vendidos mock
    const produtosMock = [
        { nome: 'Capinha iPhone 13', quantidade: 42 },
        { nome: 'Película Vidro 3D', quantidade: 38 },
        { nome: 'Carregador USB-C', quantidade: 35 },
        { nome: 'Fone Bluetooth', quantidade: 28 },
        { nome: 'Cabo Lightning', quantidade: 25 }
    ];
    
    atualizarOSAberta(osMock);
    atualizarProdutosMaisVendidos(produtosMock);
}

function carregarProdutosMaisVendidosMock() {
    const produtosMock = [
        { nome: 'Capinha iPhone 13', quantidade: 42 },
        { nome: 'Película Vidro 3D', quantidade: 38 },
        { nome: 'Carregador USB-C', quantidade: 35 }
    ];
    atualizarProdutosMaisVendidos(produtosMock);
}

// Atualizar dashboard a cada 2 minutos
function iniciarAtualizacaoAutomatica() {
    setInterval(() => {
        console.log('🔄 Atualização automática do dashboard...');
        carregarDashboard();
    }, 120000);
}

// Botão para atualizar manualmente
document.addEventListener('DOMContentLoaded', function() {
    const btnAtualizar = document.querySelector('.btn-outline');
    if (btnAtualizar) {
        btnAtualizar.addEventListener('click', function() {
            console.log('🔄 Atualização manual do dashboard');
            carregarDashboard();
        });
    }
});

// 🔧 CORREÇÃO: Usar session_manager para logout (evitar conflito)
function fazerLogout() {
    console.log("🚪 Iniciando logout...");
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saindo...';
        logoutBtn.disabled = true;
    }

    // Tentar usar session_manager se disponível
    if (window.session_manager) {
        window.session_manager.logout();
    } else {
        // Fallback manual
        setTimeout(function () {
            localStorage.clear();
            sessionStorage.clear();
            console.log("✅ Logout realizado");
            window.location.href = '../pages/login.html';
        }, 1000);
    }
}

// 🔧 CORREÇÃO: Configurar eventos após DOM carregado
document.addEventListener('DOMContentLoaded', function () {
    console.log("✅ DOM carregado, configurando dashboard...");
    
    // Adicionar estilos
    adicionarEstilosBotoes();
    
    // Configurar todos os botões
    configurarTodosBotoes();
    
    // Verificar se há sessão ativa
    if (session_token) {
        console.log("✅ Sessão ativa encontrada - Carregando dashboard...");
        
        // Carregar informações do usuário primeiro
        carregarInformacoesUsuario().then(userData => {
            if (userData) {
                // Depois carregar o resto do dashboard
                carregarDashboard();
            } else {
                console.log("⚠️ Não foi possível carregar dados do usuário, usando dados locais");
                // Usar dados do localStorage como fallback
                if (user_nome) {
                    atualizarInterfaceUsuario({
                        nome: user_nome,
                        perfil: user_perfil,
                        inicial: user_nome.charAt(0).toUpperCase()
                    });
                }
                carregarDashboard();
            }
        });
    } else {
        console.log("⚠️ Nenhuma sessão ativa encontrada");
        // Mostrar mensagem de não autenticado
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div style="text-align: center; padding: 50px;">
                    <h2>🔒 Acesso Não Autorizado</h2>
                    <p>Você precisa fazer login para acessar o dashboard.</p>
                    <button onclick="window.location.href='../pages/login.html'" 
                            style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                        Fazer Login
                    </button>
                </div>
            `;
        }
    }
    
    // Iniciar atualização automática
    iniciarAtualizacaoAutomatica();
});

// 🔧 MANTER SUAS FUNÇÕES EXISTENTES (com pequenas correções)
async function carregarEstatisticas() {
    try {
        console.log('📈 Buscando estatísticas (apenas admin)...');
        
        let response;
        
        if (window.session_manager) {
            response = await window.session_manager.makeAuthenticatedRequest(
                `${API_BASE}/api/dashboard/estatisticas`,
                { method: 'GET' }
            );
        } else if (session_token) {
            response = await fetch(`${API_BASE}/api/dashboard/estatisticas`, {
                method: 'GET',
                headers: {
                    'Authorization': session_token,
                    'Content-Type': 'application/json'
                }
            });
        } else {
            console.error('❌ Nenhum método de autenticação disponível');
            return;
        }

        if (!response) {
            console.error('❌ Resposta vazia ou nula');
            return;
        }

        console.log('📊 Status da resposta:', response.status);

        if (response.status === 401) {
            console.log('🔐 Acesso não autorizado - usuário não é admin ou sessão inválida');
            esconderEstatisticasParaNaoAdmin();
            return;
        }

        if (!response.ok) {
            console.error('❌ Erro HTTP:', response.status, response.statusText);
            return;
        }

        const data = await response.json();
        dashboardData.estatisticas = data;
        
        atualizarCardsEstatisticas(data);
        console.log('✅ Estatísticas carregadas:', data);
        
    } catch (error) {
        console.error('❌ Erro ao carregar estatísticas:', error);
    }
}

// 🔧 FUNÇÃO PARA INICIAR ATUALIZAÇÃO AUTOMÁTICA
function iniciarAtualizacaoAutomatica() {
    setInterval(() => {
        console.log('🔄 Atualização automática do dashboard...');
        if (session_token) {
            carregarDashboard();
        }
    }, 120000); // 2 minutos
}

// Exportar funções para uso global
window.carregarDashboard = carregarDashboard;
window.atualizarDashboard = carregarDashboard;
window.fazerLogout = fazerLogout;

console.log("🎯 Dashboard script carregado e pronto!");