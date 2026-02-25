# 👤 Funcionalidades do Portal do Colaborador

## Visão Geral

O Portal do Colaborador oferece 6 módulos completos para que os colaboradores possam gerir os seus próprios dados e processos de RH de forma autónoma.

---

## 🏠 1. Início (Dashboard)

### Estatísticas Rápidas:
- **Estado Hoje**: Mostra se já registou entrada/saída
- **Dias de Férias**: Saldo disponível de férias
- **Horas Este Mês**: Total de horas trabalhadas no mês atual

### Ações Rápidas:
- ✓ **Registar Entrada**: Marca a hora de chegada ao trabalho
- ✗ **Registar Saída**: Marca a hora de saída do trabalho
- 🏖️ **Solicitar Férias**: Formulário rápido para pedir férias

### Meus Dados:
- Visualização resumida dos dados pessoais
- Nome, Email, Cargo, Departamento, Data de Admissão, Telefone

---

## 👤 2. Meu Perfil

### Visualização de Dados:
- **Dados Bloqueados** (apenas leitura):
  - Nome Completo
  - Email
  - Cargo
  - Departamento
  - Data de Admissão
  - Salário Base
  - Status

- **Dados Editáveis**:
  - Telefone (pode atualizar o próprio número)

### Alterar Password:
- Formulário seguro para mudança de password
- Requer password atual para confirmação
- Nova password deve ter pelo menos 6 caracteres
- Validação de confirmação de password

---

## 🕐 3. Minha Assiduidade

### Funcionalidades:
- **Filtro por Mês/Ano**: Consultar histórico de assiduidade
- **Visualização em Grid**: Tabela com todos os registos

### Informações Exibidas:
- Data
- Hora de Entrada
- Hora de Saída
- Horas Trabalhadas
- Status (Presente, Ausente, Falta, Férias, Doença)

### Resumo Mensal:
- Total de dias presente
- Total de faltas
- Total de horas trabalhadas

---

## 🏖️ 4. Minhas Férias

### Estatísticas:
- **Dias Anuais**: Total de dias de férias por ano (padrão: 22 dias)
- **Dias Usados**: Férias já aprovadas e gozadas
- **Saldo Disponível**: Dias restantes para usar

### Gestão de Pedidos:
- ➕ **Novo Pedido**: Solicitar novas férias
  - Data de Início
  - Data de Fim
  - Motivo (opcional)
  - Cálculo automático de dias úteis

### Histórico de Pedidos:
- Visualização de todos os pedidos (aprovados, pendentes, rejeitados)
- Status com badges coloridos
- Data de solicitação

---

## 💰 5. Recibos de Vencimento

### Listagem:
- Grid com todos os recibos processados
- Filtrado automaticamente para o colaborador logado

### Informações por Recibo:
- Mês/Ano
- Salário Base
- Bónus
- Deduções (IRT, INSS)
- Total Líquido

### Ações:
- 👁️ **Ver Detalhes**: Modal com recibo formatado
  - Layout profissional tipo recibo real
  - Discriminação completa de valores
  - Data de processamento
- 📥 **Download PDF**: Exportar recibo (em desenvolvimento)

### Detalhes do Recibo:
```
=================================
    RECIBO DE VENCIMENTO
=================================
Mês/Ano: 12/2024
Colaborador: João Silva

Salário Base:        1.200,00 €
Bónus:             +   100,00 €
Deduções:          -   200,00 €
─────────────────────────────────
TOTAL LÍQUIDO:       1.100,00 €
=================================
```

---

## ⭐ 6. Minhas Avaliações

### Listagem:
- Todas as avaliações de desempenho recebidas
- Ordenadas por data (mais recentes primeiro)

### Informações por Avaliação:
- Data da Avaliação
- Nome do Avaliador (gestor)
- Classificação (1-5 estrelas) com visualização ⭐⭐⭐⭐⭐

### Ver Detalhes:
- 📝 **Feedback**: Comentários e observações do avaliador
- 🎯 **Objetivos**: Metas definidas para o próximo período
- Visualização completa em modal formatado

---

## 🔒 Segurança e Privacidade

### Restrições de Acesso:
- ✅ Cada colaborador **APENAS** vê os seus próprios dados
- ✅ Não pode ver assiduidade de outros colaboradores
- ✅ Não pode ver salários de outros
- ✅ Não pode ver avaliações de outros

### Dados Protegidos:
- 🔐 Autenticação obrigatória (JWT Token)
- 🔐 Token expira após 8 horas
- 🔐 Todas as ações são auditadas (logs)
- 🔐 Passwords com bcrypt (hash + salt)

### Permissões:
| Funcionalidade | Visualizar | Editar | Criar |
|----------------|------------|--------|-------|
| Meu Perfil | ✅ | ✅ (telefone) | ❌ |
| Minha Assiduidade | ✅ | ❌ | ✅ (check-in/out) |
| Minhas Férias | ✅ | ❌ | ✅ (pedidos) |
| Meus Recibos | ✅ | ❌ | ❌ |
| Minhas Avaliações | ✅ | ❌ | ❌ |
| Alterar Password | - | ✅ | - |

---

## 📱 Interface do Utilizador

### Design:
- **Menu Lateral** com 6 itens navegáveis
- **Dashboard Inicial** com estatísticas e ações rápidas
- **Grids Responsivos** para visualização de dados
- **Modais** para formulários e detalhes
- **Badges Coloridos** para status
- **Ícones Intuitivos** em todos os módulos

### Cores COPIA GROUP:
- Laranja (#FF8C00) - Ações primárias
- Marrom/Bronze (#8B4513, #A0522D) - Identidade visual
- Verde (#28A745) - Sucesso/Aprovado
- Vermelho (#DC3545) - Erro/Rejeitado
- Azul (#007BFF) - Informação

---

## 🚀 Como Utilizar

### 1. Login:
```
URL: http://localhost:3000
Username: joao.silva
Password: 123456
```

### 2. Navegação:
- Clique nos itens do menu lateral para aceder aos módulos
- Dashboard inicial carrega automaticamente

### 3. Ações Rápidas:
- **Check-in/Check-out**: Clique nos botões no dashboard
- **Solicitar Férias**: Preencha datas no formulário

### 4. Consultar Histórico:
- Use os filtros de Mês/Ano em Assiduidade
- Navegue pelos grids usando scroll

### 5. Ver Detalhes:
- Clique no ícone 👁️ para ver detalhes completos
- Modais abrem com informações formatadas

---

## 🔧 Arquivos Implementados

### Frontend:
- `frontend/user-dashboard.html` - Dashboard principal do utilizador
- `frontend/js/user-modules.js` - **NOVO** - Módulos de Perfil, Assiduidade, Férias, Recibos, Avaliações

### Backend (já existente):
- `backend/routes/auth.routes.js` - Login
- `backend/routes/employees.routes.js` - Dados do colaborador
- `backend/routes/attendance.routes.js` - Assiduidade e férias
- `backend/routes/payroll.routes.js` - Recibos de vencimento
- `backend/routes/performance.routes.js` - Avaliações
- `backend/routes/users.routes.js` - Alterar password

---

## 📊 Estatísticas

### Total de Funcionalidades: **25+**

1. Dashboard com 3 estatísticas
2. Check-in/Check-out
3. Solicitar férias
4. Visualizar perfil
5. Editar telefone
6. Alterar password
7. Ver assiduidade mensal
8. Filtrar assiduidade por período
9. Ver resumo mensal de horas
10. Ver saldo de férias
11. Ver pedidos de férias (histórico)
12. Status de pedidos (badges)
13. Ver recibos de vencimento
14. Ver detalhes de recibo
15. Download PDF de recibo (TODO)
16. Ver avaliações de desempenho
17. Ver detalhes de avaliação
18. Ver feedback do gestor
19. Ver objetivos definidos
20. Classificação por estrelas
21. Navegação entre módulos
22. Auto-refresh de dados
23. Logout seguro
24. Avatar com inicial do nome
25. Data/hora em tempo real

---

## ✅ Checklist de Teste

### Teste Completo:
- [ ] Login com utilizador regular (joao.silva / 123456)
- [ ] Ver dashboard inicial com estatísticas
- [ ] Registar entrada (check-in)
- [ ] Registar saída (check-out)
- [ ] Solicitar férias com datas
- [ ] Navegar para "Meu Perfil"
- [ ] Editar número de telefone
- [ ] Alterar password
- [ ] Navegar para "Assiduidade"
- [ ] Filtrar por mês diferente
- [ ] Ver resumo mensal
- [ ] Navegar para "Férias"
- [ ] Ver saldo de férias
- [ ] Ver pedidos anteriores
- [ ] Navegar para "Recibos"
- [ ] Ver detalhes de um recibo
- [ ] Navegar para "Avaliações"
- [ ] Ver detalhes de avaliação
- [ ] Testar logout

---

## 🎯 Próximos Passos (Opcional)

### Melhorias Futuras:
1. **PDF de Recibos**: Implementar geração real de PDFs
2. **Gráficos**: Charts de horas trabalhadas por mês
3. **Notificações**: Alertas de férias aprovadas
4. **Upload de Documentos**: Anexar comprovantes
5. **Chat com RH**: Suporte direto
6. **Mobile App**: Versão para smartphone

---

© 2025 COPIA GROUP OF COMPANIES S.A.
Sistema de Gestão de RH - Portal do Colaborador
