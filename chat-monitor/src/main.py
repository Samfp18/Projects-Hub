"""
Monitor de Chat — Google Chat → Firestore → Dashboard
POST /            → webhook Google Chat (salva mensagem)
GET  /mensagens   → retorna mensagens para o dashboard
OPTIONS *         → CORS preflight
"""

import json
import os
import functions_framework
from banco import salvar_mensagem, buscar_mensagens

DASHBOARD_ORIGIN = os.environ.get("DASHBOARD_ORIGIN", "*")


def _cors(body, status=200, ct="application/json"):
    return (body, status, {
        "Access-Control-Allow-Origin":  DASHBOARD_ORIGIN,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": ct,
    })


@functions_framework.http
def monitor_chat(request):
    if request.method == "OPTIONS":
        return _cors("", 204)

    path = request.path.rstrip("/")

    # ── API: buscar mensagens ─────────────────────────────────────────
    if request.method == "GET" and path == "/mensagens":
        espaco  = request.args.get("espaco")
        email   = request.args.get("email")
        limite  = int(request.args.get("limite", 300))

        mensagens = buscar_mensagens(espaco=espaco, email=email, limite=limite)
        for m in mensagens:
            if "recebido_em" in m and hasattr(m["recebido_em"], "isoformat"):
                m["recebido_em"] = m["recebido_em"].isoformat()

        return _cors(json.dumps({"mensagens": mensagens, "total": len(mensagens)}, ensure_ascii=False))

    # ── Webhook Google Chat ───────────────────────────────────────────
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

    # Ignora bots
    if sender.get("type") == "BOT":
        return _cors(json.dumps({"text": ""}))

    if tipo == "MESSAGE":
        mensagem  = evento.get("message", {})
        texto     = mensagem.get("text", "").strip()
        nome      = sender.get("displayName", "Desconhecido")
        email     = sender.get("email", "")
        avatar    = sender.get("avatarUrl", "")
        espaco    = evento.get("space", {}).get("displayName", "")
        espaco_id = evento.get("space", {}).get("name", "")
        thread    = mensagem.get("thread", {}).get("name", "")

        if not texto:
            return _cors(json.dumps({"text": ""}))

        salvar_mensagem({
            "texto":     texto,
            "nome":      nome,
            "email":     email,
            "avatar":    avatar,
            "espaco":    espaco,
            "espaco_id": espaco_id,
            "thread":    thread,
        })

    # Não responde nada — monitoramento silencioso
    return _cors(json.dumps({"text": ""}))
