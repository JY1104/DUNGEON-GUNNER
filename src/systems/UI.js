import { ctx, game, entities, input } from '../core/context.js';
import { STATE } from '../core/constants.js';
import { FloatingText } from '../entities/Objects.js';
import { DataSystem } from './Data.js'; 

class Button {
    constructor(x, y, w, h, text, onClick, cost) {
        this.x = x; this.y = y; this.w = w; this.h = h;
        this.text = text; this.onClick = onClick; this.cost = cost;
    }
    draw() {
        const mx = input.mouse.x;
        const my = input.mouse.y;
        const hover = mx > this.x && mx < this.x + this.w && my > this.y && my < this.y + this.h;
        
        if (hover && input.mouse.clicked) {
            this.onClick();
            input.mouse.clicked = false;
        }
        
        ctx.fillStyle = hover ? '#555' : '#333';
        if (this.cost > entities.player.coins) ctx.fillStyle = '#222';
        
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.w, this.h);
        
        ctx.fillStyle = '#fff';
        if (this.cost > entities.player.coins) ctx.fillStyle = '#888';
        ctx.textAlign = 'center';
        ctx.font = '20px Arial';
        ctx.fillText(this.text, this.x + this.w/2, this.y + 30);
        
        if (this.cost > 0) {
            ctx.fillStyle = '#ffd700';
            ctx.font = '16px Arial';
            ctx.fillText(`Cost: ${this.cost}`, this.x + this.w/2, this.y + 55);
        }
    }
}

// 商店按钮配置
const shopButtons = [
    new Button(0, 0, 200, 80, "+10 Max HP", () => {
        const p = entities.player;
        if (p.coins >= 100) {
            p.coins -= 100;
            p.maxHp += 10;
            p.hp += 10;
            entities.texts.push(new FloatingText(p.x, p.y, "UPGRADED!", "#0f0"));
        }
    }, 100),
    new Button(0, 0, 200, 80, "+5 Damage", () => {
        const p = entities.player;
        if (p.coins >= 150) {
            p.coins -= 150;
            p.damage += 5;
            entities.texts.push(new FloatingText(p.x, p.y, "POWER UP!", "#0f0"));
        }
    }, 150),
    new Button(0, 0, 200, 80, "EXIT SHOP", () => {
    // 1. 保存游戏
    DataSystem.save(); 

    // 2. 切换回游戏状态
    game.state = STATE.PLAYING;
    entities.player.x += 100; // 移开一点，防止无限进门
    }, 0)
];

export function drawUI() {
    const p = entities.player;
    
    // HUD
    if (game.state === STATE.PLAYING || game.state === STATE.SHOP) {
        if (!p) return;
        const hpPct = Math.max(0, p.hp / p.maxHp);
        ctx.fillStyle = '#333';
        ctx.fillRect(20, 20, 200, 25);
        ctx.fillStyle = hpPct > 0.5 ? '#0f0' : '#f00';
        ctx.fillRect(20, 20, 200 * hpPct, 25);
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(20, 20, 200, 25);
        
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.font = '20px Arial';
        ctx.fillText(`HP: ${Math.floor(p.hp)}/${p.maxHp}`, 30, 40);
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`COINS: ${p.coins}`, 20, 80);
        ctx.fillStyle = '#fff';
        ctx.fillText(`SCORE: ${game.score}`, 20, 110);
    }
    
    // SHOP
    if (game.state === STATE.SHOP) {
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0, 0, game.width, game.height);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = '40px Arial';
        ctx.fillText("MERCHANT", game.width/2, 100);
        
        const startX = game.width/2 - 100;
        let startY = 200;
        shopButtons.forEach(btn => {
            btn.x = startX;
            btn.y = startY;
            btn.draw();
            startY += 100;
        });
    }
    
    // GAME OVER
    if (game.state === STATE.GAME_OVER) {
        ctx.fillStyle = 'rgba(50,0,0,0.8)';
        ctx.fillRect(0, 0, game.width, game.height);
        ctx.fillStyle = '#f00';
        ctx.textAlign = 'center';
        ctx.font = '80px Arial';
        ctx.fillText("YOU DIED", game.width/2, game.height/2);
        ctx.fillStyle = '#fff';
        ctx.font = '30px Arial';
        ctx.fillText(`Final Score: ${game.score}`, game.width/2, game.height/2 + 60);
        ctx.fillText("Press [R] to Restart", game.width/2, game.height/2 + 120);
    }
}