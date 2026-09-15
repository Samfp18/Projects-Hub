# 🤖 Sistema de Classificação de Chamados

Sistema completo de suporte técnico integrado ao **Google Chat** e **WhatsApp**, com classificação automática de chamados e dashboard web em tempo real hospedado no Netlify.

---

## 📦 Projetos

### 1. `agente-chamados/` — Bot de classificação

Bot que recebe chamados via Google Chat e WhatsApp, classifica automaticamente e exibe tudo em um dashboard web.

**Funcionalidades:**
- Classificação automática: 🟢 Fácil · 🟡 Médio · 🔴 Difícil · 🚨 Urgente
- Diagnóstico prévio por palavras-chave (10 categorias)
- Botão de redirecionamento para equipe de infraestrutura
- Suporte a Google Chat e WhatsApp (Twilio)
- Alertas por e-mail para chamados urgentes
- Dashboard web com filtros, busca e exportação CSV

**Stack:** Python 3.11 · Google Cloud Functions · Firestore · Twilio · React + Tailwind

---

### 2. `chat-monitor/` — Monitor de mensagens do Google Chat

Espelha todas as mensagens do Google Chat em um dashboard em tempo real.

**Funcionalidades:**
- Feed de mensagens em tempo real (atualiza a cada 10s)
- Filtro por espaço do Google Chat
- Busca por nome, e-mail ou conteúdo
- Destaque visual para mensagens novas
- Exportação CSV

**Stack:** Python 3.11 · Google Cloud Functions · Firestore · React + Tailwind

---

## 🚀 Deploy rápido

### Pré-requisitos
- Conta Google Cloud com faturamento ativado
- `gcloud` CLI instalado e autenticado
- Chave de API LLM (variável `ANTHROPIC_API_KEY`)
- Conta Twilio com WhatsApp habilitado (opcional)

### 1. Criar projeto e ativar APIs
```bash
gcloud projects create meu-agente-chamados
gcloud config set project meu-agente-chamados

gcloud services enable \
  cloudfunctions.googleapis.com \
  chat.googleapis.com \
  firestore.googleapis.com \
  secretmanager.googleapis.com

gcloud firestore databases create --region=southamerica-east1
```

### 2. Guardar segredos
```bash
echo -n "SUA_CHAVE_LLM"    | gcloud secrets create ANTHROPIC_API_KEY --data-file=-
echo -n "seu@email.com"    | gcloud secrets create EMAIL_REMETENTE    --data-file=-
echo -n "senha-app-gmail"  | gcloud secrets create EMAIL_SENHA        --data-file=-
echo -n "plantao@emp.com"  | gcloud secrets create EMAIL_URGENTE      --data-file=-

# Opcional — WhatsApp
echo -n "ACxxxx"           | gcloud secrets create TWILIO_ACCOUNT_SID  --data-file=-
echo -n "auth_token"       | gcloud secrets create TWILIO_AUTH_TOKEN   --data-file=-
echo -n "whatsapp:+1415…"  | gcloud secrets create TWILIO_WHATSAPP_NUM --data-file=-

# Link do espaço Google Chat da equipe de infra
echo -n "https://chat.google.com/room/…" | gcloud secrets create LINK_INFRAESTRUTURA --data-file=-
```

### 3. Deploy — Agente de Chamados
```bash
cd src

gcloud functions deploy webhook_chamados \
  --gen2 --runtime=python311 \
  --region=southamerica-east1 \
  --entry-point=webhook_chamados \
  --trigger-http --allow-unauthenticated \
  --set-secrets=ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest,\
EMAIL_REMETENTE=EMAIL_REMETENTE:latest,\
EMAIL_SENHA=EMAIL_SENHA:latest,\
EMAIL_URGENTE=EMAIL_URGENTE:latest,\
LINK_INFRAESTRUTURA=LINK_INFRAESTRUTURA:latest,\
TWILIO_ACCOUNT_SID=TWILIO_ACCOUNT_SID:latest,\
TWILIO_AUTH_TOKEN=TWILIO_AUTH_TOKEN:latest,\
TWILIO_WHATSAPP_NUM=TWILIO_WHATSAPP_NUM:latest \
  --memory=256Mi --timeout=60s
```

### 4. Dashboard no Netlify
1. Edite `dashboard/_redirects` substituindo `SEU-PROJETO` pela URL real da Cloud Function
2. Acesse [app.netlify.com](https://app.netlify.com) → Add new site → Deploy manually
3. Arraste a pasta `dashboard/`
4. Acesse a URL gerada e cole a URL da Cloud Function no campo de configuração

### 5. Registrar o bot no Google Chat
1. Acesse `console.cloud.google.com` → Google Chat API → Configuração
2. Nome: **Suporte TI** · URL do app: URL da Cloud Function
3. Ative: **Receber mensagens diretas** · Visibilidade: seu domínio

### WhatsApp (Twilio)
Configure o webhook no painel Twilio:
```
Messaging → Sandbox → When a message comes in:
https://SUA-URL.cloudfunctions.net/webhook_chamados/whatsapp
```

---

## 🗂 Estrutura de arquivos

```
├── src/
│   ├── main.py           # Webhook unificado (Google Chat + WhatsApp + API)
│   ├── agente.py         # Classificação + diagnóstico por palavras-chave
│   ├── banco.py          # Firestore
│   └── notificacoes.py   # Alertas de urgente
├── dashboard/
│   ├── index.html        # Dashboard React + Tailwind
│   ├── _redirects        # Proxy Netlify → Cloud Function
│   └── netlify.toml
└── requirements.txt
```

---

## ⚙️ Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `ANTHROPIC_API_KEY` | Chave da API de linguagem |
| `EMAIL_REMETENTE` | E-mail remetente dos alertas |
| `EMAIL_SENHA` | Senha de app do Gmail |
| `EMAIL_URGENTE` | E-mail(s) da equipe de plantão |
| `LINK_INFRAESTRUTURA` | URL do espaço Google Chat da infra |
| `TWILIO_ACCOUNT_SID` | Account SID do Twilio (WhatsApp) |
| `TWILIO_AUTH_TOKEN` | Auth token do Twilio |
| `TWILIO_WHATSAPP_NUM` | Número WhatsApp do Twilio |
| `DASHBOARD_ORIGIN` | Origem CORS permitida (padrão: `*`) |

---

## 📄 Licença

MIT — livre para uso, modificação e distribuição.
