// src/main.js
console.log("💡 主程序已经成功加载！");

import { ctx, game, entities, input } from './core/context.js';
import { STATE, CONFIG } from './core/constants.js';
import { MapSystem } from './systems/Map.js';
import { drawUI } from './systems/UI.js';
import { Player } from './entities/Player.js';
import { Enemy, SpiderEnemy, GolemEnemy } from './entities/Enemy.js';
import { Portal, FloatingText, HealthDrop } from './entities/Objects.js';
import { DataSystem } from './systems/Data.js'; 
import { loadAssets } from './core/assets.js'; 
import { playBGM, updateBGMVolume } from './core/audio.js'; 



// ==========================================
// 🖥️ 1. HTML UI 控制系统 (接管所有菜单)
// ==========================================
const uiMainMenu = document.getElementById('ui-main-menu');
const uiSettings = document.getElementById('ui-settings');
const uiShop = document.getElementById('ui-shop');
const uiRecords = document.getElementById('ui-records');
const uiPause = document.getElementById('ui-pause'); 
const uiMobile = document.getElementById('ui-mobile-controls');

// 📱 新增探测器：如果设备型号是手机，或者屏幕支持触控 (包括 F12 模拟器)，就判定为 true
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

function switchUI(newState) {
    if (game.state !== newState) game.previousState = game.state;
    game.state = newState;

    // 1. 先无情地隐藏所有 UI 图层（包括摇杆）
    uiMainMenu.classList.add('hidden');
    uiSettings.classList.add('hidden');
    uiShop.classList.add('hidden');
    uiRecords.classList.add('hidden');
    uiPause.classList.add('hidden');
    uiMobile.classList.add('hidden'); // 👈 新增：每次切换界面先藏起摇杆

    // 2. 根据状态显示图层
    if (newState === STATE.START) uiMainMenu.classList.remove('hidden');
    else if (newState === STATE.SETTINGS) uiSettings.classList.remove('hidden');
    else if (newState === STATE.SHOP) uiShop.classList.remove('hidden');
    else if (newState === STATE.RECORDS) uiRecords.classList.remove('hidden');
    else if (newState === STATE.PAUSED) uiPause.classList.remove('hidden');
    
    if (newState === STATE.PLAYING && isMobile) {
        uiMobile.classList.remove('hidden');
    }
    
    // 如果进入游戏，隐藏鼠标指针
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        canvas.style.cursor = (newState === STATE.PLAYING) ? 'crosshair' : 'default';
    }
}

// === 按钮事件绑定 ===
document.getElementById('btn-start').addEventListener('click', () => {
    resetGame();
    switchUI(STATE.PLAYING);
    playBGM(); 
});

document.getElementById('btn-settings').addEventListener('click', () => switchUI(STATE.SETTINGS));
document.getElementById('btn-records').addEventListener('click', () => switchUI(STATE.RECORDS));

document.getElementById('btn-settings-back').addEventListener('click', () => switchUI(game.previousState || STATE.START));
document.getElementById('btn-shop-back').addEventListener('click', () => switchUI(STATE.PLAYING));
document.getElementById('btn-records-back').addEventListener('click', () => switchUI(STATE.START));

// --- 暂停菜单按钮 ---
document.getElementById('btn-resume').addEventListener('click', () => {
    switchUI(STATE.PLAYING);
});
document.getElementById('btn-pause-settings').addEventListener('click', () => {
    switchUI(STATE.SETTINGS);
});
document.getElementById('btn-pause-main').addEventListener('click', () => {
    switchUI(STATE.START);
});

// === 设置菜单：音量滑块 ===
const sliderBgm = document.getElementById('slider-bgm');
const sliderSfx = document.getElementById('slider-sfx');
const valBgm = document.getElementById('bgm-val');
const valSfx = document.getElementById('sfx-val');

sliderBgm.addEventListener('input', (e) => {
    game.bgmVolume = e.target.value;
    valBgm.innerText = game.bgmVolume;
    updateBGMVolume(); // 实时更新
});
sliderSfx.addEventListener('input', (e) => {
    game.sfxVolume = e.target.value;
    valSfx.innerText = game.sfxVolume;
});
document.getElementById('btn-mute').addEventListener('click', () => {
    game.bgmVolume = 0; game.sfxVolume = 0;
    sliderBgm.value = 0; sliderSfx.value = 0;
    valBgm.innerText = '0'; valSfx.innerText = '0';
    updateBGMVolume();
});

// ==========================================
// 💰 2. 商店与经济系统 
// ==========================================
// 1. 初始化数据 (把多余的 increment 删掉，因为不用了)
game.upgrades = game.upgrades || {
    dmg: { level: 1, basePrice: 50 },
    hp: { level: 1, basePrice: 50 },
};

// 2. 使用你的新公式计算物价
function getPrice(type) {
    let item = game.upgrades[type];
    // 新公式: price = base + 10 * level
    return item.basePrice + (10 * item.level);
}

function updateShopUI() {
    document.getElementById('shop-wallet').innerText = (game.coins || 0);
    document.getElementById('lvl-dmg').innerText = game.upgrades.dmg.level;
    document.getElementById('lvl-hp').innerText = game.upgrades.hp.level;
    document.getElementById('btn-buy-dmg').innerText = getPrice('dmg');
    document.getElementById('btn-buy-hp').innerText = getPrice('hp');
    
}

function buyUpgrade(type) {
    let price = getPrice(type);
    
    if (game.coins >= price) {
        // 1. 扣除全局钱包的 RM
        game.coins -= price;
        
        // 2. 暴力同步给玩家实体（防止 UI 显示错误或杀怪时拿错旧钱）
        if (entities.player) {
            entities.player.coins = game.coins;
        }

        // 3. 强制把扣完的余额写入存档对象（防止 save 的时候存进旧的 300 RM！）
        if (DataSystem && DataSystem.data) {
            DataSystem.data.coins = game.coins;
        }

        // 4. 玩家加强逻辑
        if (type === 'dmg' && entities.player) {
            entities.player.damage = (entities.player.damage || 10) + 5; 
        } else if (type === 'hp' && entities.player) {
            entities.player.maxHp = (entities.player.maxHp || 100) + 20;
            entities.player.hp = entities.player.maxHp; 
        }

        // 5. 物价上涨机制
        game.upgrades[type].level++;
        
        // 6. 更新商店 UI 并执行存档
        updateShopUI();
        DataSystem.save(); 
        
        console.log("🛒 购买成功！三方数据已同步，当前剩余 RM:", game.coins);
    }
}
// 绑定按钮事件
document.getElementById('btn-buy-dmg').addEventListener('click', () => buyUpgrade('dmg'));
document.getElementById('btn-buy-hp').addEventListener('click', () => buyUpgrade('hp'));


// ==========================================
// 📱 3. 手机虚拟摇杆系统
// ==========================================
const mobileUI = document.getElementById('ui-mobile-controls');
const knob = document.getElementById('joystick-knob');
const base = document.getElementById('joystick-base');
const shootBtn = document.getElementById('shoot-btn');


function handleJoyMove(e) {
    if (!input.joyVector.active) return;
    e.preventDefault(); // 🛑 阻止网页跟着手指滑动！
    
    let rect = base.getBoundingClientRect();
    let centerX = rect.left + rect.width / 2;
    let centerY = rect.top + rect.height / 2;
    let touch = e.touches[0];
    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;
    
    let distance = Math.hypot(dx, dy);
    let maxDist = rect.width / 2 - knob.offsetWidth / 2;
    
    if (distance > maxDist) { 
        dx = (dx / distance) * maxDist; 
        dy = (dy / distance) * maxDist; 
    }
    
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    
    // 写入全局 input 状态
    input.joyVector.x = dx / maxDist;
    input.joyVector.y = dy / maxDist;
}

base.addEventListener('touchstart', (e) => { 
    input.joyVector.active = true; 
    handleJoyMove(e); 
}, {passive: false}); // 必须加 passive: false 才能 preventDefault

base.addEventListener('touchmove', handleJoyMove, {passive: false});

['touchend', 'touchcancel'].forEach(evt => base.addEventListener(evt, () => {
    input.joyVector.active = false; 
    input.joyVector.x = 0; 
    input.joyVector.y = 0;
    knob.style.transform = `translate(-50%, -50%)`;
}));

// 射击按钮监听
shootBtn.addEventListener('touchstart', (e) => { 
    e.preventDefault(); 
    input.mouse.down = true; // 假装按下了鼠标左键
}, {passive: false});
shootBtn.addEventListener('touchend', (e) => { 
    e.preventDefault();
    input.mouse.down = false; 
}, {passive: false});

// ==========================================
// 🎮 4. 初始化与核心流程
// ==========================================
function init() {
    // 1. 强制先获取正确的全屏尺寸
    const canvasObj = document.getElementById('gameCanvas');
    canvasObj.width = window.innerWidth;
    canvasObj.height = window.innerHeight;
    game.width = canvasObj.width;
    game.height = canvasObj.height;

    // 2. 尺寸对了之后，再初始化地图和 UI
    MapSystem.init();
    switchUI(STATE.START); 
    loop();
}

export function resetGame() {
    game.score = 0;
    game.wave = 1;
    game.playTime = 0;
    game.enemyHpMulti = 1;
    game.coins = 0;

    game.shopTimer = 60;

    entities.player = new Player();
    entities.bullets = [];
    entities.enemies = [];
    entities.portals = [];
    entities.texts = [];
    entities.drops = [];

    DataSystem.reset();
    const hasSave = DataSystem.load();
    if (hasSave) {
        entities.texts.push(new FloatingText(entities.player.x, entities.player.y, "WELCOME BACK!", "#fff"));
        // 确保进游戏时能拿到最新的币数
        game.coins = DataSystem.data.coins || 0; 

        entities.player.coins = game.coins;
    }
}

let lastTime = 0;
function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    let dt = (timestamp - lastTime) / (1000 / 60);
    if (dt > 3) dt = 3; 
    lastTime = timestamp;

    update(dt); 
    draw();
    input.mouse.clicked = false;
    requestAnimationFrame(loop); 
}

loadAssets(() => {
    init();
});

// ==========================================
// 5. 实体生成逻辑 (Spawners)
// ==========================================
function spawnPortal() {
    let x = Math.random() * game.width;
    let y = Math.random() * game.height;
    entities.portals.push(new Portal(x, y));
    console.log("🏪 商店已在地图刷新！");
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
    
    const rand = Math.random();
    let enemy;

    // 🎲 核心：通过概率决定刷出什么怪物
    if (rand < 0.50) {
        enemy = new Enemy(x, y); // 50% 基础哥布林
    } else if (rand < 0.70) {
        enemy = new SpiderEnemy(x, y); // 20% 霓虹蜘蛛
    } else if (rand < 0.85) {
        enemy = new BatEnemy(x, y); // 15% 蝙蝠
    } else {
        enemy = new GolemEnemy(x, y); // 5% 概率出现巨人坦克！
    }

    // 依然应用动态难度 (DDA) 增加血量
    enemy.hp = enemy.hp * game.enemyHpMulti; 
    enemy.maxHp = enemy.hp; // 👈 确保 maxHp 也同步放大，不然血条会超出！
    entities.enemies.push(enemy);
}
setInterval(spawnEnemy, CONFIG.SPAWN_RATE);

// ==========================================
// 6. 游戏逻辑更新 (Update)
// ==========================================
function update(dt) {
    if (game.state === STATE.PLAYING) {
        game.frame++;
        
        // 📈 1. 动态难度 (DDA)
        game.playTime += dt * (1/60);
        if (game.playTime >= 300) {
            game.enemyHpMulti += 0.5;
            game.playTime = 0;
            console.log("DDA: 敌人发生突变！当前血量倍率: " + game.enemyHpMulti);
        }

        // 🏃‍♂️ 2. 更新玩家 (只需一次！)
        if (entities.player) {
            entities.player.update(dt);
        }
        
        // ⏳ 3. 控制商店刷新
        if (game.shopTimer !== undefined) {
            game.shopTimer -= dt * (1/60); 
            if (game.shopTimer <= 0) {
                spawnPortal(); 
                game.shopTimer = 60; 
            }
        }

        // 🏪 4. 商店寿命与碰撞
        for (let i = entities.portals.length - 1; i >= 0; i--) {
            let p = entities.portals[i];
            p.update(); 
            if (p.life <= 0) {
                entities.portals.splice(i, 1);
                console.log("💨 商店停留时间结束，已离开地图。");
                continue; 
            }
            const dist = Math.hypot(p.x - entities.player.x, p.y - entities.player.y);
            if (dist < p.radius + entities.player.radius) {
                switchUI(STATE.SHOP);   
                updateShopUI();         
                entities.portals.splice(i, 1); 
            }
        }
        
        // 🔫 5. 玩家子弹更新
        for (let i = entities.bullets.length - 1; i >= 0; i--) {
            let b = entities.bullets[i];
            b.update(dt);
            if (b.x < 0 || b.x > game.width || b.y < 0 || b.y > game.height) {
                entities.bullets.splice(i, 1);
            }
        }

        // ☄️ 6. 敌人射出的子弹 (必须独立出来！)
        if (!entities.enemyBullets) entities.enemyBullets = [];
        for (let i = entities.enemyBullets.length - 1; i >= 0; i--) {
            let eb = entities.enemyBullets[i];
            eb.update(dt);
            
            // 飞出屏幕销毁
            if (eb.x < 0 || eb.x > game.width || eb.y < 0 || eb.y > game.height) {
                entities.enemyBullets.splice(i, 1);
                continue;
            }
            
            // 打中玩家判定
            const dist = Math.hypot(eb.x - entities.player.x, eb.y - entities.player.y);
            if (dist < eb.radius + entities.player.radius) {
                if (entities.player.iframes <= 0) {
                    entities.player.hp -= eb.damage;
                    entities.player.iframes = 30; // 玩家受伤无敌帧
                    entities.texts.push(new FloatingText(entities.player.x, entities.player.y, `-${eb.damage}`, "#f00"));
                    
                    if (entities.player.hp <= 0) {
                        game.state = STATE.GAME_OVER;
                        DataSystem.save();
                    }
                }
                entities.enemyBullets.splice(i, 1); // 打中玩家后子弹消失
            }
        }
        
        // 👾 7. 敌人本体更新与碰撞
        for (let i = entities.enemies.length - 1; i >= 0; i--) {
            let e = entities.enemies[i];
            e.update(dt);
            const p = entities.player;
            
            // 敌人撞击玩家
            const distToPlayer = Math.hypot(e.x - p.x, e.y - p.y);
            if (distToPlayer < e.radius + p.radius) {
                if (p.iframes <= 0) {
                    p.hp -= e.damage || 10; 
                    p.iframes = 30; 
                    entities.texts.push(new FloatingText(p.x, p.y, `-${e.damage || 10}`, "#f00"));
                    if (p.hp <= 0) {
                        game.state = STATE.GAME_OVER;
                        DataSystem.save(); 
                    }
                }
            }
            
            // 玩家子弹打中敌人
            for (let j = entities.bullets.length - 1; j >= 0; j--) {
                let b = entities.bullets[j];
                const distB = Math.hypot(b.x - e.x, b.y - e.y);
                if (distB < e.radius + b.radius) {
                    e.hp -= b.damage;
                    entities.bullets.splice(j, 1);
                    entities.texts.push(new FloatingText(e.x, e.y, Math.floor(b.damage), "#fff"));
                    
                    if (e.hp <= 0) {
                        entities.enemies.splice(i, 1);
                        game.score += 100;
                        let moneyGained = 20 + Math.floor(Math.random()*10);
                        game.coins = (game.coins || 0) + moneyGained; 
                        entities.player.coins = game.coins;
                        entities.texts.push(new FloatingText(e.x, e.y, "+"+moneyGained, "#ffd700"));

                        // 掉落血包
                        if (Math.random() < 0.20) {
                            entities.drops.push(new HealthDrop(e.x, e.y));
                        }
                        break; // 敌人已经死了，跳出子弹检测循环
                    }
                }
            }
        }

        // 🎁 8. 掉落物更新
        for (let i = entities.drops.length - 1; i >= 0; i--) {
            let drop = entities.drops[i];
            drop.update(dt); 
            if (drop.life <= 0) {
                entities.drops.splice(i, 1);
                continue; 
            }
            
            const p = entities.player;
            const dist = Math.hypot(p.x - drop.x, p.y - drop.y);
            
            if (dist < p.radius + drop.radius) {
                const heal = Math.min(drop.healAmount, p.maxHp - p.hp);
                if (heal > 0) {
                    p.hp += heal;
                    entities.texts.push(new FloatingText(p.x, p.y, `+${heal} HP`, "#00ff44"));
                } else {
                    entities.texts.push(new FloatingText(p.x, p.y, "MAX HP", "#00ff44"));
                }
                entities.drops.splice(i, 1);
            }
        }
    }
    
    // 💬 9. 飘字更新 (不论是否暂停都继续飘)
    for (let i = entities.texts.length - 1; i >= 0; i--) {
        let t = entities.texts[i];
        t.update(dt); 
        if (t.life <= 0) entities.texts.splice(i, 1);
    }
}

// ==========================================
// 7. 游戏画面渲染 (Draw) - 完美修复版
// ==========================================
function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, game.width, game.height);

    if (game.state === STATE.PLAYING || game.state === STATE.GAME_OVER || game.state === STATE.SHOP || game.state === STATE.PAUSED) {
        
        MapSystem.draw();
        entities.portals.forEach(p => p.draw());
        entities.drops.forEach(d => d.draw());
        entities.enemies.forEach(e => e.draw());
        entities.bullets.forEach(b => b.draw());
        entities.enemyBullets.forEach(b => b.draw());
        const p = entities.player;
        if (p) p.draw();
        entities.texts.forEach(t => t.draw());
        
        if (p && p.iframes > 0) {
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

        // 全权交给你的 UI.js 负责，main.js 绝对不插手画字！
        drawUI(); 
    }
}
// ==========================================
// 8. 输入监听 (只保留游戏中需要的)
// ==========================================
window.addEventListener('keydown', e => {
    // ESC 键用于死亡后返回主菜单
    if (e.key === 'Escape') {
        if (game.state === STATE.PLAYING) {
            switchUI(STATE.PAUSED); // 触发暂停，HTML 隐藏，露出底层的 Canvas 暂停画面
        } else if (game.state === STATE.PAUSED) {
            switchUI(STATE.PLAYING); // 再次按 ESC 恢复游戏
        } else if (game.state === STATE.GAME_OVER) {
            switchUI(STATE.START);
        }
    }
    // R键重启
    if (e.key.toLowerCase() === 'r' && game.state === STATE.GAME_OVER) {
        resetGame(); 
        switchUI(STATE.PLAYING);
    }
    
    // 录入 WASD
    if (e.key === 'w' || e.key === 'W') input.keys.w = true;
    if (e.key === 'a' || e.key === 'A') input.keys.a = true;
    if (e.key === 's' || e.key === 'S') input.keys.s = true;
    if (e.key === 'd' || e.key === 'D') input.keys.d = true;
});

window.addEventListener('keyup', e => {
    if (e.key === 'w' || e.key === 'W') input.keys.w = false;
    if (e.key === 'a' || e.key === 'A') input.keys.a = false;
    if (e.key === 's' || e.key === 'S') input.keys.s = false;
    if (e.key === 'd' || e.key === 'D') input.keys.d = false;
});

const canvasObj = document.getElementById('gameCanvas');
canvasObj.addEventListener('mousemove', (e) => { 
    const rect = canvasObj.getBoundingClientRect();
    input.mouse.x = e.clientX - rect.left; 
    input.mouse.y = e.clientY - rect.top; 
});
canvasObj.addEventListener('mousedown', () => { 
    if(game.state === STATE.PLAYING) {
        input.mouse.down = true; 
        input.mouse.clicked = true; 
    }
});
window.addEventListener('mouseup', () => { input.mouse.down = false; });

window.addEventListener('resize', () => {
    const canvasObj = document.getElementById('gameCanvas');
    if (canvasObj) {
        canvasObj.width = window.innerWidth;
        canvasObj.height = window.innerHeight;
        game.width = canvasObj.width;
        game.height = canvasObj.height;
    }
});

window.addEventListener('blur', () => {
    if (game.state === STATE.PLAYING) {
        switchUI(STATE.PAUSED);
        if (input && input.mouse) input.mouse.down = false; 
    }
});