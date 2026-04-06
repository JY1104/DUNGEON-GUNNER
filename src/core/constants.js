export const STATE = {
    START: 0,
    PLAYING: 1,
    GAME_OVER: 2,
    SHOP: 3,
    PAUSED: 4,      // 👈 新增：暂停状态
    COUNTDOWN: 5,    // 👈 新增：倒数状态
    SETTINGS: 6
};

export const CONFIG = {
    TILE_SIZE: 64,
    PLAYER_SPEED: 5,
    BULLET_SPEED: 15,
    SPAWN_RATE: 800
};