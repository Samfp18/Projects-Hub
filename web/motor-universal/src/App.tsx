import { useState } from 'react';
import type { ConfigMemoria, Tela } from './types';
import { MenuScreen } from './components/MenuScreen';
import { ConfigScreen } from './components/ConfigScreen';
import { HudScreen } from './components/HudScreen';
import { IabugScreen } from './components/IabugScreen';
import { IabugPasswordModal } from './components/IabugPasswordModal';

function App() {
  const [tela, setTela] = useState<Tela>('menu');
  const [configMemoria, setConfigMemoria] = useState<ConfigMemoria | null>(null);
  const [iabugModalOpen, setIabugModalOpen] = useState<boolean>(false);
  const [iabugRetorno, setIabugRetorno] = useState<Tela>('hud');

  function handleMenuAction(action: string) {
    if (action === 'nova') setTela('config');
    else if (action === 'continuar') { if (configMemoria) setTela('hud'); }
    else console.log('Ação não implementada:', action);
  }

  function handleIniciarSimulacao(config: ConfigMemoria) {
    setConfigMemoria(config);
    setTela('hud');
  }

  function handleOpenIabug() {
    setIabugRetorno(tela);
    setIabugModalOpen(true);
  }

  return (
    <>
      <MenuScreen active={tela === 'menu'} onAction={handleMenuAction} canContinuar={!!configMemoria} />
      <ConfigScreen active={tela === 'config'} onVoltarMenu={() => setTela('menu')} onIniciar={handleIniciarSimulacao} />
      <HudScreen active={tela === 'hud'} configMemoria={configMemoria} onVoltarMenu={() => setTela('menu')} onOpenIabug={handleOpenIabug} />
      <IabugScreen active={tela === 'iabug'} configMemoria={configMemoria} onVoltar={() => setTela(iabugRetorno)} />
      <IabugPasswordModal isOpen={iabugModalOpen} onCancel={() => setIabugModalOpen(false)} onSuccess={() => { setIabugModalOpen(false); setTela('iabug'); }} />
    </>
  );
}

export default App;
