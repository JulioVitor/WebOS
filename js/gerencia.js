 // Modal functionality
        const modal = document.getElementById('productModal');
        const newProductBtn = document.getElementById('newProductBtn');
        const closeModal = document.querySelector('.close-modal');
        
        newProductBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
        });
        
        closeModal.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
        
        // Simulated data for demonstration
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                if (this.innerHTML.includes('fa-edit')) {
                    alert('Funcionalidade de edição será implementada em breve!');
                } else {
                    if (confirm('Tem certeza que deseja excluir este produto?')) {
                        alert('Produto excluído com sucesso!');
                    }
                }
            });
        });