import { useState } from 'react';
import type { ConfigMemoria, Tela, SaveSlot, NarrativaState } from './types';
import { MenuScreen } from './components/MenuScreen';
import { ConfigScreen } from './components/ConfigScreen';
import { HudScreen } from './components/HudScreen';
import { IabugScreen } from './components/IabugScreen';
import { IabugPasswordModal } from './components/IabugPasswordModal';
import { SobreScreen } from './components/SobreScreen';
import { AjustesScreen } from './components/AjustesScreen';
import { SavesScreen } from './components/SavesScreen';
import { upsertSave, novoSaveId } from './storage';

function App() {
  const [tela, setTela] = useState<Tela>('menu');
  const [configMemoria, setConfigMemoria] = useState<ConfigMemoria | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [resumeSlot, setResumeSlot] = useState<SaveSlot | null>(null);
  const [iabugModalOpen, setIabugModalOpen] = useState<boolean>(false);
  const [iabugRetorno, setIabugRetorno] = useState<Tela>('hud');

  function handleMenuAction(action: string) {
    if (action === 'nova') setTela('config');
    else if (action === 'continuar') { if (configMemoria) setTela('hud'); }
    else if (action === 'carregar') setTela('saves');
    else if (action === 'ajustes') setTela('ajustes');
    else if (action === 'sobre') setTela('sobre');
    else console.log('Ação não implementada:', action);
  }

  function handleIniciarSimulacao(config: ConfigMemoria) {
    setConfigMemoria(config);
    setSessionId(novoSaveId());
    setResumeSlot(null);
    setTela('hud');
  }

  function handleCarregarSave(slot: SaveSlot) {
    setConfigMemoria(slot.configMemoria);
    setSessionId(slot.id);
    setResumeSlot(slot);
    setTela('hud');
  }

  function handleSave(snapshot: { turno: number; vinheta: number; historicoVinhetas: string[]; narrativa: NarrativaState }) {
    if (!configMemoria || !sessionId) return;
    upsertSave({
      id: sessionId,
      cenario: configMemoria.cenario,
      protagonistaNome: configMemoria.protagonista.nome,
      savedAt: new Date().toISOString(),
      configMemoria,
      ...snapshot,
    });
  }

  function handleOpenIabug() {
    setIabugRetorno(tela);
    setIabugModalOpen(true);
  }

  return (
    <>
      <MenuScreen active={tela === 'menu'} onAction={handleMenuAction} canContinuar={!!configMemoria} />
      <ConfigScreen active={tela === 'config'} onVoltarMenu={() => setTela('menu')} onIniciar={handleIniciarSimulacao} />
      <HudScreen
        active={tela === 'hud'}
        configMemoria={configMemoria}
        resumeSlot={resumeSlot}
        onVoltarMenu={() => setTela('menu')}
        onOpenIabug={handleOpenIabug}
        onSave={handleSave}
      />
      <IabugScreen active={tela === 'iabug'} configMemoria={configMemoria} onVoltar={() => setTela(iabugRetorno)} />
      <IabugPasswordModal isOpen={iabugModalOpen} onCancel={() => setIabugModalOpen(false)} onSuccess={() => { setIabugModalOpen(false); setTela('iabug'); }} />
      <SobreScreen active={tela === 'sobre'} onVoltar={() => setTela('menu')} />
      <AjustesScreen active={tela === 'ajustes'} onVoltar={() => setTela('menu')} />
      <SavesScreen active={tela === 'saves'} onVoltar={() => setTela('menu')} onCarregar={handleCarregarSave} />
    </>
  );
}

export default App;
