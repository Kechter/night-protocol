/**
 * tests/unit/password-hints.test.js
 * Testet die calculateHints-Logik (Mastermind) aus PasswordCrackScene.
 * Die Funktion ist eine reine Berechnung ohne Phaser-Abhängigkeit → direkt extrahiert.
 */
import { describe, it, expect } from "vitest";

/**
 * Pure version of PasswordCrackScene.calculateHints()
 * Extracted here so it can be tested without Phaser context.
 */
function calculateHints(secretCode, input) {
  const codeLength = secretCode.length;
  let correctPosition = 0;
  let correctDigit = 0;

  const secretCopy = [...secretCode];
  const inputCopy = [...input];

  // First pass: exact matches
  for (let i = 0; i < codeLength; i++) {
    if (inputCopy[i] === secretCopy[i]) {
      correctPosition++;
      secretCopy[i] = -1;
      inputCopy[i] = -2;
    }
  }

  // Second pass: right digit, wrong position
  for (let i = 0; i < codeLength; i++) {
    if (inputCopy[i] === -2) continue;
    const foundIndex = secretCopy.indexOf(inputCopy[i]);
    if (foundIndex !== -1) {
      correctDigit++;
      secretCopy[foundIndex] = -1;
    }
  }

  return { correctPosition, correctDigit };
}

/**
 * Pure version of generateSecretCode() – uses Math.random instead of Phaser.Math.Between
 * Returns a 4-element array of unique digits 0–9.
 */
function generateSecretCode(codeLength = 4) {
  const code = [];
  const available = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = 0; i < codeLength; i++) {
    const idx = Math.floor(Math.random() * available.length);
    code.push(available[idx]);
    available.splice(idx, 1);
  }
  return code;
}

// ──────────────────────────────────────────────────────────
describe("calculateHints – Mastermind Logik", () => {
  it("alle 4 richtig: correctPosition=4, correctDigit=0", () => {
    const secret = [1, 2, 3, 4];
    const result = calculateHints(secret, [1, 2, 3, 4]);
    expect(result.correctPosition).toBe(4);
    expect(result.correctDigit).toBe(0);
  });

  it("kein Treffer: alles 0", () => {
    const secret = [1, 2, 3, 4];
    const result = calculateHints(secret, [5, 6, 7, 8]);
    expect(result.correctPosition).toBe(0);
    expect(result.correctDigit).toBe(0);
  });

  it("richtige Ziffern, falsche Positionen", () => {
    const secret = [1, 2, 3, 4];
    const result = calculateHints(secret, [4, 3, 2, 1]); // alles verschoben
    expect(result.correctPosition).toBe(0);
    expect(result.correctDigit).toBe(4);
  });

  it("2 richtige Position, 0 falsche", () => {
    const secret = [1, 2, 3, 4];
    const result = calculateHints(secret, [1, 2, 9, 8]);
    expect(result.correctPosition).toBe(2);
    expect(result.correctDigit).toBe(0);
  });

  it("1 richtige Position, 2 falsche (gemischt)", () => {
    const secret = [1, 2, 3, 4];
    const result = calculateHints(secret, [1, 3, 2, 9]); // 1 correct pos, 2+3 wrong pos
    expect(result.correctPosition).toBe(1);
    expect(result.correctDigit).toBe(2);
  });

  it("keine Doppelzählung: Ziffer nur einmal verwendet", () => {
    // secret=[1,2,3,4], guess=[1,1,1,1]
    // only index 0 is exact; the three remaining 1s should NOT match 1 again
    const secret = [1, 2, 3, 4];
    const result = calculateHints(secret, [1, 1, 1, 1]);
    expect(result.correctPosition).toBe(1);
    expect(result.correctDigit).toBe(0);
  });

  it("symmetrisch: hint(a,b) correctDigit === hint(b,a) correctDigit", () => {
    const a = [3, 7, 0, 5];
    const b = [0, 5, 3, 7];
    const r1 = calculateHints(a, b);
    const r2 = calculateHints(b, a);
    expect(r1.correctDigit).toBe(r2.correctDigit);
  });

  it("correctPosition + correctDigit <= 4", () => {
    const secret = [1, 2, 3, 4];
    const guess = [1, 3, 5, 2];
    const result = calculateHints(secret, guess);
    expect(result.correctPosition + result.correctDigit).toBeLessThanOrEqual(4);
  });
});

// ──────────────────────────────────────────────────────────
describe("generateSecretCode", () => {
  it("erzeugt exakt 4 Ziffern", () => {
    expect(generateSecretCode()).toHaveLength(4);
  });

  it("alle Ziffern sind 0–9", () => {
    const code = generateSecretCode();
    code.forEach((d) => {
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(9);
    });
  });

  it("keine doppelten Ziffern", () => {
    // Run 20 times to be confident
    for (let i = 0; i < 20; i++) {
      const code = generateSecretCode();
      const unique = new Set(code);
      expect(unique.size).toBe(4);
    }
  });
});
