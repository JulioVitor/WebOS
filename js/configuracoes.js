// Configurações da API
const API_BASE_URL = 'http://localhost:8001';
let sessionToken = localStorage.getItem('session_token');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

// Elementos DOM
const searchInput = document.getElementById('searchInput');
const alertContainer = document.getElementById('alertContainer');

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
            // Sessão expirada
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

// Funções de configurações
function configureNetwork() {
    showAlert('Abrindo configurações de rede...');
    // Implementar lógica de configuração de rede
}
 //funcao criar backup
async function createBackup() {
    try {
        showAlert('Criando backup no computador...', 'info');

        // ✅ AGORA CORRETO - usa o BackupConfig definido
        const result = await apiCall('/api/backup', {
            method: 'POST',
            body: JSON.stringify({
                tipo: 'completo',
                descricao: `Backup ${new Date().toLocaleString()}`
            })
        });

        if (result && result.success) {
            const mensagem = `
                ✅ Backup criado com sucesso!<br>
                💻 Salvo em: <strong>${result.caminho_backup}</strong><br>
                📊 Tamanho: ${formatBytes(result.tamanho_bytes)}<br>
                📋 Registros: ${result.total_registros} em ${result.tabelas_incluidas.length} tabelas
            `;
            
            showAlert(mensagem, 'success');
            console.log('💾 Backup criado:', result);
            
            // Atualizar a lista se o modal estiver aberto
            if (document.querySelector('.backup-history')) {
                openBackupManagement();
            }
        } else {
            showAlert('❌ Erro ao criar backup', 'error');
        }
    } catch (error) {
        console.error('❌ Erro no backup:', error);
        showAlert('❌ Erro ao criar backup: ' + (error.message || 'Verifique o console'), 'error');
    }
}

async function openBackupManagement() {
    try {
        const historico = await apiCall('/api/backup/historico');
        const config = await apiCall('/api/backup/configuracao');
        
        const modal = document.createElement('div');
        modal.className = 'modal-backdrop';
        modal.innerHTML = `
            <div class="modal" style="max-width: 800px;">
                <div class="modal-header">
                    <h3>💾 Gerenciamento de Backups</h3>
                    <button class="close-btn" onclick="this.closest('.modal-backdrop').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="backup-status">
                        <h4>📁 Local dos Backups</h4>
                        <div class="pasta-info ${config.pasta_existe ? 'status-success' : 'status-error'}">
                            <strong>Pasta:</strong> ${config.pasta_backup}<br>
                            <strong>Status:</strong> ${config.pasta_existe ? '✅ Disponível' : '❌ Não encontrada'}<br>
                            <strong>Backups:</strong> ${config.backups_encontrados} arquivos encontrados
                        </div>
                    </div>
                    
                    <div class="backup-actions" style="margin: 20px 0;">
                        <button class="btn btn-primary" onclick="createBackup()">
                            💾 Criar Novo Backup
                        </button>
                        <button class="btn" onclick="abrirPastaBackups()" style="margin-left: 10px;">
                            📂 Abrir Pasta
                        </button>
                    </div>
                    
                    <div class="backup-history">
                        <h4>📋 Backups Realizados (${historico.total})</h4>
                        ${historico.backups.length > 0 ? 
                            `<div class="backup-list">
                                ${historico.backups.map(backup => `
                                    <div class="backup-item">
                                        <div class="backup-info">
                                            <strong>${backup.nome}</strong>
                                            <div class="backup-details">
                                                <span>📅 ${new Date(backup.data_criacao).toLocaleString()}</span>
                                                <span>💾 ${formatBytes(backup.tamanho_bytes)}</span>
                                            </div>
                                            <small class="caminho-backup">${backup.caminho}</small>
                                        </div>
                                        <div class="backup-actions">
                                            <button class="btn btn-sm" onclick="downloadBackup('${backup.nome}')">
                                                📥 Download
                                            </button>
                                            <button class="btn btn-sm btn-danger" onclick="excluirBackup('${backup.nome}')">
                                                🗑️ Excluir
                                            </button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>` :
                            '<p class="no-backups">Nenhum backup encontrado na pasta.</p>'
                        }
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    } catch (error) {
        console.error('Erro ao abrir gerenciamento:', error);
        showAlert('Erro ao carregar backups: ' + error.message, 'error');
    }
}

// Função para abrir a pasta de backups
function abrirPastaBackups() {
    showAlert('⚠️ Para abrir a pasta, navegue até: C:/Backups_Sistema', 'info');
}

// Função para download
async function downloadBackup(nomeArquivo) {
    try {
        // Abre em nova aba para download
        window.open(`${API_BASE_URL}/api/backup/download/${nomeArquivo}?token=${sessionToken}`, '_blank');
        showAlert('Download iniciado', 'success');
    } catch (error) {
        console.error('Erro no download:', error);
        showAlert('Erro ao fazer download', 'error');
    }
}

// Função para excluir backup
async function excluirBackup(nomeArquivo) {
    if (!confirm(`Tem certeza que deseja excluir o backup "${nomeArquivo}"?`)) {
        return;
    }
    
    try {
        const result = await apiCall(`/api/backup/${nomeArquivo}`, {
            method: 'DELETE'
        });
        
        if (result.success) {
            showAlert('Backup excluído com sucesso', 'success');
            openBackupManagement(); // Recarregar a lista
        } else {
            showAlert('Erro ao excluir backup', 'error');
        }
    } catch (error) {
        console.error('Erro ao excluir:', error);
        showAlert('Erro ao excluir backup: ' + error.message, 'error');
    }
}

// Função utilitária para formatar bytes
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// CSS para o gerenciamento
const backupLocalCSS = `
.pasta-info {
    padding: 15px;
    border-radius: 5px;
    margin: 10px 0;
    line-height: 1.6;
}

.status-success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
}

.status-error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
}

.caminho-backup {
    color: #666;
    font-family: monospace;
    font-size: 0.8em;
    word-break: break-all;
    display: block;
    margin-top: 5px;
}

.backup-list {
    max-height: 400px;
    overflow-y: auto;
    margin-top: 15px;
    border: 1px solid #ddd;
    border-radius: 5px;
    padding: 10px;
}

.backup-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 12px;
    border: 1px solid #eee;
    border-radius: 5px;
    margin: 8px 0;
    background: #f9f9f9;
}

.backup-info {
    flex: 1;
}

.backup-details {
    display: flex;
    gap: 15px;
    margin: 5px 0;
    font-size: 0.9em;
    color: #666;
}

.backup-actions {
    display: flex;
    gap: 5px;
    margin-left: 10px;
}

.btn-sm {
    padding: 4px 8px;
    font-size: 0.8em;
}

.no-backups {
    text-align: center;
    color: #666;
    font-style: italic;
    padding: 20px;
}
`;

// Adicionar CSS
if (!document.querySelector('#backup-local-css')) {
    const style = document.createElement('style');
    style.id = 'backup-local-css';
    style.textContent = backupLocalCSS;
    document.head.appendChild(style);
}

function restoreBackup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.backup,.json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                showAlert('Restaurando backup...');
                // Implementar lógica de restauração
                showAlert('Backup restaurado com sucesso!');
            } catch (error) {
                showAlert('Erro ao restaurar backup', 'error');
            }
        }
    };
    input.click();
}

function clearData() {
    if (confirm('⚠️ ATENÇÃO: Esta ação irá limpar TODOS os dados do sistema. Esta ação não pode ser desfeita. Tem certeza?')) {
        if (confirm('❌ CONFIRMAÇÃO FINAL: Você realmente deseja apagar TODOS os dados?')) {
            showAlert('Limpando dados do sistema...');
            // Implementar lógica de limpeza de dados
        }
    }
}

function exportData() {
    showAlert('Exportando dados...');
    // Implementar lógica de exportação
}

// Gerenciamento de Usuários
async function openUserManagement() {
    if (currentUser.perfil !== 'admin') {
        showAlert('Apenas administradores podem gerenciar usuários', 'error');
        return;
    }

    try {
        const users = await apiCall('/api/usuarios');
        const userList = document.getElementById('userList');
        userList.innerHTML = '';

        users.usuarios.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            userItem.innerHTML = `
                        <div class="user-info">
                            <div class="user-name">${user.nome}</div>
                            <div class="user-email">${user.email} • ${user.perfil}</div>
                            <span class="status-badge ${user.ativo ? 'status-active' : 'status-inactive'}">
                                ${user.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                        </div>
                        <div class="user-actions">
                            <button class="btn btn-primary" onclick="editUser(${user.id})">Editar</button>
                            <button class="btn btn-danger" onclick="deleteUser(${user.id})">Excluir</button>
                        </div>
                    `;
            userList.appendChild(userItem);
        });

        document.getElementById('userManagementModal').style.display = 'block';
    } catch (error) {
        showAlert('Erro ao carregar usuários', 'error');
    }
}

function closeUserManagement() {
    document.getElementById('userManagementModal').style.display = 'none';
}

function openAddUserModal() {
    document.getElementById('userFormTitle').textContent = 'Adicionar Usuário';
    document.getElementById('userForm').reset();
    document.getElementById('userFormModal').style.display = 'block';
}

function closeUserForm() {
    document.getElementById('userFormModal').style.display = 'none';
}

async function editUser(userId) {
    try {
        const user = await apiCall(`/api/usuarios/${userId}`);
        document.getElementById('userFormTitle').textContent = 'Editar Usuário';
        document.getElementById('userName').value = user.nome;
        document.getElementById('userEmail').value = user.email;
        document.getElementById('userProfile').value = user.perfil;
        document.getElementById('userActive').checked = user.ativo;

        // Armazenar ID do usuário para edição
        document.getElementById('userForm').dataset.userId = userId;
        document.getElementById('userFormModal').style.display = 'block';
    } catch (error) {
        showAlert('Erro ao carregar usuário', 'error');
    }
}

async function deleteUser(userId) {
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
        try {
            await apiCall(`/api/usuarios/${userId}`, { method: 'DELETE' });
            showAlert('Usuário excluído com sucesso');
            openUserManagement(); // Recarregar lista
        } catch (error) {
            showAlert('Erro ao excluir usuário', 'error');
        }
    }
}

// Formulário de usuário
document.getElementById('userForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        nome: document.getElementById('userName').value,
        email: document.getElementById('userEmail').value,
        password: document.getElementById('userPassword').value,
        perfil: document.getElementById('userProfile').value,
        ativo: document.getElementById('userActive').checked
    };

    const userId = document.getElementById('userForm').dataset.userId;

    try {
        if (userId) {
            // Editar usuário existente
            await apiCall(`/api/usuarios/${userId}`, {
                method: 'PUT',
                body: JSON.stringify(formData)
            });
            showAlert('Usuário atualizado com sucesso');
        } else {
            // Criar novo usuário
            await apiCall('/api/usuarios', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            showAlert('Usuário criado com sucesso');
        }

        closeUserForm();
        openUserManagement(); // Recarregar lista
    } catch (error) {
        showAlert('Erro ao salvar usuário', 'error');
    }
});

// Gerenciamento de Permissões
async function openPermissionsModal() {
    if (currentUser.perfil !== 'admin') {
        showAlert('Apenas administradores podem gerenciar permissões', 'error');
        return;
    }

    try {
        const users = await apiCall('/api/usuarios-com-permissoes');
        const permissions = await apiCall('/api/permissoes/disponiveis');

        const content = document.getElementById('permissionsContent');
        content.innerHTML = `
                    <div class="user-list">
                        ${users.usuarios.map(user => `
                            <div class="user-item">
                                <div class="user-info">
                                    <div class="user-name">${user.nome}</div>
                                    <div class="user-email">${user.email} • ${user.perfil}</div>
                                </div>
                                <button class="btn btn-primary" onclick="editUserPermissions(${user.id})">
                                    Configurar Permissões
                                </button>
                            </div>
                        `).join('')}
                    </div>
                `;

        document.getElementById('permissionsModal').style.display = 'block';
    } catch (error) {
        showAlert('Erro ao carregar permissões', 'error');
    }
}

function closePermissionsModal() {
    document.getElementById('permissionsModal').style.display = 'none';
}

async function editUserPermissions(userId) {
    try {
        const userPerms = await apiCall(`/api/usuarios/${userId}/permissoes`);
        const permissions = await apiCall('/api/permissoes/disponiveis');

        const modal = document.getElementById('permissionsModal');
        const content = document.getElementById('permissionsContent');

        content.innerHTML = `
                    <h4>Permissões para ${userPerms.usuario.nome}</h4>
                    <div class="form-group">
                        <label>Nível de Acesso:</label>
                        <select id="accessLevel" onchange="updatePermissionsByLevel()">
                            <option value="admin" ${userPerms.nivel_acesso === 'admin' ? 'selected' : ''}>Administrador</option>
                            <option value="tecnico" ${userPerms.nivel_acesso === 'tecnico' ? 'selected' : ''}>Técnico</option>
                            <option value="vendedor" ${userPerms.nivel_acesso === 'vendedor' ? 'selected' : ''}>Vendedor</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Permissões Específicas:</label>
                        <div id="permissionsList">
                            ${permissions.permissoes.map(perm => `
                                <label style="display: block; margin: 5px 0;">
                                    <input type="checkbox" value="${perm.valor}" 
                                           ${userPerms.permissoes.includes(perm.valor) ? 'checked' : ''}>
                                    ${perm.descricao}
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    <div class="form-actions">
                        <button class="btn btn-primary" onclick="saveUserPermissions(${userId})">Salvar</button>
                        <button class="btn" onclick="openPermissionsModal()">Voltar</button>
                    </div>
                `;
    } catch (error) {
        showAlert('Erro ao carregar permissões do usuário', 'error');
    }
}

function updatePermissionsByLevel() {
    const level = document.getElementById('accessLevel').value;
    const checkboxes = document.querySelectorAll('#permissionsList input[type="checkbox"]');

    // Definir permissões padrão por nível
    const defaultPermissions = {
        admin: ['gerenciar_usuarios', 'gerenciar_produtos', 'gerenciar_vendas', 'gerenciar_os', 'gerenciar_clientes', 'ver_relatorios', 'exportar_dados', 'configurar_sistema'],
        tecnico: ['gerenciar_os', 'gerenciar_clientes', 'gerenciar_produtos'],
        vendedor: ['gerenciar_vendas', 'gerenciar_clientes', 'ver_relatorios']
    };

    checkboxes.forEach(checkbox => {
        checkbox.checked = defaultPermissions[level]?.includes(checkbox.value) || false;
    });
}

async function saveUserPermissions(userId) {
    const level = document.getElementById('accessLevel').value;
    const checkboxes = document.querySelectorAll('#permissionsList input[type="checkbox"]:checked');
    const permissions = Array.from(checkboxes).map(cb => cb.value);

    try {
        await apiCall(`/api/usuarios/${userId}/permissoes`, {
            method: 'PUT',
            body: JSON.stringify({
                nivel_acesso: level,
                permissoes: permissions
            })
        });
        showAlert('Permissões atualizadas com sucesso');
        openPermissionsModal(); // Voltar para a lista
    } catch (error) {
        showAlert('Erro ao salvar permissões', 'error');
    }
}

// Busca em tempo real
searchInput.addEventListener('input', function (e) {
    const searchTerm = e.target.value.toLowerCase();
    const cards = document.querySelectorAll('.settings-card');

    cards.forEach(card => {
        const cardText = card.textContent.toLowerCase();
        if (cardText.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
});

// Carregar configurações salvas
function loadSavedSettings() {
    const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');

    // Aplicar configurações salvas nos controles
    if (settings.language) document.getElementById('languageSelect').value = settings.language;
    if (settings.timezone) document.getElementById('timezoneSelect').value = settings.timezone;
    if (settings.dateFormat) document.getElementById('dateFormatSelect').value = settings.dateFormat;
    if (settings.autoLogin !== undefined) document.getElementById('autoLoginToggle').checked = settings.autoLogin;
    // ... aplicar outras configurações
}

// Salvar configurações automaticamente
function setupAutoSave() {
    const inputs = document.querySelectorAll('select, input[type="checkbox"]');
    inputs.forEach(input => {
        input.addEventListener('change', () => {
            saveSettings();
        });
    });
}

function saveSettings() {
    const settings = {
        language: document.getElementById('languageSelect').value,
        timezone: document.getElementById('timezoneSelect').value,
        dateFormat: document.getElementById('dateFormatSelect').value,
        autoLogin: document.getElementById('autoLoginToggle').checked,
        passwordRequired: document.getElementById('passwordRequiredToggle').checked,
        inactivityTimeout: document.getElementById('inactivityTimeoutSelect').value,
        emailNotifications: document.getElementById('emailNotificationsToggle').checked,
        lowStockAlerts: document.getElementById('lowStockAlertsToggle').checked,
        salesNotifications: document.getElementById('salesNotificationsToggle').checked,
        printer: document.getElementById('printerSelect').value,
        autoPrint: document.getElementById('autoPrintToggle').checked,
        paperSize: document.getElementById('paperSizeSelect').value,
        autoBackup: document.getElementById('autoBackupToggle').checked,
        backupFrequency: document.getElementById('backupFrequencySelect').value,
        backupLocation: document.getElementById('backupLocationSelect').value,
        cloudSync: document.getElementById('cloudSyncToggle').checked,
        syncFrequency: document.getElementById('syncFrequencySelect').value,
        stockAlert: document.getElementById('stockAlertToggle').checked,
        defaultMinStock: document.getElementById('defaultMinStock').value
    };

    localStorage.setItem('appSettings', JSON.stringify(settings));
    showAlert('Configurações salvas');
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    if (!sessionToken) {
        window.location.href = '../pages/login.html';
        return;
    }

    loadSavedSettings();
    setupAutoSave();

    // Verificar permissões do usuário
    if (currentUser.perfil !== 'admin') {
        // Ocultar seções administrativas
        const adminSections = document.querySelectorAll('.settings-card:nth-child(7)'); // Gerenciar Usuários
        adminSections.forEach(section => section.style.display = 'none');
    }
});


// ✅ FUNÇÃO PARA TESTAR CONEXÃO COM BACKEND
async function testarConexaoBackup() {
    try {
        console.log('🧪 Testando conexão com backup...');
        
        // 1. Testar endpoint de configuração primeiro
        console.log('1. Testando /api/backup/configuracao...');
        const config = await apiCall('/api/backup/configuracao');
        console.log('✅ Configuração:', config);
        
        // 2. Testar criar backup
        console.log('2. Testando /api/backup...');
        const backup = await apiCall('/api/backup', {
            method: 'POST',
            body: JSON.stringify({
                tipo: 'completo',
                descricao: 'Teste de backup'
            })
        });
        console.log('✅ Backup criado:', backup);
        
        return { config, backup };
        
    } catch (error) {
        console.error('❌ Erro no teste:', error);
        return { error: error.message };
    }
}

// ✅ FUNÇÃO PARA VERIFICAR AUTENTICAÇÃO
function verificarAutenticacao() {
    const token = localStorage.getItem('session_token');
    const user = localStorage.getItem('currentUser');
    
    console.log('🔐 Status da autenticação:');
    console.log('   Token:', token ? `✅ Presente (${token.length} chars)` : '❌ Ausente');
    console.log('   User:', user ? `✅ ${JSON.parse(user).nome}` : '❌ Ausente');
    
    return {
        token: !!token,
        user: !!user
    };
}

// ✅ FUNÇÃO PARA BUSCAR USUÁRIO DO SERVIDOR
async function carregarUsuarioDoServidor() {
    try {
        console.log('🔄 Buscando dados do usuário do servidor...');
        const userInfo = await apiCall('/api/user-info');
        
        if (userInfo) {
            currentUser = {
                id: userInfo.user_id,
                nome: userInfo.nome,
                perfil: userInfo.perfil,
                loja_id: userInfo.loja_id,
                inicial: userInfo.inicial
            };
            
            // Salvar no localStorage
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            console.log('✅ Usuário carregado do servidor:', currentUser);
            return true;
        }
    } catch (error) {
        console.error('❌ Erro ao carregar usuário:', error);
    }
    return false;
}

// ✅ FUNÇÃO PARA VERIFICAR E CORRIGIR USUÁRIO
async function verificarEAtualizarUsuario() {
    const userData = localStorage.getItem('currentUser');
    
    // Se não tem usuário ou está vazio, buscar do servidor
    if (!userData || userData === '{}' || userData === 'null') {
        console.log('🔄 Usuário não encontrado no localStorage, buscando do servidor...');
        await carregarUsuarioDoServidor();
    } else {
        try {
            currentUser = JSON.parse(userData);
            console.log('✅ Usuário carregado do localStorage:', currentUser);
        } catch (e) {
            console.error('❌ Erro ao parsear usuário do localStorage:', e);
            await carregarUsuarioDoServidor();
        }
    }
}

// ✅ FUNÇÃO PARA RECARREGAR USUÁRIO (execute no console)
async function recarregarUsuario() {
    console.log('🔄 Recarregando dados do usuário...');
    await carregarUsuarioDoServidor();
    location.reload();
}

// ✅ EXECUTAR VERIFICAÇÃO NA INICIALIZAÇÃO - VERSÃO CORRIGIDA
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando sistema...');
    
    // Verificar autenticação
    const authStatus = verificarAutenticacao();
    
    if (!authStatus.token) {
        console.error('❌ Usuário não autenticado - redirecionando para login');
        window.location.href = '../pages/login.html';
        return;
    }
    
    // ✅ CORRIGIR: Carregar usuário antes de verificar permissões
    await verificarEAtualizarUsuario();
    
    console.log('✅ Usuário autenticado, carregando sistema...');
    console.log('👤 Usuário atual:', currentUser);
    
    loadSavedSettings();
    setupAutoSave();

    // ✅ VERIFICAÇÃO CORRIGIDA - Usar currentUser atualizado
    if (currentUser && currentUser.perfil === 'admin') {
        console.log('👑 Usuário é ADMIN - mostrando todas as seções');
        // Mostrar todas as seções (não ocultar nada)
    } else {
        console.log('👤 Usuário não é admin - ocultando seções administrativas');
        const adminSections = document.querySelectorAll('.settings-card:nth-child(7)'); // Gerenciar Usuários
        adminSections.forEach(section => section.style.display = 'none');
    }
});
