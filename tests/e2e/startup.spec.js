/**
 * tests/e2e/startup.spec.js
 * Smoke test: Spiel lädt korrekt – Canvas erscheint, keine JS-Fehler
 */
import { test, expect } from "@playwright/test";

test.describe("Startup", () => {
  test("Seite lädt ohne Fehler und Canvas ist sichtbar", async ({ page }) => {
    const jsErrors = [];
    page.on("pageerror", (err) => jsErrors.push(err.message));

    await page.goto("/");

    // Canvas should appear within 8 seconds (Phaser init + PreloadScene)
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 8000 });

    // No JS errors during load
    expect(
      jsErrors,
      `JS-Fehler aufgetreten: ${jsErrors.join(", ")}`,
    ).toHaveLength(0);
  });

  test("game-container existiert und hat Inhalt", async ({ page }) => {
    await page.goto("/");
    const container = page.locator("#game-container");
    await expect(container).toBeVisible();
    // Phaser inserts the canvas into the container
    await expect(container.locator("canvas")).toBeVisible({ timeout: 8000 });
  });

  test("Titel-Tag ist korrekt", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Night Protocol/i);
  });

  test("keine 404-Fehler beim Laden von Ressourcen", async ({ page }) => {
    const failed404 = [];
    page.on("response", (resp) => {
      if (resp.status() === 404) failed404.push(resp.url());
    });

    await page.goto("/");
    // Wait for game to initialize
    await page.waitForTimeout(4000);

    expect(failed404, `404 Ressourcen: ${failed404.join("\n")}`).toHaveLength(
      0,
    );
  });
});
