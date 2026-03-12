/**
 * tests/e2e/game-flow.spec.js
 * Vollständiger Spielfluss: ControlsScene → DifficultySelect → IntroScene → GameScene
 * Karten-Koordinaten: vertikal bei y=200/290/380/470 in 1920×1080 Auflösung
 */
import { test, expect } from "@playwright/test";

const CARDS = {
  easy: { xFrac: 0.5, yFrac: 200 / 1080 },
  normal: { xFrac: 0.5, yFrac: 290 / 1080 },
  hard: { xFrac: 0.5, yFrac: 380 / 1080 },
  hardcore: { xFrac: 0.5, yFrac: 470 / 1080 },
};

/** Navigiert durch Controls → DifficultySelect */
async function waitForDifficultySelect(page) {
  await page.goto("/");
  await page.waitForTimeout(4000); // PreloadScene + ControlsScene
  await page.mouse.click(960, 540); // ControlsScene überspringen
  await page.waitForTimeout(2000); // Fade + DifficultySelectScene
}

async function clickCard(page, key) {
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas nicht gefunden");
  const { xFrac, yFrac } = CARDS[key];
  await page.mouse.click(box.x + box.width * xFrac, box.y + box.height * yFrac);
}

// ──────────────────────────────────────────────────────────
test.describe("Spielfluss: Easy → IntroScene → GameScene", () => {
  test("Kompletter Flow ohne JS-Fehler", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await waitForDifficultySelect(page);

    // 1. Easy auswählen
    await clickCard(page, "easy");
    await page.waitForTimeout(1500); // Fade zur IntroScene

    // 2. Erster Klick: Text sofort anzeigen (skip animation)
    await page.mouse.click(960, 540);
    await page.waitForTimeout(500);

    // 3. Zweiter Klick: Spiel starten
    await page.mouse.click(960, 540);
    await page.waitForTimeout(2000); // Transition zur GameScene

    await expect(page.locator("canvas")).toBeVisible();
    expect(errors, `JS-Fehler: ${errors.join("; ")}`).toHaveLength(0);
  });

  test("Difficulty bleibt nach dem Szenenwechsel erhalten", async ({
    page,
  }) => {
    await waitForDifficultySelect(page);
    await clickCard(page, "normal");
    await page.waitForTimeout(800);

    const difficulty = await page.evaluate(() => window.__NP_DIFFICULTY__);
    expect(difficulty).toBe("normal");
  });

  test("Klick in IntroScene überspringt Animation, 2. Klick startet GameScene", async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await waitForDifficultySelect(page);
    await clickCard(page, "easy");
    await page.waitForTimeout(1500);

    // 1. Klick: Animation überspringen
    await page.mouse.click(960, 540);
    await page.waitForTimeout(600);

    // 2. Klick: Spiel starten
    await page.mouse.click(960, 540);
    await page.waitForTimeout(2000);

    await expect(page.locator("canvas")).toBeVisible();
    expect(errors).toHaveLength(0);
  });
});

test.describe("Spielfluss: Hardcore", () => {
  test("Hardcore wählen setzt Difficulty korrekt", async ({ page }) => {
    await waitForDifficultySelect(page);
    await clickCard(page, "hardcore");
    await page.waitForTimeout(800);

    const difficulty = await page.evaluate(() => window.__NP_DIFFICULTY__);
    expect(difficulty).toBe("hardcore");
  });
});
