-- --------------------------------------------------------
-- Criação do Banco de Dados
-- --------------------------------------------------------
CREATE DATABASE IF NOT EXISTS webos_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE webos_db;

-- --------------------------------------------------------
-- Tabela de Lojas (Para sistema multi-lojas)
-- --------------------------------------------------------
CREATE TABLE lojas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome_fantasia VARCHAR(100) NOT NULL,
    razao_social VARCHAR(100) NOT NULL,
    cnpj VARCHAR(18) UNIQUE NOT NULL,
    email VARCHAR(100),
    telefone VARCHAR(20),
    celular VARCHAR(20),
    endereco VARCHAR(200),
    numero VARCHAR(10),
    complemento VARCHAR(50),
    bairro VARCHAR(50),
    cidade VARCHAR(50),
    estado CHAR(2),
    cep VARCHAR(9),
    logo_path VARCHAR(255),
    ativa BOOLEAN DEFAULT TRUE,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- Tabela de Usuários do Sistema
-- --------------------------------------------------------
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loja_id INT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    tipo ENUM('admin', 'tecnico', 'vendas') DEFAULT 'vendas',
    ativo BOOLEAN DEFAULT TRUE,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_login TIMESTAMP NULL,
    FOREIGN KEY (loja_id) REFERENCES lojas(id) ON DELETE CASCADE
);

-- --------------------------------------------------------
-- Tabela de Clientes
-- --------------------------------------------------------
CREATE TABLE clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loja_id INT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    telefone VARCHAR(20) NOT NULL,
    celular VARCHAR(20),
    cpf VARCHAR(14) UNIQUE,
    data_nascimento DATE,
    endereco VARCHAR(200),
    numero VARCHAR(10),
    complemento VARCHAR(50),
    bairro VARCHAR(50),
    cidade VARCHAR(50),
    estado CHAR(2),
    cep VARCHAR(9),
    observacoes TEXT,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (loja_id) REFERENCES lojas(id) ON DELETE CASCADE
);

-- --------------------------------------------------------
-- Tabela de Ordens de Serviço
-- --------------------------------------------------------
CREATE TABLE ordens_servico (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loja_id INT NOT NULL,
    cliente_id INT NOT NULL,
    numero_os VARCHAR(10) UNIQUE NOT NULL,
    equipamento VARCHAR(100) NOT NULL,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    serial_imei VARCHAR(50),
    acessorios TEXT,
    defeito_relatado TEXT NOT NULL,
    defeito_constatado TEXT,
    observacoes TEXT,
    estado_aparelho TEXT,
    senha_desbloqueio VARCHAR(50),
    orcamento DECIMAL(10,2) DEFAULT 0.00,
    valor_total DECIMAL(10,2) DEFAULT 0.00,
    desconto DECIMAL(10,2) DEFAULT 0.00,
    status ENUM(
        'orcamento', 
        'aprovado', 
        'andamento', 
        'aguardando_peca', 
        'concluido', 
        'entregue', 
        'cancelado'
    ) DEFAULT 'orcamento',
    tecnico_id INT,
    prioridade ENUM('baixa', 'media', 'alta') DEFAULT 'media',
    data_entrada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_previsao DATE,
    data_conclusao TIMESTAMP NULL,
    data_entrega TIMESTAMP NULL,
    garantia_ate DATE,
    FOREIGN KEY (loja_id) REFERENCES lojas(id) ON DELETE CASCADE,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
    FOREIGN KEY (tecnico_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- --------------------------------------------------------
-- Tabela de Serviços Realizados
-- --------------------------------------------------------
CREATE TABLE servicos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    os_id INT NOT NULL,
    descricao TEXT NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    custo DECIMAL(10,2) DEFAULT 0.00,
    tempo_execucao INT COMMENT 'Tempo em minutos',
    data_execucao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tecnico_id INT,
    FOREIGN KEY (os_id) REFERENCES ordens_servico(id) ON DELETE CASCADE,
    FOREIGN KEY (tecnico_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- --------------------------------------------------------
-- Tabela de Peças/Produtos Utilizados
-- --------------------------------------------------------
CREATE TABLE pecas_utilizadas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    os_id INT NOT NULL,
    descricao VARCHAR(100) NOT NULL,
    quantidade DECIMAL(10,3) NOT NULL DEFAULT 1,
    valor_unitario DECIMAL(10,2) NOT NULL,
    custo_unitario DECIMAL(10,2) DEFAULT 0.00,
    data_utilizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (os_id) REFERENCES ordens_servico(id) ON DELETE CASCADE
);

-- --------------------------------------------------------
-- Tabela de Produtos para Venda
-- --------------------------------------------------------
CREATE TABLE produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loja_id INT NOT NULL,
    codigo_barras VARCHAR(50) UNIQUE,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    categoria VARCHAR(50),
    marca VARCHAR(50),
    estoque_atual DECIMAL(10,3) DEFAULT 0,
    estoque_minimo DECIMAL(10,3) DEFAULT 0,
    preco_custo DECIMAL(10,2) DEFAULT 0.00,
    preco_venda DECIMAL(10,2) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (loja_id) REFERENCES lojas(id) ON DELETE CASCADE
);

-- --------------------------------------------------------
-- Tabela de Vendas (PDV)
-- --------------------------------------------------------
CREATE TABLE vendas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loja_id INT NOT NULL,
    cliente_id INT,
    numero_venda VARCHAR(10) UNIQUE NOT NULL,
    tipo_venda ENUM('balcao', 'delivery', 'os') DEFAULT 'balcao',
    os_id INT NULL,
    total_venda DECIMAL(10,2) NOT NULL,
    desconto DECIMAL(10,2) DEFAULT 0.00,
    total_pago DECIMAL(10,2) NOT NULL,
    forma_pagamento ENUM('dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'transferencia') DEFAULT 'dinheiro',
    status ENUM('pendente', 'pago', 'cancelado') DEFAULT 'pendente',
    vendedor_id INT NOT NULL,
    data_venda TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_pagamento TIMESTAMP NULL,
    observacoes TEXT,
    FOREIGN KEY (loja_id) REFERENCES lojas(id) ON DELETE CASCADE,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
    FOREIGN KEY (os_id) REFERENCES ordens_servico(id) ON DELETE SET NULL,
    FOREIGN KEY (vendedor_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- --------------------------------------------------------
-- Tabela de Itens Vendidos
-- --------------------------------------------------------
CREATE TABLE itens_venda (
    id INT AUTO_INCREMENT PRIMARY KEY,
    venda_id INT NOT NULL,
    produto_id INT NOT NULL,
    quantidade DECIMAL(10,3) NOT NULL,
    valor_unitario DECIMAL(10,2) NOT NULL,
    desconto DECIMAL(10,2) DEFAULT 0.00,
    total_item DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE,
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
);

-- --------------------------------------------------------
-- Tabela de Movimentação de Estoque
-- --------------------------------------------------------
CREATE TABLE movimentacao_estoque (
    id INT AUTO_INCREMENT PRIMARY KEY,
    produto_id INT NOT NULL,
    tipo ENUM('entrada', 'saida', 'ajuste') NOT NULL,
    quantidade DECIMAL(10,3) NOT NULL,
    motivo VARCHAR(100),
    observacoes TEXT,
    usuario_id INT NOT NULL,
    data_movimentacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- --------------------------------------------------------
-- Inserção de Dados Iniciais
-- --------------------------------------------------------

-- Inserir loja principal
INSERT INTO lojas (
    nome_fantasia, 
    razao_social, 
    cnpj, 
    email, 
    telefone, 
    endereco, 
    numero, 
    bairro, 
    cidade, 
    estado, 
    cep
) VALUES (
    'TecnoCell Assistência Técnica', 
    'TecnoCell Serviços de Tecnologia LTDA', 
    '12.345.678/0001-90', 
    'contato@tecnocell.com.br', 
    '(11) 3333-3333', 
    'Avenida Principal', 
    '1234', 
    'Centro', 
    'São Paulo', 
    'SP', 
    '01234-567'
);

-- Inserir usuário admin
INSERT INTO usuarios (
    loja_id, 
    nome, 
    email, 
    senha_hash, 
    tipo
) VALUES (
    1, 
    'Administrador', 
    'admin@tecnocell.com.br', 
    '$2b$10$ExampleHashExampleHashExampleHash', 
    'admin'
);

-- Inserir alguns clientes de exemplo
INSERT INTO clientes (
    loja_id, 
    nome, 
    email, 
    telefone, 
    cpf
) VALUES 
(1, 'João Silva', 'joao@email.com', '(11) 99999-9999', '123.456.789-00'),
(1, 'Maria Santos', 'maria@email.com', '(11) 98888-8888', '987.654.321-00');

-- Inserir alguns produtos de exemplo
INSERT INTO produtos (
    loja_id, 
    codigo_barras, 
    nome, 
    categoria, 
    estoque_atual, 
    preco_venda
) VALUES 
(1, '7891234567890', 'Película Protetora Vidro', 'Acessórios', 50, 25.90),
(1, '7891234567891', 'Capa Silicone', 'Acessórios', 30, 35.90),
(1, '7891234567892', 'Carregador Original Samsung', 'Carregadores', 20, 89.90);

-- --------------------------------------------------------
-- Criação de Índices para Melhor Performance
-- --------------------------------------------------------
CREATE INDEX idx_os_loja ON ordens_servico(loja_id);
CREATE INDEX idx_os_cliente ON ordens_servico(cliente_id);
CREATE INDEX idx_os_status ON ordens_servico(status);
CREATE INDEX idx_clientes_loja ON clientes(loja_id);
CREATE INDEX idx_produtos_loja ON produtos(loja_id);
CREATE INDEX idx_produtos_codigo ON produtos(codigo_barras);
CREATE INDEX idx_vendas_loja ON vendas(loja_id);
CREATE INDEX idx_vendas_data ON vendas(data_venda);

-- --------------------------------------------------------
-- Criação de Usuário para a Aplicação
-- --------------------------------------------------------
CREATE USER IF NOT EXISTS 'webos_user'@'localhost' IDENTIFIED BY 'SenhaSegura123';
GRANT ALL PRIVILEGES ON webos_db.* TO 'webos_user'@'localhost';
FLUSH PRIVILEGES;

-- --------------------------------------------------------
-- Mensagem de Confirmação
-- --------------------------------------------------------
SELECT 'Banco de dados WebOS criado com sucesso!' AS Status;