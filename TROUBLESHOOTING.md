# 🔧 Troubleshooting - Funcionalidades Não Aparecem

## Problema: Não vejo as novas funcionalidades mesmo após limpar cache

### ✅ Solução Passo a Passo:

## 1️⃣ **Fechar TODAS as abas do navegador**
```
1. Feche completamente o navegador (Chrome/Edge/Firefox)
2. Não deixe nenhuma aba aberta
3. Aguarde 5 segundos
```

## 2️⃣ **Limpar Cache Profundamente**

### Chrome/Edge:
```
1. Abra o navegador
2. Pressione: Ctrl + Shift + Delete
3. Selecione:
   ☑ Cookies e outros dados do site
   ☑ Imagens e arquivos em cache
   ☑ Dados hospedados de aplicativo
4. Intervalo: "Todo o período"
5. Clique em "Limpar dados"
6. Aguarde completar
7. Feche o navegador novamente
```

### Firefox:
```
1. Ctrl + Shift + Delete
2. Marque tudo
3. Intervalo: "Tudo"
4. Limpar agora
```

## 3️⃣ **Abrir em Modo Anônimo/Privado**
```
Chrome/Edge: Ctrl + Shift + N
Firefox: Ctrl + Shift + P
```

Acesse: http://localhost:3000

## 4️⃣ **Verificar Console do Browser**
```
1. Abra http://localhost:3000
2. Pressione F12 (DevTools)
3. Vá em "Console"
4. Veja se há erros em vermelho
```

### Erros Comuns:
- ❌ `Failed to load resource` → Servidor não está rodando
- ❌ `MODULES.onboarding is not defined` → Script não carregado
- ❌ `SyntaxError` → Erro de sintaxe no JavaScript

## 5️⃣ **Verificar Servidor**
```bash
# No terminal, execute:
curl http://localhost:3000/api/health

# Deve retornar:
{"status":"OK","message":"Sistema de RH COPIA GROUP está a funcionar"...}
```

## 6️⃣ **Forçar Reload de Scripts**

### No DevTools (F12):
```
1. Aba "Network"
2. Marque "Disable cache"
3. Pressione Ctrl + Shift + R (hard reload)
```

## 7️⃣ **Testar Endpoints das Novas Funcionalidades**

### Teste 1: Onboarding
```bash
curl -H "Authorization: Bearer SEU_TOKEN" http://localhost:3000/api/onboarding
```

### Teste 2: Relatórios
```bash
curl http://localhost:3000/api/reports/headcount
```

## 8️⃣ **Verificar se Admin Dashboard está correto**

Acesse: http://localhost:3000/admin-dashboard.html

**Deve ter no menu:**
- 📊 Dashboard
- 👥 Colaboradores
- 🔐 Utilizadores
- 🕐 Assiduidade
- 🏖️ Férias
- 📝 Recrutamento
- 🎯 **Onboarding** ← NOVO
- 💰 Folha de Pagamento
- ⭐ Desempenho
- 📈 Relatórios

## 9️⃣ **Teste Manual - Ver Código Fonte**
```
1. Abra http://localhost:3000/admin-dashboard.html
2. Clique direito > "Ver código fonte da página"
3. Procure (Ctrl+F) por: "onboarding.js"
4. Deve encontrar: <script src="js/onboarding.js"></script>
```

## 🔟 **Reiniciar Servidor Limpo**
```bash
# Parar tudo
taskkill /F /IM node.exe

# Esperar 2 segundos

# Reiniciar
cd c:\Users\user\Desktop\RH
npm start
```

---

## ✅ Checklist de Verificação:

- [ ] Fechei TODAS as abas do browser
- [ ] Limpei cache profundamente
- [ ] Testei em modo anônimo
- [ ] Verifiquei console (F12) sem erros
- [ ] Servidor está rodando (curl http://localhost:3000/api/health)
- [ ] Hard reload (Ctrl + Shift + R)
- [ ] Vi código fonte da página
- [ ] Menu tem "🎯 Onboarding"
- [ ] Testei clicar em "Onboarding" no menu

---

## 🐛 Se AINDA não funciona:

### Verificação Final - Scripts Carregados:

**No Console do Browser (F12 > Console), digite:**
```javascript
console.log(MODULES);
```

**Deve mostrar:**
```javascript
{
  employees: {...},
  users: {...},
  attendance: {...},
  leave: {...},
  recruitment: {...},
  onboarding: {...},     // ← Deve estar aqui
  payroll: {...},
  performance: {...},
  reports: {...}         // ← E aqui
}
```

### Se `onboarding` ou `reports` não aparecer:

**1. Verificar ordem dos scripts:**
```javascript
// No código fonte, deve aparecer ANTES do script inline:
<script src="js/onboarding.js"></script>
<script src="js/reports.js"></script>
```

**2. Testar URL direta:**
- http://localhost:3000/js/onboarding.js
- http://localhost:3000/js/reports.js

Ambos devem mostrar o código JavaScript.

---

## 💡 Solução Rápida (90% dos casos):

```
1. Fechar browser completamente
2. Reiniciar servidor (taskkill /F /IM node.exe && npm start)
3. Abrir browser em modo anônimo (Ctrl+Shift+N)
4. Aceder http://localhost:3000
5. Login como admin
6. Verificar menu lateral
```

---

## 📞 Debug Avançado:

Se nada funcionar, envie estas informações:

1. **Console Errors** (F12 > Console)
2. **Network Tab** (F12 > Network, filtre "js")
3. **Resultado de:** `console.log(MODULES)`
4. **Screenshot do menu lateral**

---

## ✅ Como Saber se Funcionou:

**Menu lateral deve ter 10 itens:**
1. Dashboard
2. Colaboradores
3. Utilizadores
4. Assiduidade
5. Férias
6. Recrutamento
7. **Onboarding** ← Deve aparecer
8. Folha de Pagamento
9. Desempenho
10. Relatórios

**Dashboard deve ter 6 cards:**
1. Total Colaboradores
2. Presentes Hoje
3. Férias Pendentes
4. Candidaturas Ativas
5. **Onboardings Ativos** ← Deve aparecer
6. **Utilizadores Sistema** ← Deve aparecer

**Clicar em "Relatórios" deve mostrar 6 cards:**
1. Headcount
2. Absentismo
3. Custos Salariais
4. Recrutamento
5. Logs de Auditoria
6. Export Completo

---

## 🎯 Teste Definitivo:

**Abra Console (F12) e cole:**
```javascript
// Teste 1: Verificar módulos
console.log('Módulos carregados:', Object.keys(MODULES));

// Teste 2: Testar Onboarding
if (MODULES.onboarding) {
    console.log('✅ Onboarding carregado!');
} else {
    console.log('❌ Onboarding NÃO carregado!');
}

// Teste 3: Testar Reports
if (MODULES.reports && MODULES.reports.load) {
    console.log('✅ Reports carregado!');
} else {
    console.log('❌ Reports NÃO carregado!');
}

// Teste 4: Verificar API
fetch('/api/onboarding')
    .then(r => r.json())
    .then(d => console.log('✅ API Onboarding OK:', d))
    .catch(e => console.log('❌ API Onboarding ERRO:', e));
```

Se todos os testes passarem (✅), o sistema está funcionando!

---

© 2025 COPIA GROUP - Sistema de RH
