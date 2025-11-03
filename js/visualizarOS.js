console.log("📋 Script Visualizar OS carregado, aguardando DOM...");

// Variáveis globais
let ordensServico = [];
let paginaAtual = 1;
const itensPorPagina = 10;
let filtroStatus = '';
let filtroBusca = '';
let filtroData = '';

// =============================================
// FUNÇÕES PRINCIPAIS - DEFINIDAS PRIMEIRO
// =============================================

// Função para editar OS - DEFINIDA NO INÍCIO
async function editarOS(osId) {
    try {
        console.log('✏️ Editando OS:', osId);
        
        // Fechar modal de detalhes se estiver aberto
        fecharModalDetalhes();
        
        // Buscar dados completos da OS
        const sessionToken = localStorage.getItem('session_token');
        const response = await fetch(`http://localhost:8001/api/os/${osId}`, {
            method: 'GET',
            headers: {
                'Authorization': sessionToken,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao carregar OS para edição');
        }
        
        const os = await response.json();
        console.log('📋 Dados da OS para edição:', os);
        
        // Abrir modal de edição
        abrirModalEdicao(os);
        
    } catch (error) {
        console.error('❌ Erro ao editar OS:', error);
        alert('Erro ao carregar OS para edição: ' + error.message);
    }
}

// Função para editar OS do botão do modal
function editarOSDoModal() {
    const modalDetalhes = document.getElementById('modal-detalhes-os');
    const osId = modalDetalhes.getAttribute('data-os-id');
    
    if (osId) {
        fecharModalDetalhes();
        editarOS(osId);
    } else {
        alert('ID da OS não encontrado');
    }
}

// Aguardar o DOM carregar completamente
document.addEventListener('DOMContentLoaded', function() {
    console.log("✅ DOM pronto - Inicializando Visualizar OS");
    
    document.getElementById('modal-detalhes-os').style.display = 'none';
    // Inicializar a página
    inicializarPagina();
    
    // Configurar event listeners
    configurarEventListeners();
});

// Função para inicializar a página
function inicializarPagina() {
    carregarOrdensServico();
    atualizarEstatisticas();
}

// Função para configurar os event listeners
function configurarEventListeners() {
    // 🎯 GARANTIR QUE O MODAL ESTÁ FECHADO AO INICIAR
    document.getElementById('modal-detalhes-os').style.display = 'none';
    
    // Botões de ação
    document.getElementById('btn-atualizar').addEventListener('click', carregarOrdensServico);
    document.getElementById('btn-pesquisar').addEventListener('click', aplicarFiltros);
    document.getElementById('btn-limpar').addEventListener('click', limparFiltros);
    document.getElementById('btn-imprimir-lista').addEventListener('click', imprimirLista);
    document.getElementById('btn-exportar').addEventListener('click', exportarOS);
    
    // Filtros
    document.getElementById('filter-status').addEventListener('change', function() {
        filtroStatus = this.value;
        aplicarFiltros();
    });
    
    document.getElementById('filter-data').addEventListener('change', function() {
        filtroData = this.value;
        const customDate = document.getElementById('custom-date');
        
        if (filtroData === 'custom') {
            customDate.classList.add('show');
        } else {
            customDate.classList.remove('show');
        }
        
        aplicarFiltros();
    });
    
    document.getElementById('search-input').addEventListener('input', function(e) {
        if (e.target.value.length === 0) {
            filtroBusca = '';
            aplicarFiltros();
        } else if (e.target.value.length >= 3) {
            filtroBusca = e.target.value;
            aplicarFiltros();
        }
    });
    
    // Modal detalhes
    document.getElementById('fechar-detalhes').addEventListener('click', fecharModalDetalhes);
    document.getElementById('btn-fechar-detalhes').addEventListener('click', fecharModalDetalhes);
    document.getElementById('btn-imprimir-os').addEventListener('click', function() {

     imprimirOS();
    })
    document.getElementById('btn-editar-os').addEventListener('click', editarOSDoModal); // ✅ CORRIGIDO
    
    // Fechar modal clicando fora
    document.getElementById('modal-detalhes-os').addEventListener('click', function(e) {
        if (e.target === this) fecharModalDetalhes();
    });

    
}

// Carregar do servidor
async function carregarOrdensServico() {
    try {
        mostrarLoading(true);
        
        const sessionToken = localStorage.getItem('session_token');
        if (!sessionToken) {
            throw new Error('Token de sessão não encontrado');
        }
        
        // Construir URL com parâmetros
        const params = new URLSearchParams();
        params.append('pagina', paginaAtual);
        params.append('limite', itensPorPagina);
        
        if (filtroStatus) {
            params.append('status', filtroStatus);
        }
        
        if (filtroBusca) {
            params.append('busca', filtroBusca);
        }
        
        const url = `http://localhost:8001/api/os?${params.toString()}`;
        console.log('🔗 Buscando OS:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': sessionToken,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                // Sessão expirada
                window.location.href = 'login.html';
                return;
            }
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        ordensServico = data.ordens || [];
        
        console.log('✅ OS carregadas do servidor:', ordensServico.length);
        console.log('📋 Primeira OS:', ordensServico[0]); // Debug
        
        renderizarTabelaOS();
        atualizarEstatisticas();
        
    } catch (error) {
        console.error('❌ Erro ao carregar OS do servidor:', error);
        
        // Fallback para localStorage
        console.log('🔄 Tentando carregar do localStorage...');
        ordensServico = carregarDoLocalStorage();
        renderizarTabelaOS();
        atualizarEstatisticas();
        
        // Mostrar aviso se estiver usando dados locais
        if (ordensServico.length > 0) {
            mostrarAvisoOffline();
        }
    } finally {
        mostrarLoading(false);
    }
}

// Carregar OS específica para detalhes
async function carregarDetalhesOS(osId) {
    try {
        const sessionToken = localStorage.getItem('session_token');
        
        const response = await fetch(`http://localhost:8001/api/os/${osId}`, {
            method: 'GET',
            headers: {
                'Authorization': sessionToken,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            return await response.json();
        }
        return null;
        
    } catch (error) {
        console.error('Erro ao carregar detalhes da OS:', error);
        return null;
    }
}

// Atualizar status da OS
async function atualizarStatusOS(osId, novoStatus) {
    try {
        const sessionToken = localStorage.getItem('session_token');
        
        console.log(`🔄 Atualizando status da OS ${osId} para: ${novoStatus}`);
        
        const response = await fetch(`http://localhost:8001/api/os/${osId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': sessionToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: novoStatus })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Erro HTTP ${response.status}:`, errorText);
            
            if (response.status === 500) {
                throw new Error('Erro interno do servidor. Tente novamente.');
            } else if (response.status === 404) {
                throw new Error('OS não encontrada.');
            } else if (response.status === 403) {
                throw new Error('Não autorizado a atualizar esta OS.');
            } else {
                throw new Error(`Erro: ${response.status} - ${errorText}`);
            }
        }
        
        const resultado = await response.json();
        console.log('✅ Status atualizado com sucesso:', resultado);
        return resultado;
        
    } catch (error) {
        console.error('❌ Erro ao atualizar status:', error);
        throw error;
    }
}

// Abrir modal de detalhes - VERSÃO CONECTADA
async function abrirModalDetalhes(osId) {
    try {
        mostrarLoading(true);
        
        // Tentar carregar do servidor
        let os = await carregarDetalhesOS(osId);
        
        if (!os) {
            // Fallback para localStorage
            os = ordensServico.find(o => (o.id || o.numero) == osId);
            
            if (!os) {
                alert('OS não encontrada!');
                return;
            }
        }
        
        // 🎯 ARMAZENAR ID NO MODAL
        document.getElementById('modal-detalhes-os').setAttribute('data-os-id', os.id || os.numero);
        
        preencherModalDetalhes(os);
        document.getElementById('modal-detalhes-os').style.display = 'flex';
        
    } catch (error) {
        console.error('Erro ao abrir detalhes:', error);
        alert('Erro ao carregar detalhes da OS');
    } finally {
        mostrarLoading(false);
    }
}

// Preencher modal de detalhes

// Preencher modal de detalhes - ATUALIZADO COM DATA DE ENTREGA
function preencherModalDetalhes(os) {
    // ✅ FORMATAR DATA DE ENTREGA PARA O MODAL - CORREÇÃO
    const dataEntregaFormatada = (os.data_entrega && os.data_entrega !== 'None' && os.data_entrega !== 'null') 
        ? formatarDataHora(os.data_entrega)
        : '<span style="color: #6c757d; font-style: italic;">Não entregue</span>';
    
    document.getElementById('detalhes-os-content').innerHTML = `
        <div class="detalhes-os">
            <div>
                <div class="detalhes-group">
                    <h4>Informações da OS</h4>
                    <p><strong>Número:</strong> ${os.numero_os || os.numero}</p>
                    <p><strong>Data Entrada:</strong> ${formatarData(os.data_entrada || os.data)}</p>
                    <p><strong>Data Entrega:</strong> ${dataEntregaFormatada}</p> <!-- ✅ ADICIONADO -->
                    <p><strong>Status:</strong> 
                        <select id="status-os" class="status-select">
                            <option value="pendente" ${(os.status || 'pendente') === 'pendente' ? 'selected' : ''}>Pendente</option>
                            <option value="andamento" ${(os.status || 'pendente') === 'andamento' ? 'selected' : ''}>Em Andamento</option>
                            <option value="concluida" ${(os.status || 'pendente') === 'concluida' ? 'selected' : ''}>Concluída</option>
                            <option value="entregue" ${(os.status || 'pendente') === 'entregue' ? 'selected' : ''}>Entregue</option>
                            <option value="cancelada" ${(os.status || 'pendente') === 'cancelada' ? 'selected' : ''}>Cancelada</option>
                        </select>
                    </p>
                    <p><strong>Orçamento:</strong> R$ ${parseFloat(os.orcamento || 0).toFixed(2)}</p>
                    ${os.data_conclusao ? `<p><strong>Data Conclusão:</strong> ${formatarData(os.data_conclusao)}</p>` : ''}
                </div>
                
                <div class="detalhes-group">
                    <h4>Informações do Cliente</h4>
                    <p><strong>Nome:</strong> ${os.cliente_nome || os.nome}</p>
                    <p><strong>Telefone:</strong> ${os.cliente_telefone || os.telefone}</p>
                    <p><strong>CPF:</strong> ${os.cpf || 'Não informado'}</p>
                </div>
            </div>
            
            <div>
                <div class="detalhes-group">
                    <h4>Equipamento</h4>
                    <p><strong>Equipamento:</strong> ${os.equipamento || 'Celular'}</p>
                    <p><strong>Marca:</strong> ${os.marca || 'N/A'}</p>
                    <p><strong>Modelo:</strong> ${os.modelo || 'N/A'}</p>
                    <p><strong>Defeito Relatado:</strong> ${os.defeito_relatado || os.defeito || 'N/A'}</p>
                </div>
                
                <div class="detalhes-group">
                    <h4>Observações</h4>
                    <p>${os.observacoes || 'Nenhuma observação'}</p>
                </div>
                
                ${os.usuario_nome ? `
                <div class="detalhes-group">
                    <h4>Responsável</h4>
                    <p><strong>Técnico:</strong> ${os.usuario_nome}</p>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    // Adicionar evento para mudança de status
    document.getElementById('status-os').addEventListener('change', function() {
        const novoStatus = this.value;
        atualizarStatusNoModal(os.id || os.numero, novoStatus);
    });
}

function formatarDataHora(dataString) {
    if (!dataString) return '-';
    
    try {
        const data = new Date(dataString);
        return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dataString;
    }
}
// Atualizar status no modal
async function atualizarStatusNoModal(osId, novoStatus) {
    try {
        console.log(`🔄 Atualizando status no modal: OS ${osId} -> ${novoStatus}`);
        
        const resultado = await atualizarStatusOS(osId, novoStatus);
        
        if (resultado.success) {
            // Atualizar a lista
            await carregarOrdensServico();
            
            // Atualizar badge no modal
            const statusSelect = document.getElementById('status-os');
            if (statusSelect) {
                statusSelect.value = novoStatus;
                
                // Atualizar também o badge visual se existir
                const statusBadge = document.querySelector('.status-badge');
                if (statusBadge) {
                    statusBadge.className = `status-badge status-${novoStatus}`;
                    statusBadge.textContent = formatarStatus(novoStatus);
                }
            }
            
            console.log('✅ Status atualizado com sucesso no modal');
        }
    } catch (error) {
        console.error('❌ Erro ao atualizar status no modal:', error);
        
        // Reverter o select para o valor anterior
        const statusSelect = document.getElementById('status-os');
        if (statusSelect) {
            // Buscar o status atual da OS para reverter
            const os = ordensServico.find(o => (o.id || o.numero) == osId);
            if (os) {
                statusSelect.value = os.status || 'pendente';
            }
        }
        
        alert('❌ Erro ao atualizar status: ' + error.message);
    }
}

// Mostrar aviso offline
function mostrarAvisoOffline() {
    const aviso = document.createElement('div');
    aviso.className = 'aviso-offline';
    aviso.innerHTML = `
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 4px; margin: 10px 0;">
            <i class="fas fa-wifi"></i> Modo offline - Mostrando dados locais. 
            Algumas funcionalidades podem estar limitadas.
        </div>
    `;
    
    const contentWrapper = document.querySelector('.content-wrapper');
    contentWrapper.insertBefore(aviso, contentWrapper.firstChild);
    
    // Remover após 5 segundos
    setTimeout(() => {
        aviso.remove();
    }, 5000);
}

// Função para imprimir OS - VERSÃO UNIFICADA (usa template da Nova OS)
function imprimirOS() {
    try {
        console.log('🖨️ Iniciando processo de impressão...');
        
        let os;
        const modalDetalhes = document.getElementById('modal-detalhes-os');
        
        // Verificar se estamos no modal de detalhes (Visualizar OS)
        if (modalDetalhes && modalDetalhes.style.display === 'flex') {
            const osId = modalDetalhes.getAttribute('data-os-id');
            console.log('📋 Modo: Visualizar OS - ID:', osId);
            
            if (!osId) {
                alert('❌ Não foi possível identificar a OS para impressão');
                return;
            }
            
            // Buscar dados da OS da lista carregada
            os = ordensServico.find(o => (o.id || o.numero) == osId);
            if (!os) {
                alert('❌ OS não encontrada para impressão');
                return;
            }
            
            // Usar template idêntico ao da Nova OS
            imprimirOSTemplateNovaOS(os);
        } 
        // Se não está no modal de detalhes, verificar se está na tela de Nova OS
        else if (document.getElementById('form-os')) {
            console.log('📋 Modo: Nova OS - Usando impressão existente');
            // A função salvarEImprimirOS já cuida da impressão na Nova OS
            salvarEImprimirOS();
        }
        else {
            alert('❌ Contexto de impressão não identificado');
            return;
        }
        
    } catch (error) {
        console.error('❌ Erro ao imprimir OS:', error);
        alert('Erro ao gerar impressão: ' + error.message);
    }
}

// Função de impressão usando template idêntico ao da Nova OS
function imprimirOSTemplateNovaOS(os) {
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    const dataEntrada = formatarData(os.data_entrada || os.data || new Date());
    
    const conteudoImpressao = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Ordem de Serviço - ${os.numero_os || os.numero}</title>
            <style>
                /* ===== ESTILOS IDÊNTICOS À NOVA OS ===== */
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                }

                body {
                    background: white !important;
                    color: black !important;
                    margin: 20px;
                    padding: 20px;
                    border: 1px solid #ddd;
                    max-width: 800px;
                    margin: 20px auto;
                    font-size: 14px;
                    line-height: 1.4;
                }

                .no-print { 
                    display: none !important; 
                }
                
                /* CABEÇALHO DA EMPRESA - ESTILO B.C IMPORTS */
                .company-header {
                    width: 100%;
                    text-align: center;
                    font-family: Arial, sans-serif;
                    border-bottom: 2px solid #000;
                    padding-bottom: 12px;
                    margin-bottom: 25px;
                    line-height: 1.3;
                }

                .company-logo {
                    width: 70px;
                    height: 70px;
                    object-fit: contain;
                    border-radius: 8px;
                    margin-bottom: 10px;
                }

                .company-header h1 {
                    font-size: 24px;
                    font-weight: bold;
                    margin-bottom: 5px;
                    text-transform: uppercase;
                    color: #2c3e50;
                }

                .company-header h2 {
                    font-size: 16px;
                    margin-bottom: 8px;
                    color: #7f8c8d;
                    font-weight: 600;
                }

                .company-header p {
                    margin: 3px 0;
                    font-size: 13px;
                }

                .contact-info {
                    font-size: 14px;
                    margin-bottom: 4px;
                    color: #34495e;
                    line-height: 1.4;
                }

                .contact-info p {
                    margin: 2px 0;
                    font-size: 13px;
                }

                /* CABEÇALHO DA OS */
                .print-header {
                    text-align: center;
                    margin-bottom: 20px;
                    border-bottom: 2px solid #3498db;
                    padding-bottom: 15px;
                }

                .print-header h2 {
                    margin: 0;
                    font-size: 18px;
                    color: #2c3e50;
                }

                .print-header p {
                    margin: 3px 0;
                    font-size: 14px;
                    font-weight: bold;
                }

                /* SEÇÕES */
                .print-section {
                    margin-bottom: 20px;
                    padding: 15px;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    background: #f8f9fa;
                }

                .print-section h3 {
                    margin: 0 0 12px 0;
                    color: #2c3e50;
                    font-size: 16px;
                    border-bottom: 1px solid #ddd;
                    padding-bottom: 8px;
                }

                .print-label {
                    font-weight: bold;
                    display: inline-block;
                    width: 120px;
                    font-size: 14px;
                    color: #2c3e50;
                }

                /* SENHAS */
                .password-row {
                    display: flex;
                    align-items: center;
                    margin-bottom: 15px;
                    padding: 12px;
                    background: white;
                    border-radius: 8px;
                    border: 1px solid #e0e0e0;
                }

                .password-row strong {
                    width: 140px;
                    font-size: 14px;
                    color: #2c3e50;
                    font-weight: 600;
                }

                /* Grid 3x3 para senha padrão */
                .password-grid-3x3 {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    grid-template-rows: repeat(3, 1fr);
                    gap: 8px;
                    margin-left: 15px;
                    width: 120px;
                    height: 120px;
                }

                .password-dot {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 30px;
                    height: 30px;
                    background-color: transparent;
                    border: 2px solid #2c3e50;
                    border-radius: 50%;
                    font-size: 18px;
                    font-weight: bold;
                    color: #2c3e50;
                    position: relative;
                }

                .password-field {
                    border-bottom: 2px solid #34495e;
                    min-width: 200px;
                    padding: 4px 8px;
                    margin-left: 15px;
                    font-size: 14px;
                    height: 24px;
                    color: #2c3e50;
                    font-weight: 500;
                }

                /* GARANTIA */
                .guarantee-section {
                    background: #fff3cd !important;
                    border: 1px solid #ffeaa7 !important;
                }

                .guarantee-options {
                    display: flex;
                    gap: 20px;
                    margin: 8px 0;
                }

                .guarantee-option {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }

                .guarantee-checkbox {
                    width: 14px;
                    height: 14px;
                    border: 1px solid #000;
                    border-radius: 2px;
                    display: inline-block;
                }

                .exclusion-list {
                    font-size: 11px;
                    line-height: 1.3;
                    margin: 8px 0;
                }

                .exclusion-item {
                    display: flex;
                    margin-bottom: 2px;
                }

                .exclusion-number {
                    min-width: 15px;
                    font-weight: bold;
                }

                .guarantee-note {
                    margin-top: 10px;
                    padding: 6px;
                    background: #fff3cd;
                    border: 1px solid #ffeaa7;
                    border-radius: 4px;
                    font-size: 10px;
                    line-height: 1.2;
                }

                /* BOTÕES */
                .actions {
                    margin-top: 20px;
                    text-align: center;
                }

                button {
                    padding: 8px 16px;
                    margin: 0 5px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    background: #f8f9fa;
                    cursor: pointer;
                    font-size: 14px;
                }

                button:hover {
                    background: #e9ecef;
                }

                /* ===== ESTILOS DE IMPRESSÃO ===== */
                @media print {
                    body * {
                        visibility: hidden;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    
                    body {
                        background: white !important;
                        font-size: 12px !important;
                        line-height: 1.2 !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }

                    #os-print,
                    #os-print * {
                        visibility: visible;
                    }

                    #os-print {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        padding: 15px !important;
                        margin: 0 !important;
                        background: white !important;
                        color: black !important;
                        font-size: 12px !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        max-width: none !important;
                        border: none !important;
                    }

                    .no-print {
                        display: none !important;
                    }

                    /* CABEÇALHO PARA IMPRESSÃO */
                    .company-header {
                        border-bottom: 2px solid #000 !important;
                        padding-bottom: 8px !important;
                        margin-bottom: 12px !important;
                        line-height: 1.1 !important;
                    }

                    .company-logo {
                        width: 70px !important;
                        height: 50px !important;
                        margin-bottom: 5px !important;
                    }

                    .company-header h1 {
                        font-size: 18px !important;
                        margin-bottom: 3px !important;
                        color: black !important;
                    }

                    .company-header h2 {
                        font-size: 14px !important;
                        margin-bottom: 3px !important;
                        color: black !important;
                    }

                    .company-header p {
                        font-size: 11px !important;
                        margin: 1px 0 !important;
                    }

                    .contact-info p {
                        font-size: 11px !important;
                        margin: 1px 0 !important;
                    }

                    /* CABEÇALHO OS */
                    .print-header {
                        margin-bottom: 12px !important;
                        padding-bottom: 8px !important;
                        border-bottom: 1px solid #000 !important;
                    }

                    .print-header h2 {
                        font-size: 16px !important;
                    }

                    .print-header p {
                        font-size: 12px !important;
                    }

                    /* SEÇÕES */
                    .print-section {
                        margin-bottom: 8px !important;
                        padding: 8px !important;
                        page-break-inside: avoid !important;
                        border: 1px solid #ccc !important;
                        background: white !important;
                    }

                    .print-section h3 {
                        font-size: 13px !important;
                        margin-bottom: 6px !important;
                        border-bottom: 1px solid #000 !important;
                    }

                    .print-label {
                        width: 100px !important;
                        font-size: 11px !important;
                    }

                    /* SENHAS */
                    .password-row {
                        margin-bottom: 6px !important;
                        padding: 4px !important;
                        background: white !important;
                    }

                    .password-row strong {
                        width: 100px !important;
                        font-size: 11px !important;
                    }

                    .password-grid-3x3 {
                        gap: 6px !important;
                        width: 100px !important;
                        height: 100px !important;
                    }

                    .password-dot {
                        width: 25px !important;
                        height: 25px !important;
                        border: 1px solid #000 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    .password-field {
                        border-bottom: 1px solid #000 !important;
                        font-size: 12px !important;
                        height: 25px !important;
                        min-width: 150px !important;
                    }

                    /* GARANTIA - ESTILOS DE IMPRESSÃO */
                    .guarantee-section {
                        background: #fff3cd !important;
                        border: 1px solid #ffeaa7 !important;
                    }

                    .guarantee-options {
                        gap: 15px !important;
                        margin: 6px 0 !important;
                    }

                    .exclusion-list {
                        font-size: 10px !important;
                        line-height: 1.2 !important;
                    }

                    .exclusion-item {
                        margin-bottom: 1px !important;
                    }

                    .guarantee-note {
                        font-size: 9px !important;
                        padding: 4px !important;
                        margin-top: 6px !important;
                    }

                    /* REMOVER TODOS OS EFEITOS VISUAIS */
                    #os-print {
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        background: white !important;
                    }

                    /* GARANTIR QUE NÃO HAJA QUEBRAS DESNECESSÁRIAS */
                    .page-break {
                        page-break-inside: avoid !important;
                    }

                    /* EVITAR QUEBRA DE PÁGINA DENTRO DE SEÇÕES IMPORTANTES */
                    .print-section,
                    .company-header,
                    .password-row,
                    .guarantee-section {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                }
            </style>
        </head>
        <body>
            <!-- ÁREA DE IMPRESSÃO IDÊNTICA À NOVA OS -->
            <div id="os-print">
                <!-- CABEÇALHO OS -->
                <div class="company-header">
                    <img src="../img/logobcimports.jpeg" alt="Logo B.C Imports" class="company-logo">
                    <h1>B.C IMPORTS</h1>
                    <h2>ESPECIALISTAS EM CELULAR</h2>
                    <p>Manutenção de Celulares e Serviços Técnicos</p>
                    <div class="contact-info">
                        <p><strong>FONE:</strong> 33 99872-9384</p>
                        <p><strong>INSTAGRAM:</strong> @bcimportsteo</p>
                        <p><strong>ENDEREÇO:</strong> AVENIDA GETÚLIO VARGAS, 110</p>
                        <p><strong>CEP:</strong> 39802-414 - TEÓFILO OTONI - MG</p>
                    </div>
                </div>

                <div class="print-header">
                    <h2>ORDEM DE SERVIÇO</h2>
                    <p>N° <span id="os-number">${os.numero_os || os.numero || '0000'}</span> - <span id="os-date">${dataAtual}</span></p>
                </div>

                <div class="print-section">
                    <h3>DADOS DO CLIENTE</h3>
                    <p><span class="print-label">Nome:</span> <span id="print-nome">${os.cliente_nome || os.nome || '-'}</span></p>
                    <p><span class="print-label">Telefone:</span> <span id="print-telefone">${os.cliente_telefone || os.telefone || '-'}</span></p>
                    <p><span class="print-label">CPF:</span> <span id="print-cpf">${os.cpf || '-'}</span></p>
                </div>

                <div class="print-section">
                    <h3>DADOS DO APARELHO</h3>
                    <p><span class="print-label">Marca:</span> <span id="print-marca">${os.marca || '-'}</span></p>
                    <p><span class="print-label">Modelo:</span> <span id="print-modelo">${os.modelo || '-'}</span></p>
                </div>

                <!-- SENHAS -->
                <div class="print-section">
                    <h3>SENHAS</h3>

                    <div class="password-row">
                        <strong>Senha Padrão:</strong>
                        <div class="password-grid-3x3">
                            <span class="password-dot"></span>
                            <span class="password-dot"></span>
                            <span class="password-dot"></span>
                            <span class="password-dot"></span>
                            <span class="password-dot"></span>
                            <span class="password-dot"></span>
                            <span class="password-dot"></span>
                            <span class="password-dot"></span>
                            <span class="password-dot"></span>
                        </div>
                    </div>

                    <div class="password-row">
                        <strong>Senha Normal:</strong>
                        <span id="print-senha-normal" class="password-field"></span>
                    </div>
                </div>

                <div class="print-section">
                    <h3>DEFEITO RELATADO</h3>
                    <p id="print-defeito">${os.defeito_relatado || os.defeito || '-'}</p>
                </div>

                <div class="print-section">
                    <h3>OBSERVAÇÕES</h3>
                    <p id="print-observacoes">${os.observacoes || '-'}</p>
                </div>

                <div class="print-section">
                    <h3>ORÇAMENTO</h3>
                    <p>R$ <span id="print-orcamento">${parseFloat(os.orcamento || 0).toFixed(2)}</span></p>
                </div>

                <!-- GARANTIA -->
                <div class="print-section guarantee-section">
                    <h3>TERMOS DE GARANTIA</h3>

                    <div style="margin-bottom: 12px;">
                        <strong>Período de Garantia:</strong>
                        <div class="guarantee-options">
                            <div class="guarantee-option">
                                <span class="guarantee-checkbox"></span>
                                <span>3 Meses</span>
                            </div>
                            <div class="guarantee-option">
                                <span class="guarantee-checkbox"></span>
                                <span>6 Meses</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <strong style="display: block; margin-bottom: 6px; font-size: 12px;">A GARANTIA NÃO COBRE:</strong>
                        <div class="exclusion-list">
                            <div class="exclusion-item">
                                <span class="exclusion-number">1.</span>
                                <span>TELA QUEBRADA</span>
                            </div>
                            <div class="exclusion-item">
                                <span class="exclusion-number">2.</span>
                                <span>PRESSÃO SOBRE O APARELHO</span>
                            </div>
                            <div class="exclusion-item">
                                <span class="exclusion-number">3.</span>
                                <span>CONTATO COM LÍQUIDOS</span>
                            </div>
                            <div class="exclusion-item">
                                <span class="exclusion-number">4.</span>
                                <span>REPARO POR TERCEIROS</span>
                            </div>
                            <div class="exclusion-item">
                                <span class="exclusion-number">5.</span>
                                <span>EXPOSIÇÃO EM ALTAS TEMPERATURAS</span>
                            </div>
                            <div class="exclusion-item">
                                <span class="exclusion-number">6.</span>
                                <span>FALHAS POR ATUALIZAÇÃO</span>
                            </div>
                        </div>
                    </div>

                    <div class="guarantee-note">
                        <strong>Observação:</strong> A garantia é válida apenas para o defeito originalmente reparado e não
                        cobre danos acidentais, mau uso ou intervenções de terceiros.
                    </div>
                </div>

                <div class="print-section">
                    <p><strong>Data de Entrada:</strong> <span id="print-data-entrada">${dataEntrada}</span></p>
                    <p style="margin-top:30px;">_________________________________________</p>
                    <p>Assinatura do Cliente</p>
                </div>

                <div class="actions no-print">
                    <button type="button" onclick="window.print()">Imprimir OS</button>
                    <button type="button" onclick="fecharJanelaImpressao()">Fechar</button>
                </div>
            </div>

            <script>
                // Função para fechar a janela de impressão
                function fecharJanelaImpressao() {
                    window.close();
                }
                
                // Imprimir automaticamente quando a janela carregar
                window.onload = function() {
                    setTimeout(() => {
                        window.print();
                    }, 500);
                };
                
                // Fechar a janela após impressão (ou se o usuário cancelar)
                window.onafterprint = function() {
                    setTimeout(() => {
                        window.close();
                    }, 1000);
                };
            </script>
        </body>
        </html>
    `;
    
    // Abrir janela de impressão
    abrirJanelaImpressao(conteudoImpressao);
}

// Função para abrir janela de impressão
function abrirJanelaImpressao(conteudo) {
    const janelaImpressao = window.open('', '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
    
    if (!janelaImpressao) {
        alert('❌ Por favor, permita pop-ups para esta funcionalidade');
        return;
    }
    
    janelaImpressao.document.open();
    janelaImpressao.document.write(conteudo);
    janelaImpressao.document.close();
}

// Função auxiliar para formatação de data
function formatarData(dataString) {
    if (!dataString) return 'N/A';
    
    try {
        const data = new Date(dataString);
        return data.toLocaleDateString('pt-BR');
    } catch {
        return dataString;
    }
}

// Função auxiliar para formatação de status
function formatarStatus(status) {
    const statusMap = {
        'pendente': 'Pendente',
        'andamento': 'Em Andamento',
        'concluida': 'Concluída',
        'entregue': 'Entregue',
        'cancelada': 'Cancelada'
    };
    
    return statusMap[status] || status;
}



// Renderizar tabela de OS
function renderizarTabelaOS() {
    const tbody = document.getElementById('corpo-tabela-os');
    tbody.innerHTML = '';
    
    // Aplicar filtros
    let osFiltradas = aplicarFiltrosOS(ordensServico);
    
    if (osFiltradas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="no-data">
                    ${filtroBusca || filtroStatus || filtroData ? 
                      'Nenhuma OS encontrada com os filtros aplicados' : 
                      'Nenhuma ordem de serviço cadastrada'}
                </td>
            </tr>
        `;
        return;
    }
    
    // Paginação
    const totalPaginas = Math.ceil(osFiltradas.length / itensPorPagina);
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const osPagina = osFiltradas.slice(inicio, fim);
    
    osPagina.forEach(os => {
        const tr = document.createElement('tr');
        
        // ✅ FORMATAR DATA DE ENTREGA - CORREÇÃO
        const dataEntregaFormatada = (os.data_entrega && os.data_entrega !== 'None' && os.data_entrega !== 'null') 
            ? formatarData(os.data_entrega)
            : '<span style="color: #6c757d; font-style: italic;">-</span>';
        
        tr.innerHTML = `
            <td><strong>${os.numero_os || os.numero || 'N/A'}</strong></td>
            <td>${os.cliente_nome || os.nome || 'N/A'}</td>
            <td>${os.cliente_telefone || os.telefone || 'N/A'}</td>
            <td>${os.marca || 'N/A'} ${os.modelo || ''}</td>
            <td title="${os.defeito_relatado || os.defeito || ''}">
                ${(os.defeito_relatado || os.defeito || '').substring(0, 30)}...
            </td>
            <td>${formatarData(os.data_entrada || os.data)}</td>
            <td>${dataEntregaFormatada}</td> <!-- ✅ NOVA COLUNA DATA ENTREGA -->
            <td>
                <span class="status-badge status-${os.status || 'pendente'}">
                    ${formatarStatus(os.status || 'pendente')}
                </span>
            </td>
            <td>R$ ${parseFloat(os.orcamento || 0).toFixed(2)}</td>
            <td>
                <button class="btn btn-outline btn-sm btn-detalhes" data-id="${os.id || os.numero}">
                    <i class="fas fa-eye"></i> Detalhes
                </button>
                <button class="btn btn-warning btn-sm btn-editar" data-id="${os.id || os.numero}">
                    <i class="fas fa-edit"></i> Editar
                </button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    // Adicionar event listeners
    document.querySelectorAll('.btn-detalhes').forEach(btn => {
        btn.addEventListener('click', function() {
            const osId = this.getAttribute('data-id');
            abrirModalDetalhes(osId);
        });
    });
    
    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.addEventListener('click', function() {
            const osId = this.getAttribute('data-id');
            editarOS(osId);
        });
    });
    
    // Renderizar paginação
    renderizarPaginacao(osFiltradas.length, totalPaginas);
}

// Aplicar filtros às OS
// Aplicar filtros às OS - CORRIGIDA
function aplicarFiltrosOS(osList) {
    if (!osList || !Array.isArray(osList)) {
        console.error('❌ osList não é um array válido:', osList);
        return [];
    }
    
    let filtradas = [...osList];
    
    // Filtro de busca
    if (filtroBusca) {
        const busca = filtroBusca.toLowerCase();
        filtradas = filtradas.filter(os => {
            if (!os) return false;
            return (
                (os.cliente_nome || os.nome || '').toLowerCase().includes(busca) ||
                (os.cliente_telefone || os.telefone || '').includes(busca) ||
                (os.numero_os || os.numero || '').includes(busca)
            );
        });
    }
    
    // Filtro de status
    if (filtroStatus) {
        filtradas = filtradas.filter(os => os && (os.status || 'pendente') === filtroStatus);
    }
    
    // Filtro de data
    if (filtroData) {
        const hoje = new Date();
        filtradas = filtradas.filter(os => {
            if (!os) return false;
            
            const dataOS = new Date(os.data_entrada || os.data);
            
            switch (filtroData) {
                case 'hoje':
                    return dataOS.toDateString() === hoje.toDateString();
                case 'semana':
                    const semanaAtras = new Date(hoje);
                    semanaAtras.setDate(hoje.getDate() - 7);
                    return dataOS >= semanaAtras;
                case 'mes':
                    return dataOS.getMonth() === hoje.getMonth() && 
                           dataOS.getFullYear() === hoje.getFullYear();
                case 'custom':
                    const inicio = document.getElementById('data-inicio').value;
                    const fim = document.getElementById('data-fim').value;
                    if (inicio && fim) {
                        return dataOS >= new Date(inicio) && dataOS <= new Date(fim);
                    }
                    return true;
                default:
                    return true;
            }
        });
    }
    
    return filtradas;
}

// Aplicar filtros
function aplicarFiltros() {
    paginaAtual = 1;
    renderizarTabelaOS();
    atualizarEstatisticas();
}

// Limpar filtros
function limparFiltros() {
    document.getElementById('search-input').value = '';
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-data').value = '';
    document.getElementById('custom-date').classList.remove('show');
    
    filtroBusca = '';
    filtroStatus = '';
    filtroData = '';
    
    aplicarFiltros();
}

// Atualizar estatísticas
function atualizarEstatisticas() {
    const osFiltradas = aplicarFiltrosOS(ordensServico);
    
    document.getElementById('total-os').textContent = osFiltradas.length;
    document.getElementById('pendentes-os').textContent = 
        osFiltradas.filter(os => (os.status || 'pendente') === 'pendente').length;
    document.getElementById('andamento-os').textContent = 
        osFiltradas.filter(os => (os.status || 'pendente') === 'andamento').length;
    document.getElementById('concluidas-os').textContent = 
        osFiltradas.filter(os => (os.status || 'pendente') === 'concluida').length;
}

// Fechar modal de detalhes
function fecharModalDetalhes() {
    document.getElementById('modal-detalhes-os').style.display = 'none';
}

// Funções auxiliares
function formatarData(dataString) {
    if (!dataString) return 'N/A';
    
    try {
        const data = new Date(dataString);
        return data.toLocaleDateString('pt-BR');
    } catch {
        return dataString;
    }
}

function formatarStatus(status) {
    const statusMap = {
        'pendente': 'Pendente',
        'andamento': 'Em Andamento',
        'concluida': 'Concluída',
        'entregue': 'Entregue',
        'cancelada': 'Cancelada'
    };
    
    return statusMap[status] || status;
}

function mostrarLoading(mostrar) {
    // Implementar loading visual
    if (mostrar) {
        document.body.style.cursor = 'wait';
    } else {
        document.body.style.cursor = 'default';
    }
}

// Funções para implementar depois
function imprimirLista() {
    alert('Funcionalidade de impressão em desenvolvimento...');
}

function exportarOS() {
    alert('Funcionalidade de exportação em desenvolvimento...');
}


// Abrir modal de edição - VERSÃO CORRIGIDA
function abrirModalEdicao(os) {
    console.log('📝 Abrindo modal de edição para OS:', os);
    
    // Criar ou mostrar modal de edição
    let modalEdicao = document.getElementById('modal-editar-os');
    
    if (!modalEdicao) {
        // Criar modal de edição se não existir
        modalEdicao = document.createElement('div');
        modalEdicao.id = 'modal-editar-os';
        modalEdicao.className = 'modal';
        modalEdicao.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h3>Editar Ordem de Serviço - ${os.numero_os || os.numero}</h3>
                    <button class="close-btn" id="fechar-edicao">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="form-editar-os">
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="editar-nome">Nome do Cliente *</label>
                                <input type="text" id="editar-nome" value="${os.cliente_nome || os.nome || ''}" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="editar-telefone">Telefone *</label>
                                <input type="tel" id="editar-telefone" value="${os.cliente_telefone || os.telefone || ''}" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="editar-cpf">CPF</label>
                                <input type="text" id="editar-cpf" value="${os.cpf || ''}">
                            </div>
                            
                            <div class="form-group">
                                <label for="editar-marca">Marca *</label>
                                <select id="editar-marca" required>
                                    <option value="">Selecionar Marca</option>
                                    <option value="Samsung" ${(os.marca || '') === 'Samsung' ? 'selected' : ''}>Samsung</option>
                                    <option value="Apple" ${(os.marca || '') === 'Apple' ? 'selected' : ''}>Apple</option>
                                    <option value="Xiaomi" ${(os.marca || '') === 'Xiaomi' ? 'selected' : ''}>Xiaomi</option>
                                    <option value="Motorola" ${(os.marca || '') === 'Motorola' ? 'selected' : ''}>Motorola</option>
                                    <option value="LG" ${(os.marca || '') === 'LG' ? 'selected' : ''}>LG</option>
                                    <option value="Outra" ${(os.marca || '') === 'Outra' ? 'selected' : ''}>Outra</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="editar-modelo">Modelo *</label>
                                <select id="editar-modelo" required>
                                    <option value="">Selecione o modelo</option>
                                </select>
                            </div>
                            
                            <div class="form-group full-width">
                                <label for="editar-defeito">Defeito Relatado *</label>
                                <textarea id="editar-defeito" required>${os.defeito_relatado || os.defeito || ''}</textarea>
                            </div>
                            
                            <div class="form-group full-width">
                                <label for="editar-observacoes">Observações</label>
                                <textarea id="editar-observacoes">${os.observacoes || ''}</textarea>
                            </div>
                            
                            <div class="form-group">
                                <label for="editar-orcamento">Orçamento (R$)</label>
                                <input type="number" id="editar-orcamento" value="${os.orcamento || 0}" step="0.01" min="0">
                            </div>
                        </div>
                        
                        
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" id="cancelar-edicao">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Salvar Alterações</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modalEdicao);
        
        // Configurar eventos do modal de edição
        configurarModalEdicao();
    }
    
    // 🎯 CORREÇÃO CRÍTICA: Armazenar o ID da OS no modal
    modalEdicao.setAttribute('data-os-id', os.id);
    console.log('✅ ID da OS armazenado no modal:', os.id);
    
    // Preencher dados específicos
    document.getElementById('editar-modelo').innerHTML = '<option value="">Selecione o modelo</option>';
    if (os.modelo) {
        const option = document.createElement('option');
        option.value = os.modelo;
        option.textContent = os.modelo;
        option.selected = true;
        document.getElementById('editar-modelo').appendChild(option);
    }
    
    // Mostrar modal
    modalEdicao.style.display = 'flex';
    
    // Configurar máscara de telefone
    const telefoneInput = document.getElementById('editar-telefone');
    if (telefoneInput) {
        telefoneInput.addEventListener('input', function (e) {
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
    
    // Configurar atualização de modelos
    document.getElementById('editar-marca').addEventListener('change', atualizarModelosEdicao);
}

// Configurar modal de edição
function configurarModalEdicao() {
    const modal = document.getElementById('modal-editar-os');
    const form = document.getElementById('form-editar-os');
    const btnFechar = document.getElementById('fechar-edicao');
    const btnCancelar = document.getElementById('cancelar-edicao');
    
    // Fechar modal
    btnFechar.addEventListener('click', fecharModalEdicao);
    btnCancelar.addEventListener('click', fecharModalEdicao);
    
    // Fechar clicando fora
    modal.addEventListener('click', function(e) {
        if (e.target === this) fecharModalEdicao();
    });
    
    // Submeter formulário
    form.addEventListener('submit', salvarEdicaoOS);
}

// Fechar modal de edição
function fecharModalEdicao() {
    const modal = document.getElementById('modal-editar-os');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Atualizar modelos na edição
function atualizarModelosEdicao() {
    const marcaSelect = document.getElementById('editar-marca');
    const modeloSelect = document.getElementById('editar-modelo');
    
    const modelosPorMarca = {
        Samsung: ["Galaxy S23", "Galaxy S21", "Galaxy M54", "Galaxy A50", "Galaxy A34", "Outro"],
        Apple: ["Iphone 15", "Iphone 13", "Iphone XR", "Iphone 11", "Iphone 8 Plus", "Outro"],
        Xiaomi: ["Redmi Note 12", "Redmi Note 11", "Poco X5", "Poco M5", "Outro"],
        Motorola: ["Moto G84", "Moto G72", "Moto E7", "Edge 30", "Outro"],
        LG: ["K52", "K20", "K10", "W41", "VELVET", "Outro"],
        Outra: ["Outro Modelo"]
    };
    
    const marca = marcaSelect.value;
    modeloSelect.innerHTML = '<option value="">Selecione o modelo</option>';
    
    if (marca && modelosPorMarca[marca]) {
        modelosPorMarca[marca].forEach(modelo => {
            const option = document.createElement('option');
            option.value = modelo;
            option.textContent = modelo;
            modeloSelect.appendChild(option);
        });
    }
}

// Versão com validação inteligente de CPF
// Versão com validação inteligente de CPF - CORRIGIDA
async function salvarEdicaoOS(event) {
    event.preventDefault();
    
    try {
        const modalEdicao = document.getElementById('modal-editar-os');
        const osId = modalEdicao.getAttribute('data-os-id');
        
        console.log('💾 Salvando edição da OS ID:', osId);
        
        if (!osId) {
            alert('❌ ID da OS não encontrado. Não é possível salvar.');
            return;
        }
        
        // Coletar dados do formulário
        const nome = document.getElementById('editar-nome').value.trim();
        const telefone = document.getElementById('editar-telefone').value.trim();
        const cpfInput = document.getElementById('editar-cpf').value.trim();
        const marca = document.getElementById('editar-marca').value;
        const modelo = document.getElementById('editar-modelo').value;
        const defeito = document.getElementById('editar-defeito').value.trim();
        const observacoes = document.getElementById('editar-observacoes').value.trim() || "";
        const orcamento = parseFloat(document.getElementById('editar-orcamento').value) || 0.0;
        
        // ✅ VALIDAÇÃO INTELIGENTE DE CPF
        let cpfParaEnviar = "";
        if (cpfInput) {
            // Limpar CPF (remover pontos e traços)
            const cpfLimpo = cpfInput.replace(/\D/g, '');
            
            // Validar se tem 11 dígitos
            if (cpfLimpo.length === 11) {
                cpfParaEnviar = cpfLimpo;
                console.log('🔍 CPF validado:', cpfParaEnviar);
            } else {
                alert('❌ CPF inválido! Deve conter 11 dígitos.');
                return;
            }
        }
        
        const formData = {
            nome: nome,
            telefone: telefone,
            marca: marca,
            modelo: modelo,
            defeito: defeito,
            observacoes: observacoes,
            orcamento: orcamento
        };
        
        // ✅ ADICIONAR CPF APENAS SE VÁLIDO E PREENCHIDO
        if (cpfParaEnviar) {
            formData.cpf = cpfParaEnviar;
        } else {
            formData.cpf = ""; // ✅ Garante que o campo sempre existe
        }
        
        console.log('📤 Dados para enviar:', formData);
        
        // Validação de campos obrigatórios
        if (!formData.nome || !formData.telefone || !formData.marca || !formData.modelo || !formData.defeito) {
            alert('Por favor, preencha todos os campos obrigatórios (*)');
            return;
        }
        
        const sessionToken = localStorage.getItem('session_token');
        console.log('🔗 Enviando para API...');
        
        const response = await fetch(`http://localhost:8001/api/os/${osId}`, {
            method: 'PUT',
            headers: {
                'Authorization': sessionToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        console.log('📥 Resposta da API:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erro da API:', errorText);
            
            // ✅ TRATAMENTO ESPECÍFICO PARA ERRO DE CPF DUPLICADO
            if (response.status === 400 && errorText.includes('CPF')) {
                const errorData = JSON.parse(errorText);
                
                // Oferecer opções ao usuário
                const userChoice = confirm(
                    `${errorData.detail}\n\n` +
                    'Clique em OK para remover o CPF e salvar a OS.\n' +
                    'Clique em Cancelar para corrigir o CPF manualmente.'
                );
                
                if (userChoice) {
                    // Tentar novamente sem CPF
                    delete formData.cpf;
                    console.log('🔄 Tentando salvar sem CPF...');
                    
                    const retryResponse = await fetch(`http://localhost:8001/api/os/${osId}`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': sessionToken,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(formData)
                    });
                    
                    if (retryResponse.ok) {
                        alert('✅ OS atualizada com sucesso (sem CPF)!');
                        fecharModalEdicao();
                        await carregarOrdensServico();
                    } else {
                        throw new Error('Erro ao salvar mesmo sem CPF');
                    }
                }
                return;
            }
            
            throw new Error(`Erro HTTP: ${response.status} - ${errorText}`);
        }
        
        const resultado = await response.json();
        console.log('✅ Resultado:', resultado);
        
        if (resultado.success) {
            alert('✅ OS atualizada com sucesso!');
            fecharModalEdicao();
            await carregarOrdensServico();
        } else {
            throw new Error(resultado.message || 'Erro ao atualizar OS');
        }
        
    } catch (error) {
        console.error('❌ Erro ao salvar edição:', error);
        alert('❌ Erro ao atualizar OS: ' + error.message);
    }
}

// Paginação
function renderizarPaginacao(totalItens, totalPaginas) {
    const paginacao = document.getElementById('paginacao-os');
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

function mudarPagina(pagina) {
    paginaAtual = pagina;
    renderizarTabelaOS();
    window.scrollTo(0, 0);
}

// Função auxiliar para carregar do localStorage (fallback)
function carregarDoLocalStorage() {
    try {
        const osSalvas = localStorage.getItem('ordens_servico');
        return osSalvas ? JSON.parse(osSalvas) : [];
    } catch {
        return [];
    }
}

console.log("🎉 Visualizar OS inicializado com sucesso!");