import { expect, test, type Page } from "@playwright/test";

// A busca roda no SQL, entao so a pilha real (web + API + banco) exercita o
// casamento. Sem a API no ar o spec e pulado em vez de falhar.
const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

async function isApiUp(): Promise<boolean> {
  try {
    const response = await fetch(`${apiBaseUrl}/proposicoes/feed?limit=1`);
    return response.ok;
  } catch {
    return false;
  }
}

async function identificadorDoPrimeiroCard(page: Page): Promise<string> {
  const primeiro = page.locator("article").first();
  await expect(primeiro).toBeVisible();
  return (await primeiro.locator("p.font-mono").first().innerText()).trim();
}

test.describe("busca do feed de proposições", () => {
  test.beforeAll(async () => {
    test.skip(
      !(await isApiUp()),
      `API indisponível em ${apiBaseUrl}; a busca só pode ser verificada com a pilha real`,
    );
  });

  test("encontra a proposição pelo próprio identificador legislativo", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/proposicoes");
    const identificador = await identificadorDoPrimeiroCard(page);

    // Act
    await page.goto(`/proposicoes?q=${encodeURIComponent(identificador)}`);

    // Assert
    expect(await identificadorDoPrimeiroCard(page)).toBe(identificador);
  });

  test("ignora acento no termo buscado", async ({ page }) => {
    // Arrange
    await page.goto("/proposicoes?q=saude");
    const semAcento = await page.locator("article").count();

    // Act
    await page.goto("/proposicoes?q=sa%C3%BAde");

    // Assert
    expect(await page.locator("article").count()).toBe(semAcento);
    expect(semAcento).toBeGreaterThan(0);
  });

  test("mostra o estado vazio quando nenhum termo casa", async ({ page }) => {
    // Arrange & Act
    await page.goto("/proposicoes?q=zzzqqqxxx");

    // Assert
    await expect(page.locator("article")).toHaveCount(0);
  });
});
