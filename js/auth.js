// Configurações da API
const API_BASE ='http://localhost:8001';
const API_BASE_URL = `${API_BASE}/api`;

// Elementos do DOM
let loginForm = null;
let errorMessage = null;
let loading = null;
let nomeInput = null;
let passwordInput = null;
let createUserLink = null;

// Inicializar elementos do DOM
function initElements() {
    console.log('🔍 Procurando elementos do DOM...');
    
    loginForm = document.getElementById('loginForm');
    errorMessage = document.getElementById('errorMessage');
    loading = document.getElementById('loading');
    nomeInput = document.getElementById('nome');
    passwordInput = document.getElementById('password');
    createUserLink = document.getElementById('createUserLink');
    
    console.log('Elementos encontrados:', {
        loginForm: !!loginForm,
        errorMessage: !!errorMessage,
        loading: !!loading,
        nomeInput: !!nomeInput,
        passwordInput: !!passwordInput,
        createUserLink: !!createUserLink
    });
    
    return loginForm && nomeInput && passwordInput;
}

// Mostrar mensagem de erro
function showError(message) {
    console.error('❌ Erro:', message);
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    } else {
        alert('Erro: ' + message);
    }
}

// Mostrar/ocultar loading
function setLoading(show) {
    console.log('⏳ Loading:', show);
    if (loading) {
        loading.style.display = show ? 'block' : 'none';
    }
}

// Criar usuário padrão
window.createDefaultUser = async function() {
    if (!confirm('Deseja criar o usuário padrão?\nUsuário: admin\nSenha: admin')) {
        return;
    }
    
    try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/api/create-default-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
           
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('✅ Usuário padrão criado com sucesso!\nUsuário: admin\nSenha: admin');
            if (nomeInput) nomeInput.value = 'admin';
            if (passwordInput) passwordInput.value = 'admin';
        } else {
            alert('❌ Erro: ' + (result.error || result.message || 'Erro desconhecido'));
        }
        
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        alert('❌ Erro ao criar usuário padrão. Verifique se o servidor está rodando.');
    } finally {
        setLoading(false);
    }
}

// Fazer login - CORRIGIDO
async function fazerLogin(nome, password) {
    try {
        setLoading(true);
        if (errorMessage) errorMessage.style.display = 'none';
        
        const response = await fetch(`${API_BASE}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
           // IMPORTANTE para cookies/sessions
            body: JSON.stringify({
                nome: nome,
                password: password
            })
        });
        
        // Verificar status da resposta primeiro
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Erro ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Login realizado com sucesso!', data);
            
            // Armazenar token se existir
            if (data.session_token) {
                localStorage.setItem('session_token', data.session_token);
            }
            if (data.nome) {
                localStorage.setItem('user_nome', data.nome);
            }
            if (data.user_id) {
                localStorage.setItem('user_id', data.user_id);
            }

            if (data.perfil) {
                localStorage.setItem('user_perfil', data.perfil);
            }
            
            alert('✅ Login realizado com sucesso! Redirecionando...');
            window.location.href = '../index.html';
        } else {
            showError(data.message || 'Erro ao fazer login');
        }
    } catch (error) {
        console.error('Erro no login:', error);
        
        // Mensagens de erro mais específicas
        if (error.message.includes('401')) {
            showError('Credenciais inválidas. Verifique usuário e senha.');
        } else if (error.message.includes('Failed to fetch')) {
            showError('Erro de conexão com o servidor. Verifique se o backend está rodando.');
        } else {
            showError(error.message || 'Erro desconhecido ao fazer login');
        }
    } finally {
        setLoading(false);
    }
}

// Verificar conexão com backend
async function verificarBackend() {
    try {
        const response = await fetch(`${API_BASE}/api/health`, {
            
        });
        
        if (response.ok) {
            console.log('✅ Backend conectado');
            return true;
        } else {
            showError('Backend não está respondendo corretamente.');
            return false;
        }
    } catch (error) {
        console.error('Erro ao conectar com backend:', error);
        showError('Não foi possível conectar com o backend. Verifique se o servidor está rodando na porta 8001.');
        return false;
    }
}

// Handler para submit do formulário
function handleLoginSubmit(e) {
    e.preventDefault();
    
    const nome = nomeInput.value.trim();
    const password = passwordInput.value;
    
    console.log('📤 Tentando login:', { nome });
    
    if (!nome || !password) {
        showError('Por favor, preencha todos os campos');
        return;
    }
    
    fazerLogin(nome, password);
}

// Inicializar página
async function initPage() {
    console.log('🚀 Inicializando página de login...');
    
    if (!initElements()) {
        console.error('❌ Elementos essenciais não encontrados');
        showError('Erro ao carregar a página. Recarregue e tente novamente.');
        return;
    }
    
    // Adicionar event listeners
    loginForm.addEventListener('submit', handleLoginSubmit);
    
    if (createUserLink) {
        createUserLink.addEventListener('click', function(e) {
            e.preventDefault();
            createDefaultUser();
        });
    }
    
    // Verificar backend
    await verificarBackend();
    
    console.log('✅ Página inicializada com sucesso');
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initPage);