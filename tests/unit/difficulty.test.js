/**
 * tests/unit/difficulty.test.js
 * Tests für DifficultyConfig – alle Settings, get/setDifficulty
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  DIFFICULTY_SETTINGS,
  getDifficulty,
  setDifficulty,
} from "../../src/utils/DifficultyConfig.js";

const DIFFICULTIES = ["easy", "normal", "hard", "hardcore"];

// Required numeric keys every difficulty must have
const REQUIRED_NUMERIC_KEYS = [
  "minigameTimeMultiplier",
  "timingHackLives",
  "simonRounds",
  "lockpickTolerance",
  "passwordAttempts",
  "signalTolerance",
  "signalAmpTolerance",
  "wireCount",
  "botPatrolSpeed",
  "botChaseSpeed",
  "visionRange",
  "visionAngle",
  "hackCooldownMs",
  "stealthRiseRate",
  "stealthFallRate",
];

// ──────────────────────────────────────────────────────────
describe("DIFFICULTY_SETTINGS – vollständigkeit", () => {
  it("alle 4 Schwierigkeiten existieren", () => {
    DIFFICULTIES.forEach((d) => expect(DIFFICULTY_SETTINGS).toHaveProperty(d));
  });

  DIFFICULTIES.forEach((diff) => {
    describe(`${diff}`, () => {
      const cfg = DIFFICULTY_SETTINGS[diff];

      it("hat label und subtitle", () => {
        expect(typeof cfg.label).toBe("string");
        expect(typeof cfg.subtitle).toBe("string");
      });

      REQUIRED_NUMERIC_KEYS.forEach((key) => {
        it(`hat numerisches Feld: ${key}`, () => {
          expect(cfg).toHaveProperty(key);
          expect(typeof cfg[key]).toBe("number");
          expect(cfg[key]).toBeGreaterThan(0);
        });
      });

      it("checkpointEnabled ist boolean", () => {
        expect(typeof cfg.checkpointEnabled).toBe("boolean");
      });
    });
  });
});

// ──────────────────────────────────────────────────────────
describe("Difficulty Scaling – Monotonie", () => {
  it("visionRange nimmt mit Schwierigkeit zu", () => {
    expect(DIFFICULTY_SETTINGS.easy.visionRange).toBeLessThan(
      DIFFICULTY_SETTINGS.normal.visionRange,
    );
    expect(DIFFICULTY_SETTINGS.normal.visionRange).toBeLessThan(
      DIFFICULTY_SETTINGS.hard.visionRange,
    );
    expect(DIFFICULTY_SETTINGS.hard.visionRange).toBeLessThan(
      DIFFICULTY_SETTINGS.hardcore.visionRange,
    );
  });

  it("botChaseSpeed nimmt mit Schwierigkeit zu", () => {
    expect(DIFFICULTY_SETTINGS.easy.botChaseSpeed).toBeLessThan(
      DIFFICULTY_SETTINGS.normal.botChaseSpeed,
    );
    expect(DIFFICULTY_SETTINGS.normal.botChaseSpeed).toBeLessThan(
      DIFFICULTY_SETTINGS.hard.botChaseSpeed,
    );
    expect(DIFFICULTY_SETTINGS.hard.botChaseSpeed).toBeLessThan(
      DIFFICULTY_SETTINGS.hardcore.botChaseSpeed,
    );
  });

  it("minigameTimeMultiplier nimmt mit Schwierigkeit ab", () => {
    expect(DIFFICULTY_SETTINGS.easy.minigameTimeMultiplier).toBeGreaterThan(
      DIFFICULTY_SETTINGS.normal.minigameTimeMultiplier,
    );
    expect(DIFFICULTY_SETTINGS.normal.minigameTimeMultiplier).toBeGreaterThan(
      DIFFICULTY_SETTINGS.hard.minigameTimeMultiplier,
    );
    expect(DIFFICULTY_SETTINGS.hard.minigameTimeMultiplier).toBeGreaterThan(
      DIFFICULTY_SETTINGS.hardcore.minigameTimeMultiplier,
    );
  });

  it("lockpickTolerance nimmt mit Schwierigkeit ab", () => {
    expect(DIFFICULTY_SETTINGS.easy.lockpickTolerance).toBeGreaterThan(
      DIFFICULTY_SETTINGS.normal.lockpickTolerance,
    );
    expect(DIFFICULTY_SETTINGS.hard.lockpickTolerance).toBeGreaterThan(
      DIFFICULTY_SETTINGS.hardcore.lockpickTolerance,
    );
  });

  it("passwordAttempts – Hardcore >= 7 (Mastermind-Minimum)", () => {
    // Optimal strategy for 4-digit no-repeat code out of 10 digits
    // requires at most 7 guesses → hardcore must provide at least 7
    expect(
      DIFFICULTY_SETTINGS.hardcore.passwordAttempts,
    ).toBeGreaterThanOrEqual(7);
  });

  it("Checkpoint deaktiviert auf Hard und Hardcore", () => {
    expect(DIFFICULTY_SETTINGS.easy.checkpointEnabled).toBe(true);
    expect(DIFFICULTY_SETTINGS.normal.checkpointEnabled).toBe(true);
    expect(DIFFICULTY_SETTINGS.hard.checkpointEnabled).toBe(false);
    expect(DIFFICULTY_SETTINGS.hardcore.checkpointEnabled).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────
describe("getDifficulty / setDifficulty", () => {
  beforeEach(() => {
    // Reset to default
    delete window.__NP_DIFFICULTY__;
  });

  it("getDifficulty() gibt normal zurück wenn nichts gesetzt", () => {
    expect(getDifficulty()).toBe(DIFFICULTY_SETTINGS.normal);
  });

  it('setDifficulty("easy") → getDifficulty() gibt easy zurück', () => {
    setDifficulty("easy");
    expect(getDifficulty()).toBe(DIFFICULTY_SETTINGS.easy);
  });

  it('setDifficulty("hardcore") → getDifficulty() gibt hardcore zurück', () => {
    setDifficulty("hardcore");
    expect(getDifficulty()).toBe(DIFFICULTY_SETTINGS.hardcore);
  });

  it("ungültiger Schlüssel → Fallback auf normal", () => {
    setDifficulty("legendary"); // non-existent
    expect(getDifficulty()).toBe(DIFFICULTY_SETTINGS.normal);
  });
});
