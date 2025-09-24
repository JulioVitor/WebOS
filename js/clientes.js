console.log("📦 Script de clientes carregado, aguardando DOM...");

// Variáveis globais
let clientes = [];
let clienteEditando = null;
let paginaAtual = 1;
const itensPorPagina = 10;
let termoPesquisa = '';

// Aguardar o DOM carregar completamente
document.addEventListener('DOMContentLoaded', function() {
    console.log("✅ DOM pronto - Inicializando gerenciamento de clientes");
    
    // Inicializar a página
    inicializarPagina();
    
    // Configurar event listeners
    configurarEventListeners();
});

// Função para inicializar a página
function inicializarPagina() {
    carregarClientes();
    aplicarMascaras();
}

// Função para configurar os event listeners
function configurarEventListeners() {
    // Botão novo cliente
    document.getElementById('btn-novo-cliente').addEventListener('click', abrirModalNovoCliente);
    
    // Botão pesquisar
    document.getElementById('btn-pesquisar').addEventListener('click', pesquisarClientes);
    
    // Botão limpar pesquisa
    document.getElementById('btn-limpar-pesquisa').addEventListener('click', limparPesquisa);
    
    // Evento de input na pesquisa (busca em tempo real)
    document.getElementById('input-pesquisa').addEventListener('input', function(e) {
        if (e.target.value.length === 0) {
            limparPesquisa();
        } else if (e.target.value.length >= 3) {
            termoPesquisa = e.target.value;
            pesquisarClientes();
        }
    });
    
    // Modal de cliente
    document.getElementById('fechar-modal').addEventListener('click', fecharModalCliente);
    document.getElementById('btn-cancelar').addEventListener('click', fecharModalCliente);
    document.getElementById('btn-salvar-cliente').addEventListener('click', salvarCliente);
    
    // Modal de confirmação
    document.getElementById('fechar-confirmacao').addEventListener('click', fecharModalConfirmacao);
    document.getElementById('btn-cancelar-exclusao').addEventListener('click', fecharModalConfirmacao);
    document.getElementById('btn-confirmar-exclusao').addEventListener('click', confirmarExclusaoCliente);
    
    // Fechar modais clicando fora
    document.getElementById('modal-cliente').addEventListener('click', function(e) {
        if (e.target === this) fecharModalCliente();
    });
    
    document.getElementById('modal-confirmacao').addEventListener('click', function(e) {
        if (e.target === this) fecharModalConfirmacao();
    });
}

// Aplicar máscaras aos campos
function aplicarMascaras() {
    const telefoneInput = document.getElementById('cliente-telefone');
    if (telefoneInput) {
        telefoneInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);
            
            if (value.length <= 10) {
                value = value.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
            } else {
                value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
            }
            
            e.target.value = value;
        });
    }

    const cpfInput = document.getElementById('cliente-cpf');
    if (cpfInput) {
        cpfInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);
            value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
            e.target.value = value;
        });
    }
}

// Função para carregar clientes do servidor
async function carregarClientes() {
    try {
        mostrarLoading(true);
        
        const sessionToken = localStorage.getItem('session_token');
        let url = 'http://localhost:8001/api/clientes';
        
        // Adicionar parâmetros de paginação e pesquisa se existirem
        const params = new URLSearchParams();
        params.append('pagina', paginaAtual);
        params.append('limite', itensPorPagina);
        
        if (termoPesquisa) {
            params.append('pesquisa', termoPesquisa);
        }
        
        url += `?${params.toString()}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': sessionToken
            }
        });
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        clientes = data.clientes || [];
        
        // Renderizar a tabela
        renderizarTabelaClientes();
        
        // Renderizar paginação
        renderizarPaginacao(data.total, data.paginas);
        
    } catch (error) {
        console.error('❌ Erro ao carregar clientes:', error);
        alert('Erro ao carregar clientes. Verifique o console para mais detalhes.');
        
        // Fallback: carregar do localStorage se disponível
        carregarClientesLocal();
    } finally {
        mostrarLoading(false);
    }
}

// Fallback para carregar clientes do localStorage
function carregarClientesLocal() {
    try {
        const clientesLocal = JSON.parse(localStorage.getItem('clientes')) || [];
        clientes = clientesLocal;
        renderizarTabelaClientes();
        renderizarPaginacao(clientes.length, Math.ceil(clientes.length / itensPorPagina));
    } catch (error) {
        console.error('Erro ao carregar clientes do localStorage:', error);
        clientes = [];
        renderizarTabelaClientes();
    }
}

// Renderizar a tabela de clientes
function renderizarTabelaClientes() {
    const tbody = document.getElementById('corpo-tabela-clientes');
    tbody.innerHTML = '';
    
    if (clientes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    ${termoPesquisa ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
                </td>
            </tr>
        `;
        return;
    }
    
    // Calcular índices para a paginação
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const clientesPagina = clientes.slice(inicio, fim);
    
    clientesPagina.forEach(cliente => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>${cliente.nome}</td>
            <td>${cliente.email || '-'}</td>
            <td>${cliente.telefone}</td>
            <td>${cliente.cpf || '-'}</td>
            <td>${formatarData(cliente.data_cadastro)}</td>
            <td>
                <span class="status-badge ${cliente.ativo ? 'status-ativo' : 'status-inativo'}">
                    ${cliente.ativo ? 'Ativo' : 'Inativo'}
                </span>
            </td>
            <td>
                <button class="btn btn-outline btn-sm btn-editar" data-id="${cliente.id}">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-danger btn-sm btn-excluir" data-id="${cliente.id}" data-nome="${cliente.nome}">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    // Adicionar event listeners aos botões de editar e excluir
    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.addEventListener('click', function() {
            const clienteId = this.getAttribute('data-id');
            abrirModalEditarCliente(clienteId);
        });
    });
    
    document.querySelectorAll('.btn-excluir').forEach(btn => {
        btn.addEventListener('click', function() {
            const clienteId = this.getAttribute('data-id');
            const clienteNome = this.getAttribute('data-nome');
            abrirModalConfirmacaoExclusao(clienteId, clienteNome);
        });
    });
}

// Renderizar controles de paginação
function renderizarPaginacao(totalItens, totalPaginas) {
    const paginacao = document.getElementById('paginacao');
    paginacao.innerHTML = '';
    
    if (totalPaginas <= 1) return;
    
    // Botão anterior
    if (paginaAtual > 1) {
        const btnAnterior = document.createElement('button');
        btnAnterior.innerHTML = '&laquo; Anterior';
        btnAnterior.addEventListener('click', () => mudarPagina(paginaAtual - 1));
        paginacao.appendChild(btnAnterior);
    }
    
    // Números das páginas
    for (let i = 1; i <= totalPaginas; i++) {
        const btnPagina = document.createElement('button');
        btnPagina.textContent = i;
        btnPagina.classList.toggle('active', i === paginaAtual);
        btnPagina.addEventListener('click', () => mudarPagina(i));
        paginacao.appendChild(btnPagina);
    }
    
    // Botão próximo
    if (paginaAtual < totalPaginas) {
        const btnProximo = document.createElement('button');
        btnProximo.innerHTML = 'Próximo &raquo;';
        btnProximo.addEventListener('click', () => mudarPagina(paginaAtual + 1));
        paginacao.appendChild(btnProximo);
    }
}

// Mudar página
function mudarPagina(pagina) {
    paginaAtual = pagina;
    carregarClientes();
    window.scrollTo(0, 0);
}

// Pesquisar clientes
function pesquisarClientes() {
    termoPesquisa = document.getElementById('input-pesquisa').value.trim();
    paginaAtual = 1;
    carregarClientes();
}

// Limpar pesquisa
function limparPesquisa() {
    document.getElementById('input-pesquisa').value = '';
    termoPesquisa = '';
    paginaAtual = 1;
    carregarClientes();
}

// Abrir modal para novo cliente
function abrirModalNovoCliente() {
    clienteEditando = null;
    document.getElementById('modal-titulo').textContent = 'Novo Cliente';
    document.getElementById('form-cliente').reset();
    document.getElementById('cliente-id').value = '';
    document.getElementById('cliente-status').checked = true;
    document.getElementById('modal-cliente').style.display = 'flex';
}

// Abrir modal para editar cliente
function abrirModalEditarCliente(clienteId) {
    const cliente = clientes.find(c => c.id == clienteId);
    
    if (!cliente) {
        alert('Cliente não encontrado!');
        return;
    }
    
    clienteEditando = cliente;
    document.getElementById('modal-titulo').textContent = 'Editar Cliente';
    
    // Preencher o formulário com os dados do cliente
    document.getElementById('cliente-id').value = cliente.id;
    document.getElementById('cliente-nome').value = cliente.nome;
    document.getElementById('cliente-email').value = cliente.email || '';
    document.getElementById('cliente-telefone').value = cliente.telefone;
    document.getElementById('cliente-cpf').value = cliente.cpf || '';
    document.getElementById('cliente-endereco').value = cliente.endereco || '';
    document.getElementById('cliente-cidade').value = cliente.cidade || '';
    document.getElementById('cliente-estado').value = cliente.estado || '';
    document.getElementById('cliente-observacoes').value = cliente.observacoes || '';
    document.getElementById('cliente-status').checked = cliente.ativo !== false;
    
    document.getElementById('modal-cliente').style.display = 'flex';
}

// Fechar modal de cliente
function fecharModalCliente() {
    document.getElementById('modal-cliente').style.display = 'none';
}

// Salvar cliente (novo ou edição)
async function salvarCliente() {
    if (!validarFormularioCliente()) return;
    
    try {
        mostrarLoading(true);
        
        const formData = {
            nome: document.getElementById('cliente-nome').value,
            email: document.getElementById('cliente-email').value || null,
            telefone: document.getElementById('cliente-telefone').value,
            cpf: document.getElementById('cliente-cpf').value || null,
            endereco: document.getElementById('cliente-endereco').value || null,
            cidade: document.getElementById('cliente-cidade').value || null,
            estado: document.getElementById('cliente-estado').value || null,
            observacoes: document.getElementById('cliente-observacoes').value || null,
            ativo: document.getElementById('cliente-status').checked
        };
        
        const sessionToken = localStorage.getItem('session_token');
        let url = 'http://localhost:8001/api/clientes';
        let method = 'POST';
        
        // Se estiver editando, altera a URL e o método
        if (clienteEditando) {
            url += `/${clienteEditando.id}`;
            method = 'PUT';
        }
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': sessionToken
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const resultado = await response.json();
        
        // Salvar também localmente como backup
        salvarClienteLocal(formData, clienteEditando?.id);
        
        alert(`Cliente ${clienteEditando ? 'atualizado' : 'cadastrado'} com sucesso!`);
        fecharModalCliente();
        carregarClientes();
        
    } catch (error) {
        console.error('❌ Erro ao salvar cliente:', error);
        alert('Erro ao salvar cliente. Verifique o console para mais detalhes.');
    } finally {
        mostrarLoading(false);
    }
}

// Salvar cliente no localStorage (fallback)
function salvarClienteLocal(dados, clienteId = null) {
    try {
        let clientesLocal = JSON.parse(localStorage.getItem('clientes')) || [];
        
        if (clienteId) {
            // Editar cliente existente
            const index = clientesLocal.findIndex(c => c.id == clienteId);
            if (index !== -1) {
                clientesLocal[index] = { ...clientesLocal[index], ...dados };
            }
        } else {
            // Novo cliente
            const novoCliente = {
                id: Date.now().toString(),
                data_cadastro: new Date().toISOString(),
                ...dados
            };
            clientesLocal.push(novoCliente);
        }
        
        localStorage.setItem('clientes', JSON.stringify(clientesLocal));
    } catch (error) {
        console.error('Erro ao salvar cliente no localStorage:', error);
    }
}

// Validar formulário de cliente
function validarFormularioCliente() {
    const nome = document.getElementById('cliente-nome').value.trim();
    const telefone = document.getElementById('cliente-telefone').value.trim();
    
    if (!nome) {
        alert('Por favor, informe o nome do cliente.');
        return false;
    }
    
    if (!telefone) {
        alert('Por favor, informe o telefone do cliente.');
        return false;
    }
    
    // Validar CPF se informado
    const cpf = document.getElementById('cliente-cpf').value.trim();
    if (cpf && !validarCPF(cpf)) {
        alert('Por favor, informe um CPF válido.');
        return false;
    }
    
    return true;
}

// Validar CPF
function validarCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    
    if (cpf.length !== 11) return false;
    
    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(cpf)) return false;
    
    // Validar dígitos verificadores
    let soma = 0;
    let resto;
    
    for (let i = 1; i <= 9; i++) {
        soma += parseInt(cpf.substring(i-1, i)) * (11 - i);
    }
    
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;
    
    soma = 0;
    for (let i = 1; i <= 10; i++) {
        soma += parseInt(cpf.substring(i-1, i)) * (12 - i);
    }
    
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;
    
    return true;
}

// Abrir modal de confirmação de exclusão
function abrirModalConfirmacaoExclusao(clienteId, clienteNome) {
    document.getElementById('nome-cliente-exclusao').textContent = clienteNome;
    document.getElementById('btn-confirmar-exclusao').setAttribute('data-id', clienteId);
    document.getElementById('modal-confirmacao').style.display = 'flex';
}

// Fechar modal de confirmação
function fecharModalConfirmacao() {
    document.getElementById('modal-confirmacao').style.display = 'none';
}

// Confirmar exclusão de cliente
async function confirmarExclusaoCliente() {
    const clienteId = document.getElementById('btn-confirmar-exclusao').getAttribute('data-id');
    
    try {
        mostrarLoading(true);
        
        const sessionToken = localStorage.getItem('session_token');
        const response = await fetch(`http://localhost:8001/api/clientes/${clienteId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': sessionToken
            }
        });
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        // Remover também localmente
        removerClienteLocal(clienteId);
        
        alert('Cliente excluído com sucesso!');
        fecharModalConfirmacao();
        carregarClientes();
        
    } catch (error) {
        console.error('❌ Erro ao excluir cliente:', error);
        alert('Erro ao excluir cliente. Verifique o console para mais detalhes.');
    } finally {
        mostrarLoading(false);
    }
}

// Remover cliente do localStorage (fallback)
function removerClienteLocal(clienteId) {
    try {
        let clientesLocal = JSON.parse(localStorage.getItem('clientes')) || [];
        clientesLocal = clientesLocal.filter(c => c.id != clienteId);
        localStorage.setItem('clientes', JSON.stringify(clientesLocal));
    } catch (error) {
        console.error('Erro ao remover cliente do localStorage:', error);
    }
}

// Formatador de data
function formatarData(dataString) {
    if (!dataString) return '-';
    
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR');
}

// Mostrar/ocultar estado de carregamento
function mostrarLoading(mostrar) {
    const mainContent = document.querySelector('.main-content');
    if (mostrar) {
        mainContent.classList.add('loading');
    } else {
        mainContent.classList.remove('loading');
    }
}

console.log("🎉 Gerenciamento de clientes inicializado com sucesso!");