# ⚙️ WebOS — Sistema de Gestão Inteligente para Lojas e Serviços

![Preview do Sistema](./preview.gif)

O **WebOS** é um sistema completo de **gestão para lojas e prestadores de serviço**, desenvolvido em **FastAPI** com interface moderna e responsiva.  
Ele oferece controle sobre **estoque, vendas, ordens de serviço, usuários, relatórios e análises de desempenho**, tudo hospedado em um **servidor VPS da Hostinger** para máxima performance e disponibilidade.

---

## 🚀 Tecnologias Utilizadas

### 🧩 Backend
- **FastAPI (Python 3.11+)** — Framework leve e de alto desempenho  
- **Uvicorn** — Servidor ASGI para execução rápida da API  
- **SQLAlchemy** — ORM para integração com o banco de dados  
- **SQLite / MySQL** — Banco de dados configurável  
- **Pydantic** — Validação e tipagem de dados  
- **JWT Auth** — Sistema seguro de autenticação por tokens  

### 💻 Frontend
- **HTML5 / CSS3 / JavaScript puro**  
- **Fetch API** para integração com a API REST  
- **Layout responsivo** adaptado a desktop e mobile  

### ☁️ Infraestrutura
- **Deploy na VPS Hostinger (Ubuntu Server)**  
- **Nginx** como proxy reverso  
- **Supervisor** para manter o processo Uvicorn ativo  
- **Certbot (Let's Encrypt)** para HTTPS automático  

---

## 💡 Funcionalidades Principais

| Módulo | Descrição |
|--------|------------|
| 🔐 Login com JWT | Sistema seguro de autenticação |
| 👥 Usuários | Gerenciamento de perfis e permissões |
| 📦 Estoque | Cadastro, edição e controle de produtos |
| 💰 Vendas rápidas | Tela de venda direta e fechamento de caixa |
| 🧾 Ordens de serviço | Criação e acompanhamento com status dinâmicos |
| 📊 Relatórios e analytics | Gráficos e métricas de desempenho |
| 🧮 Fechamento de caixa | Controle diário de entradas e saídas |
| ⚙️ Dashboard moderna | Painel intuitivo e leve |

---
## ⚙️ Instalação e Execução Local

1. Clone o repositório:
   ```bash
   git clone https://github.com/seuusuario/webos.git
   cd webos
2.Crie um ambiente virtual:
```
python3 -m venv venv
source venv/bin/activate  # Linux/macOS
venv\Scripts\activate # Windows
```
3.Instale as dependencias:
```
pip install -r requirements.txt
```
4.Inicie o servidor local:
```
uvicorn backend.main:app --reload
```
5.Acesse pelo navegador:
```
http://localhost:8000
```

☁️ Deploy na VPS Hostinger

O deploy foi realizado em uma VPS Ubuntu com:

  >Nginx configurado como proxy reverso
  >Uvicorn rodando em segundo plano via Supervisor
  >Certbot para HTTPS automático
Fluxo básico:
```
sudo apt update && apt upgrade
sudo apt install python3-venv nginx certbot python3-certbot-nginx
git clone https://github.com/seuusuario/webos.git
cd webos
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8001
````

Depois, configurar o Nginx:
```
/etc/nginx/sites-available/webos
```
E ativar o domínio:
```bash 
sudo ln -s /etc/nginx/sites-available/webos /etc/nginx/sites-enabled
sudo nginx -t
sudo systemctl restart nginx
```
📊 Rotas Principais da API
Endpoint	Método	Descrição
/api/login	POST	Autenticação de usuário
/api/usuarios	GET / POST / PUT / DELETE	CRUD de usuários
/api/produtos	GET / POST / PUT / DELETE	Controle de estoque
/api/vendas	GET / POST	Registro e listagem de vendas
/api/relatorios	GET	Dados analíticos
/api/os	GET / POST / PUT	Ordens de serviço

🧠 Conceito e Objetivo

O WebOS busca simplificar a gestão de negócios locais, unindo agilidade, controle e acessibilidade.
Seu design modular permite integração com outras soluções da Byte Solutions, como rastreamento via GPS e gestão de fazendas.

💬 Contato

📧 E-mail: contato@bytesolutions.com

💬 WhatsApp: Clique aqui para conversar

🌍 Site: bytesolutions.com.br

🪪 Licença

Este projeto é de uso interno e institucional da Byte Solutions.
Distribuição ou cópia não autorizada são proibidas.


Segue abixo screenshots do projeto.
<img width="1316" height="525" alt="Captura de tela 2025-09-03 194358" src="https://github.com/user-attachments/assets/6c8ff90b-0f26-430a-9a2f-8f2c2d665176" />
<img width="911" height="580" alt="Captura de tela 2025-09-03 194245" src="https://github.com/user-attachments/assets/14c96dfe-f8af-4c8b-9fa1-8e0c23cd29a9" />

