# SEMPRE ON CELULARES — Site + Backend

Plataforma da assistência técnica de celulares em Taubaté-SP: site institucional, catálogo de serviços, vídeos, orçamento, área do cliente, acompanhamento de ordem de serviço e painel administrativo.

**Frontend:** HTML + CSS + JS (sem frameworks).
**Backend:** Node.js + PostgreSQL (Neon) com o driver `pg`. Requer **Node 18+**. Persistência real e permanente.

## Estrutura

```
├── server.js            # Servidor + API REST
├── db.js                # Conexão PostgreSQL (Neon), migrações e seeds
├── package.json         # Dependência: pg
├── .env                 # DATABASE_URL (não versionar — ver .env.example)
├── index.html           # Página inicial
├── css/style.css        # Estilos
├── js/
│   ├── config.js        # Dados da empresa + WhatsApp
│   ├── servicos.js      # Catálogo base de serviços
│   ├── dados.js         # Dados de demonstração (fallback offline)
│   ├── api.js           # Camada de dados: usa a API real ou fallback demo
│   └── ui.js            # Interface (menu, modais, toasts, animações)
├── pages/               # Páginas internas
├── scripts/
│   └── migrar-sqlite.js # Migra data/sempreon.db (SQLite) para o PostgreSQL
├── assets/img/          # Imagens placeholder
└── data/uploads/        # Fotos enviadas no orçamento
```

O `js/api.js` faz a "ponte": **com o servidor rodando**, usa a API real (login com hash de senha, sessão por cookie httpOnly, dados em PostgreSQL). **Sem servidor** (abrindo `index.html` como arquivo), entra em modo demonstração com dados locais.

---

## 1) Rodar no PC

Pré-requisito: [Node.js 18+](https://nodejs.org).

```
cd C:\Users\Nicolas\Documents\Nicolas Luis\sempre_on_reformulado
npm install
node server.js
```

Abra **http://localhost:8080**. Para encerrar: `Ctrl + C`.

**Banco:** as tabelas são **criadas automaticamente** na primeira subida (migrações em `db.js`). A conexão usa a variável `DATABASE_URL` do ambiente ou do arquivo `.env`.

**Contas atuais (migradas do banco anterior):**

| Perfil | E-mail | Senha |
|---|---|---|
| Administrador | admin@sempreon.com.br | Admin@123 |
| Cliente demo | camila@exemplo.com | demo123 |
| Cliente demo | guilherme@exemplo.com | demo123 |

> Troque a senha do admin depois. As senhas ficam **hash (scrypt) + salt** no banco — nunca em texto puro, nunca no navegador. Sessão é cookie httpOnly.

## 2) Migração do banco antigo (SQLite → PostgreSQL)

Já feita usando:

```
npm install
node scripts/migrar-sqlite.js
```

O script cria as tabelas no Neon (se não existirem), copia os usuários, ordens, sessões, orçamentos e overrides de `data/sempreon.db` e atualiza as sequências (`OS-0005` continua de onde parou). É idempotente (`ON CONFLICT DO NOTHING`): pode rodar de novo que só acrescenta o que faltar. Requer Node 22.5+ (para ler o arquivo SQLite).

## 3) Rodar no celular

Mesma rede Wi-Fi. Rode `node server.js` e abra no navegador do celular o endereço que aparece no terminal (ex.: `http://192.168.15.178:8080`).

## 4) Endpoints da API

| Método | Rota | O que faz |
|---|---|---|
| GET | /api/health | verifica API |
| POST | /api/auth/cadastro | cria conta (hash de senha) |
| POST | /api/auth/login | login → cookie de sessão |
| POST | /api/auth/recuperar | recuperação (dispara e-mail futuramente) |
| GET | /api/auth/me | usuário logado |
| POST | /api/auth/sair | encerra sessão |
| POST | /api/conta/alterar-email | troca o e-mail do usuário logado (exige senha atual) |
| POST | /api/conta/alterar-senha | troca a senha (exige senha atual) |
| POST | /api/conta/redefinir-email | troca e-mail pela tela de login (exige e-mail + senha atuais) |
| POST | /api/conta/redefinir-senha | troca senha pela tela de login (exige e-mail + senha atual) |
| POST | /api/orcamentos | recebe solicitação de orçamento (com até 4 fotos) |
| GET | /api/servicos | overrides de serviços salvos no painel |
| PUT | /api/servicos/:slug | salva edição de serviço (admin) |
| GET | /api/clientes | lista clientes (admin) |
| POST | /api/ordens | cria ordem de serviço (admin; cria cadastro do cliente novo) |
| GET | /api/ordens | todas as ordens (admin) / do usuário (cliente) |
| GET | /api/ordens?me=1 | ordens do usuário logado |
| GET | /api/ordens/:numero | detalhe (dono ou admin) |
| PATCH | /api/ordens/:numero/status | muda status (admin) |
| GET | /api/admin/indicadores | métricas do dashboard (admin) |

## 5) Hospedar

### Com backend de verdade (login e banco) — Render + Neon (gratuito)
O banco já está em produção (PostgreSQL na Neon), então os dados **persistem até em plano grátis**. Só falta subir o site:

1. Crie conta em `https://render.com` e envie o projeto para o GitHub (não inclua `node_modules/`, `.env` e `data/` — o `.gitignore` já cobre).
2. Em Render: **New → Web Service**, escolha o repositório. O **`render.yaml`** já configura tudo (build `npm install`, start `node server.js`, health `/api/health`).
3. Configure a variável de ambiente **`DATABASE_URL`** no painel do Render (o `render.yaml` declara a variável; o valor é preenchido manualmente, igual está no `.env` da sua máquina).
4. Pronto: `https://SEU-SERVICO.onrender.com`.

### Grátis e simples (somente o site / demo)
- **Netlify Drop** (`https://app.netlify.com/drop`): arraste a pasta inteira → link na hora. Sem servidor, o site cai em modo demonstração (login demo, sem banco).

### Com domínio próprio (pagando)
- Hostinger / HostGator: máquina com Node (ou VPS). Envie a pasta, instale o Node, rode `node server.js` com um gerenciador de processos (`pm2`), defina `DATABASE_URL` e aponte o domínio + HTTPS (Let's Encrypt/Certbot). O banco continua na Neon (ou em Postgres do próprio host).

## 6) Configurações do dia a dia

- **WhatsApp / endereço / telefones:** `js/config.js`.
- **Vídeos reais:** painel admin → aba **Vídeos** → cole o ID do YouTube (ex.: `dQw4w9WgXcQ`). Fica salvo no banco.
- **Editar serviços/preços:** painel admin → aba **Serviços**.
- **Criar ordem de serviço:** painel admin → aba **Ordens** → botão **＋ Nova OS** (vincula a um cliente existente pelo e-mail ou cria o cadastro com senha padrão `cliente123`).
- **Orçamento com fotos:** o formulário envia até 4 fotos, compactadas no navegador e salvas em `data/uploads/` (servidas em `/uploads/...`).
- **Trocar e-mail/senha:** Área do cliente → aba **Minha conta**. Valida a senha atual; senhas ficam com hash (scrypt) apenas no servidor.
- **Fotos:** substitua os SVGs em `assets/img/`.

## 7) Roadmap (próximos passos sugeridos)
- Recuperação de senha por e-mail (o endpoint já existe).
- Gerar OS automaticamente a partir de um orçamento aprovado.
- Armazenar fotos do orçamento em um serviço de objetos (S3/R2) em vez de disco local.
- Notificações de mudança de status (WhatsApp/E-mail).