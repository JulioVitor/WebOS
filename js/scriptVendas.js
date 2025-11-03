// Configurações
const API_BASE = 'http://localhost:8001';
let itensVenda = [];
let usuarioLogado = null;
let produtosDisponiveis = [];
let timeoutPesquisa = null;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('🛒 Inicializando módulo de vendas...');
    
    // Verificar autenticação
    verificarAutenticacao();
    
    // Inicializar eventos
    inicializarEventos();
    
    // Carregar dados do usuário
    carregarDadosUsuario();

      // ✅ CARREGAR PRODUTOS DO ESTOQUE
    carregarProdutos().then(() => {
        // Inicializar eventos após carregar produtos
        inicializarEventos();
    });
});

// Função para verificar token
function verificarToken() {
    const token = localStorage.getItem('session_token');
    const userNome = localStorage.getItem('user_nome');
    
    if (!token || !userNome) {
        alert('Sessão expirada. Redirecionando para login...');
        window.location.href = 'login.html';
        return false;
    }
    
    // Atualizar usuarioLogado
    usuarioLogado = {
        token: token,
        nome: userNome,
        id: localStorage.getItem('user_id')
    };
    
    return true;
}

// Verificar se usuário está autenticado
function verificarAutenticacao() {
    if (!verificarToken()) {
        return;
    }
}

// Carregar dados do usuário
function carregarDadosUsuario() {
    const userNameElement = document.getElementById('user-name');
    if (userNameElement && usuarioLogado) {
        userNameElement.textContent = usuarioLogado.nome;
    }
}

// Inicializar eventos
function inicializarEventos() {
    // Botão voltar
    document.getElementById('btn-voltar').addEventListener('click', function() {
        window.history.back();
    });
    
    // Botão sair
    document.getElementById('btn-sair').addEventListener('click', function() {
        localStorage.clear();
        window.location.href = 'login.html';
    });
    
    // Botão adicionar item
    document.getElementById('btn-adicionar').addEventListener('click', adicionarItem);
    
    // Botão finalizar venda
    document.getElementById('btn-finalizar').addEventListener('click', abrirModalPagamento);
    
    // Botão cancelar
    document.getElementById('btn-cancelar').addEventListener('click', cancelarVenda);
    
    // Botões do modal
    document.getElementById('btn-cancelar-venda').addEventListener('click', fecharModal);
    document.getElementById('btn-confirmar-venda').addEventListener('click', finalizarVenda);
    
    // Botões do modal de sucesso
    document.getElementById('btn-nova-venda').addEventListener('click', novaVenda);
    document.getElementById('btn-imprimir').addEventListener('click', imprimirRecibo);
    
    // Eventos de cálculo automático
    document.getElementById('quantidade').addEventListener('input', calcularPrecoTotal);
    document.getElementById('preco-unitario').addEventListener('input', calcularPrecoTotal);
    document.getElementById('valor-recebido').addEventListener('input', calcularTroco);
    
    // Mostrar/ocultar campos de troco baseado no método de pagamento
    document.getElementById('metodo-pagamento').addEventListener('change', function() {
        const metodo = this.value;
        const modal = document.getElementById('modal-pagamento');
        
        if (metodo === 'dinheiro') {
            modal.classList.remove('esconder-troco');
            modal.classList.add('mostrar-troco');
        } else {
            modal.classList.remove('mostrar-troco');
            modal.classList.add('esconder-troco');
        }
    });

    // ✅ NOVOS EVENTOS ADICIONADOS
    // Botão para ativar modo escaneamento
    const btnEscanear = document.createElement('button');
    btnEscanear.type = 'button';
    btnEscanear.innerHTML = '📷';
    btnEscanear.title = 'Ativar modo escaneamento de código de barras';
    btnEscanear.className = 'btn-escanear';
    btnEscanear.addEventListener('click', ativarModoEscaneamento);
    
    // Adicionar botão ao lado do campo produto
    const produtoGroup = document.getElementById('produto').parentNode;
    produtoGroup.style.position = 'relative';
    produtoGroup.appendChild(btnEscanear);

    // Inicializar autocomplete e leitor
    inicializarAutocomplete();
    inicializarLeitorCodigoBarras();
}

// Calcular preço total do item
function calcularPrecoTotal() {
    const quantidade = parseInt(document.getElementById('quantidade').value) || 1;
    const precoUnitario = parseFloat(document.getElementById('preco-unitario').value) || 0;
    const precoTotal = quantidade * precoUnitario;
    
    document.getElementById('preco-total').value = precoTotal.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Adicionar item à venda
function adicionarItem() {
    const produto = document.getElementById('produto').value.trim();
    const quantidade = parseInt(document.getElementById('quantidade').value) || 1;
    const precoUnitario = parseFloat(document.getElementById('preco-unitario').value) || 0;
    
    if (!produto) {
        alert('Por favor, informe o nome do produto.');
        document.getElementById('produto').focus();
        return;
    }
    
    if (precoUnitario <= 0) {
        alert('Por favor, informe um preço válido.');
        document.getElementById('preco-unitario').focus();
        return;
    }
    
    const precoTotal = quantidade * precoUnitario;
    
    const item = {
        produto: produto,
        quantidade: quantidade,
        preco_unitario: precoUnitario,
        preco_total: precoTotal
    };
    
    itensVenda.push(item);
    atualizarListaItens();
    atualizarResumoVenda();
    limparFormularioItem();
    
    console.log('✅ Item adicionado:', item);
}

// Remover item da venda
function removerItem(index) {
    itensVenda.splice(index, 1);
    atualizarListaItens();
    atualizarResumoVenda();
}

// Atualizar lista de itens na UI
function atualizarListaItens() {
    const listaItens = document.getElementById('lista-itens');
    
    if (itensVenda.length === 0) {
        listaItens.innerHTML = '<div class="empty-state"><p>Nenhum item adicionado</p></div>';
        return;
    }
    
    listaItens.innerHTML = itensVenda.map((item, index) => {
        const precoUnitario = item.preco_unitario || 0;
        const precoTotal = item.preco_total || 0;
        
        return `
            <div class="item-venda">
                <div class="item-info">
                    <strong>${item.produto}</strong>
                    <div>${item.quantidade} x R$ ${precoUnitario.toFixed(2)}</div>
                </div>
                <div class="item-preco">R$ ${precoTotal.toFixed(2)}</div>
                <button class="btn-remover" onclick="removerItem(${index})">✕</button>
            </div>
        `;
    }).join('');
}

// Atualizar resumo da venda
function atualizarResumoVenda() {
    const subtotal = itensVenda.reduce((total, item) => total + (item.preco_total || 0), 0);
    const total = subtotal;
    
    document.getElementById('subtotal').textContent = `R$ ${subtotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    document.getElementById('total').textContent = `R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    document.getElementById('total-pagar').textContent = `R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    
    return total;
}

// Limpar formulário de item
function limparFormularioItem() {
    document.getElementById('produto').value = '';
    document.getElementById('quantidade').value = '1';
    document.getElementById('preco-unitario').value = '';
    document.getElementById('preco-total').value = '0,00';
    document.getElementById('produto').focus();
}

// Cancelar venda
function cancelarVenda() {
    if (itensVenda.length > 0 && !confirm('Deseja cancelar esta venda? Todos os itens serão perdidos.')) {
        return;
    }
    
    itensVenda = [];
    atualizarListaItens();
    atualizarResumoVenda();
    limparFormularioItem();
}

// Abrir modal de pagamento
function abrirModalPagamento() {
    if (itensVenda.length === 0) {
        alert('Adicione pelo menos um item à venda.');
        return;
    }
    
    const total = atualizarResumoVenda();
    document.getElementById('valor-recebido').value = total.toFixed(2);
    document.getElementById('troco').textContent = 'R$ 0,00';
    
    // Configurar visibilidade dos campos de troco
    const metodo = document.getElementById('metodo-pagamento').value;
    const modal = document.getElementById('modal-pagamento');
    
    if (metodo === 'dinheiro') {
        modal.classList.add('mostrar-troco');
        modal.classList.remove('esconder-troco');
    } else {
        modal.classList.add('esconder-troco');
        modal.classList.remove('mostrar-troco');
    }
    
    document.getElementById('modal-pagamento').style.display = 'block';
}

// Fechar modal
function fecharModal() {
    document.getElementById('modal-pagamento').style.display = 'none';
}

// Calcular troco
function calcularTroco() {
    const total = itensVenda.reduce((total, item) => total + (item.preco_total || 0), 0);
    const valorRecebido = parseFloat(document.getElementById('valor-recebido').value) || 0;
    const troco = Math.max(0, valorRecebido - total);
    
    document.getElementById('troco').textContent = `R$ ${troco.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
}


async function finalizarVenda() {
    // Verificar autenticação primeiro
    if (!verificarToken()) {
        return;
    }
    
    if (itensVenda.length === 0) {
        alert('Adicione pelo menos um item à venda.');
        return;
    }
    
    const total = itensVenda.reduce((total, item) => total + (item.preco_total || 0), 0);
    const metodoPagamento = document.getElementById('metodo-pagamento').value;
    
    // Validar valor recebido para dinheiro
    if (metodoPagamento === 'dinheiro') {
        const valorRecebido = parseFloat(document.getElementById('valor-recebido').value) || 0;
        if (valorRecebido < total) {
            alert('Valor recebido é menor que o total da venda.');
            return;
        }
    }
    
    const data = new Date();
    const dataVendaFormatada = data.toISOString().slice(0, 19).replace('T', ' ');

    // ⚠️ CRIAR OBJETO DO ZERO para evitar campos extras
    const vendaData = {};
    vendaData.cliente = "Consumidor Final";
    vendaData.itens = itensVenda.map(item => ({
        produto: item.produto || "",
        quantidade: item.quantidade || 0,
        preco_Unitario: item.preco_unitario || 0,
        preco_Total: item.preco_total || 0
    }));
    vendaData.total_venda = total || 0;
    vendaData.forma_pagamento = metodoPagamento || "dinheiro";
    vendaData.observacoes = "Venda rápida realizada no sistema";
    vendaData.data_venda = dataVendaFormatada;
    vendaData.usuario_id = parseInt(usuarioLogado.id) || 1;
    vendaData.loja_id = 1;

    // 🎯 VERIFICAÇÃO FINAL - Garantir que não há campo 'total'
    console.log('🎯 VERIFICAÇÃO FINAL - Campos que serão enviados:');
    Object.keys(vendaData).forEach(key => {
        console.log(`   ${key}: ${vendaData[key]}`);
    });
    
    // Remover qualquer campo 'total' que possa existir
    if (vendaData.total !== undefined) {
        console.log('⚠️ Removendo campo "total" que foi encontrado...');
        delete vendaData.total;
    }
    
    try {
        console.log('💾 Enviando venda para o servidor...', vendaData);
        
        // Obter token fresco do localStorage
        const token = localStorage.getItem('session_token');
        if (!token) {
            throw new Error('Token de autenticação não encontrado');
        }
        
        // Mostrar loading
        const btnConfirmar = document.getElementById('btn-confirmar-venda');
        const originalText = btnConfirmar.textContent;
        btnConfirmar.innerHTML = '<div class="loading"></div> Processando...';
        btnConfirmar.disabled = true;
        
        const response = await fetch(`${API_BASE}/api/vendas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify(vendaData)
        });
        
        const responseData = await response.json();
        console.log('📋 Resposta completa do servidor:', responseData);
        
        if (!response.ok) {
            if (response.status === 401) {
                // Token inválido - limpar e redirecionar
                localStorage.clear();
                throw new Error('Sessão expirada. Faça login novamente.');
            }
            
            let errorMessage = 'Erro desconhecido';
            if (responseData.detail) {
                errorMessage = typeof responseData.detail === 'string' 
                    ? responseData.detail 
                    : JSON.stringify(responseData.detail);
            }
            
            throw new Error(`Erro ${response.status}: ${errorMessage}`);
        }
        
        console.log('✅ Venda registrada com sucesso:', responseData);
        
        // Mostrar modal de sucesso
        fecharModal();
        document.getElementById('mensagem-sucesso').textContent = 
            `Venda #${responseData.numero_venda} registrada com sucesso!`;
        document.getElementById('modal-sucesso').style.display = 'block';
        
    } catch (error) {
        console.error('❌ Erro ao finalizar venda:', error);
        
        if (error.message.includes('Sessão expirada')) {
            alert(error.message);
            window.location.href = '/index.html';
        } else {
            alert('Erro ao finalizar venda:\n' + error.message);
        }
        
    } finally {
        // Restaurar botão
        const btnConfirmar = document.getElementById('btn-confirmar-venda');
        if (btnConfirmar) {
            btnConfirmar.textContent = 'Confirmar Venda';
            btnConfirmar.disabled = false;
        }
    }
}

// Nova venda após sucesso
function novaVenda() {
    // Fechar modal de sucesso
    document.getElementById('modal-sucesso').style.display = 'none';
    
    // Limpar completamente a venda atual
    itensVenda = [];
    atualizarListaItens();
    atualizarResumoVenda();
    limparFormularioItem();
    
    // Resetar método de pagamento para padrão
    document.getElementById('metodo-pagamento').value = 'dinheiro';
    document.getElementById('valor-recebido').value = '';
    document.getElementById('troco').textContent = 'R$ 0,00';
    
    // Fechar modal de pagamento se estiver aberto
    document.getElementById('modal-pagamento').style.display = 'none';
    
    console.log('🔄 Nova venda iniciada');
}
    cancelarVenda();


// Imprimir recibo
function imprimirRecibo() {
     // Extrair o número da venda da mensagem de sucesso
    const mensagemSucesso = document.getElementById('mensagem-sucesso').textContent;
    const numeroVenda = mensagemSucesso.match(/#(\w+)/)[1];
    const metodoPagamento = document.getElementById('metodo-pagamento').value;
    const totalVenda = itensVenda.reduce((total, item) => total + (item.preco_total || 0), 0);
    
// Criar conteúdo do recibo para 58mm
const reciboContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Recibo Venda #${numeroVenda}</title>
        <meta charset="UTF-8">
        <style>
            /* ESTILO PARA IMPRESSORA TÉRMICA 58MM */
            body { 
                font-family: 'Courier New', monospace; 
                margin: 0; 
                padding: 3px; 
                width: 58mm;
                font-size: 10px;
                line-height: 1.1;
            }
            .header { 
                text-align: center; 
                margin-bottom: 6px; 
                padding-bottom: 3px;
                border-bottom: 1px dashed #000;
            }
            .header h1 { 
                margin: 0; 
                font-size: 12px;
                font-weight: bold;
            }
            .info { 
                margin-bottom: 6px; 
                padding-bottom: 3px;
                border-bottom: 1px dashed #000;
            }
            .info p { 
                margin: 2px 0; 
            }
            .itens { 
                margin: 6px 0; 
                border-collapse: collapse; 
                width: 100%;
                font-size: 9px;
            }
            .itens th, .itens td { 
                padding: 2px 1px; 
                text-align: left;
            }
            .itens th { 
                border-bottom: 1px solid #000;
                font-weight: bold;
            }
            .itens .total-item {
                text-align: right;
                font-weight: bold;
            }
            .total-geral { 
                font-weight: bold; 
                text-align: center; 
                margin-top: 8px;
                padding-top: 6px;
                border-top: 2px solid #000;
                font-size: 12px;
            }
            .footer { 
                text-align: center; 
                margin-top: 12px; 
                font-size: 8px; 
                padding-top: 6px;
                border-top: 1px dashed #000;
            }
            .divider {
                border-top: 1px dashed #000;
                margin: 6px 0;
                padding: 0;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-bold { font-weight: bold; }
            
            /* OCULTAR BOTÕES NA IMPRESSÃO */
            @media print {
                .no-print { 
                    display: none !important; 
                }
                body {
                    margin: 0;
                    padding: 1px;
                }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>BC IMPORTS</h1>
            <p>** RECIBO DE VENDA **</p>
            <p>${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR').substring(0, 5)}</p>
        </div>
        
        <div class="info">
            <p><span class="text-bold">VENDA:</span> #${numeroVenda}</p>
            <p><span class="text-bold">ATENDENTE:</span> ${usuarioLogado.nome.substring(0, 12)}</p>
            <p><span class="text-bold">PAGAMENTO:</span> ${metodoPagamento.toUpperCase()}</p>
        </div>
        
        <div class="divider"></div>
        
        <table class="itens">
            <thead>
                <tr>
                    <th>ITEM</th>
                    <th>QTD</th>
                    <th>UN</th>
                    <th>TOTAL</th>
                </tr>
            </thead>
            <tbody>
                ${itensVenda.map(item => `
                    <tr>
                        <td>${item.produto.substring(0, 12)}</td>
                        <td>${item.quantidade}x</td>
                        <td>${(item.preco_unitario || 0).toFixed(2)}</td>
                        <td class="total-item">${(item.preco_total || 0).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div class="divider"></div>
        
        <div class="total-geral">
            TOTAL: R$ ${totalVenda.toFixed(2)}
        </div>
        
        ${metodoPagamento === 'dinheiro' ? `
            <div class="text-center">
                <p>Valor recebido: R$ ${parseFloat(document.getElementById('valor-recebido').value || 0).toFixed(2)}</p>
                <p>Troco: R$ ${document.getElementById('troco').textContent.replace('R$ ', '')}</p>
            </div>
        ` : ''}
        
        <div class="footer">
            <p>___________________________</p>
            <p>Assinatura do Cliente</p>
            <p>** OBRIGADO PELA PREFERÊNCIA **</p>
            <p>@bcimportsteo</p>
            <p>${new Date().getFullYear()} © BC IMPORTS</p>
        </div>
        
        <div class="no-print" style="text-align: center; margin-top: 12px;">
            <button onclick="window.print()" style="padding: 6px 12px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 10px; margin: 2px;">
                🖨️ Imprimir
            </button>
            <button onclick="window.close()" style="padding: 6px 12px; background: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 10px; margin: 2px;">
                ❌ Fechar
            </button>
        </div>
        
        <script>
            // Imprimir automaticamente após abrir
            window.onload = function() {
                setTimeout(() => {
                    window.print();
                }, 300);
            };
        </script>
    </body>
    </html>
`;
    
    // Abrir janela de impressão
    const janelaImpressao = window.open('', '_blank', 'width=320,height=500');
    janelaImpressao.document.write(reciboContent);
    janelaImpressao.document.close();
}

// Carregar produtos do estoque
async function carregarProdutos() {
    try {
        const token = localStorage.getItem('session_token');
        const response = await fetch(`${API_BASE}/api/produtos/todos`, {
            headers: {
                'Authorization': token
            }
        });

        if (response.ok) {
            const data = await response.json();
            produtosDisponiveis = data.produtos || [];
            console.log(`📦 ${produtosDisponiveis.length} produtos carregados`);
        } else {
            console.error('Erro ao carregar produtos:', response.status);
        }
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
    }
}

// Inicializar autocomplete
function inicializarAutocomplete() {
    const produtoInput = document.getElementById('produto');
    const sugestoesContainer = document.createElement('div');
    sugestoesContainer.className = 'sugestoes-produtos';
    produtoInput.parentNode.appendChild(sugestoesContainer);

    // Evento de input para pesquisa em tempo real
    produtoInput.addEventListener('input', function() {
        const termo = this.value.trim();
        
        // Limpar timeout anterior
        if (timeoutPesquisa) {
            clearTimeout(timeoutPesquisa);
        }
        
        // Debounce - esperar 300ms após a digitação
        timeoutPesquisa = setTimeout(() => {
            if (termo.length >= 2) {
                buscarSugestoes(termo, sugestoesContainer);
            } else {
                sugestoesContainer.style.display = 'none';
            }
        }, 300);
    });

    // Evento de foco - mostrar sugestões recentes
    produtoInput.addEventListener('focus', function() {
        if (this.value.length >= 2) {
            buscarSugestoes(this.value, sugestoesContainer);
        }
    });

    // Esconder sugestões ao clicar fora
    document.addEventListener('click', function(e) {
        if (!produtoInput.contains(e.target) && !sugestoesContainer.contains(e.target)) {
            sugestoesContainer.style.display = 'none';
        }
    });

    // Evento para capturar Enter e selecionar primeira sugestão
    produtoInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const primeiraSugestao = sugestoesContainer.querySelector('.sugestao-item');
            if (primeiraSugestao && sugestoesContainer.style.display !== 'none') {
                e.preventDefault();
                selecionarProduto(primeiraSugestao.dataset.produto);
                sugestoesContainer.style.display = 'none';
            }
        }
    });
}

// Buscar sugestões de produtos
function buscarSugestoes(termo, container) {
    const termoLower = termo.toLowerCase();
    const sugestoes = produtosDisponiveis.filter(produto => 
        produto.nome.toLowerCase().includes(termoLower) ||
        (produto.codigo_barras && produto.codigo_barras.includes(termo))
    ).slice(0, 8); // Limitar a 8 sugestões

    exibirSugestoes(sugestoes, container);
}

// Exibir sugestões na UI
function exibirSugestoes(sugestoes, container) {
    if (sugestoes.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.innerHTML = sugestoes.map(produto => `
        <div class="sugestao-item" data-produto='${JSON.stringify(produto)}'>
            <div class="sugestao-nome">${produto.nome}</div>
            <div class="sugestao-info">
                ${produto.codigo_barras ? `Cód: ${produto.codigo_barras} • ` : ''}
                Estoque: ${produto.estoque_atual || 0} • 
                R$ ${(produto.preco_venda || 0).toFixed(2)}
            </div>
        </div>
    `).join('');

    // Adicionar eventos de clique às sugestões
    container.querySelectorAll('.sugestao-item').forEach(item => {
        item.addEventListener('click', function() {
            const produtoData = JSON.parse(this.dataset.produto);
            selecionarProduto(produtoData);
            container.style.display = 'none';
        });
    });

    container.style.display = 'block';
}

// Selecionar produto das sugestões
function selecionarProduto(produto) {
    document.getElementById('produto').value = produto.nome;
    document.getElementById('preco-unitario').value = produto.preco_venda || 0;
    
    // Focar no campo de quantidade
    document.getElementById('quantidade').focus();
    document.getElementById('quantidade').select();
    
    // Calcular preço total automaticamente
    calcularPrecoTotal();
    
    console.log('✅ Produto selecionado:', produto.nome);
}

// Inicializar leitor de código de barras
function inicializarLeitorCodigoBarras() {
    const produtoInput = document.getElementById('produto');
    let codigoBarrasBuffer = '';
    let ultimoTimestamp = 0;

    produtoInput.addEventListener('keydown', function(e) {
        const timestamp = new Date().getTime();
        
        // Se passou mais de 100ms desde o último caractere, reinicia o buffer
        if (timestamp - ultimoTimestamp > 100) {
            codigoBarrasBuffer = '';
        }
        
        ultimoTimestamp = timestamp;
        
        // Se for Enter, processa o código de barras
        if (e.key === 'Enter') {
            if (codigoBarrasBuffer.length >= 3) { // Códigos de barras geralmente têm mais de 3 caracteres
                buscarPorCodigoBarras(codigoBarrasBuffer);
                codigoBarrasBuffer = '';
                e.preventDefault();
            }
        } else if (e.key.length === 1) { // Caractere normal
            codigoBarrasBuffer += e.key;
        }
    });
}

// Buscar produto por código de barras
function buscarPorCodigoBarras(codigo) {
    const produto = produtosDisponiveis.find(p => 
        p.codigo_barras && p.codigo_barras === codigo
    );

    if (produto) {
        selecionarProduto(produto);
        console.log('📷 Produto encontrado via código de barras:', produto.nome);
    } else {
        console.log('❌ Nenhum produto encontrado com código:', codigo);
        // Opcional: mostrar mensagem para o usuário
        // alert('Produto não encontrado! Cadastre o produto primeiro.');
    }
}

// Modo de escaneamento rápido (alternativa)
function ativarModoEscaneamento() {
    const produtoInput = document.getElementById('produto');
    produtoInput.placeholder = "📷 Modo escaneamento - Use o leitor de código de barras";
    produtoInput.focus();
    
    // Limpar o campo para novo escaneamento
    produtoInput.value = '';
}



// Verificar se servidor está disponível
async function servidorDisponivel() {
    try {
        const response = await fetch(`${API_BASE}/api/health`, {
            headers: {
                'Authorization': usuarioLogado.token
            }
        });
        return response.ok;
    } catch (error) {
        console.log('Servidor indisponível:', error.message);
        return false;
    }
}

