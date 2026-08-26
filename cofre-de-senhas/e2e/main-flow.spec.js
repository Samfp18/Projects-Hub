import { test, expect } from "@playwright/test";

test.describe("Cofre de Senhas — fluxo principal", () => {
  test("carrega a página com o título correto", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Cofre de Senhas" })).toBeVisible();
  });

  test("analisa uma senha fraca e mostra o carimbo FRACA", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Digite a senha a analisar").fill("123456");
    await expect(page.getByText("FRACA")).toBeVisible({ timeout: 10_000 });
  });

  test("gera uma senha aleatória com o comprimento configurado", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Gerar" }).click();

    const lengthSlider = page.locator("#length-range");
    await lengthSlider.fill("24");

    // A senha some por trás de "•" por padrão (oculta) — clicamos em
    // revelar antes de medir o comprimento do texto exibido.
    await page.getByRole("button", { name: "revelar" }).click();

    const passwordText = await page.locator("code").first().textContent();
    expect(passwordText.trim().length).toBe(24);
  });

  test("gera uma senha a partir de frase e permite copiar", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "A partir de frase" }).click();

    await page.getByPlaceholder(/meu cachorro adora praia/).fill("teste e2e cofre de senhas");

    await expect(page.locator("code").first()).not.toHaveText("—", { timeout: 10_000 });
  });

  test("mostra aviso de rate limit ou resultado ao consultar vazamento", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Digite a senha a analisar").fill("correcthorsebatterystaple");
    await page.getByRole("button", { name: "Consultar base de vazamentos" }).click();

    // O backend pode estar hibernando (Render free tier) ou indisponível
    // no ambiente de CI — aceitamos qualquer um dos desfechos válidos em
    // vez de exigir sucesso, já que este teste roda contra a UI real, não
    // um mock, e a disponibilidade do backend está fora do controle do
    // frontend em si.
    const resultado = page.getByText(/vazamento|Não encontrada|Muitas consultas|Não foi possível consultar/);
    await expect(resultado).toBeVisible({ timeout: 20_000 });
  });
});
