/**
 * DifficultyConfig.js
 * Alle Schwierigkeitsstufen mit ihren spezifischen Werten.
 * Wird in Config.js über Config.difficulty referenziert.
 */

export const DIFFICULTY = {
  EASY: "easy",
  NORMAL: "normal",
  HARD: "hard",
  HARDCORE: "hardcore",
};

export const DIFFICULTY_SETTINGS = {
  easy: {
    label: "EASY",
    subtitle: "Gemütlich erkunden",
    color: 0x00ff88,
    colorHex: "#00ff88",

    // --- Minigames ---
    minigameTimeMultiplier: 2.0, // Basis-Zeit * 2 (z.B. 90s → 180s)
    timingHackLives: 5,
    simonRounds: 3,
    lockpickTolerance: 25, // Grad (Sweet Spot Größe)
    passwordAttempts: 14,
    signalTolerance: 1.0, // Frequenz-Toleranz (höher = leichter)
    signalAmpTolerance: 15,
    wireCount: 3, // Weniger Drähte
    patternGridSize: 3,
    patternLength: 4,
    timingHackSpeed: 250,
    timingHackWidth: 120,

    // --- Security Bots ---
    botPatrolSpeed: 40,
    botChaseSpeed: 80,
    visionRange: 80, // Kurze Sichtweite - sehr easy
    visionAngle: 60,

    // --- Gameplay ---
    hackCooldownMs: 2000,
    checkpointEnabled: true,
    stealthRiseRate: 0.5, // Wie schnell steigt das Alert-Level
    stealthFallRate: 1.5, // Wie schnell sinkt es
  },

  normal: {
    label: "NORMAL",
    subtitle: "Standard Erfahrung",
    color: 0x00ccff,
    colorHex: "#00ccff",

    minigameTimeMultiplier: 1.0,
    timingHackLives: 3,
    simonRounds: 5,
    lockpickTolerance: 15,
    passwordAttempts: 10,
    signalTolerance: 0.5,
    signalAmpTolerance: 5,
    wireCount: 4,
    patternGridSize: 3,
    patternLength: 5,
    timingHackSpeed: 300,
    timingHackWidth: 100,

    botPatrolSpeed: 50,
    botChaseSpeed: 110,
    visionRange: 110, // Normal-Sichtweite
    visionAngle: 75,

    hackCooldownMs: 5000,
    checkpointEnabled: true,
    stealthRiseRate: 1.0,
    stealthFallRate: 1.0,
  },

  hard: {
    label: "HARD",
    subtitle: "Kein Spielraum",
    color: 0xff8800,
    colorHex: "#ff8800",

    minigameTimeMultiplier: 0.65,
    timingHackLives: 2,
    simonRounds: 6,
    lockpickTolerance: 10,
    passwordAttempts: 8,
    signalTolerance: 0.3,
    signalAmpTolerance: 3,
    wireCount: 4,
    patternGridSize: 4,
    patternLength: 8,
    timingHackSpeed: 400,
    timingHackWidth: 70,

    botPatrolSpeed: 65,
    botChaseSpeed: 145,
    visionRange: 140, // Hard-Sichtweite
    visionAngle: 90,

    hackCooldownMs: 8000,
    checkpointEnabled: false,
    stealthRiseRate: 1.5,
    stealthFallRate: 0.7,
  },

  hardcore: {
    label: "HARDCORE",
    subtitle: "Kein Pardon",
    color: 0xff0000,
    colorHex: "#ff0000",

    minigameTimeMultiplier: 0.4,
    timingHackLives: 1,
    simonRounds: 8,
    lockpickTolerance: 6,
    patternLength: 10,
    timingHackSpeed: 550,
    timingHackWidth: 40,
    passwordAttempts: 5, // Mathematisches Optimum für Hardcore
    signalTolerance: 0.2,
    signalAmpTolerance: 2,
    wireCount: 4,
    patternGridSize: 5,

    botPatrolSpeed: 80,
    botChaseSpeed: 170,
    visionRange: 170, // Hardcore-Sichtweite (aber nicht cross-map)
    visionAngle: 100,

    hackCooldownMs: 15000,
    checkpointEnabled: false,
    stealthRiseRate: 2.5,
    stealthFallRate: 0.4,
  },
};

/** Gibt den aktiven DifficultyConfig zurück. */
export function getDifficulty() {
  // Lazy import to avoid circular deps
  const key = window.__NP_DIFFICULTY__ || "normal";
  return DIFFICULTY_SETTINGS[key] || DIFFICULTY_SETTINGS.normal;
}

/** Setzt die Schwierigkeit global. */
export function setDifficulty(key) {
  window.__NP_DIFFICULTY__ = key;
}
