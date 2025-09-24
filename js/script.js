console.log("📦 Script carregado, aguardando DOM...");

// Função para abrir Venda Rápida
function abrirVendaRapida() {
    console.log("🛒 Abrindo Venda Rápida...");
    window.location.href = './pages/vendaR.html';
}

// Função para abrir Gerenciamento de Clientes
function abrirGerenciamentoClientes() {
    console.log("👥 Abrindo Gerenciamento de Clientes...");
    window.location.href = './pages/cadClientes.html';
}

// Aguardar o DOM carregar completamente
document.addEventListener('DOMContentLoaded', function() {
    console.log("✅ DOM pronto - Inicializando WebOS");

    // 1. Botão Nova OS
    const btnNovaOS = document.getElementById('btn-novaOS');
    if (btnNovaOS) {
        btnNovaOS.addEventListener('click', function() {
            console.log("📋 Abrindo Nova OS...");
            // Mostrar o formulário de OS e esconder outras seções
            document.getElementById('os-form-container').style.display = 'block';
            document.getElementById('os-print').style.display = 'none';
            document.querySelectorAll('.dashboard-section').forEach(section => {
                if (!section.id.includes('os-form') && !section.id.includes('os-print')) {
                    section.style.display = 'none';
                }
            });
        });
    } else {
        console.error("❌ Botão btn-novaOS não encontrado!");
    }

    // 2. Botão Venda Rápida
    const btnvenda = document.getElementById('btn-venda');
    if (btnvenda) {
        btnvenda.addEventListener('click', abrirVendaRapida);
    }else{
        console.log("❌ Botão btn-venda não encontrado!");
    }


    // 3. Botão do card Nova OS
    const btnNovaOSCard = document.getElementById('btnNovaOSCard');
    if (btnNovaOSCard) {
        btnNovaOSCard.addEventListener('click', function() {
            console.log("📋 Abrindo Nova OS pelo card...");
            document.getElementById('os-form-container').style.display = 'block';
            document.getElementById('os-print').style.display = 'none';
            document.querySelectorAll('.dashboard-section').forEach(section => {
                if (!section.id.includes('os-form') && !section.id.includes('os-print')) {
                    section.style.display = 'none';
                }
            });
        });
    }

    // 4. Botão do card Venda Rápida
    const btnVendaCard = document.getElementById('btn-venda-card');
    if (btnVendaCard) {
        btnVendaCard.addEventListener('click', abrirVendaRapida);
    }else{
        console.error("❌ Botão btn-venda-card não encontrado!");
    }


      // Botão Gerenciar Clientes na Sidebar
    const btnClientes = document.getElementById('btn-clientes');
    if (btnClientes) {
    btnClientes.addEventListener('click', abrirGerenciamentoClientes);
    console.log("✅ Botão de clientes (sidebar) configurado");
    } else {
    console.error("❌ Botão btn-clientes não encontrado na sidebar!");
    }

    // Botão Gerenciar Clientes no Card Principal
    const btnGerenciarClientesCard = document.getElementById('btn-gerenciar-clientes-card');
    if (btnGerenciarClientesCard) {
        btnGerenciarClientesCard.addEventListener('click', abrirGerenciamentoClientes);
    } else {
        console.error("❌ Botão btn-gerenciar-clientes-card não encontrado!");
    }

    // 5. Dados dos celulares por marca
    const modelosPorMarca = {
        Samsung: ["Galaxy S23", "Galaxy S21", "Galaxy M54", "Galaxy A50", "Galaxy A34", "Outro"],
        Apple: ["Iphone 15", "Iphone 13", "Iphone XR", "Iphone 11", "Iphone 8 Plus", "Outro"],
        Xiaomi: ["Redmi Note 12", "Redmi Note 11", "Poco X5", "Poco M5", "Outro"],
        Motorola: ["Moto G84", "Moto G72", "Moto E7", "Edge 30", "Outro"],
        LG: ["K52", "K20", "K10", "W41", "VELVET", "Outro"],
        Outra: ["Outro Modelo"]
    };

    // 6. Atualizar modelos com base na marca selecionada
    function atualizarModelos() {
        console.log("🔄 Atualizando modelos...");
        
        const marcaSelect = document.getElementById('marcaCell');
        const modeloSelect = document.getElementById('modeloCell');
        
        if (!marcaSelect || !modeloSelect) {
            console.error("❌ Elementos não encontrados!");
            return;
        }
        
        const marca = marcaSelect.value;
        console.log("Marca selecionada:", marca);

        // Limpa options atuais
        modeloSelect.innerHTML = '';

        if (marca && modelosPorMarca[marca]) {
            modelosPorMarca[marca].forEach(modelo => {
                const option = document.createElement('option');
                option.value = modelo;
                option.textContent = modelo;
                modeloSelect.appendChild(option);
            });
            console.log("✅ Modelos carregados");
        } else {
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "Selecione primeiro a marca";
            modeloSelect.appendChild(option);
        }
    }

    // 7. Adicionar evento à marca
    const marcaSelect = document.getElementById('marcaCell');
    if (marcaSelect) {
        marcaSelect.addEventListener('change', atualizarModelos);
        console.log("✅ Event listener adicionado à marca");
    }

    // 8. Gerar numero sequencial OS
    function gerarNumeroOS() {
        if (!localStorage.ultimaOS) {
            localStorage.ultimaOS = 1;
        } else {
            localStorage.ultimaOS = parseInt(localStorage.ultimaOS) + 1;
        }
        return localStorage.ultimaOS.toString().padStart(4, '0');
    }

    // 9. Função para validar formulário
    function validarFormulario() {
        const form = document.getElementById('os-form');
        if (!form.checkValidity()) {
            alert("Por favor, preencha todos os campos obrigatórios.");
            return false;
        }
        return true;
    }

    // 10. Função para coletar dados do formulário
    function coletarDadosFormulario() {
        return {
            nome: document.getElementById('nome').value,
            telefone: document.getElementById('telefone').value,
            cpf: document.getElementById('cpf').value,
            marca: document.getElementById('marcaCell').value,
            modelo: document.getElementById('modeloCell').value,
            defeito: document.getElementById('defeito').value,
            observacoes: document.getElementById('observacoes').value || '-',
            orcamento: document.getElementById('orcamento').value || '0',
            numero: gerarNumeroOS(),
            data: new Date().toLocaleDateString('pt-BR'),
            status: 'pendente'
        };
    }

    // 11. Função para preencher dados de impressão
    function preencherDadosImpressao(osData) {
        document.getElementById('print-nome').textContent = osData.nome;
        document.getElementById('print-telefone').textContent = osData.telefone;
        document.getElementById('print-cpf').textContent = osData.cpf;
        document.getElementById('print-marca').textContent = osData.marca;
        document.getElementById('print-modelo').textContent = osData.modelo;
        document.getElementById('print-defeito').textContent = osData.defeito;
        document.getElementById('print-observacoes').textContent = osData.observacoes;
        document.getElementById('print-orcamento').textContent = parseFloat(osData.orcamento).toFixed(2);
        document.getElementById('os-number').textContent = osData.numero;
        document.getElementById('os-date').textContent = osData.data;
        document.getElementById('print-data-entrada').textContent = osData.data;
    }

    // 12. Função para salvar no banco local (fallback)
    function salvarNoBancoLocal(osData) {
        try {
            let ordensServico = JSON.parse(localStorage.getItem('ordensServico')) || [];
            ordensServico.push(osData);
            localStorage.setItem('ordensServico', JSON.stringify(ordensServico));
            
            console.log("✅ OS salva localmente:", osData);
            return { success: true, numero_os: osData.numero, local: true };
        } catch (error) {
            console.error('❌ Erro ao salvar localmente:', error);
            return { success: false, error: error.message };
        }
    }

    // 13. Função para verificar se o servidor está disponível
    async function servidorDisponivel() {
        try {
            const sessionToken = localStorage.getItem('session_token');
            
            const response = await fetch('http://localhost:8001/api/health', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': sessionToken
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data.status === "healthy";
            
        } catch (error) {
            console.log('Servidor indisponível, usando modo offline:', error.message);
            return false;
        }
    }

    // 14. Função para salvar no banco real ou local (fallback)
    async function salvarNoBancoReal(osData) {
        // Verificar primeiro se o servidor está disponível
        const servidorOnline = await servidorDisponivel();
        
        if (!servidorOnline) {
            console.log('📦 Servidor offline, salvando localmente...');
            return salvarNoBancoLocal(osData);
        }
        
        try {
            console.log("💾 Enviando OS para o servidor...", osData);
            
            const sessionToken = localStorage.getItem('session_token');
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch('http://localhost:8001/api/os', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': sessionToken
                },
                body: JSON.stringify(osData),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }
            
            const result = await response.json();
            console.log("✅ OS salva no banco de dados:", result);
            return result;
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('❌ Timeout ao conectar com o servidor');
            } else {
                console.error('❌ Erro ao salvar OS no servidor:', error);
            }
            
            // Fallback para localStorage
            console.log('📦 Salvando localmente como backup...');
            return salvarNoBancoLocal(osData);
        }
    }

    // 15. Função para salvar e imprimir
    async function salvarEImprimirOS() {
        if (!validarFormulario()) return;
        
        const osData = coletarDadosFormulario();
        const resultado = await salvarNoBancoReal(osData);
        
        if (resultado && resultado.success) {
            preencherDadosImpressao(osData);
            
            document.getElementById('os-form-container').style.display = 'none';
            document.getElementById('os-print').style.display = 'block';
            document.getElementById('os-print').scrollIntoView({ behavior: 'smooth' });
            
            setTimeout(() => {
                window.print();
            }, 1000);
        } else {
            alert('Erro ao salvar OS. Verifique o console.');
        }
    }

    // 16. Função para salvar apenas
    async function salvarOS() {
        if (!validarFormulario()) return;
        
        const osData = coletarDadosFormulario();
        const resultado = await salvarNoBancoReal(osData);
        
        if (resultado && resultado.success) {
            alert(`OS ${resultado.local ? 'salva localmente' : 'salva no servidor'}! Número: ${osData.numero}`);
            novaOS();
        } else {
            alert('Erro ao salvar OS. Verifique o console.');
        }
    }

    // 17. Função para visualizar OSs salvas
    function visualizarOSs() {
        const ordensServico = JSON.parse(localStorage.getItem('ordensServico')) || [];
        
        if (ordensServico.length === 0) {
            alert('Nenhuma OS salva ainda.');
            return;
        }
        
        console.table(ordensServico);
        alert(`Total de OSs salvas: ${ordensServico.length}\n\nVerifique o console para ver os detalhes.`);
    }

    // 18. Nova OS
    function novaOS() {
        document.getElementById('os-form-container').style.display = 'block';
        document.getElementById('os-print').style.display = 'none';
        document.getElementById('os-form').reset();
        
        const modeloSelect = document.getElementById('modeloCell');
        if (modeloSelect) {
            modeloSelect.innerHTML = '<option value="">Selecione Primeiro a Marca</option>';
        }
    }

    // 19. Máscaras de campo
    const telefoneInput = document.getElementById('telefone');
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

    const cpfInput = document.getElementById('cpf');
    if (cpfInput) {
        cpfInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);
            value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
            e.target.value = value;
        });
    }

    // 20. Data atual
    const osDateElement = document.getElementById('os-date');
    if (osDateElement) {
        osDateElement.textContent = new Date().toLocaleDateString('pt-BR');
    }

    // 21. Adicionar event listeners aos botões
    document.getElementById('btn-salvar-imprimir')?.addEventListener('click', salvarEImprimirOS);
    document.getElementById('btn-salvar')?.addEventListener('click', salvarOS);
    document.getElementById('btn-nova')?.addEventListener('click', novaOS);
    document.getElementById('btn-visualizar')?.addEventListener('click', visualizarOSs);
    document.getElementById('btn-voltar')?.addEventListener('click', function() {
        document.getElementById('os-print').style.display = 'none';
        document.getElementById('os-form-container').style.display = 'block';
    });

    // 22. Gerenciamento de Clientes
    document.getElementById('btn-open-client-window')?.addEventListener('click', function() {
        document.getElementById('client-window').style.display = 'block';
        document.getElementById('overlay').style.display = 'block';
    });

    document.getElementById('close-client-window')?.addEventListener('click', function() {
        document.getElementById('client-window').style.display = 'none';
        document.getElementById('overlay').style.display = 'none';
    });

    document.getElementById('overlay')?.addEventListener('click', function() {
        document.getElementById('client-window').style.display = 'none';
        this.style.display = 'none';
    });

    console.log("🎉 WebOS inicializado com sucesso!");
});

//button logout
 document.addEventListener('DOMContentLoaded', function() {
            const logoutBtn = document.getElementById('logoutBtn');
            
            logoutBtn.addEventListener('click', function() {
                // Adicionar efeito visual de loading
                logoutBtn.innerHTML = '<span>Saindo...</span>';
                logoutBtn.disabled = true;
                
                // Simular processo de logout
                setTimeout(function() {
                    // Limpar dados de sessão (exemplo)
                    localStorage.removeItem('session_token');
                    localStorage.removeItem('user_nome');
                    localStorage.removeItem('user_id');
                    
                    // Redirecionar para a página de login
                    alert('Logout realizado com sucesso!');
                    window.location.href = './pages/login.html';
                }, 1000);
            });
            
            // Verificar se há sessão ativa (exemplo)
            const sessionToken = localStorage.getItem('session_token');
            if (!sessionToken) {
                alert('Sessão expirada. Faça login novamente.');
                window.location.href = '.pages/login.html';
            }
        });