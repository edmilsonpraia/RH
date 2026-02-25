# Sistema Integrado de Gestão de RH - COPIA GROUP OF COMPANIES S.A.

Sistema completo de gestão de Recursos Humanos com interface profissional estilo Windows Forms/C#.

## 🎨 Características

- **Interface Profissional**: Design estilo C# com menu lateral, grids e tema corporativo
- **Cores Corporativas**: Baseado no logo da COPIA GROUP (marrom/bronze e laranja)
- **Autenticação**: Sistema seguro com JWT (2 níveis: Admin e Usuário)
- **Base de Dados**: SQLite compacta mas robusta
- **Backend**: Node.js + Express
- **Frontend**: HTML5 + CSS3 + JavaScript vanilla (sem frameworks)

## 📋 Funcionalidades

### Módulos Administrativos (Admin)
1. **Dashboard** - Visão geral com estatísticas
2. **Colaboradores** - CRUD completo, pesquisa e paginação
3. **Assiduidade** - Gestão de presença e horas trabalhadas
4. **Férias** - Aprovação de pedidos e gestão de saldos
5. **Recrutamento** - ATS (Applicant Tracking System)
6. **Folha de Pagamento** - Processamento automático mensal
7. **Desempenho** - Avaliações e feedback
8. **Relatórios** - Analytics e exports

### Portal de Auto-Serviço (Usuário)
- Visualizar perfil
- Registar entrada/saída
- Solicitar férias
- Consultar recibos de vencimento
- Ver avaliações de desempenho

## 🚀 Instalação

### Requisitos
- Node.js 16+ instalado
- npm ou yarn

### Passos

1. **Abrir terminal na pasta do projeto**
```bash
cd c:\Users\user\Desktop\RH
```

2. **As dependências já estão instaladas**
(Se precisar reinstalar: `npm install`)

3. **Configurar variáveis de ambiente**
O ficheiro `.env` já foi criado com as configurações padrão.

4. **Iniciar o servidor**
```bash
npm start
```

Ou para desenvolvimento (auto-reload):
```bash
npm run dev
```

5. **Aceder ao sistema**
Abra o navegador em: **http://localhost:3000**

## 🔐 Credenciais Padrão

**Administrador:**
- Username: `admin`
- Password: `admin123`

> ⚠️ **Importante**: Altere estas credenciais em produção!

## 📁 Estrutura do Projeto

```
RH/
├── backend/
│   ├── server.js              # Servidor Express
│   ├── database.js            # SQLite + schemas
│   ├── auth.js                # Autenticação JWT
│   ├── routes/                # Rotas da API
│   │   ├── auth.routes.js
│   │   ├── employees.routes.js
│   │   ├── attendance.routes.js
│   │   ├── recruitment.routes.js
│   │   ├── payroll.routes.js
│   │   ├── performance.routes.js
│   │   └── reports.routes.js
│   └── db/
│       └── hr.db              # Base de dados SQLite
├── frontend/
│   ├── index.html             # Página de login
│   ├── admin-dashboard.html   # Dashboard Admin
│   ├── user-dashboard.html    # Portal Usuário
│   ├── css/
│   │   ├── style.css          # Estilos globais
│   │   ├── components.css     # Componentes UI
│   │   └── grids.css          # Tabelas
│   ├── js/
│   │   ├── auth.js            # Autenticação
│   │   ├── api.js             # Cliente HTTP
│   │   ├── components.js      # Componentes UI
│   │   ├── employees.js       # Módulo colaboradores
│   │   ├── attendance.js      # Módulo assiduidade
│   │   ├── recruitment.js     # Módulo recrutamento
│   │   ├── payroll.js         # Módulo folha de pagamento
│   │   └── performance.js     # Módulo desempenho
│   └── assets/
│       └── LOGO.png
├── package.json
├── .env
└── README.md
```

## 🔧 API Endpoints

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Criar utilizador (admin)

### Colaboradores
- `GET /api/employees` - Listar colaboradores
- `GET /api/employees/:id` - Obter por ID
- `POST /api/employees` - Criar colaborador
- `PUT /api/employees/:id` - Atualizar colaborador
- `DELETE /api/employees/:id` - Eliminar colaborador

### Assiduidade
- `GET /api/attendance` - Listar assiduidade
- `POST /api/attendance/check` - Registar entrada/saída
- `GET /api/attendance/leave-requests` - Pedidos de férias
- `POST /api/attendance/leave-requests` - Solicitar férias
- `PUT /api/attendance/leave-requests/:id` - Aprovar/Rejeitar férias

### Recrutamento
- `GET /api/recruitment` - Listar candidaturas
- `POST /api/recruitment` - Criar candidatura
- `PUT /api/recruitment/:id` - Atualizar status
- `DELETE /api/recruitment/:id` - Eliminar candidatura

### Folha de Pagamento
- `GET /api/payroll` - Listar folha de pagamento
- `POST /api/payroll/process` - Processar folha mensal
- `GET /api/payroll/:id` - Obter recibo

### Desempenho
- `GET /api/performance` - Listar avaliações
- `POST /api/performance` - Criar avaliação
- `PUT /api/performance/:id` - Atualizar avaliação

### Relatórios
- `GET /api/reports/headcount` - Relatório de headcount
- `GET /api/reports/absenteeism` - Relatório de absentismo
- `GET /api/reports/payroll-costs` - Custos salariais
- `GET /api/reports/recruitment` - Relatório de recrutamento
- `GET /api/reports/audit-logs` - Logs de auditoria

## 🎯 Como Usar

### 1. Login
Aceda a `http://localhost:3000` e faça login com as credenciais padrão.

### 2. Dashboard Admin
Após login como admin, verá:
- Estatísticas gerais
- Ações rápidas
- Menu lateral com todos os módulos

### 3. Gestão de Colaboradores
- Clique em "Colaboradores" no menu
- Use o botão "➕ Novo Colaborador" para adicionar
- Pesquise, edite ou elimine colaboradores

### 4. Processar Folha de Pagamento
- Aceda ao módulo "Folha de Pagamento"
- Clique em "💰 Processar Folha"
- Selecione mês e ano
- O sistema calcula automaticamente salários, bónus e deduções

### 5. Aprovar Férias
- Aceda ao módulo "Férias"
- Veja pedidos pendentes
- Clique em ✓ para aprovar ou ✗ para rejeitar

## 🔒 Segurança

- ✅ Passwords encriptadas com bcrypt
- ✅ Autenticação JWT com expiração
- ✅ Validação de inputs
- ✅ Logs de auditoria
- ✅ Role-based access control (RBAC)
- ✅ Proteção contra SQL injection

## 🛠️ Desenvolvimento

### Estrutura do Código
O código está organizado em camadas:
- **Backend**: Servidor Express com rotas modulares
- **Base de Dados**: SQLite com schemas bem definidos
- **Frontend**: JavaScript vanilla com módulos separados por funcionalidade

### Adicionar Novo Módulo
1. Criar rota no backend (`backend/routes/nome.routes.js`)
2. Adicionar endpoint no `server.js`
3. Criar módulo JS no frontend (`frontend/js/nome.js`)
4. Adicionar item no menu lateral dos dashboards

## 📊 Base de Dados

### Tabelas Principais
- **users** - Utilizadores do sistema
- **employees** - Colaboradores
- **recruitment** - Candidaturas
- **attendance** - Assiduidade
- **leave_requests** - Pedidos de férias
- **payroll** - Folha de pagamento
- **performance** - Avaliações
- **onboarding** - Processos de integração
- **audit_logs** - Logs de auditoria

A base de dados é criada automaticamente ao iniciar o servidor.

## 🐛 Resolução de Problemas

### Servidor não inicia
- Verifique se a porta 3000 está disponível
- Confirme que o Node.js está instalado: `node --version`

### Erro de autenticação
- Verifique se o JWT_SECRET está configurado no `.env`
- Limpe o localStorage do navegador

### Base de dados corrompida
- Delete o ficheiro `backend/db/hr.db`
- Reinicie o servidor (será criada nova base de dados)

## 📝 Notas de Produção

Antes de usar em produção:
1. Altere o `JWT_SECRET` no `.env`
2. Altere as credenciais padrão do admin
3. Configure backup automático da base de dados
4. Use HTTPS
5. Configure variáveis de ambiente no servidor

## 📞 Suporte

Sistema desenvolvido para COPIA GROUP OF COMPANIES S.A.

## 📄 Licença

© 2025 COPIA GROUP OF COMPANIES S.A. Todos os direitos reservados.
