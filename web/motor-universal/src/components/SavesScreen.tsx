import { useState, useEffect } from 'react';
import type { SaveSlot } from '../types';
import { listSaves, deleteSave } from '../storage';
import { InfoScreen } from './InfoScreen';

interface SavesScreenProps {
  active: boolean;
  onVoltar: () => void;
  onCarregar: (slot: SaveSlot) => void;
}

function formatarData(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function SavesScreen({ active, onVoltar, onCarregar }: SavesScreenProps) {
  const [saves, setSaves] = useState<SaveSlot[]>([]);

  useEffect(() => {
    if (active) setSaves(listSaves());
  }, [active]);

  function handleExcluir(id: string) {
    if (!window.confirm('Excluir este save? Essa ação não pode ser desfeita.')) return;
    deleteSave(id);
    setSaves(listSaves());
  }

  return (
    <InfoScreen active={active} titulo="Carregar Save" subtitulo="SAVES" onVoltar={onVoltar}>
      {saves.length === 0 ? (
        <div className="placeholder-block" style={{ height: '50vh' }}>
          <div className="icon">&#9674;</div>
          <div>Nenhum save encontrado</div>
          <div style={{ fontSize: '0.65rem', letterSpacing: '0.15em', opacity: 0.7, textTransform: 'none', fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>
            Inicie uma simulação e clique em "Save" no rodapé do HUD para criar um.
          </div>
        </div>
      ) : (
        <div className="saves-list">
          {saves.map(s => (
            <div className="save-row" key={s.id}>
              <div className="save-row-info">
                <div className="save-row-title">{s.cenario}</div>
                <div className="save-row-meta">
                  {s.protagonistaNome} · Turno {String(s.turno).padStart(2, '0')} · {formatarData(s.savedAt)}
                </div>
              </div>
              <div className="save-row-actions">
                <button className="btn btn-accent" onClick={() => onCarregar(s)}>Carregar</button>
                <button className="btn" onClick={() => handleExcluir(s.id)}>Excluir</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </InfoScreen>
  );
}
