// 获取 Canvas
export const canvas = document.getElementById('gameCanvas');
export const ctx = canvas.getContext('2d');

// 调整大小
export function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// 游戏全局状态容器
export const game = {
    state: 0, // 会在 main.js 初始化
    bgmVolume: 5, // 默认音量 5 (范围 0-10)
    sfxVolume: 5, // 默认音效 5 (范围 0-10)
    previousState: 0, // 用来记录从哪里进的设置（主菜单还是暂停界面），方便点 Back 时退回去
    width: canvas.width,
    height: canvas.height,
    score: 0,
    wave: 1,
    frame: 0
};

// 实体容器
export const entities = {
    player: null,
    bullets: [],
    enemies: [],
    particles: [],
    portals: [],
    texts: [],
    drops: []
};

// 输入状态
export const input = {
    keys: { w: false, a: false, s: false, d: false },
    mouse: { x: 0, y: 0, down: false, clicked: false },
    joyVector: { x: 0, y: 0, active: false }
};

// 输入监听 (直接在这里初始化)
window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (input.keys.hasOwnProperty(k)) input.keys[k] = true;
});
window.addEventListener('keyup', e => {
    const k = e.key.toLowerCase();
    if (input.keys.hasOwnProperty(k)) input.keys[k] = false;
});
window.addEventListener('mousemove', e => {
    input.mouse.x = e.clientX;
    input.mouse.y = e.clientY;
});
window.addEventListener('mousedown', () => {
    input.mouse.down = true;
    input.mouse.clicked = true;
});
window.addEventListener('mouseup', () => {
    input.mouse.down = false;
    input.mouse.clicked = false;
});