export const LOCAIS_MAPA = [
  { nome: 'Refúgio Central', tipo: 'Base Aliada', lat: -23.55, lng: -46.63, tipoMapa: 'ally', pop: 47 },
  { nome: 'Porto Litoral', tipo: 'Base Neutra', lat: -22.90, lng: -43.20, tipoMapa: 'neutral', pop: 122 },
  { nome: 'Fortaleza Sul', tipo: 'Base Inimiga', lat: -25.43, lng: -49.27, tipoMapa: 'enemy', pop: 80 },
  { nome: 'Colônia Bahia', tipo: 'Base Neutra', lat: -12.97, lng: -38.50, tipoMapa: 'neutral', pop: 210 },
  { nome: 'Núcleo Nordeste', tipo: 'Base Aliada', lat: -8.05, lng: -34.88, tipoMapa: 'ally', pop: 63 },
  { nome: 'Posto Amazônia', tipo: 'Base Inimiga', lat: -3.10, lng: -60.02, tipoMapa: 'enemy', pop: 34 },
  { nome: 'Refúgio Planalto', tipo: 'Base Aliada', lat: -15.78, lng: -47.93, tipoMapa: 'ally', pop: 91 },
  { nome: 'Base Pantanal', tipo: 'Base Neutra', lat: -17.63, lng: -57.65, tipoMapa: 'neutral', pop: 12 },
];

export const FACCOES_MAPA = [
  { cor: '#7fa0c0', lat: -23.55, lng: -46.63, raio: 250000 },
  { cor: '#c99a4e', lat: -25.43, lng: -49.27, raio: 300000 },
  { cor: '#c1544c', lat: -3.10, lng: -60.02, raio: 400000 },
  { cor: '#a89d85', lat: -12.97, lng: -38.50, raio: 280000 },
];

export const ROTAS_MAPA: [number, number][][] = [
  [[-23.55, -46.63], [-22.90, -43.20]],
  [[-23.55, -46.63], [-25.43, -49.27]],
  [[-23.55, -46.63], [-15.78, -47.93]],
  [[-15.78, -47.93], [-12.97, -38.50]],
  [[-12.97, -38.50], [-8.05, -34.88]],
  [[-15.78, -47.93], [-3.10, -60.02]],
];

export const NPCS_MAPA = [
  { nome: 'Carlos', lat: -22.5, lng: -45.5, destino: 'Refúgio Central' },
  { nome: 'Ana', lat: -20.0, lng: -44.0, destino: 'Porto Litoral' },
  { nome: 'MIRA', lat: -23.55, lng: -46.63, destino: 'Refúgio Central' },
];

export const STATS_DEMO = [
  { key: 'SAUDE', label: 'SAÚDE', pct: 87, classe: 'ok' },
  { key: 'FADIGA', label: 'FADIGA', pct: 34, classe: 'warn' },
  { key: 'SANIDADE', label: 'SANIDADE', pct: 72, classe: 'info' },
];

export const RECURSOS_DEMO = [
  { label: 'Comida', real: '214 un' },
  { label: 'Água', real: '38 L' },
  { label: 'Munição', real: '412 un' },
  { label: 'Combustível', real: '22 L' },
  { label: 'Medicamentos', real: '03 un' },
];

export const STATUS_DEMO = [
  { label: 'Ferimentos', real: 'Leve (braço)' },
  { label: 'População', real: '47 pessoas' },
  { label: 'Moral', real: 'Estável' },
];

export const NEMESIS_DEMO = [
  { label: 'Vermelho', real: 'Nível III' },
  { label: 'Avistamento', real: 'Há 3 turnos' },
];

export const TOM_OPCOES = [
  { value: 'FRIO', desc: 'Direto, seco, sem adjetivos.' },
  { value: 'NOIR', desc: 'Atmosférico, sombrio, ambíguo.' },
  { value: 'ÉPICO', desc: 'Grandioso, solene, histórico.' },
];

export const RITMO_OPCOES = [
  { value: 'COMPASSADO', desc: 'Vinhetas longas. 2/turno.' },
  { value: 'PADRÃO', desc: 'Equilíbrio. 2-4/turno.' },
  { value: 'DENSO', desc: 'Muitos eventos. 4/turno.' },
];

export const ROMANOS = ['I', 'II', 'III', 'IV', 'V'];

export const HUD_TABS = [
  { id: 'narrativa', label: 'Narrativa' },
  { id: 'painel', label: 'Painel' },
  { id: 'mapa', label: 'Mapa' },
  { id: 'personagens', label: 'Personagens' },
  { id: 'faccoes', label: 'Facções' },
  { id: 'agendas', label: 'Agendas' },
  { id: 'ativos', label: 'Ativos' },
  { id: 'save', label: 'Save' },
];

export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_OPTS = { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 };
