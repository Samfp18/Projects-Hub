import type { SaveSlot } from './types';

const STORAGE_KEY = 'motor-universal:saves';
const MAX_SAVES = 20;

function lerTudo(): SaveSlot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Erro ao ler saves do localStorage:', err);
    return [];
  }
}

function escreverTudo(saves: SaveSlot[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saves));
  } catch (err) {
    console.error('Erro ao salvar no localStorage:', err);
  }
}

export function listSaves(): SaveSlot[] {
  return lerTudo().sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function upsertSave(slot: SaveSlot) {
  const saves = lerTudo();
  const idx = saves.findIndex(s => s.id === slot.id);
  if (idx >= 0) saves[idx] = slot;
  else saves.unshift(slot);
  const limitado = saves
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
    .slice(0, MAX_SAVES);
  escreverTudo(limitado);
}

export function deleteSave(id: string) {
  escreverTudo(lerTudo().filter(s => s.id !== id));
}

export function novoSaveId(): string {
  return 'save-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}
