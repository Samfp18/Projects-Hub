import { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import type { ConfigMemoria, LogEntry, NarrativaState } from '../types';
import { LOCAIS_MAPA, FACCOES_MAPA, ROTAS_MAPA, NPCS_MAPA, STATS_DEMO, RECURSOS_DEMO, STATUS_DEMO, NEMESIS_DEMO, HUD_TABS, TILE_URL, TILE_OPTS } from '../data';
import { autonomiaInfo, relacaoLabel, faccaoInfo, asciiBar, horaAgora, iniciais } from '../helpers';
import { DEEPSEEK_URL, DEEPSEEK_MODEL_VINHETA, buildPromptVinheta } from '../api';

interface HudScreenProps { active: boolean; configMemoria: ConfigMemoria | null; onVoltarMenu: () => void; onOpenIabug: () => void; }

export function HudScreen({ active, configMemoria, onVoltarMenu, onOpenIabug }: HudScreenProps) {
  const [activeTab, setActiveTab] = useState<string>('narrativa');
  const [leftCollapsed, setLeftCollapsed] = useState<boolean>(false);
  const [rightCollapsed, setRightCollapsed] = useState<boolean>(false);
  const [masterOn, setMasterOn] = useState<boolean>(false);
  const [turno, setTurno] = useState<number>(1);
  const [vinheta, setVinheta] = useState<number>(0);
  const [historicoVinhetas, setHistoricoVinhetas] = useState<string[]>([]);
  const [narrativa, setNarrativa] = useState<NarrativaState>({ tipo: 'placeholder' });
  const [gerando, setGerando] = useState<boolean>(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [cmdInput, setCmdInput] = useState<string>('');

  const logRef = useRef<HTMLDivElement | null>(null);
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapObjRef = useRef<L.Map | null>(null);
  const layersRef = useRef<{ faccoes: L.LayerGroup | null; rotas: L.LayerGroup | null; npcs: L.LayerGroup | null }>({ faccoes: null, rotas: null, npcs: null });
  const [layerFaccoes, setLayerFaccoes] = useState<boolean>(true);
  const [layerRotas, setLayerRotas] = useState<boolean>(true);
  const [layerNpcs, setLayerNpcs] = useState<boolean>(true);

  const addLog = useCallback((tipo: string, msg: string) => {
    setLog(l => [...l, { ts: horaAgora(), tipo, msg, id: Math.random().toString(36).slice(2) }]);
  }, []);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log]);

  useEffect(() => {
    setLog([]);
    setNarrativa({ tipo: 'placeholder' });
    setTurno(1); setVinheta(0); setHistoricoVinhetas([]);
    if (!configMemoria) {
      addLog('warn', 'Sem configuração. Volte ao menu e inicie uma nova simulação.');
      return;
    }
    addLog('accent', `Simulação iniciada — ${configMemoria.cenario}`);
    addLog('info', `Protagonista: ${configMemoria.protagonista.nome} (${configMemoria.protagonista.papel})`);
    addLog('info', `Tom: ${configMemoria.tom} · Ritmo: ${configMemoria.ritmo}`);
    const qtdNpcs = configMemoria.npcs?.length || 0;
    const qtdFaccoes = configMemoria.faccoes?.length || 0;
    if (qtdNpcs > 0) addLog('info', `${qtdNpcs} personagens carregados.`);
    if (qtdFaccoes > 0) addLog('info', `${qtdFaccoes} facções carregadas.`);
    addLog('warn', 'Clique em CONTINUAR para gerar a primeira vinheta.');
    if (mapObjRef.current) mapObjRef.current.setView([configMemoria.localInicial.lat, configMemoria.localInicial.lng], configMemoria.localInicial.zoom);
    // eslint-disable-next-line
  }, [configMemoria]);

  function initHudMap() {
    if (mapObjRef.current || !mapDivRef.current) return;
    const center: [number, number] = configMemoria ? [configMemoria.localInicial.lat, configMemoria.localInicial.lng] : [-15.78, -47.93];
    const zoom = configMemoria ? configMemoria.localInicial.zoom : 4;
    const mapa = L.map(mapDivRef.current, { center, zoom, zoomControl: true });
    L.tileLayer(TILE_URL, TILE_OPTS).addTo(mapa);

    const baseIcon = (tipo: string) => {
      const cor = tipo === 'enemy' ? 'var(--map-enemy)' : tipo === 'neutral' ? 'var(--map-neutral)' : 'var(--map-ally)';
      return L.divIcon({ className: '', html: `<div style="width:12px;height:12px;border-radius:50%;background:${cor};border:2px solid var(--paper);box-shadow:0 0 0 1px var(--ink-faint);"></div>`, iconSize: [12, 12], iconAnchor: [6, 6] });
    };
    const npcIcon = () => L.divIcon({ className: '', html: '<div style="width:8px;height:8px;border-radius:50%;background:var(--map-npc);border:2px solid var(--paper);box-shadow:0 0 0 1px var(--ink-faint);"></div>', iconSize: [8, 8], iconAnchor: [4, 4] });

    const layerLocais = L.layerGroup().addTo(mapa);
    LOCAIS_MAPA.forEach(l => {
      L.marker([l.lat, l.lng], { icon: baseIcon(l.tipoMapa) }).addTo(layerLocais)
        .bindPopup(`<div class="popup-type">${l.tipo}</div><div class="popup-title">${l.nome}</div><div class="popup-row"><span class="k">População</span><span class="v">${l.pop}</span></div>`);
    });

    const layerFaccoesG = L.layerGroup().addTo(mapa);
    FACCOES_MAPA.forEach(f => {
      L.circle([f.lat, f.lng], { color: f.cor, fillColor: f.cor, fillOpacity: 0.1, weight: 1, opacity: 0.55, radius: f.raio }).addTo(layerFaccoesG);
    });

    const layerRotasG = L.layerGroup().addTo(mapa);
    ROTAS_MAPA.forEach(r => { L.polyline(r, { color: '#7fa0c0', weight: 1, opacity: 0.5, dashArray: '4, 6' }).addTo(layerRotasG); });

    const layerNpcsG = L.layerGroup().addTo(mapa);
    NPCS_MAPA.forEach(n => {
      L.marker([n.lat, n.lng], { icon: npcIcon() }).addTo(layerNpcsG)
        .bindPopup(`<div class="popup-type">NPC em Trânsito</div><div class="popup-title">${n.nome}</div><div class="popup-row"><span class="k">Destino</span><span class="v">${n.destino}</span></div>`);
    });

    layersRef.current = { faccoes: layerFaccoesG, rotas: layerRotasG, npcs: layerNpcsG };
    mapObjRef.current = mapa;
  }

  useEffect(() => {
    if (activeTab === 'mapa') {
      initHudMap();
      setTimeout(() => mapObjRef.current && mapObjRef.current.invalidateSize(), 50);
    }
    // eslint-disable-next-line
  }, [activeTab]);

  useEffect(() => {
    const m = mapObjRef.current, l = layersRef.current.faccoes;
    if (!m || !l) return;
    if (layerFaccoes) m.addLayer(l); else m.removeLayer(l);
  }, [layerFaccoes]);
  useEffect(() => {
    const m = mapObjRef.current, l = layersRef.current.rotas;
    if (!m || !l) return;
    if (layerRotas) m.addLayer(l); else m.removeLayer(l);
  }, [layerRotas]);
  useEffect(() => {
    const m = mapObjRef.current, l = layersRef.current.npcs;
    if (!m || !l) return;
    if (layerNpcs) m.addLayer(l); else m.removeLayer(l);
  }, [layerNpcs]);

  function reflowMap() {
    if (mapObjRef.current && activeTab === 'mapa') setTimeout(() => mapObjRef.current!.invalidateSize(), 360);
  }

  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') return;
      if (e.key === '[') { setLeftCollapsed(c => !c); reflowMap(); }
      if (e.key === ']') { setRightCollapsed(c => !c); reflowMap(); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line
  }, [active, activeTab]);

  async function gerarVinheta(diretriz: string = '') {
    if (gerando) return;
    setGerando(true);

    let novoTurno = turno, novaVinheta = vinheta + 1;
    if (novaVinheta > 3) { novoTurno = turno + 1; novaVinheta = 1; }
    setTurno(novoTurno); setVinheta(novaVinheta);

    setNarrativa({ tipo: 'loading' });
    addLog('info', `Gerando vinheta ${novaVinheta} do turno ${novoTurno}...`);

    try {
      const res = await fetch(DEEPSEEK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: DEEPSEEK_MODEL_VINHETA,
          messages: [
            { role: 'system', content: 'Você é um narrador literário. Escreve em português do Brasil. Nunca quebra a quarta parede. Nunca menciona regras, turnos, IA ou sistemas. Apenas conta a história.' },
            { role: 'user', content: buildPromptVinheta(configMemoria || {}, historicoVinhetas, novoTurno, novaVinheta, diretriz) },
          ],
          temperature: 0.9,
          max_tokens: 1600,
        }),
      });
      if (!res.ok) { const err = await res.text(); throw new Error(`API ${res.status}: ${err.substring(0, 150)}`); }
      const data = await res.json();
      const texto = data.choices?.[0]?.message?.content;
      if (!texto) throw new Error('Resposta vazia da IA.');

      setHistoricoVinhetas(h => { const novo = [...h, texto]; return novo.length > 6 ? novo.slice(-6) : novo; });

      const paragrafos: string[] = texto.split('\n').filter((p: string) => p.trim());
      setNarrativa({
        tipo: 'content', turno: novoTurno, vinheta: novaVinheta,
        dataStr: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
        horaStr: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        paragrafos,
      });
      addLog('accent', `Vinheta ${novaVinheta} gerada.`);
    } catch (err: any) {
      console.error(err);
      addLog('danger', 'Erro ao gerar vinheta: ' + err.message);
      setNarrativa({ tipo: 'erro', message: err.message });
    } finally {
      setGerando(false);
    }
  }

  function handleCmd(cmd: string) {
    const diretriz = cmdInput.trim();
    if (cmd === 'continuar') {
      if (gerando) return;
      gerarVinheta(diretriz);
      setCmdInput('');
    } else if (cmd === 'acao') {
      addLog('accent', 'Modo Ação — escreva sua diretriz e clique Continuar.');
    } else if (cmd === 'avaliar') {
      addLog('info', 'Panorama: recursos estáveis, movimento hostil ao sul, moral estável.');
    } else if (cmd === 'regenerar') {
      setHistoricoVinhetas(h => h.length > 0 ? h.slice(0, -1) : h);
      setVinheta(v => Math.max(0, v - 1));
      addLog('info', 'Regenerando última vinheta...');
      gerarVinheta('');
    } else if (cmd === 'combate') {
      addLog('warn', 'Módulo de Combate Tático — em construção.');
    } else if (cmd === 'save') {
      addLog('accent', 'Estado salvo em memória (placeholder).');
    }
  }

  function toggleMaster() {
    setMasterOn(m => {
      addLog('accent', `Modo mestre ${!m ? 'ATIVADO' : 'DESATIVADO'}.`);
      return !m;
    });
  }

  const npcs = configMemoria?.npcs || [];
  const faccoes = configMemoria?.faccoes || [];

  return (
    <div className="screen screen-hud" style={{ display: active ? 'grid' : 'none' }}>
      <header className="hud-topbar">
        <div className="meta-group">
          <span><span className="meta-label">TURNO</span><span className="meta-value accent">{String(turno).padStart(2, '0')}</span></span>
          <span><span className="meta-label">DATA</span><span className="meta-value">{new Date().toLocaleDateString('pt-BR')}</span></span>
          <span><span className="meta-label">LOCAL</span><span className="meta-value">{configMemoria ? configMemoria.cenario : '—'}</span></span>
          <span><span className="meta-label">CLIMA</span><span className="meta-value">—</span></span>
        </div>
        <div className="meta-group">
          <button className={`toggle-btn ${masterOn ? 'is-on' : ''}`} onClick={toggleMaster}>Modo Mestre</button>
          <button className="iabug-trigger" onClick={onOpenIabug}>IABUG</button>
          <span><span className="status-dot"></span>MOTOR ATIVO</span>
          <button className="link-btn back-link" onClick={onVoltarMenu}>&#8592; Menu</button>
        </div>
      </header>

      <nav className="hud-tabs">
        {HUD_TABS.map(t => (
          <button key={t.id} className={`hud-tab ${activeTab === t.id ? 'is-active' : ''}`} onClick={() => setActiveTab(t.id)}>{t.label}</button>
        ))}
      </nav>

      <div className={`hud-body ${leftCollapsed ? 'left-collapsed' : ''} ${rightCollapsed ? 'right-collapsed' : ''}`}>
        <aside className="hud-panel left">
          <button className="panel-collapse left" onClick={() => { setLeftCollapsed(c => !c); reflowMap(); }} title="Recolher painel (tecla [)">{leftCollapsed ? '›' : '‹'}</button>
          <div className="panel-body">
            <div className="panel-header">// Protagonista</div>
            <div className="panel-section">
              <div className="protag-name">{configMemoria?.protagonista?.nome || '—'}</div>
              <div className="protag-role">{(configMemoria?.protagonista?.papel || '—').toUpperCase()}</div>
              {STATS_DEMO.map(s => (
                <div className="stat-row" key={s.key}>
                  <div className="stat-label"><span>{s.label}</span><span className={!masterOn ? 'hidden-val' : ''}>{masterOn ? s.pct + '%' : '—'}</span></div>
                  <div className={`stat-ascii ${s.classe}`}>{asciiBar(masterOn ? s.pct : 0)}</div>
                </div>
              ))}
            </div>
            <div className="panel-section">
              <h3>Recursos</h3>
              {RECURSOS_DEMO.map(r => (
                <div className="ledger-row" key={r.label}><span className="key">{r.label}</span><span className="leader"></span><span className={`val ${!masterOn ? 'hidden-val' : ''}`}>{masterOn ? r.real : '—'}</span></div>
              ))}
            </div>
            <div className="panel-section">
              <h3>Status</h3>
              {STATUS_DEMO.map(r => (
                <div className="ledger-row" key={r.label}><span className="key">{r.label}</span><span className="leader"></span><span className={`val ${!masterOn ? 'hidden-val' : ''}`}>{masterOn ? r.real : '—'}</span></div>
              ))}
            </div>
          </div>
        </aside>

        <div className="hud-main-view">
          <section className={`hud-tab-content ${activeTab === 'narrativa' ? 'is-active' : ''}`}>
            <div className="narrative-page">
              {narrativa.tipo === 'placeholder' && (
                <>
                  <div className="narrative-heading">Aguardando primeira vinheta...</div>
                  <div className="narrative-sub">A integração com IA será feita no próximo passo.</div>
                  <p style={{ color: 'var(--ink-soft)', fontStyle: 'italic' }}>Clique em <strong>Continuar</strong> no rodapé para ver um texto de exemplo.</p>
                </>
              )}
              {narrativa.tipo === 'loading' && (
                <div className="narrative-loading">
                  <div className="loading-dots"><span></span><span></span><span></span></div>
                  <div>Gerando vinheta</div>
                </div>
              )}
              {narrativa.tipo === 'content' && (
                <>
                  <div className="narrative-heading">Turno {String(narrativa.turno).padStart(2, '0')} — Vinheta {narrativa.vinheta}</div>
                  <div className="narrative-sub">{narrativa.dataStr} | {narrativa.horaStr}</div>
                  {narrativa.paragrafos.map((p, i) => <p key={i}>{p.trim()}</p>)}
                  <div className="narrative-end">Fim da Vinheta {narrativa.vinheta}</div>
                </>
              )}
              {narrativa.tipo === 'erro' && (
                <>
                  <div className="narrative-heading">Erro na geração</div>
                  <div className="narrative-sub">Tente novamente clicando em Continuar.</div>
                  <p style={{ color: 'var(--danger)' }}>{narrativa.message}</p>
                </>
              )}
            </div>
          </section>

          <section className={`hud-tab-content ${activeTab === 'painel' ? 'is-active' : ''}`}>
            <div className="dash-grid">
              <div className="dash-card"><h4>Situação Atual</h4><p>Aguardando início.</p></div>
              <div className="dash-card"><h4>Alertas</h4><p className="dg">Nenhum alerta.</p></div>
              <div className="dash-card"><h4>Próximos Eventos</h4><p className={!masterOn ? 'hidden-val' : ''}>{masterOn ? 'Nenhum evento previsto.' : '— conteúdo oculto —'}</p></div>
              <div className="dash-card"><h4>Objetivos</h4><p className={!masterOn ? 'hidden-val' : ''}>{masterOn ? 'Garantir suprimentos do refúgio.' : '— conteúdo oculto —'}</p></div>
            </div>
          </section>

          <section className={`hud-tab-content ${activeTab === 'mapa' ? 'is-active' : ''}`}>
            <div className="map-shell">
              <div ref={mapDivRef} style={{ width: '100%', height: '100%' }}></div>
              <div className="map-layers-box">
                <label><input type="checkbox" checked={layerFaccoes} onChange={e => setLayerFaccoes(e.target.checked)} /> Facções</label>
                <label><input type="checkbox" checked={layerRotas} onChange={e => setLayerRotas(e.target.checked)} /> Rotas</label>
                <label><input type="checkbox" checked={layerNpcs} onChange={e => setLayerNpcs(e.target.checked)} /> NPCs</label>
              </div>
            </div>
          </section>

          <section className={`hud-tab-content ${activeTab === 'personagens' ? 'is-active' : ''}`}>
            <div className="dash-grid">
              {npcs.length === 0 ? (
                <div className="placeholder-block"><div className="icon">&#9674;</div><div>Sem personagens</div><div style={{ fontSize: '0.62rem', letterSpacing: '0.15em', opacity: 0.7 }}>o roteiro não definiu NPCs</div></div>
              ) : npcs.map((npc, i) => {
                const aut = autonomiaInfo(npc.autonomia);
                return (
                  <div className="dash-card" key={i}>
                    <h4>{npc.nome}</h4>
                    <p>Função: {npc.papel || '—'}</p>
                    <p>Relação: <span className="hl">{relacaoLabel(npc.relacao)}</span></p>
                    <p className={!masterOn ? 'hidden-val' : ''}>{masterOn ? `Autonomia: ${aut.label} · ${aut.nome}` : '— conteúdo oculto —'}</p>
                    {npc.nota && <p className={!masterOn ? 'hidden-val' : ''}>{masterOn ? npc.nota : '— conteúdo oculto —'}</p>}
                  </div>
                );
              })}
            </div>
          </section>

          <section className={`hud-tab-content ${activeTab === 'faccoes' ? 'is-active' : ''}`}>
            <div className="dash-grid">
              {faccoes.length === 0 ? (
                <div className="placeholder-block"><div className="icon">&#9674;</div><div>Sem facções</div><div style={{ fontSize: '0.62rem', letterSpacing: '0.15em', opacity: 0.7 }}>o roteiro não definiu facções</div></div>
              ) : faccoes.map((f, i) => {
                const info = faccaoInfo(f.relacao);
                return (
                  <div className="dash-card" key={i}>
                    <h4>{f.nome}</h4>
                    <p>Relação: <span className={info.classe === 'rel-war' ? 'dg' : info.classe === 'rel-hostile' ? 'hl' : 'ok'} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{info.label}</span></p>
                    {f.nota && <p className={!masterOn ? 'hidden-val' : ''}>{masterOn ? f.nota : '— conteúdo oculto —'}</p>}
                  </div>
                );
              })}
            </div>
          </section>

          <section className={`hud-tab-content ${activeTab === 'agendas' ? 'is-active' : ''}`}>
            <div className="placeholder-block"><div className="icon">&#9674;</div><div>Agendas Ocultas</div><div style={{ fontSize: '0.62rem', letterSpacing: '0.15em', opacity: 0.7 }}>ative o modo mestre</div></div>
          </section>
          <section className={`hud-tab-content ${activeTab === 'ativos' ? 'is-active' : ''}`}>
            <div className="placeholder-block"><div className="icon">&#9674;</div><div>Gestão de Ativos</div><div style={{ fontSize: '0.62rem', letterSpacing: '0.15em', opacity: 0.7 }}>em construção</div></div>
          </section>
          <section className={`hud-tab-content ${activeTab === 'save' ? 'is-active' : ''}`}>
            <div className="placeholder-block"><div className="icon">&#9674;</div><div>Extrato do Estado</div><div style={{ fontSize: '0.62rem', letterSpacing: '0.15em', opacity: 0.7 }}>disponível a partir do turno 5</div></div>
          </section>
        </div>

        <aside className="hud-panel right">
          <button className="panel-collapse right" onClick={() => { setRightCollapsed(c => !c); reflowMap(); }} title="Recolher painel (tecla ])">{rightCollapsed ? '‹' : '›'}</button>
          <div className="panel-body">
            <div className="panel-header">// Relações</div>
            <div className="panel-section">
              <h3>NPCs Próximos</h3>
              {npcs.length === 0 ? <div className="empty-note">Nenhum personagem definido.</div> : npcs.map((npc, i) => {
                const aut = autonomiaInfo(npc.autonomia);
                return (
                  <div className="npc-row" key={i}>
                    <div className="npc-tag">{iniciais(npc.nome)}</div>
                    <div className="npc-info">
                      <div className="npc-name">{npc.nome}</div>
                      <div className="npc-meta">
                        <span className={`autonomy-tag ${aut.classe}`}>{masterOn ? aut.label : '—'}</span>
                        <span className={!masterOn ? 'hidden-val' : ''}>{masterOn ? aut.nome : ''}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="panel-section">
              <h3>Facções</h3>
              {faccoes.length === 0 ? <div className="empty-note">Nenhuma facção definida.</div> : faccoes.map((f, i) => {
                const info = faccaoInfo(f.relacao);
                return (
                  <div className="faction-row" key={i}>
                    <div className="faction-name"><span className="faction-dot" style={{ background: f.cor || '#3498db' }}></span>{f.nome}</div>
                    <span className={`faction-rel ${info.classe}`}>{info.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="panel-section">
              <h3>Nêmesis</h3>
              {NEMESIS_DEMO.map(r => (
                <div className="ledger-row" key={r.label}><span className="key">{r.label}</span><span className="leader"></span><span className={`val ${!masterOn ? 'hidden-val' : ''}`}>{masterOn ? r.real : '—'}</span></div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <footer className="hud-bottom">
        <div className="hud-log" ref={logRef}>
          {log.map(l => (
            <div className={`log-line ${l.tipo}`} key={l.id}><span className="ts">[{l.ts}]</span><span>{l.msg}</span></div>
          ))}
        </div>
        <div className="hud-commands">
          <textarea className="cmd-input" value={cmdInput} onChange={e => setCmdInput(e.target.value)}
            placeholder="Escreva uma ordem ou clique em continuar..."
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCmd('continuar'); } }}></textarea>
          <div className="cmd-buttons">
            <button className="cmd-btn is-primary" onClick={() => handleCmd('continuar')}>Continuar</button>
            <button className="cmd-btn" onClick={() => handleCmd('acao')}>Ação</button>
            <button className="cmd-btn" onClick={() => handleCmd('avaliar')}>Avaliar</button>
            <button className="cmd-btn" onClick={() => handleCmd('regenerar')}>Regenerar</button>
            <button className="cmd-btn" onClick={() => handleCmd('combate')}>Combate</button>
            <button className="cmd-btn" onClick={() => handleCmd('save')}>Save</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
