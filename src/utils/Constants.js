export const BOT_STATE = {
    PATROL: 'patrol',
    CHASE: 'chase',
    SEARCH: 'search',
    RETURN: 'return',
    IDLE: 'idle'
};

export const PHYSICS_CONFIG = {
    PLAYER_SPEED: 150,
    BOT_PATROL_SPEED: 50,
    BOT_CHASE_SPEED: 120,
    VISION_RANGE: 250,
    VISION_ANGLE: 70
};

export const DEPTH = {
    FLOOR: 0,
    WALLS: 1,
    DECO: 2,
    ENTITIES: 5,
    DECO_HIGH: 10,
    UI: 100
};

export const KEY_CONFIG = {
    '1': { color: 0xFF0000, name: 'Red Access' },    // Rot
    '2': { color: 0x0000FF, name: 'Blue Access' },   // Blau
    '3': { color: 0x00FF00, name: 'Green Access' },  // Grün
    '4': { color: 0xFFFF00, name: 'Yellow Access' }, // Gelb
    'default': { color: 0xFFFFFF, name: 'Master Key' }
};

export const UI_CONFIG = {
    INV_START_X: 20,
    INV_START_Y: 550,
    INV_GAP: 40       
};