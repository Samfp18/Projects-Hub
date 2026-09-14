export function iniciais(nome?: string): string {
  if (!nome) return '??';
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function autonomiaInfo(grau?: number) {
  const g = grau || 0;
  const mapa: Record<number, { label: string; nome: string; classe: string }> = {
    0: { label: 'AUT 0', nome: 'Dependente', classe: '' },
    1: { label: 'AUT I', nome: 'Colaborador', classe: '' },
    2: { label: 'AUT II', nome: 'Parceiro', classe: 'mid' },
    3: { label: 'AUT III', nome: 'Independente', classe: 'mid' },
    4: { label: 'AUT IV', nome: 'Divergente', classe: 'high' },
    5: { label: 'AUT V', nome: 'Autônomo', classe: 'high' },
  };
  return mapa[g] || mapa[0];
}

export function relacaoLabel(r?: string): string {
  const mapa: Record<string, string> = {
    conhecimento: 'Conhecimento',
    confianca: 'Confiança',
    intimidade: 'Intimidade',
    dependencia: 'Dependência',
    ruptura: 'Ruptura',
  };
  return (r && mapa[r]) || r || '—';
}

export function faccaoInfo(r?: string): { label: string; classe: string } {
  const mapa: Record<string, { label: string; classe: string }> = {
    aliada: { label: 'Aliada', classe: 'rel-ally' },
    propria: { label: 'Própria', classe: 'rel-ally' },
    neutra: { label: 'Neutra', classe: 'rel-neutral' },
    hostil: { label: 'Hostil', classe: 'rel-hostile' },
    guerra: { label: 'Guerra', classe: 'rel-war' },
  };
  return (r && mapa[r]) || { label: r || '—', classe: 'rel-neutral' };
}

export function asciiBar(pct: number, width: number = 10): string {
  const filled = Math.max(0, Math.min(width, Math.round((pct / 100) * width)));
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

export function horaAgora(): string {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
