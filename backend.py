from fastapi import FastAPI, HTTPException, Depends, status, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from fastapi.responses import FileResponse 
from typing import Optional,Union, Any
import mysql.connector
from mysql.connector import Error
import hashlib,json,os
import uuid
from datetime import datetime, timedelta,date
from typing import List
from pathlib import Path
from decimal import Decimal
import os
import shutil
import pickle
import mysql.connector

app = FastAPI()

@app.get("/")
def home():
    return {"message": "🚀 FastAPI rodando com sucesso!"}


# ✅ CONFIGURAÇÃO DIRETA DO BANCO
DB_CONFIG = {
    "host": "localhost",
    "user": "root", 
    "password": "",  # 🔄 Se tiver senha, coloque aqui
    "database": "webos_prod",
    "auth_plugin": 'mysql_native_password'
}

# ✅ LOJA FIXA - LOJA 1
LOJA_UNICA_ID = 1

# ✅ CONEXÃO ÚNICA E SIMPLES
def get_db_connection():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        print("🗃️ Conexão MySQL estabelecida com webos_prod!")
        return conn
    except Error as err:
        print(f"❌ Erro MySQL: {err}")
        raise

# ✅ FUNÇÃO SIMPLIFICADA PARA LOJA_ID
def get_loja_id(session_data: dict = None):
    return LOJA_UNICA_ID

print(f"🎯 Sistema configurado - Banco: webos_prod, Loja ID: {LOJA_UNICA_ID}")


# 1. CRIAR A APLICAÇÃO PRIMEIRO
app = FastAPI(title="WebOS Loja-Única API", version="1.0.0")

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

# 4. FUNÇÕES AUXILIARES
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verificar_credenciais(nome: str, password: str):
    conn = get_db_connection()
    if conn is None:
        return None
    
    try:
        cursor = conn.cursor(dictionary=True)
        # ✅ Buscar usuário em QUALQUER loja primeiro para descobrir sua loja_id
        cursor.execute(
            "SELECT id, nome, password, perfil, loja_id FROM usuarios WHERE nome = %s",
            (nome,)
        )
        usuarios = cursor.fetchall()
        
        if not usuarios:
            return None
        
        # Verificar credenciais em cada usuário encontrado
        for usuario in usuarios:
            hashed_password = hash_password(password)
            if usuario['password'] == hashed_password:
                return usuario
            elif password == usuario['password']:  # Fallback para senha não hash
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

# Função auxiliar para serializar dados do MySQL
def serialize_mysql_data(data):
    """Converte dados do MySQL para tipos serializáveis em JSON"""
    if isinstance(data, dict):
        return {key: serialize_mysql_data(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [serialize_mysql_data(item) for item in data]
    elif isinstance(data, Decimal):
        return float(data)  # ✅ Converte Decimal para float
    elif isinstance(data, (datetime, date)):
        return data.isoformat()  # ✅ Converte datas
    elif isinstance(data, (bytes, bytearray)):
        return data.decode('utf-8', errors='ignore')  # ✅ Converte bytes
    else:
        return data

# 5. MODELOS PYDANTIC (MANTIDOS ORIGINAIS)

class DecimalEncoder(json.JSONEncoder):
    """Encoder personalizado para lidar com Decimal e datas"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)  # ✅ Converte Decimal para float
        elif isinstance(obj, (datetime, date)):
            return obj.isoformat()  # ✅ Converte datas para string
        elif hasattr(obj, '__dict__'):
            # Para objetos que podem ser convertidos para dict
            return obj.__dict__
        return super().default(obj)

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
    
class Config:
        # ✅ Permite campos extras e conversão de tipos
        extra = "ignore"
        from_attributes = True

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
    total_venda: float
    total: Optional[float] = None
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

#modelo fechamento caixa
class FechamentoCaixaBase(BaseModel):
    data: date
    valor_inicial: float
    valor_final: float
    total_vendas: float
    total_entradas: float
    total_saidas: float
    total_os_entregues: Optional[float] = 0.0
    observacoes: Optional[str] = None
    status: Optional[str] = "fechado"
class FechamentoCaixaCompleto(BaseModel):
    data: date
    valor_inicial: float
    valor_final: float
    total_vendas: float
    total_entradas: float
    total_saidas: float
    total_os_entregues: Optional[float] = 0.0
    observacoes: Optional[str] = None
    status: Optional[str] = "fechado"
class FechamentoCaixaResponse(BaseModel):
    id: int
    user_id: int
    loja_id: int
    data: date
    valor_inicial: float
    valor_final: float
    total_vendas: float
    total_entradas: float
    total_saidas: float
    total_os_entregues: Optional[float] = 0.0
    observacoes: Optional[str] = None
    status: str
    usuario: str
    reaberto_por: Optional[int] = None
    usuario_reabertura: Optional[str] = None
    data_reabertura: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class ReabrirCaixaRequest(BaseModel):
    motivo: Optional[str] = None
class ReabrirCaixaRequest(BaseModel):
    motivo: Optional[str] = None

class FechamentoCaixaCreate(FechamentoCaixaBase):
    pass

class MovimentacaoCaixaCreate(BaseModel):
    tipo: str  # 'entrada' ou 'saida'
    descricao: str
    valor: float
    data: date



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
    ativo: Optional[bool] = Field(default=True)


class StandardListResponse(BaseModel):
    data: List[Any]
    total: int
    pagina: int
    total_paginas: int

class ClienteUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    ativo: Optional[bool] = None
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
    
# Modelo para OS  
class OSResponse(BaseModel):
    id: int
    numero_os: str
    cliente_nome: str
    cliente_telefone: str
    equipamento: str
    marca: str
    modelo: str
    defeito_relatado: str
    observacoes: Optional[str] = None
    orcamento: float
    status: str
    data_entrada: datetime
    data_entrega: Optional[datetime] = None
    data_conclusao: Optional[datetime] = None
    usuario_nome: Optional[str] = None

class OSListResponse(BaseModel):
    ordens: List[OSResponse]
    total: int
    pagina: int
    total_paginas: int


class OSStatusUpdate(BaseModel):
    status: str
    
# Modelos Pydantic para Usuários 
class UsuarioBase(BaseModel):
    nome: str
    email: str
    perfil: str
    ativo: bool = True

class UsuarioCreate(UsuarioBase):
    password: str

class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[str] = None
    perfil: Optional[str] = None
    password: Optional[str] = None
    ativo: Optional[bool] = None

class UsuarioResponse(UsuarioBase):
    id: int
    loja_id: int
    data_criacao: datetime
    
    class Config:
        from_attributes = True
        
        

# MODELOS PYDANTIC PARA PERMISSÕES 

class PermissaoBase(BaseModel):
    permissao: str
    descricao: str

class UsuarioPermissaoCreate(BaseModel):
    usuario_id: int
    permissoes: List[str]

class UsuarioPermissaoResponse(BaseModel):
    usuario_id: int
    nome: str
    email: str
    perfil: str
    permissoes: List[str]
    
    
# MODELOS PYDANTIC PARA PRODUTOS 

class ProdutoBase(BaseModel):
    codigo_barras: Optional[str] = None
    nome: str
    descricao: Optional[str] = None
    categoria: Optional[str] = None
    marca: Optional[str] = None
    estoque_atual: float = 0.0
    estoque_minimo: float = 0.0
    preco_custo: float = 0.0
    preco_venda: float
    ativo: bool = True

class ProdutoCreate(ProdutoBase):
    pass

class ProdutoUpdate(BaseModel):
    codigo_barras: Optional[str] = None
    nome: Optional[str] = None
    descricao: Optional[str] = None
    categoria: Optional[str] = None
    marca: Optional[str] = None
    estoque_atual: Optional[float] = None
    estoque_minimo: Optional[float] = None
    preco_custo: Optional[float] = None
    preco_venda: Optional[float] = None
    ativo: Optional[bool] = None

class ProdutoResponse(ProdutoBase):
    id: int
    loja_id: int
    data_cadastro: Optional[datetime] = None
    data_atualizacao: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class ProdutoListResponse(BaseModel):
    produtos: List[ProdutoResponse]
    total: int
    pagina: int
    total_paginas: int


class DashboardStats(BaseModel):
    totalProdutos: int
    vendasMes: float
    osAndamento: int
    estoquesBaixos: int
    totalClientes: Optional[int] = 0
    osConcluidasMes: Optional[int] = 0
    ticketMedio: Optional[float] = 0.0
    vendasHoje: Optional[float] = 0.0
    produtosSemEstoque: Optional[int] = 0
    totalVendas: Optional[int] = 0 
    
class BackupConfig(BaseModel):
    tipo: str = "completo"
    descricao: Optional[str] = None
    
class BackupResponse(BaseModel):
    success: bool
    message: str
    backup_id: str
    total_registros: int
    tabelas_incluidas: List[str]
    data_backup: str
    caminho_backup: str
    tamanho_bytes: int

class PermissaoUpdate(BaseModel):
    nivel_acesso: Optional[str] = None
    permissoes: Optional[List[str]] = None
    

# =============================================
# ENDPOINTS PARA RELATÓRIOS
# =============================================

class RelatorioRequest(BaseModel):
    tipos: List[str]
    data_inicio: Optional[str] = None
    data_fim: Optional[str] = None


# 6. DEPENDENCIAS (MIDDLEWARES DE DEPENDÊNCIA) - CORRIGIDAS
async def obter_usuario_atual(request: Request):
    session_token = request.headers.get("Authorization") or request.query_params.get("token")
    print(f"🔐 Token recebido: {session_token}")  # ✅ DEBUG

    if not session_token:
        raise HTTPException(status_code=401, detail="Token de sessão não fornecido")
    
    session_data = verificar_sessao(session_token)
    print(f"🔐 Dados da sessão: {session_data}")  # ✅ DEBUG
    if not session_data:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada")
    
    return session_data

def verificar_permissao(session_data: dict, perfis_permitidos: list):
    """Verifica se o usuário tem permissão para acessar a rota"""
    if session_data['perfil'] not in perfis_permitidos:
        raise HTTPException(
            status_code=403, 
            detail=f"Acesso não autorizado. Perfil necessário: {', '.join(perfis_permitidos)}"
        )

async def obter_admin(request: Request):
    """Somente ADMIN"""
    session_data = await obter_usuario_atual(request)
    verificar_permissao(session_data, ['admin'])
    return session_data

async def obter_vendedor(request: Request):
    """VENDEDOR pode vender"""
    session_data = await obter_usuario_atual(request)
    verificar_permissao(session_data, ['admin', 'vendedor'])
    return session_data

async def obter_tecnico(request: Request):
    """TÉCNICO pode gerenciar OS"""
    session_data = await obter_usuario_atual(request)
    verificar_permissao(session_data, ['admin', 'tecnico'])
    return session_data

async def obter_vendedor_ou_tecnico(request: Request):
    """VENDEDOR ou TÉCNICO (para clientes e visualização de OS)"""
    session_data = await obter_usuario_atual(request)
    verificar_permissao(session_data, ['admin', 'vendedor', 'tecnico'])
    return session_data

async def obter_todos_usuarios(request: Request):
    """Todos os usuários logados"""
    session_data = await obter_usuario_atual(request)
    return session_data

# 7. ENDPOINTS 
@app.get("/")
async def root():
    return {"message": f"WebOS API - Loja {LOJA_UNICA_ID} - Banco: webos_prod"}

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy", 
        "server": "WebOS API", 
        "loja_id": LOJA_UNICA_ID,
        "banco": "webos_prod"
    }

@app.post("/api/login", response_model=LoginResponse)
async def login(login_data: LoginData):
    # ✅ Tentar encontrar o usuário em QUALQUER loja primeiro
    conn = get_db_connection()
    if conn is None:
        raise HTTPException(status_code=500, detail="Erro de conexão com o banco")
    
    try:
        cursor = conn.cursor(dictionary=True)
        
        # ✅ PRIMEIRO: Buscar o usuário em QUALQUER loja para descobrir sua loja_id
        cursor.execute(
            "SELECT id, nome, password, perfil, loja_id FROM usuarios WHERE nome = %s",
            (login_data.nome,)
        )
        usuarios = cursor.fetchall()
        
        if not usuarios:
            raise HTTPException(status_code=401, detail="Credenciais inválidas")
        
        usuario_encontrado = None
        
        # ✅ Verificar credenciais em cada usuário encontrado
        for usuario in usuarios:
            hashed_password = hash_password(login_data.password)
            if usuario['password'] == hashed_password or login_data.password == usuario['password']:
                usuario_encontrado = usuario
                break
        
        if not usuario_encontrado:
            raise HTTPException(status_code=401, detail="Credenciais inválidas")
        
        # ✅ AGORA usar a loja_id do usuário encontrado
        session_token = str(uuid.uuid4())
        session_data = {
            'user_id': usuario_encontrado['id'],
            'nome': usuario_encontrado['nome'],
            'perfil': usuario_encontrado['perfil'],
            'loja_id': usuario_encontrado['loja_id'],  # ✅ Usa a loja REAL do usuário
            'created_at': datetime.now()
        }
        
        active_sessions[session_token] = session_data
        
        print(f"✅ Login realizado: {usuario_encontrado['nome']} - Loja ID: {usuario_encontrado['loja_id']}")
        
        return LoginResponse(
            success=True,
            message="Login realizado com sucesso",
            user_id=usuario_encontrado['id'],
            nome=usuario_encontrado['nome'],
            perfil=usuario_encontrado['perfil'],
            session_token=session_token
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro no login: {e}")
        raise HTTPException(status_code=500, detail=f"Erro no login: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.get("/api/user-info")
async def get_user_info(session_data: dict = Depends(obter_todos_usuarios)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        cursor.execute("""
            SELECT id, nome, email, perfil 
            FROM usuarios 
            WHERE id = %s AND loja_id = %s
        """, (session_data["user_id"], loja_id))
        
        usuario = cursor.fetchone()
        
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
        nome = usuario['nome']
        inicial = nome[0].upper() if nome else 'U'
        
        return {
            "user_id": session_data["user_id"],
            "nome": nome,
            "inicial": inicial,
            "perfil": usuario['perfil'],
            "loja_id": session_data["loja_id"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar informações do usuário: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.post("/api/create-default-user")
async def create_default_user():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            return {"error": "Erro de conexão com o banco"}
        
        cursor = conn.cursor()
        
        # Verificar se a loja única existe
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

# Endpoints ADMIN apenas
@app.get("/api/dashboard/vendas")
async def dashboard_vendas(session_data: dict = Depends(obter_admin)):
    return {"message": "Dashboard de vendas - Acesso administrativo"}

@app.get("/api/dashboard/caixa")
async def fechar_caixa(session_data: dict = Depends(obter_admin)):
    return {"message": "Fechamento de caixa - Acesso administrativo"}

@app.get("/api/relatorios")
async def relatorios(session_data: dict = Depends(obter_admin)):
    return {"message": "Relatórios - Acesso administrativo"}

# Endpoints OS - TÉCNICO pode criar, VENDEDOR pode visualizar
@app.post("/api/os")
async def criar_os(os_data: OSData, session_data: dict = Depends(obter_vendedor_ou_tecnico)):
    conn = None
    cursor = None
    try:
        print(f"📥 Dados recebidos para criar OS: {os_data}")
        
        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=500, detail="Erro de conexão com o banco")
        
        cursor = conn.cursor()
        
        loja_id = get_loja_id(session_data)
        print(f"🏪 Loja ID: {loja_id}")
        
        # Verificar/inserir cliente
        cursor.execute("SELECT id FROM clientes WHERE cpf = %s AND loja_id = %s", 
                      (os_data.cpf, loja_id))
        cliente = cursor.fetchone()
        
        if cliente:
            cliente_id = cliente[0]
            print(f"✅ Cliente existente: ID {cliente_id}")
            cursor.execute(
                "UPDATE clientes SET nome = %s, telefone = %s WHERE id = %s",
                (os_data.nome, os_data.telefone, cliente_id)
            )
        else:
            print("🆕 Criando novo cliente")
            cursor.execute(
                "INSERT INTO clientes (loja_id, nome, telefone, cpf) VALUES (%s, %s, %s, %s)",
                (loja_id, os_data.nome, os_data.telefone, os_data.cpf)
            )
            cliente_id = cursor.lastrowid
            print(f"✅ Novo cliente criado: ID {cliente_id}")
        
        # ✅ CORREÇÃO: Geração do número OS DENTRO do try principal
        try:
            cursor.execute("""
                SELECT COALESCE(MAX(CAST(numero_os AS UNSIGNED)), 0) 
                FROM ordens_servico 
                WHERE loja_id = %s
            """, (loja_id,))
            
            resultado = cursor.fetchone()[0]
            ultimo_numero = int(resultado)
            proximo_numero = ultimo_numero + 1
            numero_os = f"{proximo_numero:04d}"
            
            print(f"🔢 Número OS gerado: {numero_os} (baseado no último: {ultimo_numero})")
            
        except Exception as e:
            print(f"⚠️  Erro ao gerar número OS, usando fallback: {e}")
            numero_os = "0001"

        # Inserir OS com usuario_id
        print(f"💾 Inserindo OS no banco...")
        cursor.execute(
            """INSERT INTO ordens_servico 
            (loja_id, numero_os, cliente_id, equipamento, marca, modelo, defeito_relatado, observacoes, orcamento, usuario_id, status) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'andamento')""",
            (loja_id, numero_os, cliente_id, "Celular", os_data.marca, 
             os_data.modelo, os_data.defeito, os_data.observacoes, os_data.orcamento, session_data['user_id'])
        )
        
        os_id = cursor.lastrowid
        conn.commit()
        
        print(f"✅ OS criada com sucesso! ID: {os_id}, Número: {numero_os}")
        
        return {
            "success": True,
            "os_id": os_id,
            "numero_os": numero_os,
            "message": "OS criada com sucesso!"
        }
        
    except Exception as e:
        if conn: 
            conn.rollback()
        print(f"❌ Erro ao criar OS: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao criar OS: {str(e)}")
    finally:
        if cursor: 
            cursor.close()
        if conn: 
            conn.close()

@app.get("/api/os", response_model=OSListResponse)
async def listar_os(
    pagina: int = Query(1, ge=1),
    limite: int = Query(10, ge=1, le=100),
    status: Optional[str] = Query(None),
    busca: Optional[str] = Query(None),
    session_data: dict = Depends(obter_vendedor_ou_tecnico)
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        query = """
            SELECT 
                os.id, os.numero_os, os.equipamento, os.marca, os.modelo,
                os.defeito_relatado, os.observacoes, os.orcamento, os.status,
                os.data_entrada, os.data_conclusao, os.data_entrega,
                c.nome as cliente_nome, c.telefone as cliente_telefone,
                u.nome as usuario_nome
            FROM ordens_servico os
            INNER JOIN clientes c ON os.cliente_id = c.id
            LEFT JOIN usuarios u ON os.usuario_id = u.id
            WHERE os.loja_id = %s
        """
        params = [loja_id]
        
        if session_data['perfil'] != 'admin':
            query += " AND os.usuario_id = %s"
            params.append(session_data['user_id'])
        
        if status:
            query += " AND os.status = %s"
            params.append(status)
        
        if busca:
            query += " AND (c.nome LIKE %s OR os.numero_os LIKE %s OR c.telefone LIKE %s)"
            search_term = f"%{busca}%"
            params.extend([search_term, search_term, search_term])
        
        count_query = f"SELECT COUNT(*) as total FROM ({query}) as subquery"
        cursor.execute(count_query, params)
        total = cursor.fetchone()['total']
        
        offset = (pagina - 1) * limite
        total_paginas = (total + limite - 1) // limite
        
        query += " ORDER BY os.data_entrada DESC LIMIT %s OFFSET %s"
        params.extend([limite, offset])
        
        cursor.execute(query, params)
        ordens = cursor.fetchall()
        
        for ordem in ordens:
            if ordem['data_entrada']:
                ordem['data_entrada'] = ordem['data_entrada'].isoformat()
            if ordem['data_conclusao']:
                ordem['data_conclusao'] = ordem['data_conclusao'].isoformat()
        
        return {
            "ordens": ordens,
            "total": total,
            "pagina": pagina,
            "total_paginas": total_paginas
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar OS: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# Endpoints VENDAS - Somente VENDEDOR
@app.post("/api/vendas", response_model=VendaResponse)
async def criar_venda(venda_data: VendaData, session_data: dict = Depends(obter_vendedor)):
    if not venda_data.itens or len(venda_data.itens) == 0:
        raise HTTPException(status_code=400, detail="Nenhum item na venda")
    
    if venda_data.total_venda is None:
        venda_data.total_venda = 0.0
    
    venda_data.usuario_id = session_data['user_id']
    
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=500, detail="Erro de conexão com o banco")
        
        cursor = conn.cursor()
        
        loja_id = get_loja_id(session_data)
        
        # ✅ VERIFICAÇÃO DE ESTOQUE ANTES DE GERAR NÚMERO DA VENDA
        for item in venda_data.itens:
            if not item.produto or not item.quantidade or item.quantidade <= 0:
                continue
                
            cursor.execute(
                """SELECT id, nome, estoque_atual 
                FROM produtos 
                WHERE nome = %s AND loja_id = %s AND ativo = 1""",
                (item.produto, loja_id)
            )
            produto = cursor.fetchone()
            
            if produto:
                produto_id, nome_produto, estoque_atual = produto
                if estoque_atual is not None and estoque_atual < item.quantidade:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Estoque insuficiente para '{nome_produto}'. Disponível: {estoque_atual}, Solicitado: {item.quantidade}"
                    )
        
        # ✅ SOLUÇÃO SEGURA PARA GERAR NÚMERO DA VENDA
        numero_venda = None
        tentativas = 0
        max_tentativas = 10
        
        while not numero_venda and tentativas < max_tentativas:
            try:
                # Buscar o maior número de venda atual
                cursor.execute("""
                    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_venda, 2) AS UNSIGNED)), 0) 
                    FROM vendas WHERE loja_id = %s
                """, (loja_id,))
                
                resultado = cursor.fetchone()
                ultimo_numero = int(resultado[0]) if resultado and resultado[0] is not None else 0
                proximo_numero = ultimo_numero + 1
                numero_venda_candidato = f"V{proximo_numero:04d}"
                
                # Verificar se já existe (double-check)
                cursor.execute(
                    "SELECT id FROM vendas WHERE numero_venda = %s AND loja_id = %s",
                    (numero_venda_candidato, loja_id)
                )
                
                if not cursor.fetchone():
                    numero_venda = numero_venda_candidato
                else:
                    # Número já existe, tentar próximo
                    tentativas += 1
                    continue
                    
            except Exception as e:
                print(f"⚠️ Erro ao gerar número venda (tentativa {tentativas + 1}): {e}")
                tentativas += 1
                continue
        
        # Se não conseguiu gerar número único
        if not numero_venda:
            # Fallback: usar timestamp como número
            timestamp = int(datetime.now().timestamp())
            numero_venda = f"V{timestamp % 10000:04d}"
            print(f"⚠️ Usando fallback para número da venda: {numero_venda}")
        
        print(f"🔢 Número da venda gerado: {numero_venda}")
        
        # ✅ INSERIR VENDA
        cursor.execute(
            """INSERT INTO vendas 
            (loja_id, numero_venda, cliente, total_venda, total_pago, forma_pagamento, 
             observacoes, data_venda, vendedor_id, usuario_id) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (loja_id, numero_venda, venda_data.cliente, venda_data.total_venda,
             venda_data.total_venda, venda_data.forma_pagamento, venda_data.observacoes, 
             venda_data.data_venda, session_data['user_id'], venda_data.usuario_id)
        )
        
        venda_id = cursor.lastrowid
        
        # ✅ PROCESSAR ITENS E ATUALIZAR ESTOQUE
        for item in venda_data.itens:
            if not item.produto or not item.quantidade or item.quantidade <= 0:
                continue
                
            cursor.execute(
                "SELECT id, estoque_atual FROM produtos WHERE nome = %s AND loja_id = %s",
                (item.produto, loja_id)
            )
            produto = cursor.fetchone()
            
            if not produto:
                # Criar produto se não existir
                cursor.execute(
                    "INSERT INTO produtos (loja_id, nome, preco_venda, estoque_atual, ativo) VALUES (%s, %s, %s, %s, %s)",
                    (loja_id, item.produto, item.preco_Unitario or 0, 0, 1)
                )
                produto_id = cursor.lastrowid
                novo_estoque = 0
            else:
                produto_id, estoque_atual = produto
                if estoque_atual is not None:
                    novo_estoque = estoque_atual - item.quantidade
                    cursor.execute(
                        "UPDATE produtos SET estoque_atual = %s WHERE id = %s",
                        (novo_estoque, produto_id)
                    )
            
            # Inserir item da venda
            cursor.execute(
                """INSERT INTO itens_venda 
                (venda_id, produto_id, quantidade, valor_unitario, total_item) 
                VALUES (%s, %s, %s, %s, %s)""",
                (venda_id, produto_id, item.quantidade, item.preco_Unitario or 0, item.preco_Total or 0)
            )
        
        conn.commit()
        
        print(f"✅ Venda registrada com sucesso: {numero_venda}")
        
        return VendaResponse(
            success=True,
            message="Venda registrada com sucesso! Estoque atualizado.",
            venda_id=venda_id,
            numero_venda=numero_venda
        )
        
    except HTTPException:
        raise
    except Exception as e:
        if conn: 
            conn.rollback()
        print(f"❌ Erro ao registrar venda: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao registrar venda: {str(e)}")
    finally:
        if cursor: 
            cursor.close()
        if conn: 
            conn.close()
            
@app.get("/api/vendas")
async def listar_vendas(session_data: dict = Depends(obter_vendedor)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        if session_data['perfil'] == 'admin':
            cursor.execute("""
                SELECT v.*, u.nome as usuario_nome 
                FROM vendas v
                INNER JOIN usuarios u ON v.usuario_id = u.id
                WHERE v.loja_id = %s
                ORDER BY v.data_venda DESC
            """, (loja_id,))
        else:
            cursor.execute("""
                SELECT v.*, u.nome as usuario_nome 
                FROM vendas v
                INNER JOIN usuarios u ON v.usuario_id = u.id
                WHERE v.loja_id = %s AND v.usuario_id = %s
                ORDER BY v.data_venda DESC
            """, (loja_id, session_data['user_id']))
        
        vendas = cursor.fetchall()
        return {"vendas": vendas}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar vendas: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()



#rotas fechamento caixa
@app.put("/api/fechamento-caixa/{fechamento_id}/reabrir")
async def reabrir_caixa(
    fechamento_id: int,
    reabrir_data: ReabrirCaixaRequest,
    session_data: dict = Depends(obter_admin)
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        cursor.execute("""
            SELECT id, status, data, user_id 
            FROM fechamento_caixa 
            WHERE id = %s AND loja_id = %s
        """, (fechamento_id, loja_id))
        
        fechamento = cursor.fetchone()
        
        if not fechamento:
            raise HTTPException(status_code=404, detail="Fechamento não encontrado")
        
        if fechamento['status'] == 'aberto':
            raise HTTPException(status_code=400, detail="Caixa já está aberto")
        
        cursor.execute("""
            SELECT id FROM fechamento_caixa 
            WHERE user_id = %s AND data = %s AND status = 'aberto' AND loja_id = %s
        """, (fechamento['user_id'], fechamento['data'], loja_id))
        
        if cursor.fetchone():
            raise HTTPException(
                status_code=400, 
                detail="Já existe um caixa aberto para esta data"
            )
        
        cursor.execute("""
            UPDATE fechamento_caixa 
            SET status = 'aberto', 
                reaberto_por = %s, 
                data_reabertura = NOW() 
            WHERE id = %s
        """, (session_data['user_id'], fechamento_id))
        
        conn.commit()
        
        cursor.execute("""
            SELECT 
                fc.*, 
                u.nome as usuario,
                ur.nome as usuario_reabertura
            FROM fechamento_caixa fc
            INNER JOIN usuarios u ON fc.user_id = u.id
            LEFT JOIN usuarios ur ON fc.reaberto_por = ur.id
            WHERE fc.id = %s
        """, (fechamento_id,))
        
        fechamento_atualizado = cursor.fetchone()
        
        return {
            "success": True,
            "message": "Caixa reaberto com sucesso",
            "fechamento": FechamentoCaixaResponse(**fechamento_atualizado)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao reabrir caixa: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.post("/api/movimentacao-caixa")
async def registrar_movimentacao(
    movimentacao_data: MovimentacaoCaixaCreate,
    session_data: dict = Depends(obter_vendedor)
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        total_entradas = movimentacao_data.valor if movimentacao_data.tipo == 'entrada' else 0
        total_saidas = movimentacao_data.valor if movimentacao_data.tipo == 'saida' else 0
        
        cursor.execute("""
            INSERT INTO movimentacao_caixa 
            (user_id, loja_id, data, tipo, descricao, valor, total_entradas, total_saidas)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            session_data['user_id'], loja_id, movimentacao_data.data,
            movimentacao_data.tipo, movimentacao_data.descricao, movimentacao_data.valor,
            total_entradas, total_saidas
        ))
        
        conn.commit()
        
        return {
            "success": True,
            "message": f"{movimentacao_data.tipo.title()} registrada com sucesso"
        }
        
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao registrar movimentação: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.post("/api/fechamento-caixa", response_model=FechamentoCaixaResponse)
async def fechar_caixa(
    fechamento_data: FechamentoCaixaCreate,
    session_data: dict = Depends(obter_vendedor)
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        cursor.execute("""
            SELECT id, status FROM fechamento_caixa 
            WHERE user_id = %s AND data = %s AND loja_id = %s
            ORDER BY created_at DESC
            LIMIT 1
        """, (session_data['user_id'], fechamento_data.data, loja_id))
        
        fechamento_existente = cursor.fetchone()
        
        if fechamento_existente:
            if fechamento_existente['status'] == 'fechado':
                cursor.execute("""
                    INSERT INTO fechamento_caixa 
                    (user_id, loja_id, data, valor_inicial, valor_final, total_vendas, 
                     total_entradas, total_saidas, observacoes, status, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'fechado', NOW())
                """, (
                    session_data['user_id'], loja_id, fechamento_data.data,
                    fechamento_data.valor_inicial, fechamento_data.valor_final,
                    fechamento_data.total_vendas, fechamento_data.total_entradas,
                    fechamento_data.total_saidas, fechamento_data.observacoes
                ))
                fechamento_id = cursor.lastrowid
            else:
                cursor.execute("""
                    UPDATE fechamento_caixa 
                    SET valor_inicial = %s, valor_final = %s, total_vendas = %s,
                        total_entradas = %s, total_saidas = %s, observacoes = %s,
                        status = 'fechado', reaberto_por = NULL, data_reabertura = NULL
                    WHERE id = %s
                """, (
                    fechamento_data.valor_inicial, fechamento_data.valor_final,
                    fechamento_data.total_vendas, fechamento_data.total_entradas,
                    fechamento_data.total_saidas, fechamento_data.observacoes,
                    fechamento_existente['id']
                ))
                fechamento_id = fechamento_existente['id']
        else:
            cursor.execute("""
                INSERT INTO fechamento_caixa 
                (user_id, loja_id, data, valor_inicial, valor_final, total_vendas, 
                 total_entradas, total_saidas, observacoes, status, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'fechado', NOW())
            """, (
                session_data['user_id'], loja_id, fechamento_data.data,
                fechamento_data.valor_inicial, fechamento_data.valor_final,
                fechamento_data.total_vendas, fechamento_data.total_entradas,
                fechamento_data.total_saidas, fechamento_data.observacoes
            ))
            fechamento_id = cursor.lastrowid
        
        conn.commit()
        
        cursor.execute("""
            SELECT 
                fc.*, 
                u.nome as usuario,
                ur.nome as usuario_reabertura
            FROM fechamento_caixa fc
            INNER JOIN usuarios u ON fc.user_id = u.id
            LEFT JOIN usuarios ur ON fc.reaberto_por = ur.id
            WHERE fc.id = %s
        """, (fechamento_id,))
        
        fechamento = cursor.fetchone()
        
        return FechamentoCaixaResponse(**fechamento)
        
    except HTTPException:
        raise
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao fechar caixa: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.get("/api/fechamento-caixa/hoje")
async def verificar_fechamento_hoje(session_data: dict = Depends(obter_vendedor)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        hoje = date.today().isoformat()
        loja_id = get_loja_id(session_data)
        
        cursor.execute("""
            SELECT id, data, status, valor_final, created_at, user_id
            FROM fechamento_caixa 
            WHERE user_id = %s AND data = %s AND loja_id = %s
            ORDER BY created_at DESC
            LIMIT 1
        """, (session_data['user_id'], hoje, loja_id))
        
        fechamento = cursor.fetchone()
        
        if fechamento:
            esta_fechado = fechamento['status'] == 'fechado'
            
            return {
                "fechado": esta_fechado,
                "fechamento": fechamento
            }
        else:
            return {
                "fechado": False,
                "fechamento": None
            }
        
    except Exception as e:
        return {
            "fechado": False,
            "fechamento": None,
            "erro": str(e)
        }
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
@app.post("/api/fechamento-caixa/forcar-reabertura")
async def forcar_reabertura_caixa(session_data: dict = Depends(obter_admin)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        hoje = date.today().isoformat()
        loja_id = get_loja_id(session_data)
        
        cursor.execute("""
            SELECT id, status FROM fechamento_caixa 
            WHERE user_id = %s AND data = %s AND loja_id = %s
            ORDER BY created_at DESC LIMIT 1
        """, (session_data['user_id'], hoje, loja_id))
        
        fechamento = cursor.fetchone()
        
        if not fechamento:
            return {"success": True, "message": "Nenhum fechamento encontrado para hoje - Caixa já está aberto"}
        
        if fechamento['status'] == 'aberto':
            return {"success": True, "message": "Caixa já está aberto"}
        
        cursor.execute("""
            UPDATE fechamento_caixa 
            SET status = 'aberto', 
                reaberto_por = %s, 
                data_reabertura = NOW() 
            WHERE id = %s
        """, (session_data['user_id'], fechamento['id']))
        
        conn.commit()
        
        return {
            "success": True,
            "message": "Caixa reaberto com sucesso!",
            "fechamento_id": fechamento['id']
        }
        
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao forçar reabertura: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
        
@app.delete("/api/fechamento-caixa/hoje")
async def remover_fechamento_hoje(session_data: dict = Depends(obter_admin)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        hoje = date.today().isoformat()
        loja_id = get_loja_id(session_data)
        
        cursor.execute("""
            SELECT id, status, valor_final FROM fechamento_caixa 
            WHERE user_id = %s AND data = %s AND loja_id = %s
        """, (session_data['user_id'], hoje, loja_id))
        
        fechamentos = cursor.fetchall()
        
        if not fechamentos:
            return {"success": True, "message": "Nenhum fechamento encontrado para hoje"}
        
        cursor.execute("""
            DELETE FROM fechamento_caixa 
            WHERE user_id = %s AND data = %s AND loja_id = %s
        """, (session_data['user_id'], hoje, loja_id))
        
        conn.commit()
        
        return {
            "success": True,
            "message": f"Removido(s) {len(fechamentos)} fechamento(s) de hoje",
            "fechamentos_removidos": fechamentos
        }
        
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao remover fechamento: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@app.get("/api/debug/caixa-completo")
async def debug_caixa_completo(session_data: dict = Depends(obter_vendedor)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        hoje = date.today().isoformat()
        loja_id = get_loja_id(session_data)
        
        cursor.execute("""
            SELECT id, data, status, valor_final, created_at, user_id
            FROM fechamento_caixa 
            WHERE user_id = %s AND data = %s AND loja_id = %s
            ORDER BY created_at DESC
        """, (session_data['user_id'], hoje, loja_id))
        
        todos_fechamentos = cursor.fetchall()
        
        cursor.execute("""
            SELECT id, status, created_at
            FROM fechamento_caixa 
            WHERE user_id = %s AND data = %s AND loja_id = %s
            ORDER BY created_at DESC
            LIMIT 1
        """, (session_data['user_id'], hoje, loja_id))
        
        ultimo_fechamento = cursor.fetchone()
        
        resultado = {
            "diagnostico": {
                "data_hoje": hoje,
                "usuario": session_data['nome'],
                "user_id": session_data['user_id'],
                "total_fechamentos_hoje": len(todos_fechamentos),
                "ultimo_fechamento": ultimo_fechamento,
                "todos_fechamentos": todos_fechamentos,
                "status_calculado": ultimo_fechamento['status'] == 'fechado' if ultimo_fechamento else False
            }
        }
        
        return resultado
        
    except Exception as e:
        return {"error": str(e)}
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
        
@app.get("/api/debug/caixa-status")
async def debug_caixa_status(session_data: dict = Depends(obter_vendedor)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        hoje = date.today().isoformat()
        loja_id = get_loja_id(session_data)
        
        cursor.execute("""
            SELECT id, data, status, valor_final, created_at, user_id
            FROM fechamento_caixa 
            WHERE user_id = %s AND data = %s AND loja_id = %s
            ORDER BY created_at DESC
        """, (session_data['user_id'], hoje, loja_id))
        
        fechamentos = cursor.fetchall()
        
        cursor.execute("""
            SELECT id, status, created_at
            FROM fechamento_caixa 
            WHERE user_id = %s AND data = %s AND loja_id = %s
            ORDER BY created_at DESC
            LIMIT 1
        """, (session_data['user_id'], hoje, loja_id))
        
        ultimo = cursor.fetchone()
        
        return {
            "diagnostico": {
                "data_hoje": hoje,
                "usuario": session_data['nome'],
                "user_id": session_data['user_id'],
                "total_fechamentos_hoje": len(fechamentos),
                "ultimo_fechamento": ultimo,
                "todos_fechamentos": fechamentos,
                "status_calculado": ultimo['status'] == 'fechado' if ultimo else False
            }
        }
        
    except Exception as e:
        return {"error": str(e)}
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
    

@app.get("/api/debug/caixa-completo")
async def debug_caixa_completo(session_data: dict = Depends(obter_vendedor)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        hoje = date.today().isoformat()
        loja_id = get_loja_id(session_data)
        
        cursor.execute("""
            SELECT id, data, status, valor_final, created_at, user_id
            FROM fechamento_caixa 
            WHERE user_id = %s AND data = %s AND loja_id = %s
            ORDER BY created_at DESC
        """, (session_data['user_id'], hoje, loja_id))
        
        todos_fechamentos = cursor.fetchall()
        
        cursor.execute("""
            SELECT id, status, created_at
            FROM fechamento_caixa 
            WHERE user_id = %s AND data = %s AND loja_id = %s
            ORDER BY created_at DESC
            LIMIT 1
        """, (session_data['user_id'], hoje, loja_id))
        
        ultimo_fechamento = cursor.fetchone()
        
        return {
            "diagnostico": {
                "data_hoje": hoje,
                "usuario": session_data['nome'],
                "user_id": session_data['user_id'],
                "total_fechamentos_hoje": len(todos_fechamentos),
                "ultimo_fechamento": ultimo_fechamento,
                "todos_fechamentos": todos_fechamentos,
                "status_calculado": ultimo_fechamento['status'] == 'fechado' if ultimo_fechamento else False
            }
        }
        
    except Exception as e:
        return {"error": str(e)}
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
@app.get("/api/fechamento-caixa/resumo-completo")
async def resumo_completo_caixa(session_data: dict = Depends(obter_vendedor)):
    """Resumo completo para fechamento de caixa"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        hoje = date.today().isoformat()
        loja_id = get_loja_id(session_data)
        user_id = session_data['user_id']
        
        print(f"📊 Gerando resumo completo para user {user_id}, loja {loja_id}")
        
        # 1. VENDAS DO DIA
        cursor.execute("""
            SELECT 
                COUNT(*) as quantidade_vendas,
                COALESCE(SUM(total_venda), 0) as total_vendas,
                COALESCE(SUM(total_pago), 0) as total_recebido
            FROM vendas 
            WHERE usuario_id = %s AND DATE(data_venda) = %s AND loja_id = %s
        """, (user_id, hoje, loja_id))
        
        vendas_result = cursor.fetchone()
        
        # 2. MOVIMENTAÇÕES DO DIA
        cursor.execute("""
            SELECT 
                COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END), 0) as total_entradas,
                COALESCE(SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END), 0) as total_saidas
            FROM movimentacao_caixa 
            WHERE user_id = %s AND DATE(data) = %s AND loja_id = %s
        """, (user_id, hoje, loja_id))
        
        movimentacao_result = cursor.fetchone()
        
        # 3. ORDENS DE SERVIÇO ENTREGUES
        cursor.execute("""
            SELECT 
                COUNT(*) as quantidade_os,
                COALESCE(SUM(orcamento), 0) as total_os
            FROM ordens_servico 
            WHERE loja_id = %s 
            AND status = 'entregue'
            AND DATE(data_entrega) = %s
            AND usuario_id = %s
        """, (loja_id, hoje, user_id))
        
        os_result = cursor.fetchone()
        
        # 4. VERIFICAR SE JÁ EXISTE FECHAMENTO HOJE
        cursor.execute("""
            SELECT id, status, valor_inicial, valor_final, total_vendas, total_entradas, total_saidas
            FROM fechamento_caixa 
            WHERE user_id = %s AND data = %s AND loja_id = %s
            ORDER BY created_at DESC
            LIMIT 1
        """, (user_id, hoje, loja_id))
        
        fechamento_existente = cursor.fetchone()
        
        resumo = {
            "data": hoje,
            "vendas": {
                "quantidade": vendas_result['quantidade_vendas'],
                "total": float(vendas_result['total_vendas']),
                "recebido": float(vendas_result['total_recebido'])
            },
            "movimentacoes": {
                "entradas": float(movimentacao_result['total_entradas']),
                "saidas": float(movimentacao_result['total_saidas'])
            },
            "ordens_servico": {
                "quantidade": os_result['quantidade_os'],
                "total": float(os_result['total_os'])
            },
            "fechamento_existente": fechamento_existente,
            "caixa_aberto": fechamento_existente is None or fechamento_existente['status'] == 'aberto'
        }
        
        print(f"✅ Resumo gerado: {resumo}")
        return resumo
        
    except Exception as e:
        print(f"❌ Erro ao gerar resumo: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao gerar resumo: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.post("/api/fechamento-caixa/completo", response_model=FechamentoCaixaResponse)
async def fechar_caixa_completo(
    fechamento_data: FechamentoCaixaCompleto,
    session_data: dict = Depends(obter_vendedor)
):
    """Fechamento de caixa completo e robusto"""
    conn = None
    cursor = None
    
    print(f"🔄 Iniciando fechamento completo de caixa...")
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        user_id = session_data['user_id']
        
        # Validar dados
        if fechamento_data.valor_final < 0:
            raise HTTPException(status_code=400, detail="Valor final não pode ser negativo")
        
        # Verificar se já existe fechamento para hoje
        cursor.execute("""
            SELECT id, status FROM fechamento_caixa 
            WHERE user_id = %s AND data = %s AND loja_id = %s
            ORDER BY created_at DESC
            LIMIT 1
        """, (user_id, fechamento_data.data, loja_id))
        
        fechamento_existente = cursor.fetchone()
        
        if fechamento_existente and fechamento_existente['status'] == 'fechado':
            # Já existe um fechamento fechado, criar novo registro
            print("📝 Criando novo registro de fechamento (já existe um fechado)")
            cursor.execute("""
                INSERT INTO fechamento_caixa 
                (user_id, loja_id, data, valor_inicial, valor_final, total_vendas, 
                 total_entradas, total_saidas, total_os_entregues, observacoes, status, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'fechado', NOW())
            """, (
                user_id, loja_id, fechamento_data.data,
                fechamento_data.valor_inicial, fechamento_data.valor_final,
                fechamento_data.total_vendas, fechamento_data.total_entradas,
                fechamento_data.total_saidas, fechamento_data.total_os_entregues or 0,
                fechamento_data.observacoes
            ))
            fechamento_id = cursor.lastrowid
            
        elif fechamento_existente and fechamento_existente['status'] == 'aberto':
            # Atualizar fechamento existente
            print("📝 Atualizando fechamento existente")
            cursor.execute("""
                UPDATE fechamento_caixa 
                SET valor_inicial = %s, valor_final = %s, total_vendas = %s,
                    total_entradas = %s, total_saidas = %s, total_os_entregues = %s,
                    observacoes = %s, status = 'fechado', 
                    reaberto_por = NULL, data_reabertura = NULL
                WHERE id = %s
            """, (
                fechamento_data.valor_inicial, fechamento_data.valor_final,
                fechamento_data.total_vendas, fechamento_data.total_entradas,
                fechamento_data.total_saidas, fechamento_data.total_os_entregues or 0,
                fechamento_data.observacoes, fechamento_existente['id']
            ))
            fechamento_id = fechamento_existente['id']
            
        else:
            # Criar novo fechamento
            print("📝 Criando primeiro fechamento do dia")
            cursor.execute("""
                INSERT INTO fechamento_caixa 
                (user_id, loja_id, data, valor_inicial, valor_final, total_vendas, 
                 total_entradas, total_saidas, total_os_entregues, observacoes, status, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'fechado', NOW())
            """, (
                user_id, loja_id, fechamento_data.data,
                fechamento_data.valor_inicial, fechamento_data.valor_final,
                fechamento_data.total_vendas, fechamento_data.total_entradas,
                fechamento_data.total_saidas, fechamento_data.total_os_entregues or 0,
                fechamento_data.observacoes
            ))
            fechamento_id = cursor.lastrowid
        
        conn.commit()
        
        # Buscar dados completos do fechamento
        cursor.execute("""
            SELECT 
                fc.*, 
                u.nome as usuario,
                ur.nome as usuario_reabertura
            FROM fechamento_caixa fc
            INNER JOIN usuarios u ON fc.user_id = u.id
            LEFT JOIN usuarios ur ON fc.reaberto_por = ur.id
            WHERE fc.id = %s
        """, (fechamento_id,))
        
        fechamento = cursor.fetchone()
        
        print(f"✅ Caixa fechado com sucesso! ID: {fechamento_id}")
        
        return FechamentoCaixaResponse(**fechamento)
        
    except HTTPException:
        raise
    except Exception as e:
        if conn: 
            conn.rollback()
        print(f"❌ Erro ao fechar caixa: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao fechar caixa: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.get("/api/fechamento-caixa/detalhado/{fechamento_id}")
async def obter_fechamento_detalhado(
    fechamento_id: int,
    session_data: dict = Depends(obter_vendedor)
):
    """Obter detalhes completos de um fechamento"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        # Buscar fechamento
        cursor.execute("""
            SELECT 
                fc.*, 
                u.nome as usuario,
                ur.nome as usuario_reabertura
            FROM fechamento_caixa fc
            INNER JOIN usuarios u ON fc.user_id = u.id
            LEFT JOIN usuarios ur ON fc.reaberto_por = ur.id
            WHERE fc.id = %s AND fc.loja_id = %s
        """, (fechamento_id, loja_id))
        
        fechamento = cursor.fetchone()
        
        if not fechamento:
            raise HTTPException(status_code=404, detail="Fechamento não encontrado")
        
        # Buscar vendas do dia do fechamento
        cursor.execute("""
            SELECT 
                numero_venda, cliente, total_venda, forma_pagamento, data_venda
            FROM vendas 
            WHERE usuario_id = %s AND DATE(data_venda) = %s AND loja_id = %s
            ORDER BY data_venda DESC
        """, (fechamento['user_id'], fechamento['data'], loja_id))
        
        vendas = cursor.fetchall()
        
        # Buscar movimentações do dia
        cursor.execute("""
            SELECT 
                tipo, descricao, valor, data
            FROM movimentacao_caixa 
            WHERE user_id = %s AND DATE(data) = %s AND loja_id = %s
            ORDER BY data DESC
        """, (fechamento['user_id'], fechamento['data'], loja_id))
        
        movimentacoes = cursor.fetchall()
        
        # Buscar OS entregues no dia
        cursor.execute("""
            SELECT 
                numero_os, cliente_nome, orcamento, data_entrega
            FROM ordens_servico 
            WHERE usuario_id = %s AND DATE(data_entrega) = %s AND loja_id = %s
            AND status = 'entregue'
            ORDER BY data_entrega DESC
        """, (fechamento['user_id'], fechamento['data'], loja_id))
        
        ordens_servico = cursor.fetchall()
        
        return {
            "fechamento": fechamento,
            "detalhes": {
                "vendas": vendas,
                "movimentacoes": movimentacoes,
                "ordens_servico": ordens_servico
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar detalhes: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.get("/api/fechamento-caixa/relatorio")
async def relatorio_fechamento_caixa(
    data_inicio: str = Query(..., description="Data início (YYYY-MM-DD)"),
    data_fim: str = Query(..., description="Data fim (YYYY-MM-DD)"),
    session_data: dict = Depends(obter_admin)
):
    """Relatório completo de fechamentos de caixa"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        # Estatísticas gerais
        cursor.execute("""
            SELECT 
                COUNT(*) as total_fechamentos,
                SUM(total_vendas) as total_vendas_periodo,
                SUM(total_entradas) as total_entradas_periodo,
                SUM(total_saidas) as total_saidas_periodo,
                AVG(valor_final - valor_inicial) as lucro_medio
            FROM fechamento_caixa 
            WHERE loja_id = %s AND data BETWEEN %s AND %s AND status = 'fechado'
        """, (loja_id, data_inicio, data_fim))
        
        estatisticas = cursor.fetchone()
        
        # Fechamentos por usuário
        cursor.execute("""
            SELECT 
                u.nome as usuario,
                COUNT(*) as total_fechamentos,
                SUM(fc.total_vendas) as total_vendas,
                SUM(fc.total_entradas) as total_entradas,
                SUM(fc.total_saidas) as total_saidas,
                AVG(fc.valor_final - fc.valor_inicial) as lucro_medio
            FROM fechamento_caixa fc
            INNER JOIN usuarios u ON fc.user_id = u.id
            WHERE fc.loja_id = %s AND fc.data BETWEEN %s AND %s AND fc.status = 'fechado'
            GROUP BY u.id, u.nome
            ORDER BY total_vendas DESC
        """, (loja_id, data_inicio, data_fim))
        
        por_usuario = cursor.fetchall()
        
        # Fechamentos diários
        cursor.execute("""
            SELECT 
                data,
                COUNT(*) as quantidade_fechamentos,
                SUM(total_vendas) as total_vendas_dia,
                SUM(total_entradas) as total_entradas_dia,
                SUM(total_saidas) as total_saidas_dia
            FROM fechamento_caixa 
            WHERE loja_id = %s AND data BETWEEN %s AND %s AND status = 'fechado'
            GROUP BY data
            ORDER BY data DESC
        """, (loja_id, data_inicio, data_fim))
        
        por_dia = cursor.fetchall()
        
        return {
            "periodo": {
                "inicio": data_inicio,
                "fim": data_fim
            },
            "estatisticas_gerais": estatisticas,
            "por_usuario": por_usuario,
            "por_dia": por_dia,
            "data_geracao": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar relatório: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


# ENDPOINTS QUE PRECISAM SER ADICIONADOS:

@app.get("/api/dashboard/estatisticas", response_model=DashboardStats)
async def carregar_estatisticas(session_data: dict = Depends(obter_todos_usuarios)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=500, detail="Erro de conexão com o banco")
            
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        cursor.execute("""
            SELECT 
                -- Total de Produtos
                (SELECT COUNT(*) FROM produtos WHERE loja_id = %s AND ativo = 1) as total_produtos,
                
                -- Vendas do Mês
                (SELECT COALESCE(SUM(total_venda), 0) FROM vendas 
                 WHERE loja_id = %s AND MONTH(data_venda) = MONTH(CURRENT_DATE()) 
                 AND YEAR(data_venda) = YEAR(CURRENT_DATE())) as vendas_mes,
                
                -- OS em Andamento
                (SELECT COUNT(*) FROM ordens_servico 
                 WHERE loja_id = %s AND status IN ('andamento', 'aguardando_pecas')) as os_andamento,
                
                -- Estoque Baixo
                (SELECT COUNT(*) FROM produtos 
                 WHERE loja_id = %s AND ativo = 1 
                 AND estoque_atual <= estoque_minimo AND estoque_atual > 0) as estoques_baixos,
                
                -- Total de Clientes
                (SELECT COUNT(*) FROM clientes WHERE loja_id = %s AND ativo = 1) as total_clientes,
                
                -- OS Concluídas no Mês
                (SELECT COUNT(*) FROM ordens_servico 
                 WHERE loja_id = %s AND status = 'concluida'
                 AND MONTH(data_conclusao) = MONTH(CURRENT_DATE()) 
                 AND YEAR(data_conclusao) = YEAR(CURRENT_DATE())) as os_concluidas_mes,
                
                -- Ticket Médio
                (SELECT COALESCE(AVG(total_venda), 0) FROM vendas 
                 WHERE loja_id = %s AND MONTH(data_venda) = MONTH(CURRENT_DATE()) 
                 AND YEAR(data_venda) = YEAR(CURRENT_DATE())) as ticket_medio,
                
                -- Vendas de Hoje
                (SELECT COALESCE(SUM(total_venda), 0) FROM vendas 
                 WHERE loja_id = %s AND DATE(data_venda) = CURDATE()) as vendas_hoje,
                
                -- Produtos Sem Estoque
                (SELECT COUNT(*) FROM produtos 
                 WHERE loja_id = %s AND ativo = 1 AND estoque_atual = 0) as produtos_sem_estoque,
                 
                -- Total de Vendas (quantidade)
                (SELECT COUNT(*) FROM vendas 
                 WHERE loja_id = %s AND MONTH(data_venda) = MONTH(CURRENT_DATE()) 
                 AND YEAR(data_venda) = YEAR(CURRENT_DATE())) as total_vendas
        """, [loja_id] * 10)
        
        stats = cursor.fetchone()
        
        return DashboardStats(
            totalProdutos=stats['total_produtos'] or 0,
            vendasMes=float(stats['vendas_mes'] or 0),
            osAndamento=stats['os_andamento'] or 0,
            estoquesBaixos=stats['estoques_baixos'] or 0,
            totalClientes=stats['total_clientes'] or 0,
            osConcluidasMes=stats['os_concluidas_mes'] or 0,
            ticketMedio=float(stats['ticket_medio'] or 0),
            vendasHoje=float(stats['vendas_hoje'] or 0),
            produtosSemEstoque=stats['produtos_sem_estoque'] or 0,
            totalVendas=stats['total_vendas'] or 0
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao carregar estatísticas: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
    # =============================================
# ENDPOINTS PARA RELATÓRIOS AVANÇADOS
# =============================================

class PeriodoRequest(BaseModel):
    data_inicio: Optional[str] = None
    data_fim: Optional[str] = None

@app.get("/api/relatorios/vendas-periodo")
async def relatorios_vendas_periodo(
    data_inicio: Optional[str] = Query(None),
    data_fim: Optional[str] = Query(None),
    session_data: dict = Depends(obter_admin)
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        query = """
            SELECT 
                DATE(v.data_venda) as data,
                COUNT(*) as quantidade_vendas,
                SUM(v.total_venda) as valor_total,
                AVG(v.total_venda) as ticket_medio,
                COUNT(DISTINCT v.usuario_id) as vendedores_ativos
            FROM vendas v
            WHERE v.loja_id = %s
        """
        params = [loja_id]
        
        if data_inicio and data_fim:
            query += " AND DATE(v.data_venda) BETWEEN %s AND %s"
            params.extend([data_inicio, data_fim])
        
        query += " GROUP BY DATE(v.data_venda) ORDER BY data"
        
        cursor.execute(query, params)
        dados_vendas = cursor.fetchall()
        
        cursor.execute("""
            SELECT 
                forma_pagamento,
                COUNT(*) as quantidade,
                SUM(total_venda) as valor_total
            FROM vendas 
            WHERE loja_id = %s
            GROUP BY forma_pagamento
        """, (loja_id,))
        
        formas_pagamento = cursor.fetchall()
        
        cursor.execute("""
            SELECT 
                p.nome as produto,
                SUM(iv.quantidade) as quantidade_vendida,
                SUM(iv.total_item) as valor_total
            FROM itens_venda iv
            INNER JOIN produtos p ON iv.produto_id = p.id
            INNER JOIN vendas v ON iv.venda_id = v.id
            WHERE v.loja_id = %s
            GROUP BY p.id, p.nome
            ORDER BY quantidade_vendida DESC
            LIMIT 10
        """, (loja_id,))
        
        produtos_mais_vendidos = cursor.fetchall()
        
        return {
            "periodo": {
                "inicio": data_inicio,
                "fim": data_fim
            },
            "vendas_por_dia": serialize_mysql_data(dados_vendas),
            "formas_pagamento": serialize_mysql_data(formas_pagamento),
            "produtos_mais_vendidos": serialize_mysql_data(produtos_mais_vendidos),
            "total_geral": {
                "quantidade_vendas": sum(item['quantidade_vendas'] for item in dados_vendas),
                "valor_total": float(sum(item['valor_total'] for item in dados_vendas)),
                "ticket_medio": float(sum(item['valor_total'] for item in dados_vendas) / sum(item['quantidade_vendas'] for item in dados_vendas)) if dados_vendas else 0
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar relatório de vendas: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.get("/api/relatorios/os-periodo")
async def relatorios_os_periodo(
    data_inicio: Optional[str] = Query(None),
    data_fim: Optional[str] = Query(None),
    session_data: dict = Depends(obter_admin)
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        query = """
            SELECT 
                status,
                COUNT(*) as quantidade,
                AVG(orcamento) as orcamento_medio,
                SUM(orcamento) as valor_total
            FROM ordens_servico 
            WHERE loja_id = %s
        """
        params = [loja_id]
        
        if data_inicio and data_fim:
            query += " AND DATE(data_entrada) BETWEEN %s AND %s"
            params.extend([data_inicio, data_fim])
        
        query += " GROUP BY status"
        
        cursor.execute(query, params)
        os_por_status = cursor.fetchall()
        
        cursor.execute("""
            SELECT 
                u.nome as tecnico,
                COUNT(*) as total_os,
                SUM(CASE WHEN os.status = 'concluida' THEN 1 ELSE 0 END) as concluidas,
                SUM(CASE WHEN os.status = 'entregue' THEN 1 ELSE 0 END) as entregues,
                AVG(os.orcamento) as ticket_medio
            FROM ordens_servico os
            INNER JOIN usuarios u ON os.usuario_id = u.id
            WHERE os.loja_id = %s
            GROUP BY u.id, u.nome
        """, (loja_id,))
        
        os_por_tecnico = cursor.fetchall()
        
        return {
            "os_por_status": serialize_mysql_data(os_por_status),
            "os_por_tecnico": serialize_mysql_data(os_por_tecnico)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar relatório de OS: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.get("/api/relatorios/estoque-detalhado")
async def relatorio_estoque_detalhado(session_data: dict = Depends(obter_admin)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        cursor.execute("""
            SELECT 
                p.nome,
                p.codigo_barras,
                p.categoria,
                p.marca,
                p.estoque_atual,
                p.estoque_minimo,
                p.preco_custo,
                p.preco_venda,
                (p.estoque_atual * p.preco_custo) as valor_estoque,
                CASE 
                    WHEN p.estoque_atual = 0 THEN 'CRÍTICO'
                    WHEN p.estoque_atual <= p.estoque_minimo THEN 'BAIXO'
                    ELSE 'NORMAL'
                END as status_estoque
            FROM produtos p
            WHERE p.loja_id = %s AND p.ativo = 1
            ORDER BY status_estoque, p.nome
        """, (loja_id,))
        
        produtos = cursor.fetchall()
        
        cursor.execute("""
            SELECT 
                COUNT(*) as total_produtos,
                SUM(CASE WHEN estoque_atual = 0 THEN 1 ELSE 0 END) as produtos_sem_estoque,
                SUM(CASE WHEN estoque_atual <= estoque_minimo AND estoque_atual > 0 THEN 1 ELSE 0 END) as produtos_estoque_baixo,
                SUM(estoque_atual * preco_custo) as valor_total_estoque,
                AVG(preco_venda) as preco_medio_venda
            FROM produtos 
            WHERE loja_id = %s AND ativo = 1
        """, (loja_id,))
        
        estatisticas = cursor.fetchone()
        
        return {
            "produtos": serialize_mysql_data(produtos),
            "estatisticas": serialize_mysql_data(estatisticas),
            "data_geracao": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar relatório de estoque: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
#  ENDPOINTS DADOS GRAFICOS DASHBOARD

@app.get("/api/dashboard/graficos")
async def dashboard_graficos(
    periodo: str = Query("month", regex="^(today|week|month|quarter|year)$"),
    session_data: dict = Depends(obter_admin)
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        hoje = datetime.now().date()
        data_inicio = hoje
        
        if periodo == "today":
            data_inicio = hoje
        elif periodo == "week":
            data_inicio = hoje - timedelta(days=7)
        elif periodo == "month":
            data_inicio = hoje - timedelta(days=30)
        elif periodo == "quarter":
            data_inicio = hoje - timedelta(days=90)
        elif periodo == "year":
            data_inicio = hoje - timedelta(days=365)
        
        cursor.execute("""
            SELECT 
                DATE(data_venda) as data,
                SUM(total_venda) as valor,
                COUNT(*) as quantidade
            FROM vendas 
            WHERE loja_id = %s AND data_venda >= %s
            GROUP BY DATE(data_venda)
            ORDER BY data
        """, (loja_id, data_inicio))
        
        vendas_por_dia = cursor.fetchall()
        
        cursor.execute("""
            SELECT 
                p.nome as produto,
                SUM(iv.quantidade) as quantidade
            FROM itens_venda iv
            INNER JOIN produtos p ON iv.produto_id = p.id
            INNER JOIN vendas v ON iv.venda_id = v.id
            WHERE v.loja_id = %s AND v.data_venda >= %s
            GROUP BY p.id, p.nome
            ORDER BY quantidade DESC
            LIMIT 5
        """, (loja_id, data_inicio))
        
        produtos_mais_vendidos = cursor.fetchall()
        
        cursor.execute("""
            SELECT 
                status,
                COUNT(*) as quantidade
            FROM ordens_servico 
            WHERE loja_id = %s
            GROUP BY status
        """, (loja_id,))
        
        os_por_status = cursor.fetchall()
        
        cursor.execute("""
            SELECT 
                forma_pagamento,
                COUNT(*) as quantidade,
                SUM(total_venda) as valor
            FROM vendas 
            WHERE loja_id = %s AND data_venda >= %s
            GROUP BY forma_pagamento
        """, (loja_id, data_inicio))
        
        formas_pagamento = cursor.fetchall()
        
        return {
            "vendas_por_dia": serialize_mysql_data(vendas_por_dia),
            "produtos_mais_vendidos": serialize_mysql_data(produtos_mais_vendidos),
            "os_por_status": serialize_mysql_data(os_por_status),
            "formas_pagamento": serialize_mysql_data(formas_pagamento),
            "periodo": periodo
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao carregar dados dos gráficos: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@app.get("/api/os/estatisticas-hoje")
async def estatisticas_os_hoje(session_data: dict = Depends(obter_tecnico)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        hoje = date.today().isoformat()
        loja_id = get_loja_id(session_data)
        
        cursor.execute("""
            SELECT 
                -- OS Entregues
                SUM(CASE WHEN status = 'entregue' AND DATE(data_entrega) = %s THEN orcamento ELSE 0 END) as total_entregue,
                COUNT(CASE WHEN status = 'entregue' AND DATE(data_entrega) = %s THEN 1 END) as quantidade_entregue,
                
                -- OS Concluídas (prontas para entrega)
                SUM(CASE WHEN status = 'concluida' AND DATE(data_conclusao) = %s THEN orcamento ELSE 0 END) as total_concluida,
                COUNT(CASE WHEN status = 'concluida' AND DATE(data_conclusao) = %s THEN 1 END) as quantidade_concluida,
                
                -- Em andamento
                COUNT(CASE WHEN status = 'andamento' THEN 1 END) as em_andamento,
                
                -- Aguardando peças
                COUNT(CASE WHEN status = 'aguardando_pecas' THEN 1 END) as aguardando_pecas
                
            FROM ordens_servico 
            WHERE loja_id = %s
        """, (hoje, hoje, hoje, hoje, loja_id))
        
        result = cursor.fetchone()
        
        return {
            "data": hoje,
            "entregues": {
                "quantidade": result['quantidade_entregue'],
                "total": float(result['total_entregue'])
            },
            "concluidas": {
                "quantidade": result['quantidade_concluida'],
                "total": float(result['total_concluida'])
            },
            "em_andamento": result['em_andamento'],
            "aguardando_pecas": result['aguardando_pecas']
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar estatísticas de OS: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.get("/api/os/status-disponiveis")
async def listar_status_disponiveis(session_data: dict = Depends(obter_tecnico)):
    return {
        "status_disponiveis": [
            {"valor": "pendente", "descricao": "Aguardando análise"},
            {"valor": "andamento", "descricao": "Em andamento"},
            {"valor": "aguardando_pecas", "descricao": "Aguardando peças"},
            {"valor": "concluida", "descricao": "Concluída (pronta para entrega)"},
            {"valor": "entregue", "descricao": "Entregue ao cliente"},
            {"valor": "cancelada", "descricao": "Cancelada"}
        ]
    }


@app.get("/api/fechamento-caixa/total-os-entregues")
async def total_os_entregues(session_data: dict = Depends(obter_vendedor)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        hoje = date.today().isoformat()
        loja_id = get_loja_id(session_data)
        
        cursor.execute("""
            SELECT 
                COUNT(*) as quantidade_os,
                COALESCE(SUM(orcamento), 0) as total_os
            FROM ordens_servico 
            WHERE loja_id = %s 
            AND status = 'entregue'
            AND DATE(data_entrega) = %s
        """, (loja_id, hoje))
        
        result = cursor.fetchone()
        
        cursor.execute("""
            SELECT id, numero_os, orcamento, status, data_entrada, data_entrega
            FROM ordens_servico 
            WHERE loja_id = %s 
            AND status = 'entregue'
            AND DATE(data_entrega) = %s
        """, (loja_id, hoje))
        
        oss_encontradas = cursor.fetchall()
        
        return {
            "data": hoje,
            "quantidade_os": result['quantidade_os'],
            "total_os": float(result['total_os'])
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao calcular OS entregues: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.get("/api/fechamento-caixa/os-entregues-periodo")
async def os_entregues_periodo(
    data_inicio: str = Query(..., description="Data início (YYYY-MM-DD)"),
    data_fim: str = Query(..., description="Data fim (YYYY-MM-DD)"),
    session_data: dict = Depends(obter_vendedor)
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        cursor.execute("""
            SELECT 
                COUNT(*) as quantidade_os,
                COALESCE(SUM(orcamento), 0) as total_os
            FROM ordens_servico 
            WHERE loja_id = %s 
            AND status = 'entregue'
            AND DATE(data_entrega) BETWEEN %s AND %s
        """, (loja_id, data_inicio, data_fim))
        
        result = cursor.fetchone()
        
        cursor.execute("""
            SELECT id, numero_os, orcamento, data_entrada, data_entrega
            FROM ordens_servico 
            WHERE loja_id = %s 
            AND status = 'entregue'
            AND DATE(data_entrega) BETWEEN %s AND %s
        """, (loja_id, data_inicio, data_fim))
        
        detalhes = cursor.fetchall()
        
        return {
            "periodo": {
                "inicio": data_inicio,
                "fim": data_fim
            },
            "quantidade_os": result['quantidade_os'],
            "total_os": float(result['total_os']),
            "detalhes": detalhes
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar OSs por período: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.get("/api/fechamento-caixa/status-hoje")
async def status_caixa_hoje(session_data: dict = Depends(obter_vendedor)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        hoje = date.today().isoformat()
        loja_id = get_loja_id(session_data)
        
        cursor.execute("""
            SELECT id, status, valor_final, created_at
            FROM fechamento_caixa 
            WHERE user_id = %s AND data = %s AND loja_id = %s
        """, (session_data['user_id'], hoje, loja_id))
        
        fechamento = cursor.fetchone()
        
        return {
            "existe": fechamento is not None,
            "status": fechamento['status'] if fechamento else None,
            "pode_fechar": fechamento is None or fechamento['status'] == 'aberto',
            "fechamento": fechamento
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao verificar status: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
@app.get("/api/fechamento-caixa/historico")
async def historico_fechamentos(
    data_inicio: Optional[str] = Query(None),
    data_fim: Optional[str] = Query(None),
    session_data: dict = Depends(obter_vendedor)
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        query = """
            SELECT 
                fc.*, 
                u.nome as usuario
            FROM fechamento_caixa fc
            INNER JOIN usuarios u ON fc.user_id = u.id
            WHERE fc.user_id = %s AND fc.loja_id = %s
        """
        params = [session_data['user_id'], loja_id]
        
        if data_inicio and data_fim:
            query += " AND fc.data BETWEEN %s AND %s"
            params.extend([data_inicio, data_fim])
        
        query += " ORDER BY fc.data DESC"
        
        cursor.execute(query, params)
        fechamentos = cursor.fetchall()
        
        return {
            "fechamentos": [FechamentoCaixaResponse(**fc) for fc in fechamentos],
            "total": len(fechamentos)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar histórico: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
        
@app.get("/api/fechamento-caixa")
async def listar_fechamentos_caixa(
    session_data: dict = Depends(obter_vendedor)
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        cursor.execute("""
            SELECT 
                fc.*, 
                u.nome as usuario
            FROM fechamento_caixa fc
            INNER JOIN usuarios u ON fc.user_id = u.id
            WHERE fc.user_id = %s AND fc.loja_id = %s
            ORDER BY fc.data DESC
        """, (session_data['user_id'], loja_id))
        
        fechamentos = cursor.fetchall()
        
        return {
            "fechamentos": [FechamentoCaixaResponse(**fc) for fc in fechamentos],
            "total": len(fechamentos)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar fechamentos: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
@app.get("/api/fechamento-caixa/resumo-dia")
async def resumo_vendas_dia(session_data: dict = Depends(obter_vendedor)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        hoje = date.today().isoformat()
        loja_id = get_loja_id(session_data)
        
        cursor.execute("""
            SELECT 
                COUNT(*) as quantidade_vendas,
                COALESCE(SUM(total_venda), 0) as total_vendas
            FROM vendas 
            WHERE usuario_id = %s AND DATE(data_venda) = %s AND loja_id = %s
        """, (session_data['user_id'], hoje, loja_id))
        
        vendas_result = cursor.fetchone()
        
        cursor.execute("""
            SELECT 
                COALESCE(SUM(total_entradas), 0) as total_entradas,
                COALESCE(SUM(total_saidas), 0) as total_saidas
            FROM movimentacao_caixa 
            WHERE user_id = %s AND DATE(data) = %s AND loja_id = %s
        """, (session_data['user_id'], hoje, loja_id))
        
        movimentacao_result = cursor.fetchone()
        
        return {
            "data": hoje,
            "quantidade_vendas": vendas_result['quantidade_vendas'],
            "total_vendas": float(vendas_result['total_vendas']),
            "total_entradas": float(movimentacao_result['total_entradas']),
            "total_saidas": float(movimentacao_result['total_saidas'])
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar resumo do dia: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
#Para Admin ver todos os fechamentos

@app.get("/api/fechamento-caixa/todos")
async def listar_todos_fechamentos(
    data_inicio: Optional[str] = Query(None),
    data_fim: Optional[str] = Query(None),
    session_data: dict = Depends(obter_admin)
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        query = """
            SELECT 
                fc.*, 
                u.nome as usuario
            FROM fechamento_caixa fc
            INNER JOIN usuarios u ON fc.user_id = u.id
            WHERE fc.loja_id = %s
        """
        params = [loja_id]
        
        if data_inicio and data_fim:
            query += " AND fc.data BETWEEN %s AND %s"
            params.extend([data_inicio, data_fim])
        
        query += " ORDER BY fc.data DESC, u.nome"
        
        cursor.execute(query, params)
        fechamentos = cursor.fetchall()
        
        return {
            "fechamentos": [FechamentoCaixaResponse(**fc) for fc in fechamentos],
            "total": len(fechamentos)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar fechamentos: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

#Rota PUT para atualizar cliente
@app.put("/api/clientes/{cliente_id}")
async def atualizar_cliente(
    cliente_id: int,
    cliente_data: ClienteUpdate,
    session_data: dict = Depends(obter_vendedor_ou_tecnico)
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        cursor.execute(
            "SELECT id FROM clientes WHERE id = %s AND loja_id = %s",
            (cliente_id, loja_id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Cliente não encontrado")
        
        update_fields = []
        update_values = []
        
        if cliente_data.nome is not None:
            update_fields.append("nome = %s")
            update_values.append(cliente_data.nome)
        
        if cliente_data.email is not None:
            update_fields.append("email = %s")
            update_values.append(cliente_data.email)
        
        if cliente_data.telefone is not None:
            update_fields.append("telefone = %s")
            update_values.append(cliente_data.telefone)
        
        if cliente_data.ativo is not None:
            update_fields.append("ativo = %s")
            update_values.append(cliente_data.ativo)
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="Nenhum campo fornecido para atualização")
        
        update_fields.append("data_atualizacao = NOW()")
        
        update_values.extend([cliente_id, loja_id])
        
        query = f"UPDATE clientes SET {', '.join(update_fields)} WHERE id = %s AND loja_id = %s"
        cursor.execute(query, update_values)
        
        conn.commit()
        
        cursor.execute("""
            SELECT id, nome, email, telefone, celular, cpf, data_nascimento,
                   endereco, numero, complemento, bairro, cidade, estado, cep,
                   observacoes, ativo, data_cadastro
            FROM clientes 
            WHERE id = %s AND loja_id = %s
        """, (cliente_id, loja_id))
        
        cliente_atualizado = cursor.fetchone()
        
        if cliente_atualizado and cliente_atualizado['data_cadastro']:
            cliente_atualizado['data_cadastro'] = cliente_atualizado['data_cadastro'].isoformat()
        if cliente_atualizado and cliente_atualizado['data_nascimento']:
            cliente_atualizado['data_nascimento'] = cliente_atualizado['data_nascimento'].isoformat()
        
        return {
            "success": True,
            "message": "Cliente atualizado com sucesso",
            "cliente": cliente_atualizado
        }
        
    except HTTPException:
        raise
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar cliente: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
 #Rota POST para criar novo cliente       
@app.post("/api/clientes")
async def criar_cliente(
    cliente_data: ClienteCreate,
    session_data: dict = Depends(obter_vendedor_ou_tecnico)
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        if cliente_data.telefone:
            cursor.execute(
                "SELECT id FROM clientes WHERE telefone = %s AND loja_id = %s",
                (cliente_data.telefone, loja_id)
            )
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Já existe cliente com este telefone")
        
        if cliente_data.email:
            cursor.execute(
                "SELECT id FROM clientes WHERE email = %s AND loja_id = %s",
                (cliente_data.email, loja_id)
            )
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Já existe cliente com este email")
        
        cursor.execute("""
            INSERT INTO clientes (
                loja_id, nome, email, telefone, celular, cpf, data_nascimento,
                endereco, numero, complemento, bairro, cidade, estado, cep,
                observacoes, ativo, data_cadastro
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
        """, (
            loja_id, cliente_data.nome, cliente_data.email, cliente_data.telefone,
            cliente_data.celular, cliente_data.cpf, cliente_data.data_nascimento,
            cliente_data.endereco, cliente_data.numero, cliente_data.complemento,
            cliente_data.bairro, cliente_data.cidade, cliente_data.estado, cliente_data.cep,
            cliente_data.observacoes, cliente_data.ativo
        ))
        
        cliente_id = cursor.lastrowid
        conn.commit()
        
        cursor.execute("""
            SELECT id, nome, email, telefone, celular, cpf, data_nascimento,
                   endereco, numero, complemento, bairro, cidade, estado, cep,
                   observacoes, ativo, data_cadastro
            FROM clientes 
            WHERE id = %s
        """, (cliente_id,))
        
        cliente = cursor.fetchone()
        
        if cliente and cliente['data_cadastro']:
            cliente['data_cadastro'] = cliente['data_cadastro'].isoformat()
        if cliente and cliente['data_nascimento']:
            cliente['data_nascimento'] = cliente['data_nascimento'].isoformat()
        
        return {
            "success": True,
            "message": "Cliente criado com sucesso",
            "cliente": cliente
        }
        
    except HTTPException:
        raise
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar cliente: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()        


#Rota GET para buscar cliente específico
@app.get("/api/clientes/{cliente_id}")
async def obter_cliente(
    cliente_id: int,
    session_data: dict = Depends(obter_vendedor_ou_tecnico)
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        cursor.execute("""
            SELECT id, nome, email, telefone, celular, cpf, data_nascimento,
                   endereco, numero, complemento, bairro, cidade, estado, cep,
                   observacoes, ativo, data_cadastro
            FROM clientes 
            WHERE id = %s AND loja_id = %s
        """, (cliente_id, loja_id))
        
        cliente = cursor.fetchone()
        
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente não encontrado")
        
        if cliente['data_cadastro']:
            cliente['data_cadastro'] = cliente['data_cadastro'].isoformat()
        if cliente['data_nascimento']:
            cliente['data_nascimento'] = cliente['data_nascimento'].isoformat()
        
        return cliente
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar cliente: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

#Rota DELETE para excluir cliente
@app.delete("/api/clientes/{cliente_id}")
async def excluir_cliente(
    cliente_id: int,
    session_data: dict = Depends(obter_vendedor_ou_tecnico)
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        loja_id = get_loja_id(session_data)
        
        cursor.execute(
            "SELECT id FROM clientes WHERE id = %s AND loja_id = %s",
            (cliente_id, loja_id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Cliente não encontrado")
        
        cursor.execute(
            "UPDATE clientes SET ativo = 0, data_atualizacao = NOW() WHERE id = %s AND loja_id = %s",
            (cliente_id, loja_id)
        )
        
        conn.commit()
        
        return {
            "success": True,
            "message": "Cliente marcado como inativo com sucesso"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao excluir cliente: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# Endpoints CLIENTES - VENDEDOR e TÉCNICO podem gerenciar
@app.get("/api/clientes", response_model=ClienteResponse)
async def listar_clientes(
    pagina: int = Query(1, ge=1),
    limite: int = Query(10, ge=1, le=100),
    busca: Optional[str] = Query(None),
    session_data: dict = Depends(obter_vendedor_ou_tecnico)
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        query = """
            SELECT id, loja_id, nome, email, telefone, celular, cpf, data_nascimento,
                   endereco, numero, complemento, bairro, cidade, estado, cep,
                   observacoes, ativo, data_cadastro
            FROM clientes 
            WHERE loja_id = %s
        """
        params = [loja_id]
        
        if busca:
            query += " AND (nome LIKE %s OR telefone LIKE %s OR email LIKE %s OR celular LIKE %s)"
            search_term = f"%{busca}%"
            params.extend([search_term, search_term, search_term, search_term])
        
        count_query = f"SELECT COUNT(*) as total FROM ({query}) as subquery"
        cursor.execute(count_query, params)
        total = cursor.fetchone()['total']
        
        offset = (pagina - 1) * limite
        total_paginas = (total + limite - 1) // limite
        
        query += " ORDER BY nome LIMIT %s OFFSET %s"
        params.extend([limite, offset])
        
        cursor.execute(query, params)
        clientes = cursor.fetchall()
        
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

@app.put("/api/os/{os_id}")
async def atualizar_os(
    os_id: int,
    os_data: OSData,
    session_data: dict = Depends(obter_tecnico)
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        if session_data['perfil'] != 'admin':
            cursor.execute(
                "SELECT id, cliente_id FROM ordens_servico WHERE id = %s AND loja_id = %s AND usuario_id = %s",
                (os_id, loja_id, session_data['user_id'])
            )
        else:
            cursor.execute(
                "SELECT id, cliente_id FROM ordens_servico WHERE id = %s AND loja_id = %s",
                (os_id, loja_id)
            )
            
        os_existente = cursor.fetchone()
        
        if not os_existente:
            raise HTTPException(status_code=404, detail="OS não encontrada ou não autorizada")
        
        cliente_id = os_existente['cliente_id']
        
        if os_data.cpf and os_data.cpf.strip():
            cursor.execute(
                "SELECT id, nome FROM clientes WHERE cpf = %s AND id != %s AND loja_id = %s",
                (os_data.cpf.strip(), cliente_id, loja_id)
            )
            cliente_com_mesmo_cpf = cursor.fetchone()
            
            if cliente_com_mesmo_cpf:
                raise HTTPException(
                    status_code=400, 
                    detail=f"CPF {os_data.cpf} já está cadastrado para outro cliente: {cliente_com_mesmo_cpf['nome']} (ID: {cliente_com_mesmo_cpf['id']})"
                )
        
        cursor.execute(
            "UPDATE clientes SET nome = %s, telefone = %s, cpf = %s WHERE id = %s",
            (os_data.nome, os_data.telefone, os_data.cpf, cliente_id)
        )
        
        observacoes = os_data.observacoes if os_data.observacoes is not None else ""
        orcamento = os_data.orcamento if os_data.orcamento is not None else 0.0
        
        cursor.execute(
            """UPDATE ordens_servico SET 
            marca = %s, modelo = %s, defeito_relatado = %s, observacoes = %s, orcamento = %s
            WHERE id = %s""",
            (os_data.marca, os_data.modelo, os_data.defeito, observacoes, orcamento, os_id)
        )
        
        conn.commit()
        return {"success": True, "message": "OS atualizada com sucesso"}
        
    except HTTPException:
        raise
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar OS: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.delete("/api/os/{os_id}")
async def excluir_os(
    os_id: int,
    session_data: dict = Depends(obter_tecnico)
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        loja_id = get_loja_id(session_data)
        
        cursor.execute(
            "SELECT id, status FROM ordens_servico WHERE id = %s AND loja_id = %s",
            (os_id, loja_id)
        )
        os_info = cursor.fetchone()
        
        if not os_info:
            raise HTTPException(status_code=404, detail="OS não encontrada")
        
        if session_data['perfil'] != 'admin':
            cursor.execute(
                "SELECT id FROM ordens_servico WHERE id = %s AND usuario_id = %s",
                (os_id, session_data['user_id'])
            )
            if not cursor.fetchone():
                raise HTTPException(status_code=403, detail="Não autorizado a excluir esta OS")
        
        cursor.execute(
            "UPDATE ordens_servico SET status = 'cancelada', data_conclusao = NOW() WHERE id = %s",
            (os_id,)
        )
        
        conn.commit()
        return {"success": True, "message": "OS cancelada com sucesso"}
        
    except HTTPException:
        raise
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao excluir OS: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@app.post("/api/logout")
async def logout(session_data: dict = Depends(obter_todos_usuarios)):
    session_token = None
    
    for token, data in active_sessions.items():
        if data['user_id'] == session_data['user_id']:
            session_token = token
            break
    
    if session_token:
        del active_sessions[session_token]
    
    return {"success": True, "message": "Logout realizado com sucesso"}

@app.get("/api/relatorios/vendas")
async def relatorios_vendas(
    data_inicio: str = Query(None, description="Data início (YYYY-MM-DD)"),
    data_fim: str = Query(None, description="Data fim (YYYY-MM-DD)"),
    session_data: dict = Depends(obter_admin)
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        query = """
            SELECT 
                DATE(v.data_venda) as data,
                COUNT(*) as total_vendas,
                SUM(v.total_venda) as valor_total,
                AVG(v.total_venda) as ticket_medio
            FROM vendas v
            WHERE v.loja_id = %s
        """
        params = [loja_id]
        
        if data_inicio and data_fim:
            query += " AND DATE(v.data_venda) BETWEEN %s AND %s"
            params.extend([data_inicio, data_fim])
        
        query += " GROUP BY DATE(v.data_venda) ORDER BY data DESC"
        
        cursor.execute(query, params)
        dados = cursor.fetchall()
        
        return {
            "periodo": f"{data_inicio} a {data_fim}" if data_inicio and data_fim else "Todo o período",
            "dados": dados,
            "total_geral": sum(item['valor_total'] for item in dados) if dados else 0
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar relatório: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.get("/api/relatorios/os")
async def relatorios_os(
    session_data: dict = Depends(obter_admin)
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        cursor.execute("""
            SELECT 
                status,
                COUNT(*) as quantidade,
                AVG(orcamento) as orcamento_medio
            FROM ordens_servico 
            WHERE loja_id = %s
            GROUP BY status
        """, (loja_id,))
        
        stats_status = cursor.fetchall()
        
        cursor.execute("""
            SELECT 
                u.nome as tecnico,
                COUNT(*) as total_os,
                SUM(CASE WHEN os.status = 'concluida' THEN 1 ELSE 0 END) as concluidas
            FROM ordens_servico os
            INNER JOIN usuarios u ON os.usuario_id = u.id
            WHERE os.loja_id = %s
            GROUP BY u.nome
        """, (loja_id,))
        
        stats_tecnicos = cursor.fetchall()
        
        return {
            "por_status": stats_status,
            "por_tecnico": stats_tecnicos
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar relatório: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


# Endpoints para Gerenciamento de Usuários 
@app.get("/api/usuarios")
async def listar_usuarios(session_data: dict = Depends(obter_todos_usuarios)):
    if session_data['perfil'] != 'admin':
        raise HTTPException(
            status_code=403, 
            detail="Apenas administradores podem visualizar usuários"
        )
    
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=500, detail="Erro de conexão com o banco")
            
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        cursor.execute("""
            SELECT id, loja_id, nome, email, perfil, ativo, data_criacao
            FROM usuarios 
            WHERE loja_id = %s
            ORDER BY nome
        """, (loja_id,))
        
        usuarios = cursor.fetchall()
        
        for usuario in usuarios:
            if usuario['data_criacao']:
                usuario['data_criacao'] = usuario['data_criacao'].isoformat()
        
        return {"usuarios": usuarios}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar usuários: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.post("/api/usuarios")
async def criar_usuario(
    usuario_data: UsuarioCreate,
    session_data: dict = Depends(obter_todos_usuarios)
):
    if session_data['perfil'] != 'admin':
        raise HTTPException(
            status_code=403, 
            detail="Apenas administradores podem criar usuários"
        )
    
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        cursor.execute(
            "SELECT id FROM usuarios WHERE nome = %s AND loja_id = %s",
            (usuario_data.nome, loja_id)
        )
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Já existe usuário com este nome")
        
        if usuario_data.email:
            cursor.execute(
                "SELECT id FROM usuarios WHERE email = %s AND loja_id = %s",
                (usuario_data.email, loja_id)
            )
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Já existe usuário com este email")
        
        hashed_password = hash_password(usuario_data.password)
        
        cursor.execute("""
            INSERT INTO usuarios (loja_id, nome, email, password, perfil, ativo, data_criacao)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
        """, (
            loja_id, usuario_data.nome, usuario_data.email, 
            hashed_password, usuario_data.perfil, usuario_data.ativo
        ))
        
        usuario_id = cursor.lastrowid
        conn.commit()
        
        cursor.execute("""
            SELECT id, loja_id, nome, email, perfil, ativo, data_criacao
            FROM usuarios WHERE id = %s
        """, (usuario_id,))
        
        usuario = cursor.fetchone()
        
        if usuario and usuario['data_criacao']:
            usuario['data_criacao'] = usuario['data_criacao'].isoformat()
        
        return {
            "success": True,
            "message": "Usuário criado com sucesso",
            "usuario": usuario
        }
        
    except HTTPException:
        raise
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar usuário: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.put("/api/usuarios/{usuario_id}")
async def atualizar_usuario(
    usuario_id: int,
    usuario_data: UsuarioUpdate,
    session_data: dict = Depends(obter_todos_usuarios)
):
    if session_data['perfil'] != 'admin':
        raise HTTPException(
            status_code=403, 
            detail="Apenas administradores podem editar usuários"
        )
    
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        cursor.execute(
            "SELECT id FROM usuarios WHERE id = %s AND loja_id = %s",
            (usuario_id, loja_id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
        update_fields = []
        update_values = []
        
        if usuario_data.nome is not None:
            update_fields.append("nome = %s")
            update_values.append(usuario_data.nome)
        
        if usuario_data.email is not None:
            update_fields.append("email = %s")
            update_values.append(usuario_data.email)
        
        if usuario_data.perfil is not None:
            update_fields.append("perfil = %s")
            update_values.append(usuario_data.perfil)
        
        if usuario_data.ativo is not None:
            update_fields.append("ativo = %s")
            update_values.append(usuario_data.ativo)
        
        if usuario_data.password is not None:
            hashed_password = hash_password(usuario_data.password)
            update_fields.append("password = %s")
            update_values.append(hashed_password)
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="Nenhum campo fornecido para atualização")
        
        update_values.extend([usuario_id, loja_id])
        
        query = f"UPDATE usuarios SET {', '.join(update_fields)} WHERE id = %s AND loja_id = %s"
        cursor.execute(query, update_values)
        
        conn.commit()
        
        cursor.execute("""
            SELECT id, loja_id, nome, email, perfil, ativo, data_criacao
            FROM usuarios WHERE id = %s AND loja_id = %s
        """, (usuario_id, loja_id))
        
        usuario_atualizado = cursor.fetchone()
        
        if usuario_atualizado and usuario_atualizado['data_criacao']:
            usuario_atualizado['data_criacao'] = usuario_atualizado['data_criacao'].isoformat()
        
        return {
            "success": True,
            "message": "Usuário atualizado com sucesso",
            "usuario": usuario_atualizado
        }
        
    except HTTPException:
        raise
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar usuário: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.delete("/api/usuarios/{usuario_id}")
async def excluir_usuario(
    usuario_id: int,
    session_data: dict = Depends(obter_todos_usuarios)
):
    if session_data['perfil'] != 'admin':
        raise HTTPException(
            status_code=403, 
            detail="Apenas administradores podem excluir usuários"
        )
    
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        loja_id = get_loja_id(session_data)
        
        cursor.execute(
            "SELECT id, nome FROM usuarios WHERE id = %s AND loja_id = %s",
            (usuario_id, loja_id)
        )
        usuario = cursor.fetchone()
        
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
        if usuario_id == session_data['user_id']:
            raise HTTPException(status_code=400, detail="Não é possível excluir seu próprio usuário")
        
        cursor.execute(
            "DELETE FROM usuarios WHERE id = %s AND loja_id = %s",
            (usuario_id, loja_id)
        )
        
        conn.commit()
        
        return {
            "success": True,
            "message": "Usuário excluído com sucesso"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao excluir usuário: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.get("/api/usuarios/{usuario_id}")
async def obter_usuario(
    usuario_id: int,
    session_data: dict = Depends(obter_todos_usuarios)
):
    if session_data['perfil'] != 'admin':
        raise HTTPException(
            status_code=403, 
            detail="Apenas administradores podem visualizar usuários"
        )
    
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        cursor.execute("""
            SELECT id, loja_id, nome, email, perfil, ativo, data_criacao
            FROM usuarios 
            WHERE id = %s AND loja_id = %s
        """, (usuario_id, loja_id))
        
        usuario = cursor.fetchone()
        
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
        if usuario['data_criacao']:
            usuario['data_criacao'] = usuario['data_criacao'].isoformat()
        
        return usuario
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar usuário: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
        
        
@app.get("/api/produtos", response_model=ProdutoListResponse)
async def listar_produtos(
    pagina: Optional[int] = Query(None, ge=1),
    limite: int = Query(10, ge=1, le=1000),
    busca: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    session_data: dict = Depends(obter_todos_usuarios)
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        query = """
            SELECT id, loja_id, codigo_barras, nome, descricao, categoria, marca,
                   estoque_atual, estoque_minimo, preco_custo, preco_venda, ativo,
                   data_cadastro, data_atualizacao
            FROM produtos 
            WHERE loja_id = %s AND ativo = 1
        """
        params = [loja_id]
        
        if busca:
            query += " AND (nome LIKE %s OR codigo_barras LIKE %s OR descricao LIKE %s)"
            search_term = f"%{busca}%"
            params.extend([search_term, search_term, search_term])
        
        if categoria:
            query += " AND categoria = %s"
            params.append(categoria)
        
        count_query = f"SELECT COUNT(*) as total FROM ({query}) as subquery"
        cursor.execute(count_query, params)
        total = cursor.fetchone()['total']
        
        if limite == 1000 or pagina is None:
            query += " ORDER BY nome"
            cursor.execute(query, params)
            produtos = cursor.fetchall()
            
            return {
                "produtos": produtos,
                "total": total,
                "pagina": 1,
                "total_paginas": 1
            }
        else:
            offset = (pagina - 1) * limite
            total_paginas = (total + limite - 1) // limite
            
            query += " ORDER BY nome LIMIT %s OFFSET %s"
            params.extend([limite, offset])
            cursor.execute(query, params)
            produtos = cursor.fetchall()
        
        for produto in produtos:
            if produto['data_cadastro']:
                produto['data_cadastro'] = produto['data_cadastro'].isoformat()
            if produto['data_atualizacao']:
                produto['data_atualizacao'] = produto['data_atualizacao'].isoformat()
        
        return {
            "produtos": produtos,
            "total": total,
            "pagina": pagina or 1,
            "total_paginas": total_paginas
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar produtos: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
@app.get("/api/produtos/todos")
async def listar_todos_produtos(
    session_data: dict = Depends(obter_todos_usuarios)
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        cursor.execute("""
            SELECT id, nome, codigo_barras, preco_venda, estoque_atual
            FROM produtos 
            WHERE loja_id = %s AND ativo = 1
            ORDER BY nome
        """, (loja_id,))
        
        produtos = cursor.fetchall()
        
        return {
            "success": True,
            "produtos": produtos,
            "total": len(produtos)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar produtos: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
        
@app.get("/api/produtos/inativos", response_model=ProdutoListResponse)
async def listar_produtos_inativos(
    pagina: Optional[int] = Query(None, ge=1),
    limite: int = Query(10, ge=1, le=1000),
    busca: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    session_data: dict = Depends(obter_todos_usuarios)
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        query = """
            SELECT id, loja_id, codigo_barras, nome, descricao, categoria, marca,
                   estoque_atual, estoque_minimo, preco_custo, preco_venda, ativo,
                   data_cadastro, data_atualizacao
            FROM produtos 
            WHERE loja_id = %s AND ativo = 0
        """
        params = [loja_id]
        
        if busca:
            query += " AND (nome LIKE %s OR codigo_barras LIKE %s OR descricao LIKE %s)"
            search_term = f"%{busca}%"
            params.extend([search_term, search_term, search_term])
        
        if categoria:
            query += " AND categoria = %s"
            params.append(categoria)
        
        count_query = f"SELECT COUNT(*) as total FROM ({query}) as subquery"
        cursor.execute(count_query, params)
        total = cursor.fetchone()['total']
        
        if limite == 1000 or pagina is None:
            query += " ORDER BY nome"
            cursor.execute(query, params)
            produtos = cursor.fetchall()
            
            return {
                "produtos": produtos,
                "total": total,
                "pagina": 1,
                "total_paginas": 1
            }
        else:
            offset = (pagina - 1) * limite
            total_paginas = (total + limite - 1) // limite
            
            query += " ORDER BY nome LIMIT %s OFFSET %s"
            params.extend([limite, offset])
            cursor.execute(query, params)
            produtos = cursor.fetchall()
        
        for produto in produtos:
            if produto['data_cadastro']:
                produto['data_cadastro'] = produto['data_cadastro'].isoformat()
            if produto['data_atualizacao']:
                produto['data_atualizacao'] = produto['data_atualizacao'].isoformat()
        
        return {
            "produtos": produtos,
            "total": total,
            "pagina": pagina or 1,
            "total_paginas": total_paginas
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar produtos inativos: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.get("/api/produtos/{produto_id}")
async def obter_produto(
    produto_id: int,
    session_data: dict = Depends(obter_todos_usuarios)
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        cursor.execute("""
            SELECT id, loja_id, codigo_barras, nome, descricao, categoria, marca,
                   estoque_atual, estoque_minimo, preco_custo, preco_venda, ativo,
                   data_cadastro, data_atualizacao
            FROM produtos 
            WHERE id = %s AND loja_id = %s AND ativo = 1
        """, (produto_id, loja_id))
        
        produto = cursor.fetchone()
        
        if not produto:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        
        if produto['data_cadastro']:
            produto['data_cadastro'] = produto['data_cadastro'].isoformat()
        if produto['data_atualizacao']:
            produto['data_atualizacao'] = produto['data_atualizacao'].isoformat()
        
        return produto
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar produto: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.post("/api/produtos")
async def criar_produto(
    produto_data: ProdutoCreate,
    session_data: dict = Depends(obter_todos_usuarios)
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        if produto_data.codigo_barras:
            cursor.execute(
                "SELECT id FROM produtos WHERE codigo_barras = %s AND loja_id = %s",
                (produto_data.codigo_barras, loja_id)
            )
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Já existe produto com este código de barras")
        
        cursor.execute("""
            INSERT INTO produtos (
                loja_id, codigo_barras, nome, descricao, categoria, marca,
                estoque_atual, estoque_minimo, preco_custo, preco_venda, ativo
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            loja_id, produto_data.codigo_barras, produto_data.nome, 
            produto_data.descricao, produto_data.categoria, produto_data.marca,
            produto_data.estoque_atual, produto_data.estoque_minimo, 
            produto_data.preco_custo, produto_data.preco_venda, produto_data.ativo
        ))
        
        produto_id = cursor.lastrowid
        conn.commit()
        
        cursor.execute("""
            SELECT id, loja_id, codigo_barras, nome, descricao, categoria, marca,
                   estoque_atual, estoque_minimo, preco_custo, preco_venda, ativo,
                   data_cadastro, data_atualizacao
            FROM produtos WHERE id = %s
        """, (produto_id,))
        
        produto = cursor.fetchone()
        
        if produto and produto['data_cadastro']:
            produto['data_cadastro'] = produto['data_cadastro'].isoformat()
        if produto and produto['data_atualizacao']:
            produto['data_atualizacao'] = produto['data_atualizacao'].isoformat()
        
        return {
            "success": True,
            "message": "Produto criado com sucesso",
            "produto": produto
        }
        
    except HTTPException:
        raise
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar produto: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.put("/api/produtos/{produto_id}")
async def atualizar_produto(
    produto_id: int,
    produto_data: ProdutoUpdate,
    session_data: dict = Depends(obter_todos_usuarios)
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        cursor.execute(
            "SELECT id FROM produtos WHERE id = %s AND loja_id = %s",
            (produto_id, loja_id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        
        if produto_data.codigo_barras:
            cursor.execute(
                "SELECT id FROM produtos WHERE codigo_barras = %s AND loja_id = %s AND id != %s",
                (produto_data.codigo_barras, loja_id, produto_id)
            )
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Código de barras já está em uso por outro produto")
        
        update_fields = []
        update_values = []
        
        if produto_data.codigo_barras is not None:
            update_fields.append("codigo_barras = %s")
            update_values.append(produto_data.codigo_barras)
        
        if produto_data.nome is not None:
            update_fields.append("nome = %s")
            update_values.append(produto_data.nome)
        
        if produto_data.descricao is not None:
            update_fields.append("descricao = %s")
            update_values.append(produto_data.descricao)
        
        if produto_data.categoria is not None:
            update_fields.append("categoria = %s")
            update_values.append(produto_data.categoria)
        
        if produto_data.marca is not None:
            update_fields.append("marca = %s")
            update_values.append(produto_data.marca)
        
        if produto_data.estoque_atual is not None:
            update_fields.append("estoque_atual = %s")
            update_values.append(produto_data.estoque_atual)
        
        if produto_data.estoque_minimo is not None:
            update_fields.append("estoque_minimo = %s")
            update_values.append(produto_data.estoque_minimo)
        
        if produto_data.preco_custo is not None:
            update_fields.append("preco_custo = %s")
            update_values.append(produto_data.preco_custo)
        
        if produto_data.preco_venda is not None:
            update_fields.append("preco_venda = %s")
            update_values.append(produto_data.preco_venda)
        
        if produto_data.ativo is not None:
            update_fields.append("ativo = %s")
            update_values.append(produto_data.ativo)
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="Nenhum campo fornecido para atualização")
        
        update_fields.append("data_atualizacao = CURRENT_TIMESTAMP")
        
        update_values.extend([produto_id, loja_id])
        
        query = f"UPDATE produtos SET {', '.join(update_fields)} WHERE id = %s AND loja_id = %s"
        cursor.execute(query, update_values)
        
        conn.commit()
        
        cursor.execute("""
            SELECT id, loja_id, codigo_barras, nome, descricao, categoria, marca,
                   estoque_atual, estoque_minimo, preco_custo, preco_venda, ativo,
                   data_cadastro, data_atualizacao
            FROM produtos WHERE id = %s AND loja_id = %s
        """, (produto_id, loja_id))
        
        produto_atualizado = cursor.fetchone()
        
        if produto_atualizado and produto_atualizado['data_cadastro']:
            produto_atualizado['data_cadastro'] = produto_atualizado['data_cadastro'].isoformat()
        if produto_atualizado and produto_atualizado['data_atualizacao']:
            produto_atualizado['data_atualizacao'] = produto_atualizado['data_atualizacao'].isoformat()
        
        return {
            "success": True,
            "message": "Produto atualizado com sucesso",
            "produto": produto_atualizado
        }
        
    except HTTPException:
        raise
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar produto: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.delete("/api/produtos/{produto_id}")
async def excluir_produto(
    produto_id: int,
    session_data: dict = Depends(obter_todos_usuarios)
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        loja_id = get_loja_id(session_data)
        
        cursor.execute(
            "SELECT id FROM produtos WHERE id = %s AND loja_id = %s",
            (produto_id, loja_id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        
        cursor.execute(
            "UPDATE produtos SET ativo = 0, data_atualizacao = CURRENT_TIMESTAMP WHERE id = %s AND loja_id = %s",
            (produto_id, loja_id)
        )
        
        conn.commit()
        
        return {
            "success": True,
            "message": "Produto excluído com sucesso"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao excluir produto: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
        

# ENDPOINTS PARA PERMISSÕES

@app.get("/api/permissoes/disponiveis")
async def listar_permissoes_disponiveis(session_data: dict = Depends(obter_admin)):
    permissoes_disponiveis = [
        {"valor": "gerenciar_usuarios", "descricao": "Gerenciar usuários do sistema"},
        {"valor": "gerenciar_produtos", "descricao": "Gerenciar produtos e estoque"},
        {"valor": "gerenciar_vendas", "descricao": "Realizar vendas e gerenciar"},
        {"valor": "gerenciar_os", "descricao": "Criar e gerenciar ordens de serviço"},
        {"valor": "gerenciar_clientes", "descricao": "Gerenciar cadastro de clientes"},
        {"valor": "ver_relatorios", "descricao": "Visualizar relatórios do sistema"},
        {"valor": "exportar_dados", "descricao": "Exportar dados do sistema"},
        {"valor": "configurar_sistema", "descricao": "Configurar parâmetros do sistema"}
    ]
    
    return {"permissoes": permissoes_disponiveis}

@app.get("/api/usuarios-com-permissoes")
async def listar_usuarios_com_permissoes(session_data: dict = Depends(obter_admin)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        cursor.execute("""
            SELECT id, nome, email, perfil, ativo
            FROM usuarios 
            WHERE loja_id = %s AND ativo = 1
            ORDER BY nome
        """, (loja_id,))
        
        usuarios = cursor.fetchall()
        
        return {"usuarios": usuarios}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar usuários: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.get("/api/usuarios/{usuario_id}/permissoes")
async def obter_permissoes_usuario(
    usuario_id: int,
    session_data: dict = Depends(obter_admin)
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        cursor.execute("""
            SELECT id, nome, email, perfil 
            FROM usuarios 
            WHERE id = %s AND loja_id = %s AND ativo = 1
        """, (usuario_id, loja_id))
        
        usuario = cursor.fetchone()
        
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
        permissoes_por_perfil = {
            "admin": [
                "gerenciar_usuarios", "gerenciar_produtos", "gerenciar_vendas", 
                "gerenciar_os", "gerenciar_clientes", "ver_relatorios", 
                "exportar_dados", "configurar_sistema"
            ],
            "tecnico": [
                "gerenciar_os", "gerenciar_clientes", "gerenciar_produtos"
            ],
            "vendedor": [
                "gerenciar_vendas", "gerenciar_clientes", "ver_relatorios"
            ]
        }
        
        permissoes = permissoes_por_perfil.get(usuario['perfil'], [])
        
        return {
            "success": True,
            "usuario": usuario,
            "permissoes": permissoes,
            "nivel_acesso": usuario['perfil']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar permissões: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.put("/api/usuarios/{usuario_id}/permissoes")
async def atualizar_permissoes_usuario(
    usuario_id: int,
    permissao_data: dict,
    session_data: dict = Depends(obter_admin)
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        cursor.execute(
            "SELECT id, nome FROM usuarios WHERE id = %s AND loja_id = %s",
            (usuario_id, loja_id)
        )
        usuario_existente = cursor.fetchone()
        
        if not usuario_existente:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
        nivel_acesso = permissao_data.get('nivel_acesso')
        niveis_validos = ['admin', 'tecnico', 'vendedor']
        
        if nivel_acesso and nivel_acesso not in niveis_validos:
            raise HTTPException(
                status_code=400, 
                detail=f"Nível de acesso inválido. Use: {', '.join(niveis_validos)}"
            )
        
        if nivel_acesso:
            cursor.execute(
                "UPDATE usuarios SET perfil = %s WHERE id = %s AND loja_id = %s",
                (nivel_acesso, usuario_id, loja_id)
            )
        
        conn.commit()
        
        return {
            "success": True,
            "message": "Permissões atualizadas com sucesso",
            "usuario_id": usuario_id,
            "nivel_acesso": nivel_acesso,
            "permissoes": permissao_data.get('permissoes', [])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar permissões: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
        
@app.get("/api/vendas/{venda_id}/itens")
async def obter_itens_venda(venda_id: int, session_data: dict = Depends(obter_vendedor)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT iv.*, p.nome as produto 
            FROM itens_venda iv
            LEFT JOIN produtos p ON iv.produto_id = p.id
            WHERE iv.venda_id = %s
        """, (venda_id,))
        
        itens = cursor.fetchall()
        return {"itens": itens}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar itens da venda: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()        
        
        
        
# =============================================
# ENDPOINTS PARA RELATÓRIOS
# =============================================

@app.post("/api/relatorios/gerar")
async def gerar_relatorio_completo(
    relatorio_data: RelatorioRequest,
    session_data: dict = Depends(obter_admin)
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        relatorios = {}
        
        if 'estoque' in relatorio_data.tipos or 'todos' in relatorio_data.tipos:
            cursor.execute("""
                SELECT 
                    codigo_barras, nome, categoria, marca, 
                    estoque_atual, estoque_minimo, preco_custo, preco_venda,
                    CASE 
                        WHEN estoque_atual = 0 THEN 'CRÍTICO'
                        WHEN estoque_atual <= estoque_minimo THEN 'BAIXO'
                        ELSE 'NORMAL'
                    END as status_estoque
                FROM produtos 
                WHERE loja_id = %s AND ativo = 1
                ORDER BY nome
            """, (loja_id,))
            relatorios['estoque'] = cursor.fetchall()
        
        if 'mais-vendidos' in relatorio_data.tipos or 'todos' in relatorio_data.tipos:
            cursor.execute("""
                SELECT 
                    p.nome as produto,
                    SUM(iv.quantidade) as quantidade_vendida,
                    SUM(iv.total_item) as total_vendido,
                    COUNT(iv.id) as total_vendas
                FROM itens_venda iv
                INNER JOIN produtos p ON iv.produto_id = p.id
                INNER JOIN vendas v ON iv.venda_id = v.id
                WHERE v.loja_id = %s
                GROUP BY p.id, p.nome
                ORDER BY total_vendido DESC
                LIMIT 20
            """, (loja_id,))
            relatorios['mais_vendidos'] = cursor.fetchall()
        
        if 'movimentacoes' in relatorio_data.tipos or 'todos' in relatorio_data.tipos:
            cursor.execute("""
                SELECT 
                    v.data_venda as data,
                    'VENDA' as tipo,
                    p.nome as produto,
                    iv.quantidade,
                    iv.total_item as valor,
                    u.nome as usuario,
                    v.numero_venda as referencia
                FROM itens_venda iv
                INNER JOIN vendas v ON iv.venda_id = v.id
                INNER JOIN produtos p ON iv.produto_id = p.id
                INNER JOIN usuarios u ON v.usuario_id = u.id
                WHERE v.loja_id = %s
                ORDER BY v.data_venda DESC
                LIMIT 50
            """, (loja_id,))
            movimentacoes_vendas = cursor.fetchall()
            
            cursor.execute("""
                SELECT 
                    data_cadastro as data,
                    'ENTRADA' as tipo,
                    nome as produto,
                    estoque_atual as quantidade,
                    preco_custo as valor,
                    'SISTEMA' as usuario,
                    codigo_barras as referencia
                FROM produtos 
                WHERE loja_id = %s AND estoque_atual > 0
                ORDER BY data_cadastro DESC
                LIMIT 50
            """, (loja_id,))
            movimentacoes_entradas = cursor.fetchall()
            
            relatorios['movimentacoes'] = movimentacoes_vendas + movimentacoes_entradas
        
        return {
            "success": True,
            "relatorios": relatorios,
            "data_geracao": datetime.now().isoformat(),
            "tipos_selecionados": relatorio_data.tipos
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar relatório: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.get("/api/relatorios/estoque")
async def relatorio_estoque(session_data: dict = Depends(obter_admin)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        cursor.execute("""
            SELECT 
                p.nome,
                p.codigo_barras,
                p.categoria,
                p.marca,
                p.estoque_atual,
                p.estoque_minimo,
                p.preco_custo,
                p.preco_venda,
                CASE 
                    WHEN p.estoque_atual = 0 THEN 'CRÍTICO'
                    WHEN p.estoque_atual <= p.estoque_minimo THEN 'BAIXO'
                    ELSE 'NORMAL'
                END as status_estoque,
                (p.estoque_atual * p.preco_custo) as valor_total_estoque
            FROM produtos p
            WHERE p.loja_id = %s AND p.ativo = 1
            ORDER BY status_estoque, p.nome
        """, (loja_id,))
        
        produtos = cursor.fetchall()
        
        cursor.execute("""
            SELECT 
                COUNT(*) as total_produtos,
                SUM(CASE WHEN estoque_atual = 0 THEN 1 ELSE 0 END) as produtos_sem_estoque,
                SUM(CASE WHEN estoque_atual <= estoque_minimo AND estoque_atual > 0 THEN 1 ELSE 0 END) as produtos_estoque_baixo,
                SUM(estoque_atual * preco_custo) as valor_total_estoque
            FROM produtos 
            WHERE loja_id = %s AND ativo = 1
        """, (loja_id,))
        
        estatisticas = cursor.fetchone()
        
        return {
            "produtos": produtos,
            "estatisticas": estatisticas,
            "data_geracao": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar relatório de estoque: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.get("/api/dashboard/estatisticas", response_model=DashboardStats)
async def carregar_estatisticas(session_data: dict = Depends(obter_todos_usuarios)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=500, detail="Erro de conexão com o banco")
            
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        cursor.execute("""
            SELECT 
                -- Total de Produtos
                (SELECT COUNT(*) FROM produtos WHERE loja_id = %s AND ativo = 1) as total_produtos,
                
                -- Vendas do Mês
                (SELECT COALESCE(SUM(total_venda), 0) FROM vendas 
                 WHERE loja_id = %s AND MONTH(data_venda) = MONTH(CURRENT_DATE()) 
                 AND YEAR(data_venda) = YEAR(CURRENT_DATE())) as vendas_mes,
                
                -- OS em Andamento
                (SELECT COUNT(*) FROM ordens_servico 
                 WHERE loja_id = %s AND status IN ('aberta', 'andamento', 'aguardando_pecas')) as os_andamento,
                
                -- Estoque Baixo
                (SELECT COUNT(*) FROM produtos 
                 WHERE loja_id = %s AND ativo = 1 
                 AND estoque_atual <= estoque_minimo AND estoque_atual > 0) as estoques_baixos,
                
                -- Total de Clientes
                (SELECT COUNT(*) FROM clientes WHERE loja_id = %s AND ativo = 1) as total_clientes,
                
                -- OS Concluídas no Mês
                (SELECT COUNT(*) FROM ordens_servico 
                 WHERE loja_id = %s AND status = 'concluida'
                 AND MONTH(data_conclusao) = MONTH(CURRENT_DATE()) 
                 AND YEAR(data_conclusao) = YEAR(CURRENT_DATE())) as os_concluidas_mes,
                
                -- Ticket Médio
                (SELECT COALESCE(AVG(total_venda), 0) FROM vendas 
                 WHERE loja_id = %s AND MONTH(data_venda) = MONTH(CURRENT_DATE()) 
                 AND YEAR(data_venda) = YEAR(CURRENT_DATE())) as ticket_medio,
                
                -- Vendas de Hoje
                (SELECT COALESCE(SUM(total_venda), 0) FROM vendas 
                 WHERE loja_id = %s AND DATE(data_venda) = CURDATE()) as vendas_hoje,
                
                -- Produtos Sem Estoque
                (SELECT COUNT(*) FROM produtos 
                 WHERE loja_id = %s AND ativo = 1 AND estoque_atual = 0) as produtos_sem_estoque
        """, [loja_id] * 9)
        
        stats = cursor.fetchone()
        
        return DashboardStats(
            totalProdutos=stats['total_produtos'],
            vendasMes=float(stats['vendas_mes']),
            osAndamento=stats['os_andamento'],
            estoquesBaixos=stats['estoques_baixos'],
            totalClientes=stats['total_clientes'],
            osConcluidasMes=stats['os_concluidas_mes'],
            ticketMedio=float(stats['ticket_medio']),
            vendasHoje=float(stats['vendas_hoje']),
            produtosSemEstoque=stats['produtos_sem_estoque']
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao carregar estatísticas: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


#ENDPOINTS OS 

@app.get("/api/os/{os_id}")
async def obter_os(os_id: int, session_data: dict = Depends(obter_vendedor_ou_tecnico)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        cursor.execute("""
            SELECT 
                os.id, os.numero_os, os.equipamento, os.marca, os.modelo,
                os.defeito_relatado, os.observacoes, os.orcamento, os.status,
                os.data_entrada, os.data_conclusao,os.data_entrega,
                c.nome as cliente_nome, c.telefone as cliente_telefone, c.cpf,
                u.nome as usuario_nome
            FROM ordens_servico os
            INNER JOIN clientes c ON os.cliente_id = c.id
            LEFT JOIN usuarios u ON os.usuario_id = u.id
            WHERE os.id = %s AND os.loja_id = %s
        """, (os_id, loja_id))
        
        os_data = cursor.fetchone()
        
        if not os_data:
            raise HTTPException(status_code=404, detail="OS não encontrada")
        
        if session_data['perfil'] != 'admin' and os_data.get('usuario_id') != session_data['user_id']:
            raise HTTPException(status_code=403, detail="Não autorizado a visualizar esta OS")
        
        if os_data['data_entrada']:
            os_data['data_entrada'] = os_data['data_entrada'].isoformat()
        if os_data['data_conclusao']:
            os_data['data_conclusao'] = os_data['data_conclusao'].isoformat()
        
        return os_data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar OS: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
@app.put("/api/os/{os_id}/status")
async def atualizar_status_os(
    os_id: int,
    status_data: OSStatusUpdate,
    session_data: dict = Depends(obter_tecnico)
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        loja_id = get_loja_id(session_data)
        
        if session_data['perfil'] != 'admin':
            cursor.execute(
                "SELECT id, status FROM ordens_servico WHERE id = %s AND loja_id = %s AND usuario_id = %s",
                (os_id, loja_id, session_data['user_id'])
            )
        else:
            cursor.execute(
                "SELECT id, status FROM ordens_servico WHERE id = %s AND loja_id = %s",
                (os_id, loja_id)
            )
            
        os_existente = cursor.fetchone()
        
        if not os_existente:
            raise HTTPException(status_code=404, detail="OS não encontrada ou não autorizada")
        
        novo_status = status_data.status
        if not novo_status:
            raise HTTPException(status_code=400, detail="Status não fornecido")
        
        status_validos = ['pendente', 'andamento', 'aguardando_pecas', 'concluida', 'entregue', 'cancelada']
        if novo_status not in status_validos:
            raise HTTPException(status_code=400, detail=f"Status inválido. Use: {', '.join(status_validos)}")
        
        data_atual = datetime.now()
        
        if novo_status == 'entregue':
            cursor.execute(
                "UPDATE ordens_servico SET status = %s, data_entrega = %s WHERE id = %s",
                (novo_status, data_atual, os_id)
            )
        elif novo_status == 'concluida':
            cursor.execute(
                "UPDATE ordens_servico SET status = %s, data_conclusao = %s WHERE id = %s",
                (novo_status, data_atual, os_id)
            )
        else:
            cursor.execute(
                "UPDATE ordens_servico SET status = %s WHERE id = %s",
                (novo_status, os_id)
            )
        
        conn.commit()
        return {"success": True, "message": f"Status da OS atualizado para {novo_status}"}
        
    except HTTPException:
        raise
    except Exception as e:
        if conn: 
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar status: {str(e)}")
    finally:
        if cursor: 
            cursor.close()
        if conn: 
            conn.close()
            
            
# =============================================
# ENDPOINTS PARA BACKUP E CONFIGURAÇÕES
# =============================================

class BackupRequest(BaseModel):
    tipo: str = "completo"  # completo, vendas, produtos, etc.

@app.post("/api/backup", response_model=BackupResponse)
async def criar_backup_local(
    backup_request: BackupConfig, 
    session_data: dict = Depends(obter_admin)
):
    conn = None
    cursor = None
    try:
        print(f"🔧 Iniciando backup - Tipo: {backup_request.tipo}")
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        # ✅ CORRIJA O CAMINHO AQUI - Use caminho relativo
        backup_dir = Path("backups")  # ← ALTERE PARA ESTE CAMINHO
        print(f"🔧 Caminho do backup: {backup_dir.absolute()}")
        
        # Tentar criar diretório com tratamento de erro
        try:
            backup_dir.mkdir(exist_ok=True)
            print(f"✅ Diretório criado/verificado: {backup_dir.absolute()}")
        except Exception as e:
            print(f"❌ Erro ao criar diretório: {e}")
            # Tentar criar em /tmp como fallback
            backup_dir = Path("/tmp/backups_webos")
            backup_dir.mkdir(exist_ok=True)
            print(f"🔧 Usando fallback: {backup_dir.absolute()}")
        
        backup_info = {
            "metadata": {
                "data_backup": datetime.now().isoformat(),
                "tipo": backup_request.tipo,
                "gerado_por": session_data['nome'],
                "loja_id": loja_id,
                "versao_sistema": "1.0.0",
                "descricao": backup_request.descricao
            },
            "dados": {}
        }
        
        # ... resto do código permanece igual
        tabelas = {
            'vendas': "SELECT * FROM vendas WHERE loja_id = %s",
            'produtos': "SELECT * FROM produtos WHERE loja_id = %s",
            'clientes': "SELECT * FROM clientes WHERE loja_id = %s", 
            'ordens_servico': "SELECT * FROM ordens_servico WHERE loja_id = %s",
            'usuarios': "SELECT id, nome, email, perfil, ativo, data_criacao FROM usuarios WHERE loja_id = %s",
            'fechamento_caixa': "SELECT * FROM fechamento_caixa WHERE loja_id = %s",
            'itens_venda': """SELECT iv.*, v.loja_id 
                            FROM itens_venda iv 
                            INNER JOIN vendas v ON iv.venda_id = v.id 
                            WHERE v.loja_id = %s""",
            'movimentacao_caixa': "SELECT * FROM movimentacao_caixa WHERE loja_id = %s"
        }
        
        total_registros = 0
        
        for tabela, query in tabelas.items():
            if backup_request.tipo == "completo" or backup_request.tipo == tabela:
                cursor.execute(query, (loja_id,))
                dados = cursor.fetchall()
                
                dados_serializados = serialize_mysql_data(dados)
                backup_info["dados"][tabela] = dados_serializados
                total_registros += len(dados)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        nome_arquivo = f"backup_{loja_id}_{backup_request.tipo}_{timestamp}.json"
        
        # ✅ SALVAR BACKUP
        caminho_backup = backup_dir / nome_arquivo
        
        with open(caminho_backup, 'w', encoding='utf-8') as f:
            json.dump(backup_info, f, indent=2, ensure_ascii=False, cls=DecimalEncoder)
        
        tamanho_backup = caminho_backup.stat().st_size
        
        print(f"✅ Backup criado com sucesso: {caminho_backup}")
        
        return BackupResponse(
            success=True,
            message=f"Backup {backup_request.tipo} criado com sucesso",
            backup_id=timestamp,
            total_registros=total_registros,
            tabelas_incluidas=list(backup_info["dados"].keys()),
            data_backup=backup_info["metadata"]["data_backup"],
            caminho_backup=str(caminho_backup.absolute()),
            tamanho_bytes=tamanho_backup
        )
        
    except Exception as e:
        print(f"❌ Erro ao criar backup: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao criar backup: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


    
    

# ✅ Endpoint para listar backups do computador
@app.get("/api/backup/historico")
async def listar_backups_locais(session_data: dict = Depends(obter_admin)):
    # ✅ MESMO CAMINHO DO BACKUP - MODIFIQUE AQUI TAMBÉM!
    backup_dir = Path("backups")  # ← ALTERE ESTE CAMINHO!
    backups = []
    
    if backup_dir.exists():
        for arquivo in backup_dir.glob("backup_*.json"):
            stat = arquivo.stat()
            backups.append({
                "nome": arquivo.name,
                "tamanho_bytes": stat.st_size,
                "data_criacao": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                "caminho": str(arquivo.absolute())
            })
    
    # Ordenar por data de criação (mais recente primeiro)
    backups.sort(key=lambda x: x["data_criacao"], reverse=True)
    
    return {
        "backups": backups,
        "total": len(backups),
        "pasta_backup": str(backup_dir.absolute())
    }


@app.get("/api/backup/download/{nome_arquivo}")
async def download_backup_local(nome_arquivo: str, session_data: dict = Depends(obter_admin)):
    # ✅ MESMO CAMINHO DO BACKUP - MODIFIQUE AQUI TAMBÉM!
    backup_dir = Path("backups")  # ← ALTERE ESTE CAMINHO!
    arquivo_path = backup_dir / nome_arquivo
    
    if not arquivo_path.exists():
        raise HTTPException(status_code=404, detail="Backup não encontrado")
    
    return FileResponse(
        path=str(arquivo_path),
        filename=nome_arquivo,
        media_type='application/json'
    )


# ✅ Endpoint para ver configuração
@app.get("/api/backup/configuracao")
async def verificar_configuracao_backup_local(session_data: dict = Depends(obter_admin)):
    backup_dir = Path("backups")   # ← ALTERE ESTE CAMINHO!
    
    config = {
        "pasta_backup": str(backup_dir.absolute()),
        "pasta_existe": backup_dir.exists(),
        "backups_encontrados": len(list(backup_dir.glob("backup_*.json"))) if backup_dir.exists() else 0,
        "tipo_backup": "local_computador"
    }
    
    return config

@app.delete("/api/backup/{nome_arquivo}")
async def excluir_backup_local(nome_arquivo: str, session_data: dict = Depends(obter_admin)):
    backup_dir = Path("backups")   # ← MESMO CAMINHO!
    arquivo_path = backup_dir / nome_arquivo
    
    if not arquivo_path.exists():
        raise HTTPException(status_code=404, detail="Backup não encontrado")
    
    try:
        arquivo_path.unlink()  # Exclui o arquivo
        return {
            "success": True,
            "message": f"Backup {nome_arquivo} excluído com sucesso"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao excluir backup: {str(e)}")


# =============================================
# ENDPOINTS PARA CONFIGURAÇÕES DO SISTEMA
# =============================================

class ConfiguracaoSistema(BaseModel):
    nome_loja: Optional[str] = None
    email_contato: Optional[str] = None
    telefone_loja: Optional[str] = None
    endereco_loja: Optional[str] = None
    alerta_estoque_baixo: Optional[bool] = True
    dias_retencao_backup: Optional[int] = 30

@app.get("/api/configuracoes")
async def obter_configuracoes(session_data: dict = Depends(obter_admin)):
    configuracoes_padrao = {
        "nome_loja": "WebOS Sistema",
        "email_contato": "contato@webos.com",
        "telefone_loja": "(11) 99999-9999",
        "endereco_loja": "Endereço da Loja",
        "alerta_estoque_baixo": True,
        "dias_retencao_backup": 30,
        "versao_sistema": "1.0.0"
    }
    
    return configuracoes_padrao

@app.put("/api/configuracoes")
async def atualizar_configuracoes(
    config_data: ConfiguracaoSistema,
    session_data: dict = Depends(obter_admin)
):
    return {
        "success": True,
        "message": "Configurações atualizadas com sucesso",
        "configuracoes": config_data.dict()
    }
    

# ENDPOINTS QUE PRECISAM SER ADICIONADOS:

@app.get("/api/configuracoes/usuarios")
async def get_user_settings(session_data: dict = Depends(obter_todos_usuarios)):
    return {
        "language": "pt",
        "timezone": "America/Sao_Paulo", 
        "dateFormat": "DD/MM/YYYY",
        "autoLogin": False
    }

@app.put("/api/configuracoes/usuarios")
async def update_user_settings(
    settings_data: dict,
    session_data: dict = Depends(obter_todos_usuarios)
):
    return {"success": True, "message": "Configurações atualizadas"}

class UserSettings(BaseModel):
    language: Optional[str] = "pt"
    timezone: Optional[str] = "America/Sao_Paulo"
    dateFormat: Optional[str] = "DD/MM/YYYY"
    autoLogin: Optional[bool] = False

@app.get("/api/configuracoes/usuario")
async def get_user_settings(session_data: dict = Depends(obter_todos_usuarios)):
    return UserSettings().dict()

@app.put("/api/configuracoes/usuario")
async def update_user_settings(
    settings: UserSettings,
    session_data: dict = Depends(obter_todos_usuarios)
):
    return {"success": True, "message": "Configurações salvas"}
        
        
if __name__ == "__main__":
    import uvicorn
    print("🚀 Servidor iniciando na porta 8001...")
    print(f"🏪 Modo: Loja Única (ID: {LOJA_UNICA_ID})")
    print(f"🗃️ Banco: webos_prod")
    print("📊 Acesse http://localhost:8001/docs para a documentação da API")
    uvicorn.run(app, host="0.0.0.0", port=8001)