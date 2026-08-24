# 🤖 Agente de Classificação de Chamados

Sistema de suporte técnico integrado ao **Google Chat** e **WhatsApp** com classificação automática de chamados e dashboard web em tempo real.

### 🔗 [Ver dashboard ao vivo →](https://agente-chamados.netlify.app/)

> O dashboard possui um **modo demonstração** com dados fictícios — basta clicar em *Ver demonstração* para explorar a interface sem precisar de backend.

---

## ✨ Funcionalidades

| Recurso | Descrição |
|---|---|
| **Classificação automática** | Todo chamado é classificado como 🟢 Fácil · 🟡 Médio · 🔴 Difícil · 🚨 Urgente |
| **Diagnóstico prévio** | Identifica o tipo de problema por palavras-chave e sugere ações imediatas ao usuário |
| **Multicanal** | Recebe chamados via Google Chat e WhatsApp (Twilio) simultaneamente |
| **Redirecionamento** | Botão no chat leva o usuário direto ao espaço da equipe de infraestrutura |
| **Alertas urgentes** | Notificação automática por e-mail e webhook para chamados críticos |
| **Dashboard** | Filtros por classificação, status e canal · busca · exportação CSV |

---

## 🔍 Categorias de diagnóstico

O agente detecta automaticamente 10 categorias de problema e entrega orientações imediatas ao usuário enquanto o chamado aguarda atendimento:

🔑 Acesso · 🐢 Lentidão · ⚠️ Erro no sistema · 🖥️ Servidor · 🖨️ Impressão · 📧 E-mail · 💾 Software · 🌐 Rede · 💾 Backup · 💻 Hardware

As palavras-chave e mensagens de cada categoria são totalmente editáveis no dicionário `DIAGNOSTICOS` em `src/agente.py`.

---

## 🛠 Stack

**Backend:** Python 3.11 · Google Cloud Functions · Firestore · Twilio
**Frontend:** React 18 · Tailwind CSS · Bootstrap Icons · Day.js
**Hospedagem:** Netlify (dashboard) · Google Cloud (backend)

---

## 🗂 Estrutura

```
agente-chamados/
├── src/
│   ├── main.py           # Webhook unificado — Google Chat, WhatsApp e API
│   ├── agente.py         # Classificação + diagnóstico por palavras-chave
│   ├── banco.py          # Persistência no Firestore
│   └── notificacoes.py   # Alertas de chamados urgentes
├── dashboard/
│   ├── index.html        # Dashboard React + Tailwind
│   ├── _redirects        # Proxy Netlify → Cloud Function
│   └── netlify.toml      # Headers de segurança
└── requirements.txt
```

---

## 🚀 Deploy

<details>
<summary><strong>1. Criar projeto e ativar APIs</strong></summary>

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
</details>

<details>
<summary><strong>2. Guardar segredos</strong></summary>

```bash
echo -n "SUA_CHAVE_LLM"   | gcloud secrets create ANTHROPIC_API_KEY   --data-file=-
echo -n "seu@email.com"   | gcloud secrets create EMAIL_REMETENTE     --data-file=-
echo -n "senha-app-gmail" | gcloud secrets create EMAIL_SENHA         --data-file=-
echo -n "plantao@emp.com" | gcloud secrets create EMAIL_URGENTE       --data-file=-
echo -n "https://chat.google.com/room/…" | gcloud secrets create LINK_INFRAESTRUTURA --data-file=-

# Opcional — WhatsApp via Twilio
echo -n "ACxxxx"          | gcloud secrets create TWILIO_ACCOUNT_SID  --data-file=-
echo -n "auth_token"      | gcloud secrets create TWILIO_AUTH_TOKEN   --data-file=-
echo -n "whatsapp:+1415…" | gcloud secrets create TWILIO_WHATSAPP_NUM --data-file=-
```
</details>

<details>
<summary><strong>3. Deploy da Cloud Function</strong></summary>

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
</details>

<details>
<summary><strong>4. Registrar o bot no Google Chat</strong></summary>

1. `console.cloud.google.com` → **Google Chat API** → Configuração
2. Nome: **Suporte TI** · URL do app: URL da Cloud Function
3. Ative **Receber mensagens diretas** · Visibilidade: seu domínio Workspace
</details>

<details>
<summary><strong>5. WhatsApp via Twilio</strong></summary>

No painel Twilio → *Messaging* → *Sandbox* → **When a message comes in**:
```
https://SUA-URL.cloudfunctions.net/webhook_chamados/whatsapp
```
</details>

<details>
<summary><strong>6. Dashboard no Netlify</strong></summary>

1. Edite `dashboard/_redirects` substituindo `SEU-PROJETO` pela URL real
2. [app.netlify.com](https://app.netlify.com) → *Add new site* → *Deploy manually*
3. Arraste a pasta `dashboard/`
4. Cole a URL da Cloud Function no campo de configuração do dashboard
</details>

---

## ⚙️ Variáveis de ambiente

| Variável | Descrição | Obrigatória |
|---|---|:---:|
| `ANTHROPIC_API_KEY` | Chave da API de linguagem | ✅ |
| `EMAIL_REMETENTE` | E-mail remetente dos alertas | ✅ |
| `EMAIL_SENHA` | Senha de app do Gmail | ✅ |
| `EMAIL_URGENTE` | E-mail(s) da equipe de plantão | ✅ |
| `LINK_INFRAESTRUTURA` | URL do espaço Google Chat da infra | ✅ |
| `TWILIO_ACCOUNT_SID` | Account SID do Twilio | ⬜ |
| `TWILIO_AUTH_TOKEN` | Auth token do Twilio | ⬜ |
| `TWILIO_WHATSAPP_NUM` | Número WhatsApp do Twilio | ⬜ |
| `DASHBOARD_ORIGIN` | Origem CORS permitida (padrão `*`) | ⬜ |

---

## 🔌 Endpoints da API

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/` | Webhook do Google Chat |
| `POST` | `/whatsapp` | Webhook do Twilio (WhatsApp) |
| `GET` | `/chamados` | Lista chamados — filtros: `classificacao`, `status`, `canal`, `limite` |
| `PATCH` | `/chamados` | Atualiza status de um chamado |

---

## 📄 Licença

MIT
