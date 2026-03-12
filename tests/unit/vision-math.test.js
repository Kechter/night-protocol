/**
 * tests/unit/vision-math.test.js
 * Testet die Winkelberechnungen und Vision-Range-Logik aus SecurityBot.checkVision()
 * Alle Phaser.Math Aufrufe werden hier durch native JS-Äquivalente ersetzt.
 */
import { describe, it, expect } from "vitest";

// ── Minimal Phaser.Math re-implementations ──────────────────
const DEG_TO_RAD = Math.PI / 180;

function angleBetween(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

function distanceBetween(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * Wraps an angle to the range (-PI, PI].
 * Equivalent to Phaser.Math.Angle.Wrap
 */
function angleWrap(angle) {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle <= -Math.PI) angle += 2 * Math.PI;
  return angle;
}

/**
 * Pure re-implementation of the bot's canSee() check (without tile/door occlusion).
 * Returns true when the target is within visionRange AND within visionAngle.
 */
function botCanSee({
  botX,
  botY,
  botRotation,
  targetX,
  targetY,
  visionRange,
  visionAngle,
}) {
  const dist = distanceBetween(botX, botY, targetX, targetY);
  if (dist > visionRange) return false;

  const angleToTarget = angleBetween(botX, botY, targetX, targetY);
  const angleDiff = Math.abs(angleWrap(angleToTarget - botRotation));

  return angleDiff < DEG_TO_RAD * (visionAngle / 2);
}

// ──────────────────────────────────────────────────────────
describe("distanceBetween", () => {
  it("gleicher Punkt → 0", () => {
    expect(distanceBetween(5, 5, 5, 5)).toBe(0);
  });

  it("horizontale Linie", () => {
    expect(distanceBetween(0, 0, 100, 0)).toBeCloseTo(100);
  });

  it("Pythagoras 3-4-5", () => {
    expect(distanceBetween(0, 0, 3, 4)).toBeCloseTo(5);
  });
});

// ──────────────────────────────────────────────────────────
describe("angleWrap", () => {
  it("0 bleibt 0", () => {
    expect(angleWrap(0)).toBeCloseTo(0);
  });

  it("PI bleibt PI", () => {
    expect(angleWrap(Math.PI)).toBeCloseTo(Math.PI);
  });

  it("2*PI → 0", () => {
    expect(angleWrap(2 * Math.PI)).toBeCloseTo(0);
  });

  it("-2*PI → 0", () => {
    expect(angleWrap(-2 * Math.PI)).toBeCloseTo(0);
  });

  it("kleinere Winkel bleiben unverändert", () => {
    expect(angleWrap(1.5)).toBeCloseTo(1.5);
    expect(angleWrap(-1.5)).toBeCloseTo(-1.5);
  });
});

// ──────────────────────────────────────────────────────────
describe("botCanSee – Vision Logik", () => {
  const BOT = {
    botX: 0,
    botY: 0,
    botRotation: 0,
    visionRange: 200,
    visionAngle: 90,
  };

  it("Spieler direkt vor dem Bot → sieht ihn", () => {
    // Bot schaut nach rechts (rotation=0), Spieler ist rechts
    expect(botCanSee({ ...BOT, targetX: 100, targetY: 0 })).toBe(true);
  });

  it("Spieler hinter dem Bot → sieht ihn NICHT", () => {
    // Bot schaut nach rechts, Spieler ist direkt links
    expect(botCanSee({ ...BOT, targetX: -100, targetY: 0 })).toBe(false);
  });

  it("Spieler außerhalb der Range → sieht ihn NICHT", () => {
    expect(botCanSee({ ...BOT, targetX: 250, targetY: 0 })).toBe(false);
  });

  it("Spieler knapp innerhalb der Range → sieht ihn", () => {
    expect(botCanSee({ ...BOT, targetX: 199, targetY: 0 })).toBe(true);
  });

  it("Spieler genau am Rand des Winkels (45°) → sieht ihn (bei 90° FOV)", () => {
    const x = Math.cos(44 * DEG_TO_RAD) * 100;
    const y = Math.sin(44 * DEG_TO_RAD) * 100;
    expect(botCanSee({ ...BOT, targetX: x, targetY: y })).toBe(true);
  });

  it("Spieler knapp außerhalb des Winkels (46°) → sieht ihn NICHT", () => {
    const x = Math.cos(46 * DEG_TO_RAD) * 100;
    const y = Math.sin(46 * DEG_TO_RAD) * 100;
    expect(botCanSee({ ...BOT, targetX: x, targetY: y })).toBe(false);
  });

  it("Easy visionRange (120px) sieht Spieler bei 110px", () => {
    expect(
      botCanSee({ ...BOT, visionRange: 120, targetX: 110, targetY: 0 }),
    ).toBe(true);
  });

  it("Easy visionRange (120px) sieht Spieler bei 130px NICHT", () => {
    expect(
      botCanSee({ ...BOT, visionRange: 120, targetX: 130, targetY: 0 }),
    ).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────
describe("Vision Range Werte (DifficultyConfig)", () => {
  // Import here so we test actual configured values
  it("alle Ranges < 300px (kein cross-map sehen)", async () => {
    const { DIFFICULTY_SETTINGS } =
      await import("../../src/utils/DifficultyConfig.js");
    Object.entries(DIFFICULTY_SETTINGS).forEach(([key, cfg]) => {
      expect(cfg.visionRange, `${key}.visionRange soll < 300`).toBeLessThan(
        300,
      );
    });
  });

  it("alle Winkel zwischen 40° und 120°", async () => {
    const { DIFFICULTY_SETTINGS } =
      await import("../../src/utils/DifficultyConfig.js");
    Object.entries(DIFFICULTY_SETTINGS).forEach(([key, cfg]) => {
      expect(cfg.visionAngle, `${key}.visionAngle`).toBeGreaterThan(40);
      expect(cfg.visionAngle, `${key}.visionAngle`).toBeLessThan(120);
    });
  });
});
