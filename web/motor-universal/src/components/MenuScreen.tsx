import { useState, useEffect } from 'react';

interface MenuItem { action: string; label: string; disabled?: boolean; }
interface MenuScreenProps { active: boolean; onAction: (action: string) => void; canContinuar: boolean; }

export function MenuScreen({ active, onAction, canContinuar }: MenuScreenProps) {
  const itens: MenuItem[] = [
    { action: 'nova', label: 'Nova Simulação' },
    { action: 'continuar', label: 'Continuar', disabled: !canContinuar },
    { action: 'carregar', label: 'Carregar Save' },
    { action: 'ajustes', label: 'Configurações' },
    { action: 'sobre', label: 'Sobre o Motor' },
    { action: 'sair', label: 'Sair' },
  ];
  const habilitados = itens.filter(i => !i.disabled);
  const [selIndex, setSelIndex] = useState<number>(0);
  const [clock, setClock] = useState<string>('--:--:--');

  useEffect(() => {
    function tick() {
      const now = new Date();
      setClock(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelIndex(i => (i + 1) % habilitados.length); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSelIndex(i => (i - 1 + habilitados.length) % habilitados.length); }
      else if (e.key === 'Enter') { e.preventDefault(); const it = habilitados[selIndex]; if (it) onAction(it.action); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active, selIndex, habilitados, onAction]);

  return (
    <div className="screen screen-menu" style={{ display: active ? 'flex' : 'none' }}>
      <div className="menu-stamp">// SISTEMA DE SIMULAÇÃO NARRATIVA</div>
      <h1 className="menu-title">MOTOR <em>UNIVERSAL</em></h1>
      <div className="menu-version">V · 0 . 1</div>
      <nav className="menu-index">
        {itens.map((it) => {
          const idx = habilitados.indexOf(it);
          const isActive = !it.disabled && idx === selIndex;
          return (
            <button
              key={it.action}
              disabled={it.disabled}
              className={`menu-index-item ${isActive ? 'is-active' : ''}`}
              onMouseEnter={() => !it.disabled && setSelIndex(idx)}
              onClick={() => !it.disabled && onAction(it.action)}
            >
              <span className="idx-leader"></span>
              <span>{it.label}</span>
              <span className="idx-arrow">&#8594;</span>
            </button>
          );
        })}
      </nav>
      <footer className="menu-footer">
        <span>aguardando diretriz</span>
        <span>{clock}</span>
      </footer>
    </div>
  );
}
