import { InfoScreen } from './InfoScreen';

interface AjustesScreenProps { active: boolean; onVoltar: () => void; }

export function AjustesScreen({ active, onVoltar }: AjustesScreenProps) {
  return (
    <InfoScreen active={active} titulo="Configurações" subtitulo="CONFIGURAÇÕES" onVoltar={onVoltar}>
      <div className="placeholder-block" style={{ height: '50vh' }}>
        <div className="icon">&#9674;</div>
        <div>Em construção</div>
        <div style={{ fontSize: '0.65rem', letterSpacing: '0.15em', opacity: 0.7, textTransform: 'none', fontFamily: 'var(--font-serif)', fontStyle: 'italic', maxWidth: '360px' }}>
          Ainda não há preferências globais para ajustar. As opções de cada simulação (tom, ritmo, mapa) ficam em "Nova Simulação".
        </div>
      </div>
    </InfoScreen>
  );
}
