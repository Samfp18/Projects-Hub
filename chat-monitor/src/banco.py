"""
Banco de dados — Firestore (Monitor de Chat)
Coleção separada: chat_mensagens
"""

from datetime import datetime, timezone
from google.cloud import firestore

db = firestore.Client()
COLECAO = "chat_mensagens"


def salvar_mensagem(dados: dict) -> str:
    doc = {**dados, "recebido_em": datetime.now(timezone.utc)}
    ref = db.collection(COLECAO).add(doc)
    doc_id = ref[1].id
    print(f"[Monitor] Mensagem salva: {doc_id}")
    return doc_id


def buscar_mensagens(espaco: str = None, email: str = None, limite: int = 300) -> list:
    query = db.collection(COLECAO)
    if espaco:
        query = query.where("espaco", "==", espaco)
    if email:
        query = query.where("email", "==", email)
    query = query.order_by("recebido_em", direction=firestore.Query.DESCENDING).limit(limite)
    return [{"id": doc.id, **doc.to_dict()} for doc in query.stream()]
