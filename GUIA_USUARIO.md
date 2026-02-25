# 👤 Guia do Usuário Comum - Portal do Colaborador

## 📖 Visão Geral

O **Portal do Colaborador** é a interface de auto-serviço onde os colaboradores da COPIA GROUP podem:
- ✅ Ver seus próprios dados
- 🕐 Registar entrada e saída
- 🏖️ Solicitar férias
- 💰 Consultar recibos de vencimento
- ⭐ Ver avaliações de desempenho

## 🔐 Como Criar um Usuário para Colaborador

### Passo 1: Criar o Colaborador (Admin)
1. Faça login como **admin**
2. Aceda ao módulo **"Colaboradores"**
3. Clique em **"➕ Novo Colaborador"**
4. Preencha todos os dados:
   - Nome completo
   - Email
   - Telefone
   - Cargo
   - Departamento
   - Salário
   - Data de admissão

### Passo 2: Criar o Utilizador (Admin)
1. No menu lateral, clique em **"🔐 Utilizadores"**
2. Clique em **"➕ Criar Utilizador"**
3. Selecione o colaborador da lista
4. Crie um **username** (recomendado: nome.sobrenome)
5. Defina uma **password inicial** (mínimo 6 caracteres)
6. Confirme a password
7. Clique em **"Criar Utilizador"**

### Passo 3: Entregar as Credenciais
Após criar o utilizador, aparecerá um modal com as credenciais. **Guarde essas informações:**

```
URL do Sistema: http://localhost:3000
Username: joao.silva
Password: senha123
```

**⚠️ Importante:** O colaborador deve alterar a password no primeiro login!

## 🚀 Como o Usuário Acede ao Sistema

### 1. Abrir o Sistema
- Aceda a: **http://localhost:3000**
- Verá a página de login da COPIA GROUP

### 2. Fazer Login
- Insira o **username** fornecido pelo admin
- Insira a **password** inicial
- Clique em **"Entrar"**
- Será redirecionado para o **Portal do Colaborador**

## 🏠 Portal do Colaborador - Funcionalidades

### Dashboard Inicial
Ao fazer login, o colaborador vê:

**Estatísticas:**
- 🕐 Estado Hoje (Presente/Não Registado)
- 📅 Dias de Férias disponíveis
- ⏱️ Horas trabalhadas este mês

**Ações Rápidas:**
- ✓ Registar Entrada
- ✗ Registar Saída
- 🏖️ Solicitar Férias

**Meus Dados:**
- Nome, Email, Cargo
- Departamento, Data de Admissão
- Telefone

### 📋 Menu Lateral

#### 1. 🏠 Início
- Visão geral do colaborador
- Estatísticas pessoais
- Ações rápidas

#### 2. 👤 Meu Perfil
- Visualizar dados pessoais completos
- Informações de contato
- Histórico na empresa

#### 3. 🕐 Assiduidade
**Registar Entrada:**
1. Ao chegar ao trabalho, clique em **"✓ Registar Entrada"**
2. O sistema regista a hora automaticamente
3. Aparece mensagem de confirmação

**Registar Saída:**
1. Ao sair, clique em **"✗ Registar Saída"**
2. O sistema calcula as horas trabalhadas
3. Mostra total de horas do dia

**Visualizar Histórico:**
- Ver todos os registos do mês
- Check-in e check-out de cada dia
- Total de horas trabalhadas

#### 4. 🏖️ Férias
**Solicitar Férias:**
1. Clique em **"🏖️ Solicitar Férias"**
2. Selecione **Data de Início**
3. Selecione **Data de Fim**
4. (Opcional) Adicione um motivo
5. Clique em **"Enviar Pedido"**

**Acompanhar Pedidos:**
- Ver todos os pedidos enviados
- Status: Pendente, Aprovado ou Rejeitado
- Dias solicitados e período
- Saldo de férias atualizado

#### 5. 💰 Recibos de Vencimento
- Consultar recibos mensais
- Ver salário base, bónus e deduções
- Salário líquido
- Histórico de pagamentos

#### 6. ⭐ Avaliações
- Ver avaliações de desempenho
- Feedback dos supervisores
- Rating (1-5 estrelas)
- Objetivos definidos

## 🎯 Casos de Uso Comuns

### Cenário 1: Primeiro Dia de Trabalho
```
1. Recebe credenciais do RH
2. Acede a http://localhost:3000
3. Faz login com username e password fornecidos
4. Explora o portal
5. (Recomendado) Altera a password
6. Regista entrada no trabalho
```

### Cenário 2: Dia Normal de Trabalho
```
Manhã:
- Chega ao trabalho
- Abre o portal
- Clica em "Registar Entrada"

Tarde:
- Antes de sair, abre o portal
- Clica em "Registar Saída"
- Sistema mostra horas trabalhadas
```

### Cenário 3: Solicitar Férias
```
1. Abre o portal
2. Menu lateral > "Férias"
3. Clica em "Solicitar Férias"
4. Data início: 01/03/2025
5. Data fim: 15/03/2025
6. Motivo: "Férias anuais"
7. Envia pedido
8. Aguarda aprovação do admin
9. Recebe notificação do status
```

### Cenário 4: Consultar Recibo
```
1. Abre o portal
2. Menu lateral > "Recibos de Vencimento"
3. Seleciona mês/ano desejado
4. Visualiza recibo com:
   - Salário base
   - Bónus (se houver)
   - Deduções (11%)
   - Salário líquido
```

## ⚙️ Configurações e Dicas

### Alterar Password
1. Menu lateral > "Meu Perfil"
2. Secção "Alterar Password"
3. Password atual
4. Nova password (mínimo 6 caracteres)
5. Confirmar nova password
6. Salvar alterações

### Dicas de Uso
✅ **Registe entrada/saída diariamente** para controle correto de horas
✅ **Solicite férias com antecedência** (mínimo 15 dias)
✅ **Verifique o saldo de férias** antes de solicitar
✅ **Consulte recibos regularmente** para verificar pagamentos
✅ **Guarde sua password em local seguro**

### Troubleshooting

**Problema:** Esqueci minha password
- **Solução:** Contacte o RH/Admin para resetar

**Problema:** Não consigo registar entrada (já registado hoje)
- **Solução:** Verifique se já registou entrada. Só pode registar uma vez por dia.

**Problema:** Erro ao solicitar férias
- **Solução:** Verifique se as datas estão corretas e se tem saldo suficiente.

**Problema:** Não vejo meus recibos
- **Solução:** O admin precisa processar a folha de pagamento do mês primeiro.

## 🔒 Segurança e Privacidade

### O que o Usuário PODE fazer:
✅ Ver apenas seus próprios dados
✅ Registar sua própria assiduidade
✅ Solicitar suas próprias férias
✅ Consultar seus próprios recibos
✅ Ver suas próprias avaliações
✅ Alterar sua própria password

### O que o Usuário NÃO PODE fazer:
❌ Ver dados de outros colaboradores
❌ Aprovar/rejeitar férias
❌ Editar informações de perfil (só admin)
❌ Processar folha de pagamento
❌ Criar/editar/eliminar colaboradores
❌ Aceder a relatórios gerais
❌ Ver logs de auditoria

## 📱 Interface do Portal

### Design
- **Estilo profissional** tipo C#/Windows Forms
- **Cores corporativas** da COPIA GROUP (marrom, bronze, laranja)
- **Menu lateral fixo** com ícones
- **Dashboard limpo** e organizado
- **Cards informativos** com estatísticas
- **Botões grandes** e fáceis de usar

### Navegação
- Menu lateral sempre visível
- Clique no item do menu para mudar de página
- Botão "Sair" no rodapé do menu
- Nome e avatar do utilizador sempre visível

## 📞 Suporte

**Precisa de ajuda?**
- Contacte o departamento de RH
- Email: rh@copiagroup.com
- Extensão: 1234

**Problemas técnicos:**
- Contacte o departamento de TI
- Email: ti@copiagroup.com
- Extensão: 5678

---

## 📊 Resumo: Admin vs Usuário

| Funcionalidade | Admin | Usuário |
|---------------|-------|---------|
| Ver todos colaboradores | ✅ | ❌ |
| Ver próprios dados | ✅ | ✅ |
| Criar/Editar colaboradores | ✅ | ❌ |
| Criar utilizadores | ✅ | ❌ |
| Registar assiduidade | ✅ | ✅ (própria) |
| Aprovar férias | ✅ | ❌ |
| Solicitar férias | ✅ | ✅ |
| Processar folha pagamento | ✅ | ❌ |
| Consultar recibos | ✅ (todos) | ✅ (próprios) |
| Criar avaliações | ✅ | ❌ |
| Ver avaliações | ✅ (todas) | ✅ (próprias) |
| Relatórios gerais | ✅ | ❌ |
| Logs de auditoria | ✅ | ❌ |

---

© 2025 COPIA GROUP OF COMPANIES S.A.
