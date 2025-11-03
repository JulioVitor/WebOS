// Variáveis globais


let session_token = localStorage.getItem('session_token');
let currentUser = {
    user_id: localStorage.getItem('user_id'),
    nome: localStorage.getItem('user_nome'),
    perfil: localStorage.getItem('user_perfil') 
};

// Dados reais da API
let users = [];

// Carregar usuários ao iniciar
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Iniciando sistema de usuários...');
    
    // Verificar se estamos logados
    if (!session_token) {
        console.warn('⚠️ Nenhum token encontrado, usando modo offline');
        // Em vez de redirecionar, vamos trabalhar em modo offline
        showOfflineMode();
        return;
    }
    
    // Verificar se é admin
    if (currentUser.perfil !== 'admin') {
        showNotAdminWarning();
        return;
    }
    
    loadUsersFromAPI();
});

// Modo offline - mostra dados mock
function showOfflineMode() {
    console.log('📴 Modo offline ativado');
    
    // Dados mock de usuários (fallback)
    const mockUsers = [
        {
            id: 1,
            nome: 'Administrador',
            email: 'admin@webos.com',
            perfil: 'admin',
            ativo: true,
            data_criacao: '2024-01-15T14:30:00'
        },
        {
            id: 2,
            nome: 'João Vendedor',
            email: 'joao@webos.com',
            perfil: 'vendedor',
            ativo: true,
            data_criacao: '2024-01-15T10:15:00'
        }
    ];
    
    users = mockUsers;
    loadUsersTable();
    
    // Mostrar aviso
    const header = document.querySelector('.header');
    if (header) {
        const warning = document.createElement('div');
        warning.style.cssText = `
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 15px;
            text-align: center;
        `;
        warning.innerHTML = '🔴 <strong>Modo Offline</strong> - Conecte-se ao servidor para gerenciar usuários';
        header.parentNode.insertBefore(warning, header.nextSibling);
    }
}

// Aviso para não-administradores
function showNotAdminWarning() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="6" style="text-align: center; padding: 30px; color: #dc3545;">
                <div style="font-size: 1.2em; margin-bottom: 10px;">
                    ⚠️ Acesso Restrito
                </div>
                <div>
                    Apenas administradores podem gerenciar usuários.
                </div>
            </td>
        </tr>
    `;
    
    // Desabilitar botões de ação
    document.querySelectorAll('.action-btn, .btn-primary').forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.6';
        btn.style.cursor = 'not-allowed';
    });
}

// Carregar usuários da API
async function loadUsersFromAPI() {
    try {
        showLoading();
        
        console.log('📡 Buscando usuários da API...');
        const response = await fetch('http://localhost:8001/api/usuarios', {
            method: 'GET',
            headers: {
                'Authorization': session_token,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                console.error('🔐 Sessão expirada');
                handleSessionExpired();
                return;
            }
            throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        users = data.usuarios || [];
        console.log(`✅ ${users.length} usuários carregados`);
        
        loadUsersTable();
        
    } catch (error) {
        console.error('❌ Erro ao carregar usuários:', error);
        
        // Fallback para dados mock em caso de erro
        if (users.length === 0) {
            showOfflineMode();
        }
        
        // Mostrar erro específico para o usuário
        if (error.message.includes('Failed to fetch')) {
            showError('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
        } else {
            showError('Erro ao carregar usuários: ' + error.message);
        }
    } finally {
        hideLoading();
    }
}

// Carregar tabela de usuários
function loadUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    
    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #6c757d;">
                    <div style="font-size: 1.1em; margin-bottom: 10px;">
                        👥 Nenhum usuário encontrado
                    </div>
                    <button class="btn btn-primary" onclick="openUserModal()">
                        👤 Criar Primeiro Usuário
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>
                <strong>${escapeHtml(user.nome)}</strong>
                ${user.id === currentUser.user_id ? ' <span style="color: #3498db;">(Você)</span>' : ''}
            </td>
            <td>${escapeHtml(user.email)}</td>
            <td>
                <span class="status-badge status-${user.perfil}">
                    ${getProfileLabel(user.perfil)}
                </span>
            </td>
            <td>
                <span class="status-badge ${user.ativo ? 'status-active' : 'status-inactive'}">
                    ${user.ativo ? 'Ativo' : 'Inativo'}
                </span>
            </td>
            <td>${formatDate(user.data_criacao)}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-action btn-edit" onclick="editUser(${user.id})" title="Editar"
                            ${user.id === currentUser.user_id ? 'disabled' : ''}>
                        ✏️
                    </button>
                    <button class="btn-action btn-reset" onclick="resetPassword(${user.id})" title="Redefinir Senha">
                        🔑
                    </button>
                    <button class="btn-action btn-delete" onclick="deleteUser(${user.id})" title="Excluir" 
                            ${user.perfil === 'admin' || user.id === currentUser.user_id ? 'disabled' : ''}>
                        🗑️
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Abrir modal de usuário
function openUserModal(user = null) {
    const modal = document.getElementById('userModal');
    const title = document.getElementById('modalTitle');
    const passwordField = document.getElementById('userPassword');
    
    if (user) {
        title.textContent = 'Editar Usuário';
        fillUserForm(user);
        passwordField.placeholder = 'Deixe em branco para manter a senha atual';
        passwordField.required = false;
    } else {
        title.textContent = 'Novo Usuário';
        document.getElementById('userForm').reset();
        passwordField.placeholder = 'Digite a senha (obrigatório)';
        passwordField.required = true;
    }
    
    modal.style.display = 'block';
}

// Fechar modal
function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
    document.getElementById('userForm').reset();
}

// Preencher formulário para edição
function fillUserForm(user) {
    document.getElementById('userId').value = user.id;
    document.getElementById('userName').value = user.nome;
    document.getElementById('userEmail').value = user.email;
    document.getElementById('userProfile').value = user.perfil;
    document.getElementById('userStatus').value = user.ativo ? '1' : '0';
}

// Salvar usuário (CREATE ou UPDATE)
async function saveUser() {
    const form = document.getElementById('userForm');
    const userId = document.getElementById('userId').value;
    const isEdit = !!userId;
    
    const userData = {
        nome: document.getElementById('userName').value.trim(),
        email: document.getElementById('userEmail').value.trim(),
        perfil: document.getElementById('userProfile').value,
        ativo: document.getElementById('userStatus').value === '1'
    };
    
    const password = document.getElementById('userPassword').value;
    if (password) {
        userData.password = password;
    }
    
    // Validações
    if (!userData.nome || !userData.email || !userData.perfil) {
        showError('Preencha todos os campos obrigatórios!');
        return;
    }
    
    if (!isEdit && !password) {
        showError('Para novo usuário, a senha é obrigatória!');
        return;
    }
    
    // Verificar se estamos offline
    if (!session_token) {
        showError('Conecte-se ao servidor para gerenciar usuários');
        return;
    }
    
    try {
        showLoading();
        
        const url = isEdit 
            ? `http://localhost:8001/api/usuarios/${userId}`
            : 'http://localhost:8001/api/usuarios';
            
        const method = isEdit ? 'PUT' : 'POST';
        
        console.log(`📤 Enviando usuário: ${method} ${url}`);
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': session_token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Erro ${response.status}`);
        }
        
        const result = await response.json();
        
        showSuccess(result.message || (isEdit ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!'));
        closeUserModal();
        await loadUsersFromAPI(); // Recarregar a lista
        
    } catch (error) {
        console.error('❌ Erro ao salvar usuário:', error);
        showError('Erro ao salvar usuário: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Editar usuário
function editUser(userId) {
    const user = users.find(u => u.id === userId);
    if (user) {
        openUserModal(user);
    }
}

// Redefinir senha
async function resetPassword(userId) {
    const newPassword = prompt('Digite a nova senha para o usuário:');
    if (!newPassword) return;
    
    if (newPassword.length < 4) {
        showError('A senha deve ter pelo menos 4 caracteres!');
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch(`http://localhost:8001/api/usuarios/${userId}`, {
            method: 'PUT',
            headers: {
                'Authorization': session_token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                password: newPassword
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Erro ${response.status}`);
        }
        
        showSuccess('Senha redefinida com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao redefinir senha:', error);
        showError('Erro ao redefinir senha: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Excluir usuário
async function deleteUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    if (!confirm(`Tem certeza que deseja excluir o usuário "${user.nome}"?\n\nEsta ação não pode ser desfeita.`)) {
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch(`http://localhost:8001/api/usuarios/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': session_token,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Erro ${response.status}`);
        }
        
        const result = await response.json();
        showSuccess(result.message || 'Usuário excluído com sucesso!');
        await loadUsersFromAPI(); // Recarregar a lista
        
    } catch (error) {
        console.error('❌ Erro ao excluir usuário:', error);
        showError('Erro ao excluir usuário: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Atualizar lista
function refreshUsers() {
    loadUsersFromAPI();
}

// Outras funções
function managePermissions() {
}

function bulkActions() {
    showInfo('Ações em massa em desenvolvimento...');
}

// ===== FUNÇÕES AUXILIARES =====

function getProfileLabel(profile) {
    const profiles = {
        'admin': 'Administrador',
        'vendedor': 'Vendedor',
        'tecnico': 'Técnico',
        'visualizador': 'Visualizador'
    };
    return profiles[profile] || profile;
}

function formatDate(dateString) {
    if (!dateString) return 'Nunca';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateString;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function handleSessionExpired() {
    localStorage.removeItem('session_token');
    localStorage.removeItem('currentUser');
    showError('Sessão expirada. Faça login novamente.');
    // Não redireciona automaticamente para evitar erro 404
}

// ===== NOTIFICAÇÕES =====

function showLoading() {
    // Poderia adicionar um spinner aqui
    document.body.style.cursor = 'wait';
}

function hideLoading() {
    document.body.style.cursor = 'default';
}

function showSuccess(message) {
    alert('✅ ' + message);
}

function showError(message) {
    alert('❌ ' + message);
}

function showInfo(message) {
    alert('ℹ️ ' + message);
}

// ===== EVENT LISTENERS =====

// Fechar modal ao clicar fora
window.onclick = function(event) {
    const modal = document.getElementById('userModal');
    if (event.target === modal) {
        closeUserModal();
    }
}

// Logout
document.querySelector('.logout-btn')?.addEventListener('click', function() {
    if (confirm('Deseja realmente sair?')) {
        localStorage.removeItem('session_token');
        localStorage.removeItem('currentUser');
        // Em vez de redirecionar, apenas recarrega a página
        location.reload();
    }
});

// Tecla ESC fecha modal
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeUserModal();
    }
});

console.log('🔧 Sistema de usuários carregado!');


// Modal de Permissões
const modalPermissoes = document.getElementById('modal-permissoes');
const btnGerenciarPermissoes = document.getElementById('btn-gerenciar-permissoes');
const btnCancelarPermissoes = document.getElementById('btn-cancelar-permissoes');
const btnSalvarPermissoes = document.getElementById('btn-salvar-permissoes');
const closePermissoes = modalPermissoes.querySelector('.close');
const selectUsuario = document.getElementById('select-usuario');
const niveisAcesso = document.querySelectorAll('input[name="nivel-acesso"]');
const checkboxesPermissoes = document.querySelectorAll('input[name="permissao"]');
const previewPermissoes = document.getElementById('preview-permissoes');

// Abrir modal
btnGerenciarPermissoes.addEventListener('click', () => {
    modalPermissoes.style.display = 'block';
    carregarUsuariosDoBanco(); // Carregar usuários do sistema
});

// Fechar modal
closePermissoes.addEventListener('click', () => {
    modalPermissoes.style.display = 'none';
});

btnCancelarPermissoes.addEventListener('click', () => {
    modalPermissoes.style.display = 'none';
});

// Fechar clicando fora
window.addEventListener('click', (event) => {
    if (event.target === modalPermissoes) {
        modalPermissoes.style.display = 'none';
    }
});

// Atualizar preview quando mudar seleções
selectUsuario.addEventListener('change', atualizarPreview);
niveisAcesso.forEach(radio => {
    radio.addEventListener('change', atualizarPreview);
});
checkboxesPermissoes.forEach(checkbox => {
    checkbox.addEventListener('change', atualizarPreview);
});

// Função para atualizar preview
function atualizarPreview() {
    const usuario = selectUsuario.value;
    const nivelSelecionado = document.querySelector('input[name="nivel-acesso"]:checked');
    const nivel = nivelSelecionado ? nivelSelecionado.value : 'nenhum';
    
    if (!usuario) {
        previewPermissoes.innerHTML = 'Selecione um usuário e nível de acesso...';
        return;
    }
    
    const permissoesAtivas = Array.from(checkboxesPermissoes)
        .filter(cb => cb.checked)
        .map(cb => cb.value.replace(/_/g, ' '));
    
    let html = `
        <strong>Usuário:</strong> ${usuario}<br>
        <strong>Nível:</strong> ${nivel}<br>
        <strong>Permissões:</strong> ${permissoesAtivas.length ? permissoesAtivas.join(', ') : 'Nenhuma'}
    `;
    
    previewPermissoes.innerHTML = html;
}

// Carregar usuários do sistema
// Carregar usuários do Banco de Dados
// 🔧 CORREÇÃO: Função com nome correto
async function carregarUsuariosDoBanco() {
    try {
        const token = localStorage.getItem('session_token') || sessionStorage.getItem('session_token');
        if (!token) {
            console.error('Token não encontrado');
            alert('Sessão expirada. Faça login novamente.');
            return;
        }

        console.log('🔍 Carregando usuários do banco...');
        
        const response = await fetch('http://localhost:8001/api/usuarios-com-permissoes', {
            method: 'GET',
            headers: {
                'Authorization': session_token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                alert('Sessão expirada. Faça login novamente.');
                window.location.href = 'login.html';
                return;
            }
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const data = await response.json();
        const usuarios = data.usuarios;
        
        console.log(`✅ ${usuarios.length} usuários carregados:`, usuarios);
        
        // Limpar select
        const selectUsuario = document.getElementById('select-usuario');
        selectUsuario.innerHTML = '<option value="">Selecione um usuário...</option>';
        
        // Popular select com dados do banco
        usuarios.forEach(usuario => {
            const option = document.createElement('option');
            option.value = usuario.id; // 🔧 Usar ID numérico, não nome
            option.textContent = `${usuario.nome} (${usuario.email}) - ${usuario.perfil}`;
            option.setAttribute('data-perfil', usuario.perfil);
            selectUsuario.appendChild(option);
        });

    } catch (error) {
        console.error('❌ Erro ao carregar usuários:', error);
        alert('Erro ao carregar usuários do sistema: ' + error.message);
    }
}

// 🔧 CORREÇÃO: Carregar permissões do usuário selecionado
selectUsuario.addEventListener('change', async function() {
    const usuarioId = this.value; // 🔧 Agora é um ID numérico
    
    if (usuarioId) {
        try {
            const token = localStorage.getItem('session_token') || sessionStorage.getItem('session_token');
            
            console.log(`🔍 Carregando permissões do usuário ID: ${usuarioId}`);
            
            // 🔧 CORREÇÃO: URL correta com ID numérico
             const response = await fetch(`http://localhost:8001/api/usuarios/${usuarioId}/permissoes`, {
                method: 'GET',
                headers: {
                    'Authorization': session_token,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.detail || 'Erro ao carregar permissões');
            }

            const usuario = data.usuario;
            const permissoes = data.permissoes;
            const nivelAcesso = data.nivel_acesso;

            console.log(`✅ Permissões carregadas:`, { usuario, permissoes, nivelAcesso });

            // Preencher nível de acesso
            const niveisAcesso = document.querySelectorAll('input[name="nivel-acesso"]');
            niveisAcesso.forEach(radio => {
                radio.checked = radio.value === nivelAcesso;
            });

            // Preencher permissões específicas
            const checkboxesPermissoes = document.querySelectorAll('input[name="permissao"]');
            checkboxesPermissoes.forEach(checkbox => {
                checkbox.checked = permissoes.includes(checkbox.value);
            });

            // Atualizar preview
            atualizarPreview();

        } catch (error) {
            console.error('❌ Erro ao carregar permissões:', error);
            alert('Erro ao carregar permissões do usuário: ' + error.message);
        }
    }
});

// 🔧 CORREÇÃO: Salvar permissões
btnSalvarPermissoes.addEventListener('click', async function() {
    const usuarioId = selectUsuario.value;
    const nivelSelecionado = document.querySelector('input[name="nivel-acesso"]:checked');
    
    if (!usuarioId) {
        alert('Selecione um usuário!');
        return;
    }
    
    if (!nivelSelecionado) {
        alert('Selecione um nível de acesso!');
        return;
    }
    
    const nivel = nivelSelecionado.value;
    const permissoes = Array.from(document.querySelectorAll('input[name="permissao"]:checked'))
        .map(cb => cb.value);

    try {
        const token = localStorage.getItem('session_token') || sessionStorage.getItem('session_token');
        
        console.log(`💾 Salvando permissões para usuário ${usuarioId}:`, { nivel, permissoes });
        
        const response = await fetch(`http://localhost:8001/api/usuarios/${usuarioId}/permissoes`, {
            method: 'PUT',
            headers: {
                'Authorization': session_token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nivel_acesso: nivel,
                permissoes: permissoes
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Erro HTTP: ${response.status}`);
        }

        const result = await response.json();
        
        alert(`✅ Permissões atualizadas para ${selectUsuario.options[selectUsuario.selectedIndex].text.split(' (')[0]}!`);
        
        // Fechar modal
        modalPermissoes.style.display = 'none';

    } catch (error) {
        console.error('❌ Erro ao salvar permissões:', error);
        alert('Erro ao salvar permissões: ' + error.message);
    }
});