// Copia um valor sensível para a área de transferência e agenda a
// limpeza automática dela depois de CLEAR_DELAY_MS. Isso evita que uma
// senha copiada fique disponível pra qualquer outro app que leia o
// clipboard depois que você já esqueceu que copiou algo.
//
// Proteção contra "limpar por cima": se a pessoa copiar um valor NOVO
// antes do timeout do valor anterior expirar, só o valor mais recente
// deve ser limpo no fim do seu próprio timer — nunca apagar um clipboard
// que já foi sobrescrito por outra coisa (copiada pelo usuário ou por
// outro app).

export const CLEAR_DELAY_MS = 20_000;

export async function copyWithAutoClear(value, clearDelayMs = CLEAR_DELAY_MS) {
  await navigator.clipboard.writeText(value);

  setTimeout(async () => {
    try {
      const current = await navigator.clipboard.readText();
      if (current === value) {
        await navigator.clipboard.writeText("");
      }
    } catch {
      // Alguns navegadores negam permissão de LEITURA do clipboard sem
      // interação direta do usuário no momento da leitura — nesse caso,
      // simplesmente não limpamos, em vez de travar com um erro não
      // tratado. Copiar continua funcionando normalmente.
    }
  }, clearDelayMs);
}
