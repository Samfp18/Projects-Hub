import type { ReactNode } from 'react';

interface InfoScreenProps {
  active: boolean;
  titulo: string;
  subtitulo: string;
  onVoltar: () => void;
  children: ReactNode;
}

export function InfoScreen({ active, titulo, subtitulo, onVoltar, children }: InfoScreenProps) {
  return (
    <div className="screen screen-info" style={{ display: active ? 'grid' : 'none' }}>
      <header className="config-header">
        <div className="config-brand">MOTOR UNIVERSAL <span className="sub">// {subtitulo}</span></div>
        <button className="link-btn" onClick={onVoltar}>&#8592; Voltar ao Menu</button>
      </header>
      <div className="info-body">
        <h1>{titulo}</h1>
        {children}
      </div>
    </div>
  );
}
