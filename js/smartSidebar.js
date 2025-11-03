// js/smartSidebar.js
console.log('🔧 Carregando sidebar inteligente...');

function loadSidebar() {
    const sidebarHTML = `
        <div class="sidebar">
            <div class="logo">
                <h1>Web<span>OS</span></h1>
            </div>
            
            <div class="menu-section">
                <div class="menu-title">PRINCIPAL</div>
                <a href="../index.html" class="menu-item">
                    <i>📊</i>
                    <span>Dashboard</span>
                </a>
                <a href="../pages/novaOS.html" class="menu-item">
                    <i>🛠️</i>
                    <span>Nova OS</span>
                </a>
            </div>

            <div class="menu-section">
                <div class="menu-title">GERENCIAMENTO</div>
                <a href="../pages/gerenciarLJ.html" class="menu-item">
                    <i>🏪</i>
                    <span>Gerenciamento de Loja</span>
                </a>
                <a href="../pages/vendaR.html" class="menu-item">
                    <i>💰</i>
                    <span>Venda Rápida</span>
                </a>
            </div>

            <div class="menu-section">
                <div class="menu-title">CLIENTES</div>
                <a href="../pages/cadClientes.html" class="menu-item">
                    <i>👥</i>
                    <span>Gerenciar Clientes</span>
                </a>
            </div>

            <div class="menu-section">
                <div class="menu-title">GERENCIAMENTO DE LOJA</div>
                <a href="../pages/estoque.html" class="menu-item">
                    <i>📦</i>
                    <span>Gestão de Estoque</span>
                </a>
                <a href="../pages/configuracoes.html" class="menu-item">
                    <i>⚙️</i>
                    <span>Configurações</span>
                </a>
                <a href="../pages/cadUser.html" class="menu-item">
                    <i>👤</i>
                    <span>Usuários e Permissões</span>
                </a>
                <a href="../pages/relatorios.html" class="menu-item">
                    <i>📈</i>
                    <span>Relatórios e Analytics</span>
                </a>
            </div>
        </div>
    `;

    const container = document.getElementById('sidebar-container');
    if (container) {
        container.innerHTML = sidebarHTML;
        console.log('✅ Sidebar carregada com sucesso!');
        
        // Configura os eventos dos botões
        setupSidebarInteractions();
    } else {
        console.error('❌ Container da sidebar não encontrado!');
    }
}

function setupSidebarInteractions() {
    // Configura os botões de ação rápida
    const btnNovaOS = document.getElementById('btnNovaOSCard');
    const btnVisualizar = document.getElementById('btn-visualizar');
    const btnGerenciarLoja = document.getElementById('btn-gerenciarLoja');
    const btnVendaRapida = document.getElementById('btn-venda-card');

    if (btnNovaOS) {
        btnNovaOS.addEventListener('click', () => {
            window.location.href = 'pages/novaOS.html';
        });
    }

    if (btnGerenciarLoja) {
        btnGerenciarLoja.addEventListener('click', () => {
            window.location.href = 'pages/gerenciarLJ.html';
        });
    }

    if (btnVendaRapida) {
        btnVendaRapida.addEventListener('click', () => {
            window.location.href = 'pages/vendaR.html';
        });
    }

    if (btnVisualizar) {
        btnVisualizar.addEventListener('click', () => {
            // Implementar redirecionamento para visualizar OSs
            alert('Funcionalidade de visualizar OSs em desenvolvimento');
        });
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Deseja realmente sair do sistema?')) {
                window.location.href = 'pages/login.html';
            }
        });
    }
}

// Carrega a sidebar quando a página estiver pronta
document.addEventListener('DOMContentLoaded', loadSidebar);