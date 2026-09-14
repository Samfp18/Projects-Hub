import { useState, useEffect, useRef } from 'react';
import type { ConfigMemoria, ChatMsg } from '../types';
import { DEEPSEEK_URL, DEEPSEEK_MODEL_IABUG, MOTOR_CONTEXT } from '../api';

function formatarProsa(texto: string) {
  return texto.split('\n').filter(p => p.trim()).map((p, i) => <p key={i}>{p.trim()}</p>);
}

interface IabugScreenProps { active: boolean; configMemoria: ConfigMemoria | null; onVoltar: () => void; }

export function IabugScreen({ active, configMemoria, onVoltar }: IabugScreenProps) {
  const [mensagens, setMensagens] = useState<ChatMsg[]>([]);
  const [historicoApi, setHistoricoApi] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [contextoAtivo, setContextoAtivo] = useState<boolean>(true);
  const chatRef = useRef<HTMLDivElement | null>(null);
  const iniciadoRef = useRef<boolean>(false);

  useEffect(() => {
    if (!active || iniciadoRef.current) return;
    iniciadoRef.current = true;
    setMensagens([
      { tipo: 'system', texto: 'Setor de teste iniciado. Você pode discutir o motor livremente.', id: 'm1' },
      { tipo: 'ia', texto: 'Olá. Estou aqui para discutir o Motor Universal com você. Posso avaliar ideias, apontar problemas, sugerir regras ou ajudar a repensar partes do sistema. O que você quer explorar?', id: 'm2' },
    ]);
  }, [active]);

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [mensagens, loading]);

  function limpar() {
    setHistoricoApi([]);
    setMensagens([
      { tipo: 'system', texto: 'Conversa limpa.', id: 'c1-' + Date.now() },
      { tipo: 'ia', texto: 'Pronto. Começamos de novo. O que você quer discutir?', id: 'c2-' + Date.now() },
    ]);
  }

  async function enviar() {
    const texto = input.trim();
    if (!texto) return;
    const userMsg: ChatMsg = { tipo: 'user', texto, id: 'u-' + Date.now() };
    setMensagens(m => [...m, userMsg]);
    const novoHistorico = [...historicoApi, { role: 'user', content: texto }];
    setHistoricoApi(novoHistorico);
    setInput('');
    setLoading(true);

    try {
      let systemPrompt = `Você é IABUG, um assistente técnico que discute design de sistemas de simulação narrativa com o criador do Motor Universal. Você é direto, crítico quando necessário, e sempre pensa em termos práticos de implementação. Não bajula, aponta problemas reais. Fala em português do Brasil.`;
      if (contextoAtivo) {
        let ctx = MOTOR_CONTEXT;
        if (configMemoria) {
          ctx += `\n\nCONFIGURAÇÃO ATUAL DA SIMULAÇÃO:\n- Cenário: ${configMemoria.cenario}\n- Protagonista: ${configMemoria.protagonista.nome} (${configMemoria.protagonista.papel})\n- Tom: ${configMemoria.tom}\n- Ritmo: ${configMemoria.ritmo}\n- Roteiro (início): ${configMemoria.roteiro.substring(0, 500)}`;
        }
        systemPrompt += `\n\nCONTEXTO DO MOTOR:\n${ctx}`;
      }

      const messages = [{ role: 'system', content: systemPrompt }, ...novoHistorico.slice(-10)];

      const res = await fetch(DEEPSEEK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: DEEPSEEK_MODEL_IABUG, messages, temperature: 0.7, max_tokens: 1500 }),
      });

      if (!res.ok) { const err = await res.text(); throw new Error(`API ${res.status}: ${err.substring(0, 150)}`); }
      const data = await res.json();
      const resposta = data.choices?.[0]?.message?.content;
      if (!resposta) throw new Error('Resposta vazia.');

      setHistoricoApi(h => { const novo = [...h, { role: 'assistant', content: resposta }]; return novo.length > 20 ? novo.slice(-20) : novo; });
      setMensagens(m => [...m, { tipo: 'ia', texto: resposta, id: 'ia-' + Date.now() }]);
    } catch (err: any) {
      console.error(err);
      setMensagens(m => [...m, { tipo: 'system', texto: `Erro: ${err.message}`, id: 'err-' + Date.now() }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen screen-iabug" style={{ display: active ? 'grid' : 'none' }}>
      <header className="iabug-header">
        <div className="iabug-brand"><span>&#9888;</span> SETOR DE TESTE <span className="sub">// IABUG</span></div>
        <div className="iabug-actions">
          <button className="link-btn" onClick={() => setContextoAtivo(c => !c)}>&#128214; Contexto: {contextoAtivo ? 'ON' : 'OFF'}</button>
          <button className="link-btn" onClick={limpar}>&#128465; Limpar</button>
          <button className="link-btn" onClick={onVoltar}>&#8592; Voltar</button>
        </div>
      </header>

      <div className="iabug-chat" ref={chatRef}>
        {mensagens.map(m => (
          <div className={`iabug-msg ${m.tipo}`} key={m.id}>
            {m.tipo === 'system' ? m.texto : (
              <>
                <span className="label">{m.tipo === 'user' ? 'Você' : 'IABUG'}</span>
                {m.tipo === 'ia' ? formatarProsa(m.texto) : m.texto}
              </>
            )}
          </div>
        ))}
        {loading && (
          <div className="iabug-msg ia">
            <span className="label">IABUG</span>
            <div className="iabug-loading">analisando…</div>
          </div>
        )}
      </div>

      <div className="iabug-input-bar">
        <textarea rows={2} placeholder="Escreva sua pergunta, ideia ou crítica sobre o motor..." value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}></textarea>
        <button onClick={enviar} disabled={loading}>Enviar</button>
      </div>
    </div>
  );
}
