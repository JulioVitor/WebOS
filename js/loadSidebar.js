// components/loadSidebar.js
function loadSidebar() {
    fetch('./pages/sidebar.html')  // ← Mudei o caminho aqui
        .then(response => {
            if (!response.ok) {
                throw new Error('Sidebar não encontrada');
            }
            return response.text();
        })
        .then(data => {
            document.getElementById('sidebar-container').innerHTML = data;
            highlightActiveMenu();
            setupSidebarInteractions();
        })
        .catch(error => {
            console.error('Erro ao carregar sidebar:', error);
            // Fallback básico
            document.getElementById('sidebar-container').innerHTML = `
                <div class="sidebar">
                    <div class="logo">
                        <h1>Web<span>OS</span></h1>
                    </div>
                    <div class="menu-section">
                        <a href="./index.html" class="menu-item">
                            <i>📊</i>
                            <span>Dashboard</span>
                        </a>
                    </div>
                </div>
            `;
        });
}

function highlightActiveMenu() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach(item => {
        const href = item.getAttribute('href');
        
        if (href === currentPage || 
            (currentPage === 'index.html' && href === '../index.html') ||
            (currentPage === '' && href === '../index.html')) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

function setupSidebarInteractions() {
    // Adiciona event listeners para os itens do menu
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove a classe active de todos os itens
            menuItems.forEach(i => i.classList.remove('active'));
            // Adiciona a classe active ao item clicado
            this.classList.add('active');
        });
    });
}

// Carrega a sidebar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', loadSidebar);