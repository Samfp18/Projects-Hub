export interface NpcData {
  nome: string;
  papel?: string;
  relacao?: string;
  autonomia?: number;
  nota?: string;
}

export interface FaccaoData {
  nome: string;
  relacao?: string;
  cor?: string;
  nota?: string;
}

export interface ConfigMemoria {
  roteiro: string;
  cenario: string;
  localInicial: { lat: number; lng: number; zoom: number };
  protagonista: { nome: string; papel: string; bio: string };
  tom: string;
  ritmo: string;
  npcs: NpcData[];
  faccoes: FaccaoData[];
}

export interface LogEntry {
  id: string;
  ts: string;
  tipo: string;
  msg: string;
}

export type Tela = 'menu' | 'config' | 'hud' | 'iabug';

export type NarrativaState =
  | { tipo: 'placeholder' }
  | { tipo: 'loading' }
  | { tipo: 'erro'; message: string }
  | { tipo: 'content'; turno: number; vinheta: number; dataStr: string; horaStr: string; paragrafos: string[] };

export interface ChatMsg {
  id: string;
  tipo: 'system' | 'user' | 'ia';
  texto: string;
}
