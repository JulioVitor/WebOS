class GerenciadorCaixa {
    constructor() {
        this.userInfo = null;
        this.fechamentoSelecionado = null;
        // Vincular métodos ao contexto da classe
        this.verificarStatusCaixa = this.verificarStatusCaixa.bind(this);
        this.atualizarUIStatusCaixa = this.atualizarUIStatusCaixa.bind(this);
        this.fecharCaixa = this.fecharCaixa.bind(this);
        this.carregarResumoVendasDia = this.carregarResumoVendasDia.bind(this);
        this.atualizarUISOSEntregues = this.atualizarUISOSEntregues.bind(this); 
        this.tentarAPIAternativaOS = this.tentarAPIAternativaOS.bind(this); 
    }

    async init() {
        await this.verificarSessao();
        await this.carregarUserInfo();
        await this.verificarStatusCaixa();
        await this.carregarHistorico();
        await this.carregarResumoVendasDia();
        await this.carregarTotalOSEntregues();
        this.configurarEventos();
        this.atualizarResumo();
        this.toggleAdminActions();
    }

    async debugCompleto() {
    try {
        const sessionToken = localStorage.getItem('session_token');
        console.log("🐛 [FRONTEND-DEBUG] Iniciando diagnóstico completo...");
        
        // 1. Debug do backend
        const response = await fetch('http://localhost:8001/api/debug/caixa-completo', {
            headers: { 'Authorization': sessionToken }
        });
        
        if (response.ok) {
            const debugData = await response.json();
            console.log("🐛 [BACKEND-DEBUG]", debugData);
            
            // 2. Status atual
            const statusResponse = await fetch('http://localhost:8001/api/fechamento-caixa/hoje', {
                headers: { 'Authorization': sessionToken }
            });
            
            if (statusResponse.ok) {
                const statusData = await statusResponse.json();
                console.log("🐛 [STATUS-ATUAL]", statusData);
            }
            
            // Mostrar resultado na tela também
            alert(`DIAGNÓSTICO:\nTotal fechamentos hoje: ${debugData.diagnostico.total_fechamentos_hoje}\nStatus: ${debugData.diagnostico.status_calculado ? 'FECHADO' : 'ABERTO'}\nVer console para detalhes.`);
        }
    } catch (error) {
        console.error('❌ Erro no diagnóstico:', error);
    }
}

    async verificarSessao() {
        const sessionToken = localStorage.getItem('session_token');
        
        if (!sessionToken) {
            alert('Sessão expirada. Redirecionando para login...');
            window.location.href = 'login.html';
            return false;
        }

        try {
            const response = await fetch('http://localhost:8001/api/user-info', {
                headers: {
                    'Authorization': sessionToken
                }
            });

            if (!response.ok) {
                throw new Error('Sessão inválida');
            }

            return true;
        } catch (error) {
            console.error('Erro ao verificar sessão:', error);
            localStorage.removeItem('session_token');
            alert('Sessão expirada. Faça login novamente.');
            window.location.href = 'login.html';
            return false;
        }
    }

    async carregarUserInfo() {
        try {
            const sessionToken = localStorage.getItem('session_token');
            const response = await fetch('http://localhost:8001/api/user-info', {
                headers: {
                    'Authorization': sessionToken
                }
            });

            if (response.ok) {
                this.userInfo = await response.json();
                this.atualizarUIUserInfo();
            }
        } catch (error) {
            console.error('Erro ao carregar info do usuário:', error);
        }
    }

    atualizarUIUserInfo() {
        if (this.userInfo) {
            document.getElementById('user-name').textContent = this.userInfo.username;
            const roleElement = document.getElementById('user-role');
            roleElement.textContent = this.userInfo.role;
            roleElement.classList.add(this.userInfo.role);
        }
    }

  atualizarUIStatusCaixa(fechado) {
        console.log("🎨 [FRONTEND] Atualizando UI - Caixa fechado:", fechado);
        
        const statusElement = document.getElementById('caixa-status');
        const dataElement = document.getElementById('caixa-data');
        const formElement = document.getElementById('fechamento-form');
        
        const hoje = new Date().toLocaleDateString('pt-BR');
        if (dataElement) {
            dataElement.textContent = hoje;
        }

        if (statusElement) {
            if (fechado) {
                statusElement.textContent = '🔴 FECHADO';
                statusElement.className = 'status-fechado';
                console.log("🔴 [FRONTEND] UI Atualizada: CAIXA FECHADO");
            } else {
                statusElement.textContent = '🟢 ABERTO';
                statusElement.className = 'status-aberto';
                console.log("🟢 [FRONTEND] UI Atualizada: CAIXA ABERTO");
            }
        }

        if (formElement) {
            formElement.style.display = fechado ? 'none' : 'block';
            console.log("📝 [FRONTEND] Formulário:", fechado ? 'OCULTO' : 'VISÍVEL');
        }
    }

      async verificarStatusCaixa() {
        try {
            const sessionToken = localStorage.getItem('session_token');
            const timestamp = new Date().getTime();
            console.log("🔄 [FRONTEND] Verificando status do caixa...");
            
            const response = await fetch(`http://localhost:8001/api/fechamento-caixa/hoje?t=${timestamp}`, {
                headers: {
                    'Authorization': sessionToken
                },
                cache: 'no-cache'
            });

            console.log("📡 [FRONTEND] Resposta da API:", response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log("📊 [FRONTEND] Dados recebidos do backend:", data);
                console.log("🔍 [FRONTEND] Status 'fechado':", data.fechado);
                
                // ✅ CORREÇÃO: Atualizar UI baseado no status recebido
                this.atualizarUIStatusCaixa(data.fechado);
                
                // ✅ DEBUG: Mostrar informações detalhadas no console
                if (data.fechamento) {
                    console.log("📋 [DEBUG] Detalhes do fechamento:", {
                        id: data.fechamento.id,
                        data: data.fechamento.data,
                        status: data.fechamento.status,
                        valor_final: data.fechamento.valor_final,
                        usuario: data.fechamento.usuario
                    });
                }
            } else {
                console.error("❌ [FRONTEND] Erro na resposta:", response.status);
                // Fallback em caso de erro - considerar caixa ABERTO
                this.atualizarUIStatusCaixa(false);
            }
        } catch (error) {
            console.error('❌ [FRONTEND] Erro ao verificar status do caixa:', error);
            // Fallback em caso de erro - considerar caixa ABERTO
            this.atualizarUIStatusCaixa(false);
        }
    }

    atualizarUIStatusCaixa(fechado) {
        console.log("🎨 [FRONTEND] Atualizando UI - Caixa fechado:", fechado);
        
        const statusElement = document.getElementById('caixa-status');
        const dataElement = document.getElementById('caixa-data');
        const formElement = document.getElementById('fechamento-form');
        const btnFechar = document.getElementById('btn-fechar-caixa');
        
        const hoje = new Date().toLocaleDateString('pt-BR');
        if (dataElement) {
            dataElement.textContent = hoje;
        }

        if (statusElement) {
            if (fechado) {
                statusElement.textContent = '🔴 FECHADO';
                statusElement.className = 'status-fechado';
                console.log("🔴 [FRONTEND] UI Atualizada: CAIXA FECHADO");
                
                // ✅ DESABILITAR botão de fechar se já estiver fechado
                if (btnFechar) {
                    btnFechar.disabled = true;
                    btnFechar.textContent = 'Caixa Já Fechado';
                }
            } else {
                statusElement.textContent = '🟢 ABERTO';
                statusElement.className = 'status-aberto';
                console.log("🟢 [FRONTEND] UI Atualizada: CAIXA ABERTO");
                
                // ✅ HABILITAR botão de fechar
                if (btnFechar) {
                    btnFechar.disabled = false;
                    btnFechar.textContent = 'Fechar Caixa';
                }
            }
        }

        if (formElement) {
            formElement.style.display = fechado ? 'none' : 'block';
            console.log("📝 [FRONTEND] Formulário:", fechado ? 'OCULTO' : 'VISÍVEL');
        }
    }

    // ✅ NOVO MÉTODO: Debug detalhado do status
    async debugStatusCaixa() {
        try {
            const sessionToken = localStorage.getItem('session_token');
            const response = await fetch('http://localhost:8001/api/debug/caixa-completo', {
                headers: {
                    'Authorization': sessionToken
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log("🐛 [DEBUG COMPLETO] Status do caixa:", data);
                return data;
            }
        } catch (error) {
            console.error('❌ Erro no debug:', error);
        }
    }


    atualizarResumo() {
        const valorInicial = parseFloat(document.getElementById('valor-inicial').value) || 0;
        const totalVendas = parseFloat(document.getElementById('total-vendas').value) || 0;
        const totalEntradas = parseFloat(document.getElementById('total-entradas').value) || 0;
        const totalSaidas = parseFloat(document.getElementById('total-saidas').value) || 0;

        const totalEntradasCalculado = totalVendas + totalEntradas;
        const valorFinal = valorInicial + totalEntradasCalculado - totalSaidas;

        document.getElementById('resumo-inicial').textContent = this.formatarMoeda(valorInicial);
        document.getElementById('resumo-entradas').textContent = this.formatarMoeda(totalEntradasCalculado);
        document.getElementById('resumo-saidas').textContent = this.formatarMoeda(totalSaidas);
        document.getElementById('resumo-final').textContent = this.formatarMoeda(valorFinal);
    }

    formatarMoeda(valor) {
        return 'R$ ' + valor.toFixed(2).replace('.', ',');
    }

  atualizarUISOSEntregues(dadosOS) {
        console.log("🎨 [FRONTEND] Atualizando UI OSs Entregues:", dadosOS);
        
        const cardOS = document.getElementById('os-entregues-card');
        const quantidadeElement = document.getElementById('os-quantidade');
        const totalElement = document.getElementById('os-total');
        const btnUsarOS = document.getElementById('btn-usar-os');
        
        // ✅ MOSTRAR CARD SEMPRE
        if (cardOS) {
            cardOS.style.display = 'block';
            if (quantidadeElement) quantidadeElement.textContent = dadosOS.quantidade_os || 0;
            if (totalElement) totalElement.textContent = this.formatarMoeda(dadosOS.total_os || 0);
            
            // ✅ Configurar botão para usar o valor
            if (btnUsarOS) {
                btnUsarOS.onclick = () => {
                    const valorOS = dadosOS.total_os || 0;
                    const campoVendas = document.getElementById('total-vendas');
                    if (campoVendas) {
                        // SOMA o valor das OSs ao valor atual de vendas
                        const vendasAtuais = parseFloat(campoVendas.value) || 0;
                        campoVendas.value = vendasAtuais + valorOS;
                        this.atualizarResumo();
                        this.mostrarMensagem(`✅ Valor de R$ ${valorOS.toFixed(2)} das OSs adicionado às vendas!`, 'success');
                    }
                };
            }
            
            // ✅ Feedback visual
            if (dadosOS.quantidade_os > 0) {
                cardOS.style.border = "2px solid #4CAF50";
                console.log("🟢 OSs encontradas:", dadosOS.quantidade_os);
            } else {
                cardOS.style.border = "2px solid #ff9800";
                console.log("🟡 Nenhuma OS encontrada");
            }
        } else {
            console.log("⚠️ Elemento os-entregues-card não encontrado");
        }
    }

    // ✅ ADICIONAR MÉTODO tentarAPIAternativaOS QUE TAMBÉM ESTÁ FALTANDO
    async tentarAPIAternativaOS() {
        try {
            const sessionToken = localStorage.getItem('session_token');
            const response = await fetch('http://localhost:8001/api/os/estatisticas-hoje', {
                headers: {
                    'Authorization': sessionToken
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log("📊 [FRONTEND] Estatísticas OS recebidas:", data);
                
                // Usar dados de entregues
                const dadosEntregues = {
                    quantidade_os: data.entregues?.quantidade || 0,
                    total_os: data.entregues?.total || 0
                };
                
                this.atualizarUISOSEntregues(dadosEntregues);
                return data.entregues?.total || 0;
            }
            return 0;
        } catch (error) {
            console.error('❌ [FRONTEND] Erro na API alternativa:', error);
            return 0;
        }       
    }    

    async fecharCaixa() {
        if (!this.validarFormulario()) {
            return;
        }

        try {
            const sessionToken = localStorage.getItem('session_token');
            const fechamentoData = {
                data: new Date().toISOString().split('T')[0],
                valor_inicial: parseFloat(document.getElementById('valor-inicial').value),
                valor_final: parseFloat(document.getElementById('resumo-final').textContent.replace('R$ ', '').replace(',', '.')),
                total_vendas: parseFloat(document.getElementById('total-vendas').value),
                total_entradas: parseFloat(document.getElementById('total-entradas').value) || 0,
                total_saidas: parseFloat(document.getElementById('total-saidas').value) || 0,
                observacoes: document.getElementById('observacoes').value
            };

            const response = await fetch('http://localhost:8001/api/fechamento-caixa', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': sessionToken
                },
                body: JSON.stringify(fechamentoData)
            });

            if (response.ok) {
                this.mostrarMensagem('Caixa fechado com sucesso!', 'success');
                await this.verificarStatusCaixa();
                await this.carregarHistorico();
                this.limparFormulario();
            } else {
                const error = await response.json();
                throw new Error(error.detail || 'Erro ao fechar caixa');
            }
        } catch (error) {
            console.error('Erro ao fechar caixa:', error);
            this.mostrarMensagem(error.message, 'error');
        }
    }

      // ✅ FUNÇÃO CORRIGIDA - Busca OSs por data de ENTREGA
   async carregarTotalOSEntregues() {
        try {
            const sessionToken = localStorage.getItem('session_token');
            const hoje = new Date().toISOString().split('T')[0];
            
            console.log(`🔄 [FRONTEND] Buscando OSs ENTREGUES HOJE - Data: ${hoje}`);
            
            // ✅ PRIMEIRO: Buscar OSs ENTREGUES hoje (por data de entrega)
            console.log("1️⃣ [FRONTEND] Buscando OSs entregues HOJE...");
            const response1 = await fetch('http://localhost:8001/api/fechamento-caixa/total-os-entregues', {
                headers: { 'Authorization': sessionToken }
            });
            
            if (response1.ok) {
                const data1 = await response1.json();
                console.log("📊 [FRONTEND] OSs Entregues HOJE:", data1);
                
                if (data1.quantidade_os > 0) {
                    console.log(`🎯 [FRONTEND] ENCONTRADAS ${data1.quantidade_os} OSs entregues hoje!`);
                    this.atualizarUISOSEntregues(data1);
                    return data1.total_os;
                }
            }
            
            // ✅ SEGUNDO: Se não encontrou, buscar por período maior (últimos 2 dias)
            console.log("2️⃣ [FRONTEND] Buscando OSs dos últimos 2 dias...");
            const ontem = new Date();
            ontem.setDate(ontem.getDate() - 1);
            const dataOntem = ontem.toISOString().split('T')[0];
            
            const response2 = await fetch(`http://localhost:8001/api/fechamento-caixa/os-entregues-periodo?data_inicio=${dataOntem}&data_fim=${hoje}`, {
                headers: { 'Authorization': sessionToken }
            });
            
            if (response2.ok) {
                const data2 = await response2.json();
                console.log("📊 [FRONTEND] OSs dos últimos 2 dias:", data2);
                
                if (data2.quantidade_os > 0) {
                    console.log(`📦 [FRONTEND] ${data2.quantidade_os} OSs entregues nos últimos 2 dias`);
                    this.atualizarUISOSEntregues(data2);
                    return data2.total_os;
                }
            }
            
            // ✅ TERCEIRO: Tentar API alternativa
            console.log("3️⃣ [FRONTEND] Tentando API alternativa...");
            const resultadoAlternativo = await this.tentarAPIAternativaOS();
            if (resultadoAlternativo > 0) {
                return resultadoAlternativo;
            }
            
            console.log("ℹ️ [FRONTEND] Nenhuma OS entregue encontrada");
            this.atualizarUISOSEntregues({ quantidade_os: 0, total_os: 0 });
            return 0;
            
        } catch (error) {
            console.error('❌ [FRONTEND] Erro ao carregar OS entregues:', error);
            this.atualizarUISOSEntregues({ quantidade_os: 0, total_os: 0 });
            return 0;
        }
}



async tentarAPIAternativaOS() {
    try {
        const sessionToken = localStorage.getItem('session_token');
        const response = await fetch('http://localhost:8001/api/os/estatisticas-hoje', {
            headers: {
                'Authorization': sessionToken
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log("📊 Estatísticas OS recebidas:", data);
            
            // Usar dados de entregues
            const dadosEntregues = {
                quantidade_os: data.entregues.quantidade,
                total_os: data.entregues.total
            };
            
            this.atualizarUISOSEntregues(dadosEntregues);
            return data.entregues.total;
        }
        return 0;
    } catch (error) {
        console.error('❌ Erro na API alternativa:', error);
        return 0;
    }
}

    validarFormulario() {
        const valorInicial = document.getElementById('valor-inicial').value;
        const totalVendas = document.getElementById('total-vendas').value;

        if (!valorInicial || parseFloat(valorInicial) < 0) {
            this.mostrarMensagem('Informe um valor inicial válido', 'error');
            return false;
        }

        if (!totalVendas || parseFloat(totalVendas) < 0) {
            this.mostrarMensagem('Informe o total de vendas', 'error');
            return false;
        }

        return true;
    }

    async carregarHistorico() {
        try {
            const sessionToken = localStorage.getItem('session_token');
            const response = await fetch('http://localhost:8001/api/fechamento-caixa', {
                headers: {
                    'Authorization': sessionToken
                }
            });

            console.log("📊 Resposta da API:", response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log("📦 Dados recebidos:", data);
                
                if (data && data.fechamentos && Array.isArray(data.fechamentos)) {
                    this.exibirHistorico(data.fechamentos);
                } else {
                    console.warn("⚠️ fechamentos não é um array:", data);
                    this.exibirHistorico([]);
                }
            } else {
                console.error('❌ Erro ao carregar histórico:', response.status, response.statusText);
                this.exibirHistorico([]);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar histórico:', error);
            this.exibirHistorico([]);
        }
    }

    toggleAdminActions() {
        const adminActions = document.getElementById('admin-actions');
        if (this.userInfo && this.userInfo.perfil === 'admin') {
            adminActions.style.display = 'block';
        } else {
            adminActions.style.display = 'none';
        }
    }

    // ✅ FUNÇÃO AUXILIAR QUE ESTAVA FALTANDO
    formatarDataHora(dataString) {
        if (!dataString) return 'Data inválida';
        try {
            const data = new Date(dataString);
            return data.toLocaleString('pt-BR');
        } catch (e) {
            return dataString;
        }
    }

    selecionarFechamento(fechamento) {
        document.querySelectorAll('.fechamento-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        const itemElement = document.querySelector(`[data-fechamento-id="${fechamento.id}"]`);
        if (itemElement) {
            itemElement.classList.add('selected');
        }
        
        this.fechamentoSelecionado = fechamento;
        this.atualizarBotaoReabrir();
    }

    atualizarBotaoReabrir() {
        const btnReabrir = document.getElementById('btn-reabrir-caixa');
        const selectedInfo = document.getElementById('selected-caixa-info');
        
        if (this.fechamentoSelecionado) {
            const podeReabrir = this.fechamentoSelecionado.status === 'fechado';
            btnReabrir.disabled = !podeReabrir;
            selectedInfo.textContent = `Selecionado: ${this.formatarData(this.fechamentoSelecionado.data)} - ${this.fechamentoSelecionado.usuario}`;
            
            if (!podeReabrir) {
                selectedInfo.textContent += ' (Já está aberto)';
            }
        } else {
            btnReabrir.disabled = true;
            selectedInfo.textContent = 'Nenhum caixa selecionado';
        }
    }

    mostrarModalReabertura() {
        if (!this.fechamentoSelecionado) {
            alert('Selecione um caixa para reabrir.');
            return;
        }
        
        if (this.fechamentoSelecionado.status !== 'fechado') {
            alert('Este caixa já está aberto.');
            return;
        }
        
        const modal = document.getElementById('modal-reabertura');
        if (modal) {
            modal.style.display = 'block';
        } else {
            this.criarModalReabertura();
        }
    }

    criarModalReabertura() {
        const modalHTML = `
            <div id="modal-reabertura" class="modal-reabertura">
                <div class="modal-reabertura-content">
                    <h3>↩️ Reabrir Caixa</h3>
                    <p><strong>Data:</strong> ${this.formatarData(this.fechamentoSelecionado.data)}</p>
                    <p><strong>Usuário:</strong> ${this.fechamentoSelecionado.usuario}</p>
                    <p><strong>Valor Final:</strong> ${this.formatarMoeda(this.fechamentoSelecionado.valor_final)}</p>
                    
                    <label for="motivo-reabertura">Motivo da reabertura:</label>
                    <textarea 
                        id="motivo-reabertura" 
                        placeholder="Descreva o motivo para reabrir este caixa..."
                    ></textarea>
                    
                    <div class="modal-actions">
                        <button id="btn-cancelar-reabertura" class="btn-secondary">Cancelar</button>
                        <button id="btn-confirmar-reabertura" class="btn-warning">Confirmar Reabertura</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        document.getElementById('btn-cancelar-reabertura').addEventListener('click', () => {
            this.fecharModalReabertura();
        });
        
        document.getElementById('btn-confirmar-reabertura').addEventListener('click', () => {
            this.confirmarReabertura();
        });
        
        document.getElementById('modal-reabertura').addEventListener('click', (e) => {
            if (e.target.id === 'modal-reabertura') {
                this.fecharModalReabertura();
            }
        });
    }

    fecharModalReabertura() {
        const modal = document.getElementById('modal-reabertura');
        if (modal) {
            modal.style.display = 'none';
            // ✅ REMOVER o modal do DOM para evitar duplicação
            modal.remove();
        }
    }

    async confirmarReabertura() {
        const motivo = document.getElementById('motivo-reabertura').value.trim();
        
        if (!motivo) {
            alert('Por favor, informe o motivo da reabertura.');
            return;
        }
        
        try {
            const sessionToken = localStorage.getItem('session_token');
            const response = await fetch(`http://localhost:8001/api/fechamento-caixa/${this.fechamentoSelecionado.id}/reabrir`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': sessionToken
                },
                body: JSON.stringify({ motivo })
            });

            if (response.ok) {
                const result = await response.json();
                alert('✅ ' + result.message);
                this.fecharModalReabertura();
                await this.carregarHistorico();
                this.fechamentoSelecionado = null;
                this.atualizarBotaoReabrir();
            } else {
                const error = await response.json();
                alert('❌ ' + (error.detail || 'Erro ao reabrir caixa'));
            }
        } catch (error) {
            console.error('❌ Erro ao reabrir caixa:', error);
            alert('❌ Erro ao reabrir caixa. Verifique o console.');
        }
    }

    exibirHistorico(fechamentos) {
        const container = document.getElementById('historico-lista');
        
        if (!fechamentos || !Array.isArray(fechamentos)) {
            fechamentos = [];
        }
        
        if (fechamentos.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>📭 Nenhum fechamento encontrado</p>
                    <p class="empty-subtitle">Os fechamentos de caixa aparecerão aqui</p>
                </div>
            `;
            return;
        }

        container.innerHTML = fechamentos.map(fechamento => {
            const isAdmin = this.userInfo && this.userInfo.perfil === 'admin';
            const isAberto = fechamento.status === 'aberto';
            const dataFormatada = this.formatarData(fechamento.data);
            const isSelected = this.fechamentoSelecionado && this.fechamentoSelecionado.id === fechamento.id;
            
            return `
                <div class="fechamento-item ${isAberto ? 'fechamento-aberto' : ''} ${isSelected ? 'selected' : ''}" 
                     data-fechamento-id="${fechamento.id}"
                     onclick="window.gerenciadorCaixa.selecionarFechamento(${JSON.stringify(fechamento).replace(/"/g, '&quot;')})">
                    
                    <div class="fechamento-info">
                        <h4>${dataFormatada} 
                            <span class="status-badge status-${fechamento.status}">
                                ${isAberto ? '🟡 ABERTO' : '✅ FECHADO'}
                            </span>
                        </h4>
                        <p><strong>Usuário:</strong> ${fechamento.usuario || 'Sistema'}</p>
                        <p><strong>Vendas:</strong> ${this.formatarMoeda(fechamento.total_vendas)}</p>
                        <p><strong>Valor Final:</strong> ${this.formatarMoeda(fechamento.valor_final)}</p>
                        
                        ${fechamento.observacoes ? `<p><strong>Observações:</strong> ${fechamento.observacoes}</p>` : ''}
                        
                        ${fechamento.usuario_reabertura ? `
                            <div class="reabertura-info">
                                <strong>↩️ Reaberto por:</strong> ${fechamento.usuario_reabertura}
                                ${fechamento.data_reabertura ? `<br><strong>Data:</strong> ${this.formatarDataHora(fechamento.data_reabertura)}` : ''}
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="fechamento-valor">
                        ${this.formatarMoeda(fechamento.valor_final)}
                    </div>
                </div>
            `;
        }).join('');
    }

    formatarData(dataString) {
        if (!dataString) return 'Data inválida';
        try {
            const data = new Date(dataString);
            return data.toLocaleDateString('pt-BR');
        } catch (e) {
            return dataString;
        }
    }

    mostrarMensagem(mensagem, tipo) {
        const messageElement = document.getElementById('message');
        messageElement.textContent = mensagem;
        messageElement.className = `message ${tipo}`;
        
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, 5000);
    }

    limparFormulario() {
        document.getElementById('valor-inicial').value = '';
        document.getElementById('total-vendas').value = '';
        document.getElementById('total-entradas').value = '';
        document.getElementById('total-saidas').value = '';
        document.getElementById('observacoes').value = '';
        this.atualizarResumo();
    }

    configurarEventos() {
        ['valor-inicial', 'total-vendas', 'total-entradas', 'total-saidas'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => this.atualizarResumo());
        });

        document.getElementById('btn-calcular')?.addEventListener('click', () => this.atualizarResumo());
        document.getElementById('btn-fechar-caixa')?.addEventListener('click', () => this.fecharCaixa());
        document.getElementById('btn-filtrar')?.addEventListener('click', () => this.carregarHistorico());
        document.getElementById('btn-voltar')?.addEventListener('click', () => window.history.back());
        
        // ✅ CORRIGIDO: Event listener seguro para reabrir caixa
        const btnReabrir = document.getElementById('btn-reabrir-caixa');
        if (btnReabrir) {
            btnReabrir.addEventListener('click', () => {
                this.mostrarModalReabertura();
            });
        }

        ['valor-inicial', 'total-vendas'].forEach(id => {
            document.getElementById(id)?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.atualizarResumo();
                }
            });
        });
    }

     async carregarResumoVendasDia() {
        try {
            const sessionToken = localStorage.getItem('session_token');
            console.log("🔄 [FRONTEND] Buscando resumo de vendas do dia...");
            
            const response = await fetch('http://localhost:8001/api/fechamento-caixa/resumo-dia', {
                headers: {
                    'Authorization': sessionToken
                }
            });

            console.log("📡 [FRONTEND] Resposta da API vendas:", response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log("💰 [FRONTEND] Dados vendas recebidos:", data);
                
                // ✅ Preencher automaticamente os campos
                const totalVendasInput = document.getElementById('total-vendas');
                const totalEntradasInput = document.getElementById('total-entradas');
                const totalSaidasInput = document.getElementById('total-saidas');
                
                if (totalVendasInput) totalVendasInput.value = data.total_vendas || 0;
                if (totalEntradasInput) totalEntradasInput.value = data.total_entradas || 0;
                if (totalSaidasInput) totalSaidasInput.value = data.total_saidas || 0;
                
                this.atualizarResumo();
                
                return data;
            } else {
                console.error("❌ [FRONTEND] Erro na resposta da API vendas:", response.status);
                // ✅ Fallback: definir valores padrão
                this.definirValoresPadraoVendas();
            }
            return null;
        } catch (error) {
            console.error('❌ [FRONTEND] Erro ao carregar resumo de vendas:', error);
            // ✅ Fallback em caso de erro
            this.definirValoresPadraoVendas();
            return null;
        }
    }

    // ✅ MÉTODO FALLBACK PARA VALORES PADRÃO
    definirValoresPadraoVendas() {
        console.log("🔄 [FRONTEND] Usando valores padrão para vendas");
        
        const totalVendasInput = document.getElementById('total-vendas');
        const totalEntradasInput = document.getElementById('total-entradas');
        const totalSaidasInput = document.getElementById('total-saidas');
        
        if (totalVendasInput && !totalVendasInput.value) totalVendasInput.value = 0;
        if (totalEntradasInput && !totalEntradasInput.value) totalEntradasInput.value = 0;
        if (totalSaidasInput && !totalSaidasInput.value) totalSaidasInput.value = 0;
        
        this.atualizarResumo();
    }

}

// ✅ INICIALIZAÇÃO CORRIGIDA - TORNANDO GLOBAL
let gerenciadorCaixa;

document.addEventListener('DOMContentLoaded', () => {
    gerenciadorCaixa = new GerenciadorCaixa();
    window.gerenciadorCaixa = gerenciadorCaixa; // ✅ Torna global para o HTML
    
    // Inicializar após um pequeno delay para garantir que tudo está carregado
    setTimeout(() => {
        gerenciadorCaixa.init().catch(error => {
            console.error('Erro na inicialização:', error);
        });
    }, 100);
});

// ✅ FUNÇÃO GLOBAL DE EMERGÊNCIA
window.forcarReaberturaCaixa = function() {
    if (window.gerenciadorCaixa) {
        window.gerenciadorCaixa.forcarReaberturaCaixa();
    } else {
        alert('Sistema não inicializado. Recarregue a página.');
    }
};