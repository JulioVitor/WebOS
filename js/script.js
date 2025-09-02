console.log("📦 Script carregado, aguardando DOM...");

// Aguardar o DOM carregar completamente
document.addEventListener('DOMContentLoaded', function() {
    console.log("✅ DOM pronto - Inicializando WebOS");
    
    // 1. Botão Nova OS
    const btnNovaOS = document.getElementById('btn-novaOS');
    if (btnNovaOS) {
        btnNovaOS.addEventListener('click', function(){
            console.log("📋 Abrindo Nova OS...");
            window.location.href = './pages/novaOS.html';
        });
    } else {
        console.error("❌ Botão btn-novaOS não encontrado!");
    }

    // 2. Dados dos celulares por marca
    const modelosPorMarca = {
        Samsung: ["Galaxy S23", "Galaxy S21", "Galaxy M54", "Galaxy A50", "Galaxy A34", "Outro"],
        Apple: ["Iphone 15", "Iphone 13", "Iphone XR", "Iphone 11", "Iphone 8 Plus", "Outro"],
        Xiaomi: ["Redmi Note 12", "Redmi Note 11", "Poco X5", "Poco M5", "Outro"],
        Motorola: ["Moto G84", "Moto G72", "Moto E7", "Edge 30", "Outro"],
        LG: ["K52", "K20", "K10", "W41", "VELVET", "Outro"],
        Outra: ["Outro Modelo"]
    };

    // 3. Atualizar modelos com base na marca selecionada
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

    // 4. Adicionar evento à marca
    const marcaSelect = document.getElementById('marcaCell');
    if (marcaSelect) {
        marcaSelect.addEventListener('change', atualizarModelos);
        console.log("✅ Event listener adicionado à marca");
    }

    // 5. Gerar numero sequencial OS
    function gerarNumeroOS() {
        if (!localStorage.ultimaOS) {
            localStorage.ultimaOS = 1;
        } else {
            localStorage.ultimaOS = parseInt(localStorage.ultimaOS) + 1;
        }
        return localStorage.ultimaOS.toString().padStart(4, '0');
    }

    // 6. Função para validar formulário
    function validarFormulario() {
        const form = document.getElementById('os-form');
        if (!form.checkValidity()) {
            alert("Por favor, preencha todos os campos obrigatórios.");
            return false;
        }
        return true;
    }

    // 7. Função para coletar dados do formulário
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

    // 8. Função para preencher dados de impressão
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

    // 9. Simular banco de dados com localStorage
    function salvarNoBancoLocal(osData) {
        let ordensServico = JSON.parse(localStorage.getItem('ordensServico')) || [];
        ordensServico.push(osData);
        localStorage.setItem('ordensServico', JSON.stringify(ordensServico));
        console.log('OS salva localmente:', osData);
    }

    // 10. Função para salvar e imprimir
    function salvarEImprimirOS() {
        if (!validarFormulario()) return;
        
        const osData = coletarDadosFormulario();
        salvarNoBancoLocal(osData);
        preencherDadosImpressao(osData);
        
        document.querySelector('.os-container').style.display = 'none';
        document.getElementById('os-print').style.display = 'block';
        document.getElementById('os-print').scrollIntoView({ behavior: 'smooth' });
        
        setTimeout(() => {
            window.print();
        }, 1000);
    }

    // 11. Função para salvar apenas
    function salvarOS() {
        if (!validarFormulario()) return;
        
        const osData = coletarDadosFormulario();
        salvarNoBancoLocal(osData);
        
        alert('OS salva com sucesso! Número: ' + osData.numero);
        novaOS();
    }

    // 12. Função para visualizar OSs salvas
    function visualizarOSs() {
        const ordensServico = JSON.parse(localStorage.getItem('ordensServico')) || [];
        
        if (ordensServico.length === 0) {
            alert('Nenhuma OS salva ainda.');
            return;
        }
        
        console.table(ordensServico);
        alert(`Total de OSs salvas: ${ordensServico.length}\n\nVerifique o console para ver os detalhes.`);
    }

    // 13. Gerar OS (função original)
    function gerarOS() {
        const form = document.getElementById('os-form');
        if (!form.checkValidity()) {
            alert("Por favor, preencha todos os campos obrigatórios.");
            return;
        }

        const osData = {
            nome: document.getElementById('nome').value,
            telefone: document.getElementById('telefone').value,
            cpf: document.getElementById('cpf').value,
            marca: document.getElementById('marcaCell').value,
            modelo: document.getElementById('modeloCell').value,
            defeito: document.getElementById('defeito').value,
            observacoes: document.getElementById('observacoes').value || '-',
            numero: gerarNumeroOS(),
            data: new Date().toLocaleDateString('pt-BR')
        };
        
        // Preencher dados de impressão...
        document.getElementById('print-nome').textContent = osData.nome;
        document.getElementById('print-telefone').textContent = osData.telefone;
        document.getElementById('print-cpf').textContent = osData.cpf;
        document.getElementById('print-marca').textContent = osData.marca;
        document.getElementById('print-modelo').textContent = osData.modelo;
        document.getElementById('print-defeito').textContent = osData.defeito;
        document.getElementById('print-observacoes').textContent = osData.observacoes;
        document.getElementById('os-number').textContent = osData.numero;
        document.getElementById('os-date').textContent = osData.data;
        document.getElementById('print-data-entrada').textContent = osData.data;

        document.querySelector('.os-container').style.display = 'none';
        document.getElementById('os-print').style.display = 'block';
        document.getElementById('os-print').scrollIntoView({ behavior: 'smooth' });
    }

    // 14. Nova OS
    function novaOS() {
        document.querySelector('.os-container').style.display = 'block';
        document.getElementById('os-print').style.display = 'none';
        document.getElementById('os-form').reset();
        
        const modeloSelect = document.getElementById('modeloCell');
        if (modeloSelect) {
            modeloSelect.innerHTML = '<option value="">Selecione Primeiro a Marca</option>';
        }
    }

    // 15. Máscaras de campo
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

    // 16. Data atual
    const osDateElement = document.getElementById('os-date');
    if (osDateElement) {
        osDateElement.textContent = new Date().toLocaleDateString('pt-BR');
    }

    console.log("🎉 WebOS inicializado com sucesso!");

    document.getElementById('btn-salvar-imprimir')?.addEventListener('click', salvarEImprimirOS);
    document.getElementById('btn-salvar')?.addEventListener('click', salvarOS);
    document.getElementById('btn-nova')?.addEventListener('click', novaOS);
    document.getElementById('btn-visualizar')?.addEventListener('click', visualizarOSs);
});