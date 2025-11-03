// js/novaOS.js - VERSÃO CORRIGIDA (Compatível com novo estilo)
console.log("📋 Script Nova OS carregado");

// ========== DECLARAÇÃO DE TODAS AS FUNÇÕES PRIMEIRO ==========



// ✅ DEFINIR API_BASE_URL NO TOPO DO ARQUIVO
const API_BASE_URL = 'http://localhost:8001';

// 1. Funções básicas de navegação
function abrirVisualizarOS() {
    console.log("📋 Abrindo Visualizar OS...");
    window.location.href = 'visualizarOS.html';
}

function novaOS() {
    document.getElementById('print-area').style.display = 'none';
    document.getElementById('os-form-container').style.display = 'block';
    document.getElementById('os-form').reset();
    if (typeof atualizarModelos === 'function') {
        atualizarModelos();
    }
}

// 2. Função de verificação de sessão
async function verificarSessao() {
    const sessionToken = localStorage.getItem('session_token');
    
    if (!sessionToken) {
        console.log('❌ Nenhum token encontrado');
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

        if (response.ok) {
            console.log('✅ Sessão válida');
            return true;
        } else {
            console.log('❌ Sessão inválida');
            localStorage.removeItem('session_token');
            alert('Sessão expirada. Faça login novamente.');
            window.location.href = 'login.html';
            return false;
        }
    } catch (error) {
        console.log('❌ Erro ao verificar sessão:', error);
        return false;
    }
}

// Função para mostrar/ocultar campo de modelo manual
function toggleModeloManual() {
    const modeloSelect = document.getElementById('modeloCell');
    const modeloManualGroup = document.getElementById('modeloManualGroup');
    const modeloManualInput = document.getElementById('modeloManual');
    
    if (modeloSelect.value === 'Outro' || modeloSelect.value === 'Outro Modelo') {
        modeloManualGroup.style.display = 'block';
        modeloManualInput.required = true;
    } else {
        modeloManualGroup.style.display = 'none';
        modeloManualInput.required = false;
        modeloManualInput.value = '';
    }
}

// Função para obter o modelo final (select ou manual)
function obterModeloFinal() {
    const modeloSelect = document.getElementById('modeloCell');
    const modeloManual = document.getElementById('modeloManual').value.trim();
    
    if (modeloSelect.value === 'Outro' || modeloSelect.value === 'Outro Modelo') {
        return modeloManual || 'Modelo não especificado';
    }
    return modeloSelect.value;
}

// 3. Funções de validação e coleta de dados
function validarFormulario() {
    console.log("🔍 Validando formulário...");
    const nome = document.getElementById('nome').value.trim();
    const telefone = document.getElementById('telefone').value.trim();
    const marca = document.getElementById('marcaCell').value;
    const modeloSelect = document.getElementById('modeloCell').value;
    const modeloManual = document.getElementById('modeloManual').value.trim();
    const defeito = document.getElementById('defeito').value.trim();

    if (!nome) {
        alert("Por favor, informe o nome do cliente.");
        return false;
    }
    if (!telefone) {
        alert("Por favor, informe o telefone do cliente.");
        return false;
    }
    if (!marca) {
        alert("Por favor, selecione a marca do equipamento.");
        return false;
    }
    if (!modeloSelect || modeloSelect  === "Selecione primeiro a marca") {
        alert("Por favor, selecione o modelo do equipamento.");
        return false;
    }
    if ((modeloSelect === 'Outro' || modeloSelect === 'Outro Modelo') && !modeloManual) {
        alert("Por favor, digite o modelo do aparelho.");
        return false;
    }
    if (!defeito) {
        alert("Por favor, descreva o defeito do equipamento.");
        return false;
    }
    return true;
}

// Função coletar dados do formulário
function coletarDadosFormulario() {
    const modeloFinal = obterModeloFinal();
    return {
        nome: document.getElementById('nome').value.trim(),
        telefone: document.getElementById('telefone').value.trim(),
        cpf: document.getElementById('cpf').value.trim() || '',
        marca: document.getElementById('marcaCell').value,
        modelo: modeloFinal,
        defeito: document.getElementById('defeito').value.trim(),
        observacoes: document.getElementById('observacoes').value.trim() || null,
        orcamento: parseFloat(document.getElementById('orcamento').value) || 0.0
    };
}

// 4. Funções de banco de dados
function salvarNoBancoLocal(osData) {
    try {
        let ordensServico = JSON.parse(localStorage.getItem('ordensServico')) || [];
        
        if (!localStorage.ultimaOS) {
            localStorage.ultimaOS = 1;
        } else {
            localStorage.ultimaOS = parseInt(localStorage.ultimaOS) + 1;
        }
        const numeroOS = localStorage.ultimaOS.toString().padStart(4, '0');
        
        const osCompleta = {
            ...osData,
            numero_os: numeroOS,
            data_entrada: new Date().toISOString(),
            status: 'pendente'
        };
        
        ordensServico.push(osCompleta);
        localStorage.setItem('ordensServico', JSON.stringify(ordensServico));

        console.log("✅ OS salva localmente:", osCompleta);
        return { success: true, numero_os: numeroOS, local: true };
    } catch (error) {
        console.error('❌ Erro ao salvar localmente:', error);
        return { success: false, error: error.message };
    }
}

async function salvarNoBancoReal(osData) {
    console.log("🔍 Verificando autenticação...");
    
    const sessaoValida = await verificarSessao();
    if (!sessaoValida) {
        console.log('❌ Sessão inválida, salvando localmente');
        return salvarNoBancoLocal(osData);
    }

    const sessionToken = localStorage.getItem('session_token');
    console.log("🔑 Token:", sessionToken);
    console.log("🌐 API Base URL:", API_BASE_URL);

    try {
        console.log("💾 Enviando OS para o servidor...", osData);

        // ✅ CORREÇÃO: Usar API_BASE_URL em vez de URL hardcoded
        const response = await fetch(`${API_BASE_URL}/api/os`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': sessionToken
            },
            body: JSON.stringify(osData)
        });

        console.log("📡 Status:", response.status, response.statusText);

        if (response.status === 401) {
            localStorage.removeItem('session_token');
            alert('Sessão expirada. Faça login novamente.');
            window.location.href = 'login.html';
            return;
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ Erro do servidor:", errorText);
            throw new Error(`Erro HTTP: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log("✅ OS salva no servidor:", result);
        return result;

    } catch (error) {
        console.error('❌ Erro ao salvar no servidor:', error);
        console.log('📦 Salvando localmente como backup...');
        return salvarNoBancoLocal(osData);
    }
}   

// 5. Funções de impressão CORRIGIDAS
function prepararEImprimirOS(osData, numeroOS) {
    console.log("🖨️ Preparando impressão...", osData);
    
    try {
        // Preencher dados
        document.getElementById('print-nome').textContent = osData.nome || '-';
        document.getElementById('print-telefone').textContent = osData.telefone || '-';
        document.getElementById('print-cpf').textContent = osData.cpf || '-';
        document.getElementById('print-marca').textContent = osData.marca || '-';
        document.getElementById('print-modelo').textContent = osData.modelo || '-';
        document.getElementById('print-defeito').textContent = osData.defeito || '-';
        document.getElementById('print-observacoes').textContent = osData.observacoes || '-';
        document.getElementById('print-orcamento').textContent = osData.orcamento ? parseFloat(osData.orcamento).toFixed(2) : '0,00';
        document.getElementById('os-number').textContent = numeroOS || '0000';
        document.getElementById('os-date').textContent = new Date().toLocaleDateString('pt-BR');
        document.getElementById('print-data-entrada').textContent = new Date().toLocaleDateString('pt-BR');

        // Mostrar área de impressão e esconder formulário
        const printArea = document.getElementById('print-area');
        const formContainer = document.getElementById('os-form-container');
        
        formContainer.style.display = 'none';
        printArea.style.display = 'block';
        
        // Forçar cores para garantir visibilidade
        printArea.style.cssText = 'display: block !important; background: white !important; color: black !important;';
        
        console.log("✅ Área de impressão mostrada - AGUARDANDO para imprimir...");
        
        // AGORA CHAMA A IMPRESSÃO AUTOMATICAMENTE APÓS UM PEQUENO DELAY
        setTimeout(() => {
            console.log("🖨️ Chamando window.print() automaticamente...");
            window.print();
        }, 500); // 500ms de delay para garantir que o DOM foi atualizado

    } catch (error) {
        console.error('❌ Erro ao preparar impressão:', error);
        alert('Erro ao preparar impressão: ' + error.message);
    }
}

// Função para impressão automática após salvar
function imprimirAutomaticamente() {
    console.log("🖨️ Iniciando impressão automática...");
    
    // Pequeno delay para garantir que tudo está carregado
    setTimeout(() => {
        try {
            // Forçar aplicação dos estilos de impressão
            const printArea = document.getElementById('print-area');
            if (printArea) {
                printArea.classList.add('printing-active');
            }
            
            // Chamar a impressão
            window.print();
            
            console.log("✅ Impressão chamada com sucesso");
            
            // Limpar classe após impressão
            setTimeout(() => {
                if (printArea) {
                    printArea.classList.remove('printing-active');
                }
            }, 1000);
            
        } catch (error) {
            console.error('❌ Erro na impressão automática:', error);
            // Fallback: mostrar botão de impressão manual
            alert('Clique no botão "Imprimir OS" para gerar a impressão.');
        }
    }, 300);
}


// Função para voltar ao formulário (chamada pelo botão "Nova OS")
function voltarAoFormulario() {
    document.getElementById('print-area').style.display = 'none';
    document.getElementById('os-form-container').style.display = 'block';
    document.getElementById('os-form').reset();
    if (typeof atualizarModelos === 'function') {
        atualizarModelos();
    }
}

// 6. Funções principais de ação
async function salvarEImprimirOS() {
    console.log("💾 Salvando e imprimindo OS...");
    
    if (!validarFormulario()) {
        console.log("❌ Validação do formulário falhou");
        return;
    }

    try {
        const osData = coletarDadosFormulario();
        console.log("📦 Dados coletados:", osData);
        
        const resultado = await salvarNoBancoReal(osData);
        console.log("✅ Resultado do salvamento:", resultado);

        if (resultado && resultado.success) {
            const numeroOS = resultado.numero_os;
            const origem = resultado.local ? 'local' : 'servidor';
            
            console.log(`✅ OS salva no ${origem}! Número: ${numeroOS}`);
            
            // PREPARAR E IMPRIMIR AUTOMATICAMENTE
            prepararEImprimirOS(osData, numeroOS);
            
        } else {
            alert('❌ Erro ao salvar OS. Verifique o console.');
        }
    } catch (error) {
        console.error('❌ Erro ao salvar e imprimir:', error);
        alert('❌ Erro ao salvar OS: ' + error.message);
    }
}

async function salvarOS() {
    console.log("💾 Salvando OS...");
    
    if (!validarFormulario()) return;

    try {
        const osData = coletarDadosFormulario();
        const resultado = await salvarNoBancoReal(osData);

        if (resultado && resultado.success) {
            const origem = resultado.local ? 'localmente' : 'no servidor';
            alert(`✅ OS salva ${origem}! Número: ${resultado.numero_os}`);
            document.getElementById('os-form').reset();
            if (typeof atualizarModelos === 'function') {
                atualizarModelos();
            }
        } else {
            alert('❌ Erro ao salvar OS.');
        }
    } catch (error) {
        console.error('❌ Erro ao salvar:', error);
        alert('❌ Erro ao salvar OS: ' + error.message);
    }
}

// Função para limpar formulário
function limparFormulario() {
    if (confirm('Tem certeza que deseja limpar todos os campos?')) {
        document.getElementById('os-form').reset();
        document.getElementById('modeloManualGroup').style.display = 'none';
        if (typeof atualizarModelos === 'function') {
            atualizarModelos();
        }
        console.log('🧹 Formulário limpo');
    }
}

// ========== INICIALIZAÇÃO QUANDO O DOM ESTIVER PRONTO ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log("✅ Página Nova OS pronta");
    
    // Verificar sessão ao carregar a página
    verificarSessao();
    
    const btnVisualizar = document.getElementById('btn-visualizar');
    if (btnVisualizar) {
        btnVisualizar.addEventListener('click', abrirVisualizarOS);
        console.log("✅ Botão Visualizar OS configurado");
    }

    // Dados dos celulares por marca
    const modelosPorMarca = {
        Samsung: ["Galaxy S23", "Galaxy S21", "Galaxy M54", "Galaxy A50", "Galaxy A34", "Outro"],
        Apple: ["Iphone 15", "Iphone 13", "Iphone XR", "Iphone 11", "Iphone 8 Plus", "Outro"],
        Xiaomi: ["Redmi Note 12", "Redmi Note 11", "Poco X5", "Poco M5", "Outro"],
        Motorola: ["Moto G84", "Moto G72", "Moto E7", "Edge 30", "Outro"],
        LG: ["K52", "K20", "K10", "W41", "VELVET", "Outro"],
        Outra: ["Outro Modelo"]
    };

    // Atualizar modelos com base na marca selecionada
    window.atualizarModelos = function() {
        const marcaSelect = document.getElementById('marcaCell');
        const modeloSelect = document.getElementById('modeloCell');

        if (!marcaSelect || !modeloSelect) return;

        const marca = marcaSelect.value;
        modeloSelect.innerHTML = '';

        if (marca && modelosPorMarca[marca]) {
            modelosPorMarca[marca].forEach(modelo => {
                const option = document.createElement('option');
                option.value = modelo;
                option.textContent = modelo;
                modeloSelect.appendChild(option);
            });
        } else {
            modeloSelect.innerHTML = '<option value="">Selecione primeiro a marca</option>';
        }
        
        // Resetar campo manual quando mudar a marca
        document.getElementById('modeloManualGroup').style.display = 'none';
        document.getElementById('modeloManual').value = '';
    };

    // Adicionar evento à marca
    const marcaSelect = document.getElementById('marcaCell');
    if (marcaSelect) {
        marcaSelect.addEventListener('change', atualizarModelos);
    }

    // Evento para mostrar campo manual quando selecionar "Outro"
    const modeloSelect = document.getElementById('modeloCell');
    if (modeloSelect) {
        modeloSelect.addEventListener('change', toggleModeloManual);
    }

    // Máscaras de campo
    const telefoneInput = document.getElementById('telefone');
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

    // Máscara para CPF
    const cpfInput = document.getElementById('cpf');
    if (cpfInput) {
        cpfInput.addEventListener('input', function (e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);
            value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
            e.target.value = value;
        });
    }

    // Configurar botões
    document.getElementById('btn-salvar-imprimir')?.addEventListener('click', salvarEImprimirOS);
    document.getElementById('btn-salvar')?.addEventListener('click', salvarOS);
    document.getElementById('btn-limpar')?.addEventListener('click', limparFormulario);
    
    // Botões da área de impressão
    document.querySelector('#print-area .btn-secondary')?.addEventListener('click', novaOS);
    document.querySelector('#print-area .btn-success')?.addEventListener('click', abrirVisualizarOS);

    // Inicializar modelos
    atualizarModelos();

    console.log("🎉 Página Nova OS inicializada com sucesso!");
});