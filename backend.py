from fastapi import FastAPI, HTTPException, Depends, status, Request,Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import mysql.connector
from mysql.connector import Error
import hashlib
import uuid
from datetime import datetime, timedelta
from typing import List

print("🟡 Iniciando WebOS Backend - Modo Loja Única...")

# Função de conexão com o banco de dados
def get_db_connection():
    try:
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="",
            database="webos_db",
            auth_plugin='mysql_native_password'
        )
        return conn
    except mysql.connector.Error as err:
        print(f"❌ Erro de conexão MySQL: {err}")
        return None
    
    # Função auxiliar para obter cursor como dicionário
def get_db_cursor(conn):
    if conn:
        return conn.cursor(dictionary=True)
    return None

# Função auxiliar para converter tuple em dict
def row_to_dict(cursor, row):
    if not cursor.description or not row:
        return {}
    
    # Pegar os nomes das colunas do cursor
    columns = [col[0] for col in cursor.description]
    
    # Converter a tupla para dicionário
    return dict(zip(columns, row))


# 1. CRIAR A APLICAÇÃO PRIMEIRO
app = FastAPI(title="WebOS API - Loja Única")

# 2. ADICIONAR MIDDLEWARES (ANTES DE TUDO)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. VARIÁVEIS GLOBAIS E CONFIGURAÇÕES
active_sessions = {}
LOJA_UNICA_ID = 1

# 4. FUNÇÕES AUXILIARES
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verificar_credenciais(nome: str, password: str):
    conn = get_db_connection()
    if conn is None:
        return None
    
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, nome, password, perfil FROM usuarios WHERE nome = %s AND loja_id = %s",
            (nome, LOJA_UNICA_ID)
        )
        usuario = cursor.fetchone()
        
        if usuario:
            hashed_password = hash_password(password)
            if usuario['password'] == hashed_password:
                return usuario
            elif password == usuario['password']:
                return usuario
        return None
        
    except Error as e:
        print(f"Erro ao verificar credenciais: {e}")
        return None
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

def verificar_sessao(session_token: str):
    if session_token in active_sessions:
        session_data = active_sessions[session_token]
        if datetime.now() - session_data['created_at'] < timedelta(minutes=30):
            return session_data
        else:
            del active_sessions[session_token]
    return None



# 5. MODELOS PYDANTIC
class LoginData(BaseModel):
    nome: str
    password: str

class LoginResponse(BaseModel):
    success: bool
    message: str
    user_id: int
    nome: str
    perfil: str
    session_token: str

class OSData(BaseModel):
    nome: str
    telefone: str
    cpf: str
    marca: str
    modelo: str
    defeito: str
    observacoes: Optional[str] = None
    orcamento: Optional[float] = 0.0

class ItemVenda(BaseModel):
    produto: str
    quantidade: int
    preco_Unitario: float
    preco_Total: float

    class Config:
        alias_generator = lambda x: x
        allow_population_by_field_name = True

class VendaData(BaseModel):
    cliente: str
    itens: List[ItemVenda]
    total: float
    forma_pagamento: str
    observacoes: Optional[str] = None
    data_venda: str
    usuario_id: int
    loja_id: int

class VendaResponse(BaseModel):
    success: bool
    message: str
    venda_id: int
    numero_venda: str

# Modelos para Clientes
class ClienteBase(BaseModel):
    nome: str
    email: Optional[str] = None
    telefone: str
    celular: Optional[str] = None
    cpf: Optional[str] = None
    data_nascimento: Optional[str] = None
    endereco: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    cep: Optional[str] = None
    observacoes: Optional[str] = None
    ativo: bool = True

class ClienteCreate(ClienteBase):
    pass

class Cliente(ClienteBase):
    id: int
    data_cadastro: datetime
    
    class Config:
        from_attributes = True

class ClienteResponse(BaseModel):
    clientes: List[Cliente]
    total: int
    pagina: int
    total_paginas: int

# 6. DEPENDENCIAS (MIDDLEWARES DE DEPENDÊNCIA)
async def obter_usuario_atual(request: Request):
    session_token = request.headers.get("Authorization") or request.query_params.get("token")
    if not session_token:
        raise HTTPException(status_code=401, detail="Token de sessão não fornecido")
    
    session_data = verificar_sessao(session_token)
    if not session_data:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada")
    
    return session_data

def verificar_permissao(session_data: dict, perfis_permitidos: list):
    if session_data['perfil'] not in perfis_permitidos:
        raise HTTPException(status_code=403, detail="Acesso não autorizado para este perfil")

async def obter_admin(request: Request):
    session_data = await obter_usuario_atual(request)
    verificar_permissao(session_data, ['admin'])
    return session_data

async def obter_tecnico(request: Request):
    session_data = await obter_usuario_atual(request)
    verificar_permissao(session_data, ['admin', 'tecnico'])
    return session_data

async def obter_vendedor(request: Request):
    session_data = await obter_usuario_atual(request)
    verificar_permissao(session_data, ['admin', 'vendedor'])
    return session_data

async def obter_tecnico_ou_vendedor(request: Request):
    session_data = await obter_usuario_atual(request)
    verificar_permissao(session_data, ['admin', 'tecnico', 'vendedor'])
    return session_data

# 7. ENDPOINTS
@app.get("/")
async def root():
    return {"message": "WebOS API - Modo Loja Única"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "server": "WebOS API", "modo": "loja_unica"}

@app.post("/api/login", response_model=LoginResponse)
async def login(login_data: LoginData):
    usuario = verificar_credenciais(login_data.nome, login_data.password)
    
    if not usuario:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    session_token = str(uuid.uuid4())
    session_data = {
        'user_id': usuario['id'],
        'nome': usuario['nome'],
        'perfil': usuario['perfil'],  # CORRIGIDO: era 'perifl'
        'loja_id': LOJA_UNICA_ID,
        'created_at': datetime.now()
    }
    
    active_sessions[session_token] = session_data
    
    return LoginResponse(
        success=True,
        message="Login realizado com sucesso",
        user_id=usuario['id'],
        nome=usuario['nome'],
        perfil=usuario['perfil'],
        session_token=session_token
    )

@app.get("/api/user-info")
async def get_user_info(session_data: dict = Depends(obter_usuario_atual)):
    return {
        "user_id": session_data["user_id"],
        "nome": session_data["nome"],
        "perfil": session_data["perfil"],
        "loja_id": session_data["loja_id"]
    }

@app.post("/api/create-default-user")
async def create_default_user():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            return {"error": "Erro de conexão com o banco"}
        
        cursor = conn.cursor()
        
        # Verificar se a loja única existe, se não, criar
        cursor.execute("SELECT id FROM lojas WHERE id = %s", (LOJA_UNICA_ID,))
        loja = cursor.fetchone()
        
        if not loja:
            cursor.execute(
                "INSERT INTO lojas (id, nome, cnpj, endereco, telefone, email) VALUES (%s, %s, %s, %s, %s, %s)",
                (LOJA_UNICA_ID, "Loja Principal", "00.000.000/0001-00", "Endereço Principal", "(00) 0000-0000", "contato@webos.com")
            )
            print(f"✅ Loja única criada: ID {LOJA_UNICA_ID}")
        
        # Verificar se usuário admin já existe
        cursor.execute("SELECT id FROM usuarios WHERE nome = 'admin' AND loja_id = %s", (LOJA_UNICA_ID,))
        if cursor.fetchone():
            return {"message": "Usuário admin já existe"}
        
        # Criar usuário admin
        hashed_password = hash_password("admin")
        cursor.execute(
            "INSERT INTO usuarios (loja_id, nome, password, email, perfil) VALUES (%s, %s, %s, %s, %s)",
            (LOJA_UNICA_ID, "admin", hashed_password, "admin@webos.com", "admin")
        )
        conn.commit()
        return {"message": "Usuário admin criado com sucesso", "senha": "admin"}
        
    except Exception as e:
        if conn:
            conn.rollback()
        return {"error": str(e)}
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.get("/api/debug")
async def debug_info():
    """Endpoint para debug do sistema"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            return {"error": "Não foi possível conectar ao banco de dados"}
        
        cursor = conn.cursor(dictionary=True)
        
        # Verificar tabelas existentes
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        table_names = [table['Tables_in_webos_db'] for table in tables] if tables else []
        
        # Verificar dados nas tabelas
        lojas = []
        usuarios = []
        
        if 'lojas' in table_names:
            cursor.execute("SELECT * FROM lojas")
            lojas = cursor.fetchall()
        
        if 'usuarios' in table_names:
            cursor.execute("SELECT id, nome, loja_id, email, perfil FROM usuarios WHERE loja_id = %s", (LOJA_UNICA_ID,))
            usuarios = cursor.fetchall()
        
        return {
            "database_connected": True,
            "modo": "loja_unica",
            "loja_id": LOJA_UNICA_ID,
            "tables": table_names,
            "lojas_count": len(lojas),
            "usuarios_count": len(usuarios),
            "lojas": lojas,
            "usuarios": usuarios
        }
        
    except Exception as e:
        return {"error": str(e), "database_connected": False}
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# Endpoints com controle de acesso
@app.get("/api/dashboard/vendas")
async def dashboard_vendas(session_data: dict = Depends(obter_admin)):
    # Somente admin
    return {"message": "Dashboard de vendas - Acesso administrativo"}

@app.get("/api/dashboard/caixa")
async def fechar_caixa(session_data: dict = Depends(obter_admin)):
    # Somente admin
    return {"message": "Fechamento de caixa - Acesso administrativo"}

@app.get("/api/os")
async def listar_os(session_data: dict = Depends(obter_tecnico_ou_vendedor)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=500, detail="Erro de conexão com o banco")
        
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT os.*, c.nome as cliente_nome, c.telefone as cliente_telefone
            FROM ordens_servico os
            INNER JOIN clientes c ON os.cliente_id = c.id
            WHERE os.loja_id = %s
            ORDER BY os.data_entrada DESC
        """, (LOJA_UNICA_ID,))
        
        ordens = cursor.fetchall()
        return {"ordens": ordens}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar OSs: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.post("/api/os")
async def criar_os(os_data: OSData, session_data: dict = Depends(obter_tecnico_ou_vendedor)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=500, detail="Erro de conexão com o banco")
        
        cursor = conn.cursor()
        
        # Verificar/inserir cliente
        cursor.execute("SELECT id FROM clientes WHERE cpf = %s AND loja_id = %s", 
                      (os_data.cpf, LOJA_UNICA_ID))
        cliente = cursor.fetchone()
        
        if cliente:
            cliente_id = cliente[0]
            cursor.execute(
                "UPDATE clientes SET nome = %s, telefone = %s WHERE id = %s",
                (os_data.nome, os_data.telefone, cliente_id)
            )
        else:
            cursor.execute(
                "INSERT INTO clientes (loja_id, nome, telefone, cpf) VALUES (%s, %s, %s, %s)",
                (LOJA_UNICA_ID, os_data.nome, os_data.telefone, os_data.cpf)
            )
            cliente_id = cursor.lastrowid
        
        # Gerar número da OS
        cursor.execute("SELECT COUNT(*) FROM ordens_servico WHERE loja_id = %s", (LOJA_UNICA_ID,))
        count = cursor.fetchone()[0]
        numero_os = f"{count + 1:04d}"
        
        # Inserir OS
        cursor.execute(
            """INSERT INTO ordens_servico 
            (loja_id, numero_os, cliente_id, equipamento, marca, modelo, defeito_relatado, observacoes, orcamento) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (LOJA_UNICA_ID, numero_os, cliente_id, "Celular", os_data.marca, 
             os_data.modelo, os_data.defeito, os_data.observacoes, os_data.orcamento)
        )
        
        conn.commit()
        return {
            "success": True,
            "os_id": cursor.lastrowid,
            "numero_os": numero_os,
            "message": "OS criada com sucesso!"
        }
        
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar OS: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.post("/api/vendas", response_model=VendaResponse)
async def criar_venda(venda_data: VendaData, session_data: dict = Depends(obter_vendedor)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=500, detail="Erro de conexão com o banco")
        
        cursor = conn.cursor()
        
        # Gerar número da venda
        cursor.execute("SELECT COUNT(*) FROM vendas WHERE loja_id = %s", (LOJA_UNICA_ID,))
        count = cursor.fetchone()[0]
        numero_venda = f"V{count + 1:04d}"
        
        # Inserir venda
        cursor.execute(
            """INSERT INTO vendas 
            (loja_id, numero_venda, cliente, total, forma_pagamento, observacoes, data_venda, usuario_id) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
            (LOJA_UNICA_ID, numero_venda, venda_data.cliente, venda_data.total, 
             venda_data.forma_pagamento, venda_data.observacoes, 
             venda_data.data_venda, venda_data.usuario_id)
        )
        
        venda_id = cursor.lastrowid
        
        # Inserir itens da venda
        for item in venda_data.itens:
            cursor.execute(
                """INSERT INTO itens_venda 
                (venda_id, produto, quantidade, preco_unitario, preco_total) 
                VALUES (%s, %s, %s, %s, %s)""",
                (venda_id, item.produto, item.quantidade, item.preco_Unitario, item.preco_Total)
            )
        
        conn.commit()
        
        return VendaResponse(
            success=True,
            message="Venda registrada com sucesso!",
            venda_id=venda_id,
            numero_venda=numero_venda
        )
        
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao registrar venda: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.get("/api/vendas")
async def listar_vendas(session_data: dict = Depends(obter_vendedor)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=500, detail="Erro de conexão com o banco")
        
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT v.*, u.nome as usuario_nome 
            FROM vendas v
            INNER JOIN usuarios u ON v.usuario_id = u.id
            WHERE v.loja_id = %s
            ORDER BY v.data_venda DESC
        """, (LOJA_UNICA_ID,))
        
        vendas = cursor.fetchall()
        return {"vendas": vendas}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar vendas: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# ROTAS PARA CLIENTES

# 1. DELETE primeiro
@app.delete("/api/clientes/{cliente_id}")
async def excluir_cliente(
    cliente_id: int, 
    session_data: dict = Depends(obter_tecnico_ou_vendedor)
):
    """
    Exclui um cliente (ou marca como inativo se tiver ordens de serviço)
    """
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=500, detail="Erro de conexão com o banco")
        
        cursor = conn.cursor()
        
        # Verificar se cliente existe
        cursor.execute(
            "SELECT id FROM clientes WHERE id = %s AND loja_id = %s", 
            (cliente_id, LOJA_UNICA_ID)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Cliente não encontrado")
        
        # Verificar se o cliente tem ordens de serviço associadas
        cursor.execute(
            "SELECT COUNT(*) as count FROM ordens_servico WHERE cliente_id = %s", 
            (cliente_id,)
        )
        result = cursor.fetchone()
        count_os = result[0] if result else 0
        
        if count_os > 0:
            # Marcar como inativo em vez de excluir
            cursor.execute(
                "UPDATE clientes SET ativo = FALSE WHERE id = %s AND loja_id = %s",
                (cliente_id, LOJA_UNICA_ID)
            )
            conn.commit()
            return {"success": True, "message": "Cliente marcado como inativo (possui ordens de serviço associadas)"}
        else:
            # Excluir cliente
            cursor.execute(
                "DELETE FROM clientes WHERE id = %s AND loja_id = %s",
                (cliente_id, LOJA_UNICA_ID)
            )
            conn.commit()
            return {"success": True, "message": "Cliente excluído com sucesso"}
        
    except HTTPException:
        raise
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao excluir cliente: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
@app.get("/api/clientes/{cliente_id}", response_model=Cliente)
async def buscar_cliente(
    cliente_id: int, 
    session_data: dict = Depends(obter_tecnico_ou_vendedor)
):
    """
    Busca um cliente específico pelo ID
    """
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=500, detail="Erro de conexão com o banco")
        
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute(
            "SELECT * FROM clientes WHERE id = %s AND loja_id = %s",
            (cliente_id, LOJA_UNICA_ID)
        )
        
        cliente = cursor.fetchone()
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente não encontrado")
        
        # Converter datetime para string
        if cliente['data_cadastro']:
            cliente['data_cadastro'] = cliente['data_cadastro'].isoformat()
        
        return cliente
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar cliente: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.put("/api/clientes/{cliente_id}", response_model=Cliente)
async def atualizar_cliente(
    cliente_id: int, 
    cliente_data: ClienteBase,
    session_data: dict = Depends(obter_tecnico_ou_vendedor)
):
    """
    Atualiza um cliente existente
    """
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=500, detail="Erro de conexão com o banco")
        
        cursor = conn.cursor()
        
        # Verificar se cliente existe
        cursor.execute(
            "SELECT id FROM clientes WHERE id = %s AND loja_id = %s",
            (cliente_id, LOJA_UNICA_ID)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Cliente não encontrado")
        
        # Verificar conflitos de telefone/CPF
        if cliente_data.telefone:
            cursor.execute(
                "SELECT id FROM clientes WHERE telefone = %s AND id != %s AND loja_id = %s",
                (cliente_data.telefone, cliente_id, LOJA_UNICA_ID)
            )
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Já existe outro cliente com este telefone")
        
        if cliente_data.cpf:
            cursor.execute(
                "SELECT id FROM clientes WHERE cpf = %s AND id != %s AND loja_id = %s",
                (cliente_data.cpf, cliente_id, LOJA_UNICA_ID)
            )
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Já existe outro cliente com este CPF")
        
        # Atualizar cliente com TODOS os campos
        cursor.execute(
            """UPDATE clientes SET 
            nome = %s, email = %s, telefone = %s, celular = %s, cpf = %s, 
            data_nascimento = %s, endereco = %s, numero = %s, complemento = %s,
            bairro = %s, cidade = %s, estado = %s, cep = %s, 
            observacoes = %s, ativo = %s
            WHERE id = %s AND loja_id = %s""",
            (
                cliente_data.nome, cliente_data.email, cliente_data.telefone,
                cliente_data.celular, cliente_data.cpf, cliente_data.data_nascimento,
                cliente_data.endereco, cliente_data.numero, cliente_data.complemento,
                cliente_data.bairro, cliente_data.cidade, cliente_data.estado,
                cliente_data.cep, cliente_data.observacoes, cliente_data.ativo,
                cliente_id, LOJA_UNICA_ID
            )
        )
        
        conn.commit()
        
        # Buscar cliente atualizado
        cursor.execute(
            "SELECT * FROM clientes WHERE id = %s AND loja_id = %s",
            (cliente_id, LOJA_UNICA_ID)
        )
        cliente = cursor.fetchone()
        
        if cliente:
            # Converter datetime para string
            if cliente['data_cadastro']:
                cliente['data_cadastro'] = cliente['data_cadastro'].isoformat()
            return cliente
        else:
            raise HTTPException(status_code=500, detail="Erro ao recuperar cliente atualizado")
        
    except HTTPException:
        raise
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar cliente: {str(e)}")
    finally:
        if cursor: cursor.close()



@app.post("/api/clientes", response_model=Cliente)
async def criar_cliente(
    cliente_data: ClienteCreate, 
    session_data: dict = Depends(obter_tecnico_ou_vendedor)
):
    """
    Cria um novo cliente - VERSÃO CORRIGIDA
    """
    print(f"🟡 Recebendo dados do cliente: {cliente_data.dict()}")
    
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=500, detail="Erro de conexão com o banco")
        
        cursor = conn.cursor()
        
        # Verificar se cliente já existe
        if cliente_data.telefone:
            cursor.execute(
                "SELECT id FROM clientes WHERE telefone = %s AND loja_id = %s",
                (cliente_data.telefone, LOJA_UNICA_ID)
            )
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Já existe um cliente com este telefone")
        
        if cliente_data.cpf:
            cursor.execute(
                "SELECT id FROM clientes WHERE cpf = %s AND loja_id = %s",
                (cliente_data.cpf, LOJA_UNICA_ID)
            )
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Já existe um cliente com este CPF")
        
        # Inserir novo cliente
        cursor.execute(
            """INSERT INTO clientes 
            (loja_id, nome, email, telefone, celular, cpf, data_nascimento, 
             endereco, numero, complemento, bairro, cidade, estado, cep, 
             observacoes, ativo) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                LOJA_UNICA_ID, 
                cliente_data.nome, 
                cliente_data.email, 
                cliente_data.telefone,
                cliente_data.celular,
                cliente_data.cpf, 
                cliente_data.data_nascimento,
                cliente_data.endereco, 
                cliente_data.numero, 
                cliente_data.complemento,
                cliente_data.bairro, 
                cliente_data.cidade, 
                cliente_data.estado, 
                cliente_data.cep,
                cliente_data.observacoes, 
                cliente_data.ativo
            )
        )
        
        cliente_id = cursor.lastrowid
        conn.commit()
        print(f"✅ Cliente inserido com ID: {cliente_id}")
        
        # Buscar cliente criado - FORMA CORRETA
        cursor.execute(
            "SELECT * FROM clientes WHERE id = %s",
            (cliente_id,)
        )
        row = cursor.fetchone()
        
        if row:
            # Obter nomes das colunas do cursor
            columns = [col[0] for col in cursor.description]
            # Converter tupla para dicionário
            cliente_dict = dict(zip(columns, row))
            
            print(f"✅ Cliente convertido: {cliente_dict}")
            
            # Converter datas
            for date_field in ['data_cadastro', 'data_nascimento', 'data_nasdmento']:
                if date_field in cliente_dict and cliente_dict[date_field]:
                    cliente_dict[date_field] = cliente_dict[date_field].isoformat()
            
            return cliente_dict
            
        else:
            raise HTTPException(status_code=500, detail="Erro ao recuperar cliente criado")
        
    except HTTPException as he:
        raise he
    except Exception as e:
        if conn: 
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar cliente: {str(e)}")
    finally:
        if cursor: 
            cursor.close()
        if conn: 
            conn.close()





@app.get("/api/clientes/{cliente_id}/ordens-servico")
async def listar_ordens_cliente(
    cliente_id: int,
    session_data: dict = Depends(obter_tecnico_ou_vendedor)
):
    """
    Lista todas as ordens de serviço de um cliente
    """
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=500, detail="Erro de conexão com o banco")
        
        cursor = conn.cursor(dictionary=True)
        
        # Verificar se cliente existe
        cursor.execute(
            "SELECT id, nome FROM clientes WHERE id = %s AND loja_id = %s",
            (cliente_id, LOJA_UNICA_ID)
        )
        cliente = cursor.fetchone()
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente não encontrado")
        
        # Buscar ordens de serviço do cliente
        cursor.execute("""
            SELECT os.*, u.nome as tecnico_nome
            FROM ordens_servico os
            LEFT JOIN usuarios u ON os.usuario_id = u.id
            WHERE os.cliente_id = %s AND os.loja_id = %s
            ORDER BY os.data_entrada DESC
        """, (cliente_id, LOJA_UNICA_ID))
        
        ordens = cursor.fetchall()
        
        return {
            "cliente": cliente,
            "ordens": ordens,
            "total_ordens": len(ordens)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar ordens do cliente: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
    

@app.get("/api/clientes", response_model=ClienteResponse)
async def listar_clientes(
    pagina: int = Query(1, ge=1, description="Número da página"),
    limite: int = Query(10, ge=1, le=100, description="Itens por página"),
    busca: Optional[str] = Query(None, description="Buscar por nome, telefone ou email"),
    session_data: dict = Depends(obter_tecnico_ou_vendedor)
):
    """
    Lista clientes com paginação e busca
    """
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=500, detail="Erro de conexão com o banco")
        
        cursor = conn.cursor(dictionary=True)
        
        # Construir query base - SELECIONANDO TODOS OS CAMPOS
        query = """
            SELECT id, loja_id, nome, email, telefone, celular, cpf, data_nascimento,
                   endereco, numero, complemento, bairro, cidade, estado, cep,
                   observacoes, ativo, data_cadastro
            FROM clientes 
            WHERE loja_id = %s
        """
        params = [LOJA_UNICA_ID]
        
        # Adicionar busca se fornecida
        if busca:
            query += " AND (nome LIKE %s OR telefone LIKE %s OR email LIKE %s OR celular LIKE %s)"
            search_term = f"%{busca}%"
            params.extend([search_term, search_term, search_term, search_term])
        
        # Contar total
        count_query = f"SELECT COUNT(*) as total FROM ({query}) as subquery"
        cursor.execute(count_query, params)
        total = cursor.fetchone()['total']
        
        # Calcular paginação
        offset = (pagina - 1) * limite
        total_paginas = (total + limite - 1) // limite
        
        # Buscar clientes
        query += " ORDER BY nome LIMIT %s OFFSET %s"
        params.extend([limite, offset])
        
        cursor.execute(query, params)
        clientes = cursor.fetchall()
        
        # Converter datas para formato serializável
        for cliente in clientes:
            if cliente['data_cadastro']:
                cliente['data_cadastro'] = cliente['data_cadastro'].isoformat()
            if cliente['data_nascimento']:
                cliente['data_nascimento'] = cliente['data_nascimento'].isoformat()
        
        return {
            "clientes": clientes,
            "total": total,
            "pagina": pagina,
            "total_paginas": total_paginas
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar clientes: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
    
    
if __name__ == "__main__":
    import uvicorn
    print("🚀 Servidor iniciando na porta 8001...")
    print("🏪 Modo: Loja Única")
    print("📊 Acesse http://localhost:8001/docs para a documentação da API")
    print("🐛 Acesse http://localhost:8001/api/debug para informações de debug")
    uvicorn.run(app, host="0.0.0.0", port=8001)
    
