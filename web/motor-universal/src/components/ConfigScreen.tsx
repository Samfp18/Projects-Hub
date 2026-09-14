import { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import type { ConfigMemoria, NpcData, FaccaoData } from '../types';
import { TOM_OPCOES, RITMO_OPCOES, ROMANOS, TILE_URL, TILE_OPTS } from '../data';
import { DEEPSEEK_URL, DEEPSEEK_MODEL_CONFIG, buildPromptExtracao } from '../api';

interface ConfigScreenProps { active: boolean; onVoltarMenu: () => void; onIniciar: (config: ConfigMemoria) => void; }

export function ConfigScreen({ active, onVoltarMenu, onIniciar }: ConfigScreenProps) {
  const [passo, setPasso] = useState<number>(1);
  const [roteiro, setRoteiro] = useState<string>('');
  const [cenarioNome, setCenarioNome] = useState<string>('');
  const [protagNome, setProtagNome] = useState<string>('');
  const [protagPapel, setProtagPapel] = useState<string>('');
  const [protagBio, setProtagBio] = useState<string>('');
  const [tom, setTom] = useState<string>('FRIO');
  const [ritmo, setRitmo] = useState<string>('PADRÃO');
  const [lat, setLat] = useState<number>(-23.5505);
  const [lng, setLng] = useState<number>(-46.6333);
  const [zoom, setZoom] = useState<number>(5);
  const [iaStatus, setIaStatusMsg] = useState<{ msg: string; tipo: string }>({ msg: '', tipo: 'info' });
  const [iaLoading, setIaLoading] = useState<boolean>(false);
  const [dadosIaTemp, setDadosIaTemp] = useState<{ npcs: NpcData[]; faccoes: FaccaoData[] }>({ npcs: [], faccoes: [] });

  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapObjRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const setIaStatus = (msg: string, tipo: string = 'info') => setIaStatusMsg({ msg, tipo });

  const colocarMarcador = useCallback((la: number, ln: number) => {
    if (!mapObjRef.current) return;
    const icone = L.divIcon({ className: '', html: '<div class="start-marker"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });
    if (markerRef.current) mapObjRef.current.removeLayer(markerRef.current);
    markerRef.current = L.marker([la, ln], { icon: icone }).addTo(mapObjRef.current);
  }, []);

  useEffect(() => {
    if (passo !== 2 || mapObjRef.current || !mapDivRef.current) return;
    const timer = setTimeout(() => {
      const mapa = L.map(mapDivRef.current!, { center: [-15.78, -47.93], zoom: 4, zoomControl: true });
      L.tileLayer(TILE_URL, TILE_OPTS).addTo(mapa);
      mapa.on('click', (e: L.LeafletMouseEvent) => {
        setLat(e.latlng.lat);
        setLng(e.latlng.lng);
        colocarMarcador(e.latlng.lat, e.latlng.lng);
      });
      mapa.on('zoomend', () => setZoom(mapa.getZoom()));
      mapObjRef.current = mapa;
    }, 100);
    return () => clearTimeout(timer);
  }, [passo, colocarMarcador]);

  useEffect(() => {
    if (passo === 2 && mapObjRef.current) {
      setTimeout(() => mapObjRef.current!.invalidateSize(), 60);
    }
  }, [passo, active]);

  async function geocodificarCidade(cidade: string, zoomAlvo: number) {
    try {
      setIaStatus('Localizando cidade no mapa...');
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(cidade)}`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } });
      const data = await res.json();
      if (!data || data.length === 0) { setIaStatus('Cidade não encontrada no mapa.', 'erro'); return; }
      const la = parseFloat(data[0].lat);
      const ln = parseFloat(data[0].lon);
      setLat(la); setLng(ln); setZoom(zoomAlvo);
      if (mapObjRef.current) {
        mapObjRef.current.setView([la, ln], zoomAlvo);
        colocarMarcador(la, ln);
      }
      setIaStatus(`✓ Local: ${data[0].display_name.substring(0, 45)}...`, 'ok');
    } catch (err: any) {
      console.error(err);
      setIaStatus('Erro ao geocodificar cidade.', 'erro');
    }
  }

  async function preencherComIA() {
    const texto = roteiro.trim();
    if (!texto) { setIaStatus('Cole um roteiro primeiro.', 'erro'); return; }
    setIaLoading(true);
    setIaStatus('Analisando roteiro...');
    try {
      const res = await fetch(DEEPSEEK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: DEEPSEEK_MODEL_CONFIG,
          messages: [
            { role: 'system', content: 'Você devolve apenas JSON válido.' },
            { role: 'user', content: buildPromptExtracao(texto) },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.4,
        }),
      });
      if (!res.ok) { const err = await res.text(); throw new Error(`API ${res.status}: ${err.substring(0, 200)}`); }
      const data = await res.json();
      const conteudo = data.choices?.[0]?.message?.content;
      if (!conteudo) throw new Error('Resposta vazia da IA.');
      const info = JSON.parse(conteudo);

      if (info.cenario) setCenarioNome(info.cenario);
      if (info.protagonista) {
        setProtagNome(info.protagonista.nome || '');
        setProtagPapel(info.protagonista.papel || '');
        setProtagBio(info.protagonista.bio || '');
      }
      if (info.tom) { const t = info.tom.toUpperCase(); if (TOM_OPCOES.some(o => o.value === t)) setTom(t); }
      if (info.ritmo) { const r = info.ritmo.toUpperCase(); if (RITMO_OPCOES.some(o => o.value === r)) setRitmo(r); }
      setDadosIaTemp({ npcs: Array.isArray(info.npcs) ? info.npcs : [], faccoes: Array.isArray(info.faccoes) ? info.faccoes : [] });
      if (info.localInicial && info.localInicial.cidade) await geocodificarCidade(info.localInicial.cidade, info.localInicial.zoom || 5);

      setIaStatus('✓ Preenchido. Revise os próximos passos.', 'ok');
    } catch (err: any) {
      console.error(err);
      setIaStatus('Erro: ' + err.message, 'erro');
    } finally {
      setIaLoading(false);
    }
  }

  function irParaPasso(n: number) { setPasso(Math.max(1, Math.min(5, n))); }

  function handleIniciar() {
    const roteiroLimpo = roteiro.trim();
    if (!roteiroLimpo) { alert('Cole um roteiro antes de iniciar.'); irParaPasso(1); return; }
    onIniciar({
      roteiro: roteiroLimpo,
      cenario: cenarioNome.trim() || 'Sem nome',
      localInicial: { lat, lng, zoom },
      protagonista: {
        nome: protagNome.trim() || 'Protagonista',
        papel: protagPapel.trim() || 'Sem papel definido',
        bio: protagBio.trim(),
      },
      tom, ritmo,
      npcs: dadosIaTemp.npcs,
      faccoes: dadosIaTemp.faccoes,
    });
  }

  const steps = ['Roteiro', 'Mundo', 'Protagonista', 'Estilo', 'Revisão'];

  return (
    <div className="screen screen-config" style={{ display: active ? 'grid' : 'none' }}>
      <header className="config-header">
        <div className="config-brand">MOTOR UNIVERSAL <span className="sub">// CONFIGURAÇÃO DE MUNDO</span></div>
        <button className="link-btn" onClick={onVoltarMenu}>&#8592; Voltar ao Menu</button>
      </header>

      <div className="config-body">
        <aside className="config-toc">
          <div className="config-toc-label">// Etapas</div>
          {steps.map((s, i) => (
            <button key={s} className={`toc-step ${passo === i + 1 ? 'is-active' : ''} ${passo > i + 1 ? 'is-done' : ''}`} onClick={() => irParaPasso(i + 1)}>
              <span className="toc-roman">{ROMANOS[i]}</span> {s}
            </button>
          ))}
        </aside>

        <main className="config-main">
          <section className={`config-page ${passo === 1 ? 'is-active' : ''}`}>
            <h1>Cenário e Roteiro</h1>
            <p className="desc">Cole o roteiro bruto do mundo. Depois clique em Preencher com IA para que a IA extraia cenário, protagonista, tom, ritmo e local inicial.</p>
            <div className="form-field">
              <label>Roteiro Completo <span className="hint">(texto livre)</span></label>
              <textarea className="roteiro" value={roteiro} onChange={e => setRoteiro(e.target.value)} placeholder="Cole o roteiro aqui..."></textarea>
              <div className="field-meta"><span>Formato livre</span><span>{roteiro.length} caracteres</span></div>
              <div className="ia-fill-row">
                <button className="btn btn-accent" onClick={preencherComIA} disabled={iaLoading}>Preencher com IA</button>
                <span className={`ia-status ${iaStatus.tipo === 'ok' ? 'is-ok' : iaStatus.tipo === 'erro' ? 'is-erro' : ''}`}>{iaStatus.msg}</span>
              </div>
            </div>
          </section>

          <section className={`config-page ${passo === 2 ? 'is-active' : ''}`}>
            <h1>Mundo e Local Inicial</h1>
            <p className="desc">Clique no mapa para definir onde a simulação começa.</p>
            <div className="form-field">
              <label>Nome do Cenário <span className="hint">(opcional)</span></label>
              <input type="text" value={cenarioNome} onChange={e => setCenarioNome(e.target.value)} placeholder="Ex: Refúgio Central" />
            </div>
            <div className="form-field">
              <label>Local Inicial no Mapa</label>
              <div className="map-picker"><div ref={mapDivRef} style={{ width: '100%', height: '100%' }}></div></div>
              <div className="map-coords">
                <span>LATITUDE: <span className="val">{lat.toFixed(4)}</span></span>
                <span>LONGITUDE: <span className="val">{lng.toFixed(4)}</span></span>
                <span>ZOOM: <span className="val">{zoom}</span></span>
              </div>
            </div>
          </section>

          <section className={`config-page ${passo === 3 ? 'is-active' : ''}`}>
            <h1>Protagonista</h1>
            <p className="desc">Defina quem o jogador controla.</p>
            <div className="form-field"><label>Nome</label><input type="text" value={protagNome} onChange={e => setProtagNome(e.target.value)} placeholder="Ex: João Vasconcelos" /></div>
            <div className="form-field"><label>Função / Papel</label><input type="text" value={protagPapel} onChange={e => setProtagPapel(e.target.value)} placeholder="Ex: Líder do Refúgio" /></div>
            <div className="form-field"><label>Background <span className="hint">(opcional)</span></label><textarea className="bio" value={protagBio} onChange={e => setProtagBio(e.target.value)}></textarea></div>
          </section>

          <section className={`config-page ${passo === 4 ? 'is-active' : ''}`}>
            <h1>Estilo Narrativo</h1>
            <p className="desc">Define como o Motor escreve a prosa.</p>
            <div className="form-field">
              <label>Tom Narrativo</label>
              <div className="radio-grid">
                {TOM_OPCOES.map(o => (
                  <div key={o.value} className={`radio-card ${tom === o.value ? 'is-selected' : ''}`} onClick={() => setTom(o.value)}>
                    <h5>{o.value}</h5><p>{o.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="form-field">
              <label>Ritmo</label>
              <div className="radio-grid">
                {RITMO_OPCOES.map(o => (
                  <div key={o.value} className={`radio-card ${ritmo === o.value ? 'is-selected' : ''}`} onClick={() => setRitmo(o.value)}>
                    <h5>{o.value}</h5><p>{o.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className={`config-page ${passo === 5 ? 'is-active' : ''}`}>
            <h1>Revisão</h1>
            <p className="desc">Confira antes de iniciar.</p>
            <div className="review-grid">
              <div className="review-card">
                <h5>Roteiro</h5>
                <p className={!roteiro.trim() ? 'is-empty' : ''}>{roteiro.trim() ? (roteiro.trim().length > 200 ? roteiro.trim().substring(0, 200) + '...' : roteiro.trim()) : 'Não fornecido'}</p>
              </div>
              <div className="review-card">
                <h5>Mundo</h5>
                <p><span className="k">Cenário:</span> {cenarioNome.trim() || 'Sem nome'}</p>
                <p><span className="k">Lat:</span> {lat.toFixed(4)}</p>
                <p><span className="k">Lng:</span> {lng.toFixed(4)}</p>
              </div>
              <div className="review-card">
                <h5>Protagonista</h5>
                <p className={!protagNome.trim() ? 'is-empty' : ''}><span className="k">Nome:</span> {protagNome.trim() || 'Não definido'}</p>
                <p className={!protagPapel.trim() ? 'is-empty' : ''}><span className="k">Papel:</span> {protagPapel.trim() || 'Não definido'}</p>
              </div>
              <div className="review-card">
                <h5>Estilo</h5>
                <p><span className="k">Tom:</span> {tom}</p>
                <p><span className="k">Ritmo:</span> {ritmo}</p>
              </div>
            </div>
          </section>
        </main>
      </div>

      <footer className="config-footer">
        <button className="btn" disabled={passo === 1} onClick={() => irParaPasso(passo - 1)}>&#8592; Anterior</button>
        <div className="step-indicator"><span className="cur">{String(passo).padStart(2, '0')}</span> / 05</div>
        <button className="btn btn-accent" onClick={() => passo === 5 ? handleIniciar() : irParaPasso(passo + 1)}>{passo === 5 ? 'Iniciar Simulação ✓' : 'Próximo →'}</button>
      </footer>
    </div>
  );
}
