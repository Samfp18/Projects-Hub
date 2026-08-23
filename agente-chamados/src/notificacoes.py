"""
Notificações — Chamados URGENTES
Envia alertas por e-mail, Slack e Google Chat de plantão.
"""

import os
import json
import smtplib
import urllib.request
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

EMAIL_REMETENTE      = os.environ.get("EMAIL_REMETENTE", "")
EMAIL_SENHA          = os.environ.get("EMAIL_SENHA", "")
EMAIL_DESTINOS       = [e for e in os.environ.get("EMAIL_URGENTE", "").split(",") if e]
WEBHOOK_SLACK        = os.environ.get("WEBHOOK_SLACK", "")
WEBHOOK_CHAT_URGENTE = os.environ.get("WEBHOOK_CHAT_URGENTE", "")


def notificar_urgente(resultado: dict, nome: str, contato: str, texto_original: str):
    print(f"[URGENTE] {nome} ({contato}): {resultado['resumo']}")
    if EMAIL_REMETENTE and EMAIL_DESTINOS:
        _enviar_email(resultado, nome, contato, texto_original)
    if WEBHOOK_SLACK:
        _notificar_webhook(WEBHOOK_SLACK, resultado, nome, contato)
    if WEBHOOK_CHAT_URGENTE:
        _notificar_webhook(WEBHOOK_CHAT_URGENTE, resultado, nome, contato, texto_original)


def _enviar_email(resultado: dict, nome: str, contato: str, texto_original: str):
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"🚨 URGENTE: {resultado['resumo']}"
        msg["From"]    = EMAIL_REMETENTE
        msg["To"]      = ", ".join(EMAIL_DESTINOS)
        html = f"""<html><body style="font-family:Arial,sans-serif;padding:20px;">
          <h2 style="color:#dc2626;">🚨 Chamado URGENTE</h2>
          <table style="border-collapse:collapse;width:100%;border:1px solid #eee;">
            <tr><td style="padding:8px;font-weight:bold;background:#f9f9f9">Solicitante</td><td style="padding:8px">{nome} ({contato})</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Resumo</td><td style="padding:8px">{resultado['resumo']}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;background:#f9f9f9">Motivo</td><td style="padding:8px">{resultado['motivo']}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Próximos passos</td><td style="padding:8px">{resultado['proximos_passos']}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;background:#f9f9f9">Mensagem</td><td style="padding:8px;font-style:italic;color:#555">{texto_original}</td></tr>
          </table>
          <p style="color:#dc2626;font-weight:bold;margin-top:20px;">Ação imediata necessária!</p>
        </body></html>"""
        msg.attach(MIMEText(html, "html"))
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
            s.login(EMAIL_REMETENTE, EMAIL_SENHA)
            s.sendmail(EMAIL_REMETENTE, EMAIL_DESTINOS, msg.as_string())
        print("[Email] Enviado.")
    except Exception as e:
        print(f"[Email] Erro: {e}")


def _notificar_webhook(url: str, resultado: dict, nome: str, contato: str, texto: str = ""):
    try:
        payload = {"text": (
            f"🚨 *URGENTE — {resultado['resumo']}*\n"
            f"👤 {nome} ({contato})\n"
            f"🔍 {resultado['motivo']}\n"
            f"➡️ {resultado['proximos_passos']}"
            + (f"\n💬 _{texto}_" if texto else "")
        )}
        data = json.dumps(payload).encode("utf-8")
        req  = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req)
        print(f"[Webhook] Notificação enviada para {url[:40]}…")
    except Exception as e:
        print(f"[Webhook] Erro: {e}")
