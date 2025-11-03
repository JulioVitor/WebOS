// session-manager.js - CORREÇÃO DA AUTENTICAÇÃO
class session_manager {
    constructor() {
        this.allowSystemNavigation = false;
        this.init();
    }

    init() {
        // Verificar sessão em todas as páginas
        this.checkSession();

        // Configurar proteção contra navegação (mais leve)
        this.setupNavigationProtection();
    }

    checkSession() {
        const sessionToken = localStorage.getItem('session_token');
        const currentPage = window.location.pathname;

        console.log("🔍 Verificando sessão:", {
            token: sessionToken ? "Presente" : "Ausente",
            pagina: currentPage
        });

        const loginPath = '../pages/login.html';
        const dashboardPath = '../index.html';

        // Se não está logado e não está na página de login
        if (!sessionToken && !currentPage.includes('login.html')) {
            console.log("🔐 Redirecionando para login...");
            if (!currentPage.includes('login.html')) {
                window.location.href = '/pages/login.html';
            }
            return;
        }

        // Se está logado e está na página de login
        if (sessionToken && currentPage.includes('login.html')) {
            console.log("✅ Redirecionando para dashboard...");
            window.location.href = dashboardPath;
            return;
        }
    }

    setupNavigationProtection() {
        // Só aplicar se usuário estiver logado
        if (!localStorage.getItem('session_token')) {
            console.log("🔓 Usuário não logado - proteção desativada");
            return;
        }

        console.log("🛡️ Configurando proteção de navegação...");

        try {
            // Substituir estado atual de forma mais segura
            if (window.history && window.history.replaceState) {
                window.history.replaceState({ 
                    page: 'protected',
                    timestamp: Date.now() 
                }, '');
            }

            // Interceptar tentativas de voltar de forma mais leve
            window.onpopstate = (event) => {
                console.log("🔄 Evento popstate detectado:", event.state);

                if (this.allowSystemNavigation) {
                    console.log("✅ Navegação permitida pelo sistema");
                    this.allowSystemNavigation = false;
                    return;
                }

                // Permitir navegação normal se não houver state ou se for state do browser
                if (!event.state || event.state.page !== 'protected') {
                    console.log("🌐 Navegação normal permitida");
                    return;
                }

                console.log('🛡️ Navegação bloqueada - Use os botões do sistema');

                // Voltar para frente de forma mais suave
                setTimeout(() => {
                    if (window.history && window.history.forward) {
                        window.history.forward();
                    }
                }, 100);

                // Mostrar aviso não intrusivo
                this.showNavigationWarning();
            };

        } catch (error) {
            console.error('❌ Erro na configuração de proteção:', error);
        }
    }

    showNavigationWarning() {
        // Verificar se já existe um aviso
        if (document.querySelector('.nav-warning')) return;

        // Criar overlay de aviso mais discreto
        const warning = document.createElement('div');
        warning.className = 'nav-warning';
        warning.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff6b6b;
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-weight: 500;
            font-size: 14px;
            max-width: 300px;
            animation: slideIn 0.3s ease-out;
        `;
        
        warning.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span>⚠️</span>
                <span>Use os botões do sistema para navegar</span>
            </div>
        `;
        
        document.body.appendChild(warning);

        // Adicionar estilo de animação
        if (!document.querySelector('#nav-warning-styles')) {
            const style = document.createElement('style');
            style.id = 'nav-warning-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        // Remover após 2.5 segundos com animação
        setTimeout(() => {
            if (document.body.contains(warning)) {
                warning.style.animation = 'slideOut 0.3s ease-in forwards';
                setTimeout(() => {
                    if (document.body.contains(warning)) {
                        document.body.removeChild(warning);
                    }
                }, 300);
            }
        }, 2500);
    }

    // Método para logout controlado
    logout() {
        if (confirm('Deseja realmente sair?')) {
            console.log("🚪 Iniciando logout...");
            
            // Limpar sessão
            localStorage.removeItem('session_token');
            localStorage.removeItem('user_nome');
            localStorage.removeItem('user_id');
            localStorage.removeItem('user_perfil');

            // Permitir navegação para login
            this.allowSystemNavigation = true;

            // Redirecionar para login
            window.location.href = '../pages/login.html';
        }
    }

    navigateBack() {
        console.log("↩️ Navegação controlada para voltar");
        this.allowSystemNavigation = true;
        
        // Usar history.back de forma segura
        if (window.history && window.history.length > 1) {
            window.history.back();
        } else {
            // Se não há histórico, ir para página inicial
            window.location.href = '../index.html';
        }
    }

    navigateTo(url) {
        console.log("🔄 Navegando para:", url);
        this.allowSystemNavigation = true;
        window.location.href = url;
    }

    // 🔧 CORREÇÃO CRÍTICA: Método getAuthHeaders corrigido
    getAuthHeaders() {
        const token = localStorage.getItem('session_token');
        console.log("🔑 Token recuperado:", token ? "Presente" : "Ausente");
        
        if (!token) {
            console.warn('⚠️ Token não encontrado no localStorage');
            return {
                'Content-Type': 'application/json'
            };
        }

        // 🔧 CORREÇÃO: Backend espera apenas o token, sem "Bearer"
        return {
            'Authorization': token, // Apenas o token, sem "Bearer"
            'Content-Type': 'application/json'
        };
    }

    async makeAuthenticatedRequest(url, options = {}) {
    const headers = this.getAuthHeaders();
    
    console.log("🔍 DEBUG session_manager:");
    console.log("📋 URL:", url);
    console.log("🔑 Headers Authorization:", headers.Authorization);
    
    const config = {
        ...options,
        headers: {
            ...headers,
            ...options.headers
        }
    };
    
    try {
        console.log("🌐 Enviando requisição via session_manager...");
        const response = await fetch(url, config);
        
        console.log("📡 Resposta recebida:");
        console.log("- Status:", response.status);
        console.log("- OK:", response.ok);
        
        // 🔧 CORREÇÃO CRÍTICA: Não retornar null imediatamente para 401
        // Deixar o código chamador decidir o que fazer
        if (response.status === 401) {
            console.log("🔐 Status 401 detectado - mas retornando response para tratamento");
            // Apenas mostra o aviso, mas retorna a response para o caller
            this.showSessionExpiredWarning();
        }
        
        // 🔧 CORREÇÃO: SEMPRE retornar a response, mesmo com erro
        return response;
        
    } catch (error) {
        console.error('❌ Erro de rede na requisição:', error);
        return null;
    }
}
    showSessionExpiredWarning() {
        // Verificar se já existe um modal
        if (document.querySelector('.session-expired-modal')) return;

        // Criar modal de sessão expirada
        const modal = document.createElement('div');
        modal.className = 'session-expired-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10001;
        `;
        
        modal.innerHTML = `
            <div style="
                background: white;
                padding: 24px;
                border-radius: 12px;
                text-align: center;
                max-width: 400px;
                width: 90%;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            ">
                <h3 style="color: #ff6b6b; margin-bottom: 16px;">🔐 Sessão Expirada</h3>
                <p style="margin-bottom: 20px; color: #666;">
                    Sua sessão expirou ou não foi autorizada. Por favor, faça login novamente.
                </p>
                <button onclick="window.session_manager.redirectToLogin()" style="
                    background: #ff6b6b;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                ">
                    Fazer Login Novamente
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    redirectToLogin() {
        console.log("🔐 Redirecionando para login...");
        this.allowSystemNavigation = true;
        
        // Limpar todos os dados de sessão
        localStorage.removeItem('session_token');
        localStorage.removeItem('user_nome');
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_perfil');
        sessionStorage.clear();
        
        window.location.href = '../pages/login.html';
    }

    // 🔧 NOVO MÉTODO: Verificar se a sessão ainda é válida
    async verifySession() {
        const token = localStorage.getItem('session_token');
        if (!token) {
            console.log("❌ Nenhum token encontrado");
            return false;
        }

        try {
            const response = await this.makeAuthenticatedRequest('http://localhost:8001/api/user-info');
            if (response && response.ok) {
                console.log("✅ Sessão válida");
                return true;
            } else {
                console.log("❌ Sessão inválida");
                return false;
            }
        } catch (error) {
            console.error("❌ Erro ao verificar sessão:", error);
            return false;
        }
    }
}

// Event listeners mais leves e não-bloqueantes
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 Inicializando session_manager...");
    
    // Inicializar session manager
    window.session_manager = new session_manager();

    // 🔧 CORREÇÃO: Verificar sessão antes de configurar botões
    setTimeout(async () => {
        // Verificar se a sessão é válida
        const isSessionValid = await window.session_manager.verifySession();
        
        if (!isSessionValid) {
            console.log("⚠️ Sessão inválida, limpando dados...");
            localStorage.removeItem('session_token');
            localStorage.removeItem('user_nome');
            localStorage.removeItem('user_id');
            localStorage.removeItem('user_perfil');
            
            // Se não está na página de login, redirecionar
            if (!window.location.pathname.includes('login.html')) {
                window.location.href = '../pages/login.html';
            }
            return;
        }

        // Configurar botões apenas se a sessão for válida
        console.log("✅ Sessão válida, configurando botões...");

        // Botão voltar
        const btnVoltar = document.getElementById('btn-voltar');
        if (btnVoltar) {
            console.log("✅ Configurando botão voltar");
            btnVoltar.addEventListener('click', function(e) {
                e.preventDefault();
                window.session_manager.navigateBack();
            });
        }

        // Botão sair
        const btnSair = document.getElementById('btn-sair');
        if (btnSair) {
            console.log("✅ Configurando botão sair");
            btnSair.addEventListener('click', function(e) {
                e.preventDefault();
                window.session_manager.logout();
            });
        }

        // Botão logout específico
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            console.log("✅ Configurando botão logout");
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                window.session_manager.logout();
            });
        }

    }, 100);

    // Prevenir gestos de swipe de forma mais leve
    document.addEventListener('touchstart', function(e) {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });

    let startX = 0;
    document.addEventListener('touchstart', function(e) {
        startX = e.touches[0].clientX;
    }, { passive: true });

    document.addEventListener('touchend', function(e) {
        const endX = e.changedTouches[0].clientX;
        const diffX = startX - endX;
        
        // Bloquear apenas swipe muito óbvio da direita para esquerda
        if (diffX > 100 && startX < 20) {
            e.preventDefault();
            console.log('🛡 Gesto de voltar bloqueado');
            
            // Mostrar aviso leve
            if (window.session_manager) {
                window.session_manager.showNavigationWarning();
            }
        }
    }, { passive: false });
});

// Exportar para uso global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = session_manager;
}