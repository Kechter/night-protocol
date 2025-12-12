export const BOT_STATE = {
    PATROL: 'patrol',
    CHASE: 'chase',
    SEARCH: 'search',
    RETURN: 'return',
    IDLE: 'idle'
};

export const PHYSICS_CONFIG = {
    PLAYER_SPEED: 150,
    BOT_PATROL_SPEED: 80,
    BOT_CHASE_SPEED: 160,
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