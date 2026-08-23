"""
Google Cloud Function — Webhook unificado v5
  POST /              → Google Chat webhook
  POST /whatsapp      → WhatsApp (Twilio) webhook
  GET  /chamados      → Dashboard API — listar chamados
  PATCH /chamados     → Dashboard API — atualizar status
  OPTIONS *           → CORS preflight
"""

import json
import os
import functions_framework
from urllib.parse import parse_qs

from agente import classificar_chamado, formatar_resposta_chat, formatar_resposta_whatsapp
from notificacoes import notificar_urgente
from banco import salvar_chamado, buscar_chamados, atualizar_status

DASHBOARD_ORIGIN = os.environ.get("DASHBOARD_ORIGIN", "*")

# ── Twilio ────────────────────────────────────────────────────────────
TWILIO_ACCOUNT_SID  = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN   = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_WHATSAPP_NUM = os.environ.get("TWILIO_WHATSAPP_NUM", "whatsapp:+14155238886")


def _cors(body, status=200, ct="application/json"):
    return (body, status, {
        "Access-Control-Allow-Origin":  DASHBOARD_ORIGIN,
        "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Content-Type": ct,
    })


def _twiml(mensagem: str):
    """Resposta TwiML para o Twilio/WhatsApp."""
    safe = mensagem.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    xml = f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>{safe}</Message></Response>'
    return (xml, 200, {
        "Content-Type": "text/xml",
        "Access-Control-Allow-Origin": "*"
    })


@functions_framework.http
def webhook_chamados(request):
    if request.method == "OPTIONS":
        return _cors("", 204)

    path = request.path.rstrip("/")

    # ── WhatsApp ──────────────────────────────────────────────────────
    if path == "/whatsapp":
        if request.method != "POST":
            return _cors(json.dumps({"erro": "Método não permitido"}), 405)

        body   = request.get_data(as_text=True)
        params = {k: v[0] for k, v in parse_qs(body).items()}

        texto  = params.get("Body", "").strip()
        nome   = params.get("ProfileName", "")
        numero = params.get("From", "").replace("whatsapp:", "")

        if not texto:
            return _twiml("Olá! Descreva sua solicitação de suporte e iremos atendê-la.")

        resultado = classificar_chamado(texto)

        salvar_chamado({
            "texto_original":  texto,
            "classificacao":   resultado["classificacao"],
            "resumo":          resultado["resumo"],
            "remetente_nome":  nome,
            "remetente_email": "",
            "remetente_fone":  numero,
            "canal":           "whatsapp",
            "motivo":          resultado["motivo"],
            "tempo_estimado":  resultado["tempo_estimado"],
            "proximos_passos": resultado["proximos_passos"],
            "diagnostico":     resultado["diagnostico_kw"]["categoria"] if resultado.get("diagnostico_kw") else "",
        })

        if resultado["classificacao"] == "URGENTE":
            notificar_urgente(resultado, nome, numero, texto)

        return _twiml(formatar_resposta_whatsapp(resultado, nome))

    # ── Dashboard API ─────────────────────────────────────────────────
    if request.method == "GET" and path == "/chamados":
        classificacao = request.args.get("classificacao")
        status        = request.args.get("status")
        canal         = request.args.get("canal")
        limite        = int(request.args.get("limite", 100))

        chamados = buscar_chamados(classificacao=classificacao, status=status, canal=canal, limite=limite)

        for c in chamados:
            for campo in ("criado_em", "atualizado_em"):
                if campo in c and hasattr(c[campo], "isoformat"):
                    c[campo] = c[campo].isoformat()

        return _cors(json.dumps({"chamados": chamados, "total": len(chamados)}, ensure_ascii=False))

    if request.method == "PATCH" and path == "/chamados":
        body       = request.get_json(silent=True) or {}
        doc_id     = body.get("id")
        novo_status = body.get("status")

        if not doc_id or not novo_status:
            return _cors(json.dumps({"erro": "Campos 'id' e 'status' são obrigatórios"}), 400)
        if novo_status not in ("aberto", "andamento", "resolvido"):
            return _cors(json.dumps({"erro": "Status inválido"}), 400)

        atualizar_status(doc_id, novo_status)
        return _cors(json.dumps({"ok": True, "id": doc_id, "status": novo_status}))

    # ── Google Chat ───────────────────────────────────────────────────
    if request.method != "POST":
        return _cors(json.dumps({"erro": "Método não permitido"}), 405)

    try:
        evento = request.get_json(silent=True)
    except Exception:
        return _cors(json.dumps({"erro": "JSON inválido"}), 400)

    if not evento:
        return _cors(json.dumps({"erro": "Payload vazio"}), 400)

    tipo   = evento.get("type", "")
    sender = evento.get("message", {}).get("sender", {})

    if sender.get("type") == "BOT":
        return _cors(json.dumps({"text": ""}))

    if tipo == "ADDED_TO_SPACE":
        return _cors(json.dumps({
            "text": (
                "👋 Olá! Sou o *Agente de Classificação de Chamados*.\n\n"
                "Envie sua solicitação e vou classificá-la automaticamente como:\n"
                "🟢 Fácil · 🟡 Médio · 🔴 Difícil · 🚨 Urgente\n\n"
                "Pode começar!"
            )
        }))

    if tipo == "MESSAGE":
        mensagem  = evento.get("message", {})
        texto     = mensagem.get("text", "").strip()
        nome      = sender.get("displayName", "")
        email     = sender.get("email", "")
        space     = evento.get("space", {}).get("name", "")
        thread    = mensagem.get("thread", {}).get("name", "")

        if not texto:
            return _cors(json.dumps({"text": "Não consegui ler sua mensagem. Tente novamente."}))

        resultado = classificar_chamado(texto)

        salvar_chamado({
            "texto_original":  texto,
            "classificacao":   resultado["classificacao"],
            "resumo":          resultado["resumo"],
            "remetente_nome":  nome,
            "remetente_email": email,
            "canal":           "google_chat",
            "space":           space,
            "thread":          thread,
            "motivo":          resultado["motivo"],
            "tempo_estimado":  resultado["tempo_estimado"],
            "proximos_passos": resultado["proximos_passos"],
            "diagnostico":     resultado["diagnostico_kw"]["categoria"] if resultado.get("diagnostico_kw") else "",
        })

        if resultado["classificacao"] == "URGENTE":
            notificar_urgente(resultado, nome, email, texto)

        resposta = formatar_resposta_chat(resultado, nome)
        if thread:
            resposta["thread"] = {"name": thread}

        return _cors(json.dumps(resposta, ensure_ascii=False))

    if tipo == "REMOVED_FROM_SPACE":
        return _cors(json.dumps({"text": ""}))

    return _cors(json.dumps({"text": ""}))
