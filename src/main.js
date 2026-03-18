// src/main.js

import { ctx, game, entities, input } from './core/context.js';
import { STATE, CONFIG } from './core/constants.js';
import { MapSystem } from './systems/Map.js';
import { drawUI } from './systems/UI.js';
import { Player } from './entities/Player.js';
import { Enemy } from './entities/Enemy.js';
import { Portal, FloatingText, HealthDrop } from './entities/Objects.js';
import { DataSystem } from './systems/Data.js'; 
import { loadAssets } from './core/assets.js'; 
import { playBGM, updateBGMVolume } from './core/audio.js'; // 👈 新增

// ==========================================
// 1. 初始化与核心流程
// ==========================================
function init() {
    MapSystem.init();
    game.state = STATE.START;
    loop();
}

export function resetGame() {
    game.state = STATE.PLAYING;
    game.score = 0;
    game.wave = 1;

    entities.player = new Player();
    entities.bullets = [];
    entities.enemies = [];
    entities.portals = [];
    entities.texts = [];
    entities.drops = [];

    DataSystem.reset();

    // 尝试读取存档
    const hasSave = DataSystem.load();
    if (hasSave) {
        entities.texts.push(new FloatingText(entities.player.x, entities.player.y, "WELCOME BACK!", "#fff"));
    }

    setTimeout(spawnPortal, 5000); 
}

let lastTime = 0;

function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    
    // 计算距离上一帧过去了多久。
    // 我们以标准的 60FPS (16.66毫秒) 为基准 1。
    // 如果是 144Hz 显示器，算出来的 dt 大概是 0.41。
    let dt = (timestamp - lastTime) / (1000 / 60);
    
    // ⚠️ 极其重要：限制 dt 的最大值！
    // 如果玩家切出网页挂机了 10 分钟再切回来，dt 会是一个天文数字，
    // 导致人物瞬间穿墙飞出宇宙。我们把它限制在最多补偿 3 帧的距离。
    if (dt > 3) dt = 3; 
    
    lastTime = timestamp;

    update(dt); // 👈 把算好的 dt 传给 update
    draw();
    input.mouse.clicked = false;
    
    // 注意：requestAnimationFrame 会自动把当前时间戳传给 loop
    requestAnimationFrame(loop); 
}

loadAssets(() => {
    init();
});

// ==========================================
// 2. 实体生成逻辑 (Spawners)
// ==========================================
function spawnPortal() {
    if (game.state === STATE.PLAYING) {
        let x = Math.random() * game.width;
        let y = Math.random() * game.height;
        entities.portals.push(new Portal(x, y));
        setTimeout(() => { entities.portals.shift(); }, 30000);
        setTimeout(spawnPortal, 60000);
    }
}

function spawnEnemy() {
    if (game.state !== STATE.PLAYING) return;
    const side = Math.random() < 0.5 ? 'h' : 'v';
    let x, y;
    if (side === 'h') {
        x = Math.random() < 0.5 ? -50 : game.width + 50;
        y = Math.random() * game.height;
    } else {
        x = Math.random() * game.width;
        y = Math.random() < 0.5 ? -50 : game.height + 50;
    }
    entities.enemies.push(new Enemy(x, y));
}
setInterval(spawnEnemy, CONFIG.SPAWN_RATE);

// ==========================================
// 3. 游戏逻辑更新 (Update)
// ==========================================
function update(dt) {
    if (game.state === STATE.PLAYING) {
        game.frame++;
        entities.player.update(dt);
        entities.portals.forEach(p => p.update(entities.player));
        
        // --- 3.1 更新子弹 ---
        entities.bullets.forEach((b, i) => {
            b.update(dt);
            if (b.x < 0 || b.x > game.width || b.y < 0 || b.y > game.height) 
                entities.bullets.splice(i, 1);
        });
        
        // --- 3.2 更新敌人与碰撞检测 ---
        entities.enemies.forEach((e, i) => {
            e.update(dt);
            const p = entities.player;
            
            // 敌人撞击玩家
            const dist = Math.hypot(e.x - p.x, e.y - p.y);
            if (dist < e.radius + p.radius) {
                if (p.iframes <= 0) {
                    p.hp -= e.damage || 10; 
                    p.iframes = 30; 
                    entities.texts.push(new FloatingText(p.x, p.y, `-${e.damage || 10}`, "#f00"));
                    if (p.hp <= 0) game.state = STATE.GAME_OVER;
                }
            }
            
            // 子弹击中敌人
            entities.bullets.forEach((b, j) => {
                const distB = Math.hypot(b.x - e.x, b.y - e.y);
                if (distB < e.radius + b.radius) {
                    e.hp -= b.damage;
                    entities.bullets.splice(j, 1);
                    entities.texts.push(new FloatingText(e.x, e.y, Math.floor(b.damage), "#fff"));
                    
                    // 敌人死亡
                    if (e.hp <= 0) {
                        entities.enemies.splice(i, 1);
                        game.score += 100;
                        p.coins += 20 + Math.floor(Math.random()*10);
                        entities.texts.push(new FloatingText(e.x, e.y, "+$$$", "#ffd700"));

                        // 🎁 新增：20% 几率掉落血包
                        if (Math.random() < 0.20) {
                            entities.drops.push(new HealthDrop(e.x, e.y));
                        }
                    }
                }
            });
        });

        // --- 3.3 更新并拾取掉落物 (血包) ---
        entities.drops.forEach((drop, i) => {
            drop.update();
            
            // 如果血包寿命到了，自动消失
            if (drop.life <= 0) {
                entities.drops.splice(i, 1);
                return; 
            }
            
            // 玩家靠近拾取
            const p = entities.player;
            const dist = Math.hypot(p.x - drop.x, p.y - drop.y);
            
            if (dist < p.radius + drop.radius) {
                // 计算能回多少血 (防止血量溢出超过 maxHp)
                const heal = Math.min(drop.healAmount, p.maxHp - p.hp);
                
                if (heal > 0) {
                    p.hp += heal;
                    entities.texts.push(new FloatingText(p.x, p.y, `+${heal} HP`, "#00ff44"));
                } else {
                    entities.texts.push(new FloatingText(p.x, p.y, "MAX HP", "#00ff44"));
                }
                // 吃掉血包
                entities.drops.splice(i, 1);
            }
        });
    }
    
    // --- 3.4 更新飘字 ---
    entities.texts.forEach((t, i) => {
        t.update();
        if (t.life <= 0) entities.texts.splice(i, 1);
    });
}
// ==========================================
// 4. 游戏画面渲染 (Draw)
// ==========================================
function draw() {
    // === 4.1 画底层和游戏实体 ===
    MapSystem.draw();
    entities.portals.forEach(p => p.draw());
    entities.drops.forEach(d => d.draw());
    entities.enemies.forEach(e => e.draw());
    entities.bullets.forEach(b => b.draw());
    const p = entities.player;
    if (p) p.draw();
    entities.texts.forEach(t => t.draw());
    
    // === 4.2 绝赞的受伤满屏红光特效 ===
    if (p && p.iframes > 0) {
        // 利用无敌帧计算透明度，做出渐隐效果
        const alpha = (p.iframes / 30) * 0.5; 
        const gradient = ctx.createRadialGradient(
            game.width/2, game.height/2, game.height/4, 
            game.width/2, game.height/2, game.width/1.5
        );
        gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
        gradient.addColorStop(1, `rgba(255, 0, 0, ${alpha * 1.5})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, game.width, game.height);
    }

    // === 4.3 画常规 UI (血条、分数等) ===
    drawUI();

    // === 4.4 画右上角设置/暂停按钮 ===
    if (game.state === STATE.PLAYING) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(game.width - 60, 15, 45, 45); 
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText("⏸️", game.width - 60 + 22.5, 15 + 24); // 换成暂停图标更直观
    }

    // === 【新增】画主菜单 (Main Menu) ===
    if (game.state === STATE.START) {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, game.width, game.height); // 黑底
        
        ctx.fillStyle = '#00ffcc';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("DUNGEON GUNNER", game.width / 2, game.height / 2 - 100);

        // 按钮：Start Game (y: -10), Settings (y: +60)
        drawButton("START GAME", game.width / 2, game.height / 2 - 10);
        drawButton("SETTINGS", game.width / 2, game.height / 2 + 60);
    }

    // === 【升级】画暂停菜单 (Paused Menu) ===
    if (game.state === STATE.PAUSED) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, game.width, game.height);
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("PAUSED", game.width / 2, game.height / 2 - 120);

        // 按钮：Resume, Settings, Main Menu
        drawButton("RESUME", game.width / 2, game.height / 2 - 30);
        drawButton("SETTINGS", game.width / 2, game.height / 2 + 40);
        drawButton("MAIN MENU", game.width / 2, game.height / 2 + 110);
    }

    // === 【新增】画设置菜单 (Settings Menu) ===
    if (game.state === STATE.SETTINGS) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, game.width, game.height);
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("SETTINGS", game.width / 2, game.height / 2 - 150);

        // BGM 音量调节
        ctx.font = '30px Arial';
        ctx.fillText(`BGM VOLUME: ${game.bgmVolume}`, game.width / 2, game.height / 2 - 40);
        drawButton("-", game.width / 2 - 120, game.height / 2 - 40, 50);
        drawButton("+", game.width / 2 + 120, game.height / 2 - 40, 50);

        // SFX 音量调节
        ctx.fillText(`SFX VOLUME: ${game.sfxVolume}`, game.width / 2, game.height / 2 + 50);
        drawButton("-", game.width / 2 - 120, game.height / 2 + 50, 50);
        drawButton("+", game.width / 2 + 120, game.height / 2 + 50, 50);

        // 返回按钮
        drawButton("BACK", game.width / 2, game.height / 2 + 150);
    }

    // === 画倒计时的黑幕和发光数字 ===
    if (game.state === STATE.COUNTDOWN) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, game.width, game.height);
        ctx.fillStyle = '#00ffcc';
        ctx.font = 'bold 120px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#00ffcc';
        ctx.shadowBlur = 20;
        ctx.fillText(game.countdownValue, game.width / 2, game.height / 2);
        ctx.shadowBlur = 0; 
    }
}

// === 辅助画按钮的函数 (放在 draw() 外面) ===
function drawButton(text, cx, cy, w = 200, h = 50) {
    ctx.fillStyle = '#333';
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 2;
    // 画底座
    ctx.fillRect(cx - w/2, cy - h/2, w, h);
    ctx.strokeRect(cx - w/2, cy - h/2, w, h);
    // 画文字
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, cy);
}

// ==========================================
// 5. 全局事件监听器 (Event Listeners)
// ==========================================
const canvas = document.querySelector('canvas'); 
let countdownInterval = null; 

// 辅助函数：判断鼠标是否点在某个按钮的区域内
const isClick = (mx, my, cx, cy, w = 200, h = 50) => {
    return mx > cx - w/2 && mx < cx + w/2 && my > cy - h/2 && my < cy + h/2;
};

// 恢复游戏的复用逻辑
const startCountdownToResume = () => {
    game.state = STATE.COUNTDOWN;
    game.countdownValue = 3;
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        game.countdownValue--;
        if (game.countdownValue <= 0) {
            clearInterval(countdownInterval);
            game.state = STATE.PLAYING;
        }
    }, 1000);
};

// 🌟 1. 监听键盘 (支持 ESC 键暂停)
window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        if (game.state === STATE.PLAYING) {
            game.state = STATE.PAUSED;
            if (input && input.mouse) input.mouse.down = false; 
        } else if (game.state === STATE.PAUSED) {
            startCountdownToResume(); // 再次按 ESC 恢复游戏
        }
    }
    
    if (e.key.toLowerCase() === 'r' && game.state === STATE.GAME_OVER) {
        resetGame(); // R键重启
    }
});

// 🌟 2. 监听鼠标点击菜单
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const cx = game.width / 2; // 屏幕中心X

    // 【右上角暂停按钮】
    if (game.state === STATE.PLAYING) {
        if (mx > game.width - 60 && mx < game.width - 15 && my > 15 && my < 60) {
            game.state = STATE.PAUSED;
            if (input && input.mouse) input.mouse.down = false; 
        }
        return; 
    }

    // 【主菜单】
    if (game.state === STATE.START) {
        playBGM();
        if (isClick(mx, my, cx, game.height / 2 - 10)) {
            resetGame(); // 点击 Start Game
            
        } else if (isClick(mx, my, cx, game.height / 2 + 60)) {
            game.previousState = STATE.START;
            game.state = STATE.SETTINGS; // 进设置
        }
        return;
    }

    // 【暂停菜单】
    if (game.state === STATE.PAUSED) {
        if (isClick(mx, my, cx, game.height / 2 - 30)) {
            startCountdownToResume(); // 点击 Resume
        } else if (isClick(mx, my, cx, game.height / 2 + 40)) {
            game.previousState = STATE.PAUSED;
            game.state = STATE.SETTINGS; // 进设置
        } else if (isClick(mx, my, cx, game.height / 2 + 110)) {
            game.state = STATE.START; // 返回主菜单
        }
        return;
    }

    // 【设置菜单】
    if (game.state === STATE.SETTINGS) {
        // BGM 减与加 (宽度50)
        if (isClick(mx, my, cx - 120, game.height / 2 - 40, 50, 50)) {
            game.bgmVolume = Math.max(0, game.bgmVolume - 1);
            updateBGMVolume();
        } else if (isClick(mx, my, cx + 120, game.height / 2 - 40, 50, 50)) {
            game.bgmVolume = Math.min(10, game.bgmVolume + 1);
            updateBGMVolume();
        }
        
        // SFX 减与加
        if (isClick(mx, my, cx - 120, game.height / 2 + 50, 50, 50)) {
            game.sfxVolume = Math.max(0, game.sfxVolume - 1);
        } else if (isClick(mx, my, cx + 120, game.height / 2 + 50, 50, 50)) {
            game.sfxVolume = Math.min(10, game.sfxVolume + 1);
        }

        // Back 返回按钮
        if (isClick(mx, my, cx, game.height / 2 + 150)) {
            game.state = game.previousState; // 退回原来的状态（START或PAUSED）
        }
        return;
    }
});

// 🌟 3. 切出与切回网页逻辑
window.addEventListener('blur', () => {
    if (game.state === STATE.PLAYING) {
        game.state = STATE.PAUSED;
        if (input && input.mouse) input.mouse.down = false; 
    }
});

window.addEventListener('focus', () => {
    // 只有在暂停状态切回时才倒数（如果在设置或主菜单里就不自动倒数）
    // 如果你觉得切回来自动倒数太烦，也可以删掉这段，让玩家自己点 Resume
});