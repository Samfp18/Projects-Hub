"""
Banco de dados — Firestore
Salva e busca chamados classificados.
"""

from datetime import datetime, timezone
from google.cloud import firestore

db = firestore.Client()
COLECAO = "chamados"


def salvar_chamado(dados: dict) -> str:
    doc = {**dados, "criado_em": datetime.now(timezone.utc), "status": "aberto"}
    ref = db.collection(COLECAO).add(doc)
    doc_id = ref[1].id
    print(f"[Firestore] Chamado salvo: {doc_id}")
    return doc_id


def buscar_chamados(classificacao: str = None, status: str = None,
                    canal: str = None, limite: int = 100) -> list:
    query = db.collection(COLECAO)
    if classificacao:
        query = query.where("classificacao", "==", classificacao)
    if status:
        query = query.where("status", "==", status)
    if canal:
        query = query.where("canal", "==", canal)
    query = query.order_by("criado_em", direction=firestore.Query.DESCENDING).limit(limite)
    return [{"id": doc.id, **doc.to_dict()} for doc in query.stream()]


def atualizar_status(doc_id: str, novo_status: str):
    db.collection(COLECAO).document(doc_id).update({
        "status": novo_status,
        "atualizado_em": datetime.now(timezone.utc)
    })
