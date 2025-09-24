// Inicializar aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando aplicação WebOS...');
    
    // Dar um pequeno delay para garantir que o DOM esteja totalmente carregado
    setTimeout(function() {
        // Inicializar elementos do DOM
        const elementsInitialized = initElements();
        
        if (!elementsInitialized) {
            console.error('❌ Erro: Elementos do DOM não foram encontrados');
            
            // Tentar encontrar elementos novamente com querySelector como fallback
            console.log('🔄 Tentando fallback com querySelector...');
            
            const fallbackLoginForm = document.querySelector('#loginForm');
            const fallbackNomeInput = document.querySelector('#nome');
            const fallbackPasswordInput = document.querySelector('#password');
            
            if (fallbackLoginForm && fallbackNomeInput && fallbackPasswordInput) {
                console.log('✅ Elementos encontrados via querySelector');
                
                // Configurar event listeners com elementos fallback
                fallbackLoginForm.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    
                    const nome = fallbackNomeInput.value;
                    const password = fallbackPasswordInput.value;
                    
                    // Validação simples
                    if (!nome || !password) {
                        alert('Por favor, preencha todos os campos.');
                        return;
                    }
                    
                    await fazerLogin(nome, password);
                });
                
                // Configurar link de criar usuário se existir
                const fallbackCreateLink = document.querySelector('#createUserLink');
                if (fallbackCreateLink) {
                    fallbackCreateLink.addEventListener('click', function(e) {
                        e.preventDefault();
                        createDefaultUser();
                    });
                }
                
                // Verificar backend
                verificarBackend();
                
            } else {
                alert('Erro ao carregar a página. Recarregue e tente novamente.');
            }
            return;
        }
        
        console.log('✅ Elementos do DOM inicializados com sucesso');
        
        // Configurar event listeners
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const nome = nomeInput.value;
            const password = passwordInput.value;
            
            // Validação simples
            if (!nome || !password) {
                showError('Por favor, preencha todos os campos.');
                return;
            }
            
            await fazerLogin(nome, password);
        });
        
        // Event listener para o link de criar usuário
        if (createUserLink) {
            createUserLink.addEventListener('click', function(e) {
                e.preventDefault();
                createDefaultUser();
            });
        }
        
        // Verificar backend
        verificarBackend();
        
        console.log('✅ Aplicação inicializada com sucesso');
    }, 100); // 100ms delay para garantir DOM carregado
});