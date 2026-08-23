"""
Agente de Classificação de Chamados — v5 revisado
Integração: Google Chat + WhatsApp → Cloud Functions → Claude API
"""

import json
import re
import os
from anthropic import Anthropic

client = Anthropic()

# ── Configuração ──────────────────────────────────────────────────────
LINK_INFRAESTRUTURA = os.environ.get(
    "LINK_INFRAESTRUTURA",
    "https://chat.google.com/room/COLE_O_LINK_AQUI"
)

# ── Diagnósticos por palavras-chave ───────────────────────────────────
DIAGNOSTICOS = [
    {
        "palavras": ["senha", "password", "acesso", "login", "entrar", "logar",
                     "bloqueado", "bloqueada", "expirou", "expirada", "autenticacao"],
        "categoria": "🔑 Acesso / Autenticação",
        "diagnostico": "Identificamos que seu problema está relacionado a *credenciais de acesso*.",
        "acao_imediata": (
            "Enquanto seu chamado é atendido, você pode tentar:\n"
            "• Usar a opção *Esqueci minha senha* na tela de login\n"
            "• Verificar se o Caps Lock está ativado\n"
            "• Limpar cookies do navegador e tentar novamente"
        ),
    },
    {
        "palavras": ["lento", "lenta", "devagar", "travando", "travado",
                     "demorar", "demora", "demorou", "carregando", "carrega", "lentidao"],
        "categoria": "🐢 Lentidão / Performance",
        "diagnostico": "Identificamos um possível problema de *performance ou lentidão no sistema*.",
        "acao_imediata": (
            "Enquanto seu chamado é atendido, você pode tentar:\n"
            "• Fechar abas desnecessárias no navegador\n"
            "• Limpar o cache do navegador (Ctrl+Shift+Del)\n"
            "• Verificar sua conexão de internet\n"
            "• Reiniciar o navegador ou aplicativo"
        ),
    },
    {
        "palavras": ["erro", "error", "falha", "falhou", "nao abre", "nao funciona",
                     "quebrando", "quebrou", "bug", "tela branca", "tela preta"],
        "categoria": "⚠️ Erro / Falha no sistema",
        "diagnostico": "Identificamos um *erro ou falha* no sistema relatado.",
        "acao_imediata": (
            "Enquanto seu chamado é atendido, você pode tentar:\n"
            "• Recarregar a página (F5 ou Ctrl+R)\n"
            "• Fechar e reabrir o aplicativo\n"
            "• Verificar se o problema ocorre em outro navegador\n"
            "• Anotar o código de erro exibido para agilizar o atendimento"
        ),
    },
    {
        "palavras": ["servidor", "fora do ar", "indisponivel", "down", "offline",
                     "sistema caiu", "caiu", "nao acessa", "ninguem acessa"],
        "categoria": "🖥️ Indisponibilidade de servidor",
        "diagnostico": "Identificamos uma possível *indisponibilidade de servidor ou serviço crítico*.",
        "acao_imediata": (
            "Ações recomendadas:\n"
            "• Verificar se outros usuários estão com o mesmo problema\n"
            "• Não reiniciar o servidor por conta própria\n"
            "• A equipe de infra já foi notificada com prioridade máxima"
        ),
    },
    {
        "palavras": ["impressora", "imprimir", "impressao", "papel", "toner",
                     "scanner", "digitalizar", "xerox"],
        "categoria": "🖨️ Impressão / Periféricos",
        "diagnostico": "Identificamos um problema relacionado a *impressora ou periférico*.",
        "acao_imediata": (
            "Enquanto seu chamado é atendido, você pode tentar:\n"
            "• Verificar se a impressora está ligada e conectada\n"
            "• Cancelar a fila de impressão (Painel de Controle → Dispositivos)\n"
            "• Desligar e religar a impressora\n"
            "• Verificar nível de toner e papel"
        ),
    },
    {
        "palavras": ["email", "e-mail", "outlook", "gmail", "correio",
                     "nao recebo", "nao envia", "caixa", "inbox"],
        "categoria": "📧 E-mail / Comunicação",
        "diagnostico": "Identificamos um problema relacionado a *e-mail ou sistema de comunicação*.",
        "acao_imediata": (
            "Enquanto seu chamado é atendido, você pode tentar:\n"
            "• Verificar a pasta Spam ou Lixo Eletrônico\n"
            "• Verificar se a caixa de entrada está cheia\n"
            "• Fechar e reabrir o cliente de e-mail\n"
            "• Verificar sua conexão com a internet"
        ),
    },
    {
        "palavras": ["instalar", "instalacao", "instalando", "programa",
                     "software", "aplicativo", "atualizar", "atualizacao", "update"],
        "categoria": "💾 Instalação / Software",
        "diagnostico": "Identificamos uma solicitação de *instalação ou atualização de software*.",
        "acao_imediata": (
            "Informações importantes:\n"
            "• Instalações requerem permissão de administrador\n"
            "• Não tente instalar sem autorização do TI\n"
            "• Um técnico realizará o procedimento remotamente ou presencialmente"
        ),
    },
    {
        "palavras": ["rede", "internet", "wifi", "wi-fi", "conexao",
                     "conectar", "sem conexao", "cabo", "vpn", "sem internet"],
        "categoria": "🌐 Rede / Conectividade",
        "diagnostico": "Identificamos um problema de *rede ou conectividade*.",
        "acao_imediata": (
            "Enquanto seu chamado é atendido, você pode tentar:\n"
            "• Desconectar e reconectar ao Wi-Fi\n"
            "• Verificar se o cabo de rede está bem conectado\n"
            "• Reiniciar o adaptador de rede\n"
            "• Testar com outros sites para confirmar se é geral ou específico"
        ),
    },
    {
        "palavras": ["backup", "recuperar", "recuperacao", "perdeu", "perdi",
                     "sumiu", "deletei", "apaguei", "arquivo perdido", "dados perdidos"],
        "categoria": "💾 Perda de dados / Backup",
        "diagnostico": "Identificamos um possível problema de *perda de dados ou necessidade de recuperação*.",
        "acao_imediata": (
            "⚠️ Ação importante — não faça nada no equipamento agora:\n"
            "• Não salve novos arquivos no local afetado\n"
            "• Não tente recuperar por conta própria\n"
            "• Aguarde o técnico — quanto menos alterações, maior a chance de recuperação"
        ),
    },
    {
        "palavras": ["computador", "pc", "notebook", "tela", "monitor",
                     "nao liga", "desligou", "reiniciando", "travou", "hardware"],
        "categoria": "💻 Hardware / Equipamento",
        "diagnostico": "Identificamos um problema relacionado a *hardware ou equipamento físico*.",
        "acao_imediata": (
            "Enquanto seu chamado é atendido, você pode tentar:\n"
            "• Verificar se os cabos de energia estão bem conectados\n"
            "• Tentar um desligamento forçado (segurar botão por 5s) e religar\n"
            "• Não abrir o equipamento por conta própria"
        ),
    },
]

SYSTEM_PROMPT = """Você é um agente especialista em suporte técnico e atendimento ao cliente.
Sua função é analisar chamados recebidos via Google Chat e WhatsApp e classificá-los.

Classifique SEMPRE em uma destas categorias:
- FÁCIL: Problemas simples, FAQ, senha, dúvidas básicas. Resolução < 1h.
- MÉDIO: Problemas que precisam de análise, configuração, atenção moderada. Resolução 1h–1 dia.
- DIFÍCIL: Problemas complexos, múltiplos sistemas, requer especialista. Resolução > 1 dia.
- URGENTE: Sistema crítico fora do ar, impacto em produção, perda de dados, problema financeiro grave.

Responda SEMPRE neste formato JSON exato (sem markdown, sem texto extra):
{
  "classificacao": "FÁCIL|MÉDIO|DIFÍCIL|URGENTE",
  "resumo": "Resumo em 1 linha do problema",
  "motivo": "Por que essa classificação (1-2 frases)",
  "proximos_passos": "O que deve ser feito agora",
  "tempo_estimado": "Ex: 30 minutos | 4 horas | 2 dias"
}
"""

EMOJI_MAP = {
    "FÁCIL":   "🟢",
    "MÉDIO":   "🟡",
    "DIFÍCIL": "🔴",
    "URGENTE": "🚨",
}


def diagnosticar_por_palavras_chave(mensagem: str) -> dict | None:
    """Identifica diagnóstico pelo conteúdo da mensagem."""
    texto = mensagem.lower()
    melhor, maior_score = None, 0
    for entry in DIAGNOSTICOS:
        score = sum(1 for p in entry["palavras"] if p in texto)
        if score > maior_score:
            maior_score, melhor = score, entry
    return melhor if maior_score > 0 else None


def classificar_chamado(mensagem: str, historico: list = None) -> dict:
    """Classifica o chamado via Claude API e anexa diagnóstico por palavras-chave."""
    msgs = list(historico or [])
    msgs.append({"role": "user", "content": f"Analise e classifique este chamado:\n\n{mensagem}"})

    resposta = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=500,
        system=SYSTEM_PROMPT,
        messages=msgs
    )

    texto = re.sub(r"```json|```", "", resposta.content[0].text.strip()).strip()
    resultado = json.loads(texto)
    resultado["emoji"] = EMOJI_MAP.get(resultado["classificacao"], "❓")
    resultado["diagnostico_kw"] = diagnosticar_por_palavras_chave(mensagem)
    return resultado


def formatar_resposta_chat(resultado: dict, nome_usuario: str = None) -> dict:
    """Monta resposta para o Google Chat com card e botão de infra."""
    clf  = resultado["classificacao"]
    nome = nome_usuario or "usuário"
    diag = resultado.get("diagnostico_kw")

    texto = (
        f"Olá, *{nome}!* ✅ Sua demanda foi registrada no *Controle de Chamados*.\n\n"
        f"{resultado['emoji']} *Classificação: {clf}*\n"
        f"📋 *Resumo:* {resultado['resumo']}\n"
        f"⏱ *Tempo estimado:* {resultado['tempo_estimado']}\n"
    )

    if clf == "URGENTE":
        texto += "\n⚠️ *Prioridade MÁXIMA* — equipe de plantão já notificada!\n"
    elif clf == "DIFÍCIL":
        texto += "\n🔴 *Alta prioridade* — especialista será designado em breve.\n"

    if diag:
        texto += (
            f"\n━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"🔍 *Diagnóstico: {diag['categoria']}*\n\n"
            f"{diag['diagnostico']}\n\n"
            f"*💡 O que você pode fazer agora:*\n"
            f"{diag['acao_imediata']}\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━\n"
        )
    else:
        texto += "\n📝 Um técnico irá analisar e entrar em contato em breve.\n"

    texto += "\nAcompanhe pelo dashboard interno ou aguarde o contato da equipe."

    cor = (
        {"red": 0.47, "green": 0.83, "blue": 0.54, "alpha": 1.0}
        if clf in ("FÁCIL", "MÉDIO") else
        {"red": 0.94, "green": 0.33, "blue": 0.20, "alpha": 1.0}
    )

    return {
        "text": texto,
        "cardsV2": [{
            "cardId": "infra-redirect",
            "card": {
                "sections": [{
                    "widgets": [
                        {"textParagraph": {"text": "Prefere falar agora com a equipe?" if clf in ("FÁCIL", "MÉDIO") else "Precisa de atendimento imediato?"}},
                        {"buttonList": {"buttons": [{
                            "text": "💬 Falar com a equipe de infraestrutura",
                            "onClick": {"openLink": {"url": LINK_INFRAESTRUTURA}},
                            "color": cor
                        }]}}
                    ]
                }]
            }
        }]
    }


def formatar_resposta_whatsapp(resultado: dict, nome: str = None) -> str:
    """Formata resposta para WhatsApp (texto simples com emojis)."""
    clf  = resultado["classificacao"]
    nome_txt = f", *{nome}*" if nome else ""
    diag = resultado.get("diagnostico_kw")

    msg = (
        f"Olá{nome_txt}! ✅ Sua demanda foi registrada no *Controle de Chamados*.\n\n"
        f"{resultado['emoji']} *Classificação: {clf}*\n"
        f"📋 *Resumo:* {resultado['resumo']}\n"
        f"⏱ *Tempo estimado:* {resultado['tempo_estimado']}\n"
    )

    if clf == "URGENTE":
        msg += "\n⚠️ *Prioridade MÁXIMA* — equipe de plantão notificada!\n"
    elif clf == "DIFÍCIL":
        msg += "\n🔴 *Alta prioridade* — especialista designado em breve.\n"

    if diag:
        msg += (
            f"\n━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"🔍 *Diagnóstico: {diag['categoria']}*\n\n"
            f"{diag['diagnostico']}\n\n"
            f"*💡 O que você pode fazer agora:*\n"
            f"{diag['acao_imediata']}\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━\n"
        )

    msg += "\nPara falar com a equipe de infraestrutura, acesse o canal de suporte da empresa."
    return msg
