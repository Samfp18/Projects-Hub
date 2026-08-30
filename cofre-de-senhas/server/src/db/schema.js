// SQLite via better-sqlite3 — mesma escolha do Guardião de Acessos: zero
// configuração externa, roda em arquivo local. Suficiente para um vault
// pessoal (poucos usuários, baixa concorrência).
//
// PONTO CRÍTICO DE SEGURANÇA: a tabela `vault_items` NUNCA tem colunas
// como `title`, `username`, `password`, `url` ou `notes` em texto puro.
// Ela só guarda `ciphertext` (o item inteiro, já criptografado no
// navegador do usuário) e metadados não-sensíveis (id, quando foi criado,
// se é favorito). Se você olhar essa tabela direto no banco, não vai
// conseguir ler nenhuma senha — só bytes cifrados.

import Database from "better-sqlite3";

export function createDb(path = process.env.DB_PATH || "./data.sqlite") {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      auth_hash TEXT NOT NULL,
      totp_secret TEXT,
      totp_enabled INTEGER NOT NULL DEFAULT 0,
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until INTEGER,
      -- Parâmetros de derivação de chave (PBKDF2), guardados em texto
      -- puro de propósito: NÃO são segredo. O atacante precisaria da
      -- senha mestra em si, que nunca chega aqui — saber "quantas
      -- iterações" não ajuda em nada sem ela.
      kdf_salt TEXT NOT NULL,
      kdf_iterations INTEGER NOT NULL,
      -- A chave de criptografia do cofre, envolvida (encriptada) pela
      -- chave derivada da senha mestra. Trocar a senha mestra só exige
      -- re-envolver esta chave, não recriptografar cada item.
      wrapped_vault_key TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      revoked INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vault_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ciphertext TEXT NOT NULL,
      iv TEXT NOT NULL,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vault_item_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL REFERENCES vault_items(id) ON DELETE CASCADE,
      ciphertext TEXT NOT NULL,
      iv TEXT NOT NULL,
      archived_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      email TEXT,
      event TEXT NOT NULL,
      ip_hash TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_vault_items_user ON vault_items(user_id);
    CREATE INDEX IF NOT EXISTS idx_vault_item_history_item ON vault_item_history(item_id);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
  `);

  return db;
}
