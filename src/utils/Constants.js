export const BOT_STATE = {
  PATROL: "patrol",
  CHASE: "chase",
  SEARCH: "search",
  RETURN: "return",
  IDLE: "idle",
  STUNNED: "stunned",
};

export const PHYSICS_CONFIG = {
  PLAYER_SPEED: 150,
  BOT_PATROL_SPEED: 50,
  BOT_CHASE_SPEED: 120,
  VISION_RANGE: 250,
  VISION_ANGLE: 70,
};

export const DEPTH = {
  FLOOR: 0,
  WALLS: 1,
  DECO: 2,
  ENTITIES: 5,
  DECO_HIGH: 10,
  UI: 100,
  PROMPT: 999999, // Above darkness (mapHeight+10000) for prompts & notifications
};

export const KEY_CONFIG = {
  1: { color: 0xff0000, name: "Red Access" }, // Rot
  2: { color: 0x0000ff, name: "Blue Access" }, // Blau
  3: { color: 0x00ff00, name: "Green Access" }, // Grün
  4: { color: 0xffff00, name: "Yellow Access" }, // Gelb
  
  // Neue Text-basierte IDs (aus User Map):
  "keycard_a": { color: 0xff0000, name: "Keycard A (Red)" },
  "keycard_b": { color: 0x0055ff, name: "Keycard B (Blue)" },
  "keycard_c": { color: 0x00ff00, name: "Keycard C (Green)" },
  "keycard_d": { color: 0xffff00, name: "Keycard D (Yellow)" },
  "master_key": { color: 0xffffff, name: "Master Key" },

  default: { color: 0xffffff, name: "Generic Key" },
};

export const UI_CONFIG = {
  INV_START_X: 20,
  INV_START_Y: 550,
  INV_GAP: 40,
};
