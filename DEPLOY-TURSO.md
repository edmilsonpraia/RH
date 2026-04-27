# Deploy com Turso (BD persistente na Vercel)

Guia rápido para fazer o deploy do Sistema RH com base de dados Turso.

## Porquê Turso?

A Vercel é serverless. Cada função tem um filesystem `/tmp` que é descartado a cada cold start. SQLite local **não persiste** dados entre invocações. Turso é SQLite-as-a-service: continua a ser SQLite mas remoto e persistente.

**Free tier**: 500 BDs, 9 GB armazenamento, 1 bilião de leituras/mês.

## Setup (10 minutos)

### 1. Criar conta Turso

```bash
# Instalar CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login (abre browser)
turso auth login
```

Ou via web: https://turso.tech → Sign up.

### 2. Criar a base de dados

```bash
turso db create rh-copia
turso db show rh-copia --url        # copia o URL
turso db tokens create rh-copia     # copia o token
```

Vais obter algo como:
- URL: `libsql://rh-copia-edmilsonpraia.turso.io`
- Token: `eyJhbGciOiJFZERTQS...`

### 3. Configurar localmente

Adicionar ao ficheiro `.env`:

```
TURSO_DATABASE_URL=libsql://rh-copia-xxxxx.turso.io
TURSO_AUTH_TOKEN=eyJhbGc...
```

### 4. Sincronizar dados locais para o Turso

```bash
node backend/scripts/sync_to_turso.js
```

Output esperado:
```
Origem: C:\Users\user\Desktop\RH\backend\db\hr.db
Destino: libsql://rh-copia-xxxxx.turso.io

A garantir schema no Turso...
✓ Tabelas verificadas/migradas

A copiar dados:
  users: 2 linhas copiadas
  employees: 162 linhas copiadas
  ...
✓ Concluido. 164 linhas sincronizadas.
```

### 5. Configurar a Vercel

No dashboard Vercel → Project Settings → Environment Variables:

| Nome | Valor |
|------|-------|
| `TURSO_DATABASE_URL` | `libsql://rh-copia-xxxxx.turso.io` |
| `TURSO_AUTH_TOKEN` | `eyJhbGc...` (token completo) |
| `JWT_SECRET` | (gerar novo: `openssl rand -hex 64`) |

Aplicar a **Production**, **Preview** e **Development**.

### 6. Re-deploy

```bash
git push origin main
```

Ou no dashboard: **Deployments → Redeploy** (sem cache).

## Verificação

Após o deploy, abre `https://teu-projeto.vercel.app/admin-dashboard.html`:
- Total Colaboradores: **162** (em vez de 1)
- Departamentos completos visíveis

## Atualizar dados depois

Sempre que quiseres re-sincronizar a BD local para Turso:

```bash
node backend/scripts/sync_to_turso.js
```

O script faz `DELETE FROM` em todas as tabelas antes de inserir, portanto re-execuções são idempotentes.

## Troubleshooting

**"TURSO_DATABASE_URL nao definido"** → o `.env` não foi carregado. Verificar que está na raiz do projeto.

**"Failed to fetch" no browser** → token expirou ou URL errado. Recriar token: `turso db tokens create rh-copia`.

**Vercel ainda mostra 1 colaborador** → forçar redeploy sem cache. As env vars só são aplicadas a builds novos.
