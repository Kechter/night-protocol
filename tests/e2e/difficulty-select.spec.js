/**
 * tests/e2e/difficulty-select.spec.js
 * DifficultySelectScene: Karten sind VERTIKAL gestapelt (Phaser-Auflösung 1920×1080)
 *
 * Flow: PreloadScene → ControlsScene → [Klick] → DifficultySelectScene
 * Karten-Positionen (scene coords): Easy y=200, Normal y=290, Hard y=380, Hardcore y=470
 * X ist immer W/2 = Mitte des Canvas
 */
import { test, expect } from "@playwright/test";

// Kartenposition als Anteil der Spielauflösung (1920×1080)
const CARDS = {
  easy: { xFrac: 0.5, yFrac: 200 / 1080 },
  normal: { xFrac: 0.5, yFrac: 290 / 1080 },
  hard: { xFrac: 0.5, yFrac: 380 / 1080 },
  hardcore: { xFrac: 0.5, yFrac: 470 / 1080 },
};

/**
 * Navigiert durch PreloadScene → ControlsScene → DifficultySelectScene.
 * Ein Klick auf den Controls-Screen reicht zum Weiterschalten.
 */
async function waitForDifficultySelect(page) {
  await page.goto("/");
  // Warte auf PreloadScene + ControlsScene create()
  await page.waitForTimeout(4000);
  // ControlsScene überspringen
  await page.mouse.click(960, 540);
  // Warte auf Fade + DifficultySelectScene create()
  await page.waitForTimeout(2000);
}

async function clickCard(page, key) {
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas nicht gefunden");
  const { xFrac, yFrac } = CARDS[key];
  await page.mouse.click(box.x + box.width * xFrac, box.y + box.height * yFrac);
}

// ──────────────────────────────────────────────────────────
test.describe("ControlsScene", () => {
  test("ControlsScene erscheint nach dem Laden", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(4000);
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("Klick auf ControlsScene wechselt zu DifficultySelectScene", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForTimeout(4000);
    await page.mouse.click(960, 540);
    // Kein JS-Fehler beim Wechsel
    await page.waitForTimeout(1500);
    await expect(page.locator("canvas")).toBeVisible();
  });
});

test.describe("DifficultySelectScene", () => {
  test("Canvas ist nach dem Laden sichtbar", async ({ page }) => {
    await waitForDifficultySelect(page);
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("Kein JS-Fehler während DifficultySelectScene", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await waitForDifficultySelect(page);
    expect(errors).toHaveLength(0);
  });

  test('Easy-Karte klicken → difficulty = "easy"', async ({ page }) => {
    await waitForDifficultySelect(page);
    await clickCard(page, "easy");
    await page.waitForTimeout(800);
    const difficulty = await page.evaluate(() => window.__NP_DIFFICULTY__);
    expect(difficulty).toBe("easy");
  });

  test('Normal-Karte klicken → difficulty = "normal"', async ({ page }) => {
    await waitForDifficultySelect(page);
    await clickCard(page, "normal");
    await page.waitForTimeout(800);
    const difficulty = await page.evaluate(() => window.__NP_DIFFICULTY__);
    expect(difficulty).toBe("normal");
  });

  test('Hard-Karte klicken → difficulty = "hard"', async ({ page }) => {
    await waitForDifficultySelect(page);
    await clickCard(page, "hard");
    await page.waitForTimeout(800);
    const difficulty = await page.evaluate(() => window.__NP_DIFFICULTY__);
    expect(difficulty).toBe("hard");
  });

  test('Hardcore-Karte klicken → difficulty = "hardcore"', async ({ page }) => {
    await waitForDifficultySelect(page);
    await clickCard(page, "hardcore");
    await page.waitForTimeout(800);
    const difficulty = await page.evaluate(() => window.__NP_DIFFICULTY__);
    expect(difficulty).toBe("hardcore");
  });
});
