# 💬 Monitor de Chat — Google Chat

Painel que espelha em tempo real todas as mensagens enviadas nos espaços do **Google Chat**, sem bot e sem interação com o usuário.

### 🔗 [Ver dashboard ao vivo →](https://chat-monitor.netlify.app/)

> O dashboard possui um **modo demonstração** com dados fictícios — basta clicar em *Ver demonstração* para explorar a interface sem precisar de backend.

---

## ✨ Funcionalidades

| Recurso | Descrição |
|---|---|
| **Feed em tempo real** | Mensagens aparecem automaticamente, atualização a cada 10 segundos |
| **Espaços automáticos** | Sidebar detecta e lista os espaços do Google Chat sozinha |
| **Destaque de novas** | Mensagens recém-chegadas aparecem marcadas por alguns segundos |
| **Busca integrada** | Filtra por nome, e-mail ou conteúdo da mensagem |
| **Monitoramento silencioso** | O app não responde nada no chat — apenas observa e registra |
| **Exportação CSV** | Baixa todo o histórico de mensagens em um clique |

---

## 🛠 Stack

**Backend:** Python 3.11 · Google Cloud Functions · Firestore
**Frontend:** React 18 · Tailwind CSS · Bootstrap Icons · Day.js
**Hospedagem:** Netlify (dashboard) · Google Cloud (backend)

---

## 🗂 Estrutura

```
chat-monitor/
├── src/
│   ├── main.py      # Webhook do Google Chat + API de mensagens
│   └── banco.py     # Persistência no Firestore
├── dashboard/
│   ├── index.html   # Dashboard React + Tailwind
│   ├── _redirects   # Proxy Netlify → Cloud Function
│   └── netlify.toml # Headers de segurança
└── requirements.txt
```

---

## 🚀 Deploy

<details>
<summary><strong>1. Criar projeto e ativar APIs</strong></summary>

```bash
gcloud projects create meu-chat-monitor
gcloud config set project meu-chat-monitor

gcloud services enable \
  cloudfunctions.googleapis.com \
  chat.googleapis.com \
  firestore.googleapis.com

gcloud firestore databases create --region=southamerica-east1
```
</details>

<details>
<summary><strong>2. Deploy da Cloud Function</strong></summary>

```bash
cd src

gcloud functions deploy monitor_chat \
  --gen2 --runtime=python311 \
  --region=southamerica-east1 \
  --entry-point=monitor_chat \
  --trigger-http --allow-unauthenticated \
  --memory=256Mi --timeout=30s
```

Anote a URL exibida ao final.
</details>

<details>
<summary><strong>3. Registrar o app no Google Chat</strong></summary>

1. `console.cloud.google.com` → **Google Chat API** → Configuração
2. Nome: **Monitor de Chat** · URL do app: URL da Cloud Function
3. Ative **Receber mensagens em espaços** · Visibilidade: seu domínio
4. Adicione o app nos espaços que deseja monitorar
</details>

<details>
<summary><strong>4. Dashboard no Netlify</strong></summary>

1. Edite `dashboard/_redirects` substituindo `SEU-PROJETO` pela URL real
2. [app.netlify.com](https://app.netlify.com) → *Add new site* → *Deploy manually*
3. Arraste a pasta `dashboard/`
4. Cole a URL da Cloud Function no campo de configuração do dashboard
</details>

---

## ⚙️ Variáveis de ambiente

| Variável | Descrição | Obrigatória |
|---|---|:---:|
| `DASHBOARD_ORIGIN` | Origem CORS permitida (padrão `*`) | ⬜ |

---

## 🔌 Endpoints da API

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/` | Webhook do Google Chat — salva a mensagem no Firestore |
| `GET` | `/mensagens` | Lista mensagens — filtros: `espaco`, `email`, `limite` |

---

## 📄 Licença

MIT
