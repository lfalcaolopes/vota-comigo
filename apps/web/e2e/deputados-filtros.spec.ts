import { expect, test, type Page } from "@playwright/test";

// Os filtros casam URL, painel e consulta no SQL, então só a pilha real
// exercita a migração. Sem a API no ar o spec é pulado em vez de falhar.
const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

async function isApiUp(): Promise<boolean> {
  try {
    const response = await fetch(`${apiBaseUrl}/deputados/feed?limit=1`);
    return response.ok;
  } catch {
    return false;
  }
}

function abrirFiltros(page: Page) {
  return page.getByRole("button", { name: /^Filtros/ });
}

function painel(page: Page) {
  return page.getByRole("dialog");
}

function estado(page: Page, nome: string) {
  return painel(page)
    .getByRole("group", { name: "Filtrar por estado" })
    .getByRole("button", { name: nome, exact: true });
}

test.describe("painel de filtros da listagem de deputados", () => {
  test.beforeAll(async () => {
    test.skip(
      !(await isApiUp()),
      `API indisponível em ${apiBaseUrl}; os filtros só podem ser verificados com a pilha real`,
    );
  });

  test("conta apenas os filtros fora do padrão", async ({ page }) => {
    // Act
    await page.goto("/deputados");

    // Assert
    await expect(abrirFiltros(page)).toHaveText("Filtros");

    // Act
    await page.goto("/deputados?uf=SP&emAtividade=true");

    // Assert
    await expect(abrirFiltros(page)).toContainText("2");
  });

  test("aplica estado e atividade em bloco, com uma única consulta", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/deputados");
    const consultas: string[] = [];
    page.on("request", (request) => {
      if (request.url().startsWith(`${apiBaseUrl}/deputados/feed`)) {
        consultas.push(request.url());
      }
    });

    // Act
    await abrirFiltros(page).click();
    await expect(painel(page)).toBeVisible();
    await painel(page).getByText("Em atividade").click();
    await expect(
      painel(page).getByRole("checkbox", { name: "Em atividade" }),
    ).toBeChecked();
    await estado(page, "São Paulo").click();
    await painel(page).getByRole("button", { name: "Aplicar" }).click();

    // Assert
    await expect(painel(page)).toBeHidden();
    await expect(page).toHaveURL(/emAtividade=true/);
    await expect(page).toHaveURL(/uf=SP/);
    await expect(
      page.getByRole("button", { name: "Remover filtro Estado: São Paulo" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Remover filtro Em atividade" }),
    ).toBeVisible();
    expect(consultas).toHaveLength(1);
  });

  test("mantém Aplicar desabilitado enquanto o rascunho não muda", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/deputados?uf=SP");

    // Act
    await abrirFiltros(page).click();

    // Assert
    await expect(
      painel(page).getByRole("button", { name: "Aplicar" }),
    ).toBeDisabled();

    // Act
    await estado(page, "Rio de Janeiro").click();

    // Assert
    await expect(
      painel(page).getByRole("button", { name: "Aplicar" }),
    ).toBeEnabled();
  });

  test("descarta o rascunho ao fechar sem aplicar", async ({ page }) => {
    // Arrange
    await page.goto("/deputados?uf=SP");

    // Act
    await abrirFiltros(page).click();
    await estado(page, "Rio de Janeiro").click();
    await page.keyboard.press("Escape");
    await expect(painel(page)).toBeHidden();
    await abrirFiltros(page).click();

    // Assert
    await expect(estado(page, "São Paulo")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page).toHaveURL(/uf=SP/);
  });

  test("remove um filtro pelo chip, sem abrir o painel", async ({ page }) => {
    // Arrange
    await page.goto("/deputados?uf=SP&emAtividade=true");

    // Act
    await page
      .getByRole("button", { name: "Remover filtro Estado: São Paulo" })
      .click();

    // Assert
    await expect(painel(page)).toBeHidden();
    await expect(page).not.toHaveURL(/uf=SP/);
    await expect(page).toHaveURL(/emAtividade=true/);
    await expect(abrirFiltros(page)).toContainText("1");
  });

  test("limpa os filtros preservando a busca", async ({ page }) => {
    // Arrange
    await page.goto("/deputados?q=maria&uf=SP");

    // Act
    await page.getByRole("button", { name: "Limpar filtros" }).click();

    // Assert
    await expect(page).toHaveURL(/q=maria/);
    await expect(page).not.toHaveURL(/uf=SP/);
    await expect(abrirFiltros(page)).toHaveText("Filtros");
    await expect(page.getByText("Resultados para")).toBeVisible();
  });
});
