import { ctx, game, input } from '../core/context.js';
import { STATE } from '../core/constants.js';
import { ASSETS } from '../core/assets.js';

export class Bullet {
    constructor(x, y, angle, damage) {
        this.x = x; this.y = y;
        this.speed = 15;
        this.dx = Math.cos(angle) * this.speed;
        this.dy = Math.sin(angle) * this.speed;
        this.damage = damage;
        this.radius = 5;
    }
    update() {
        this.x += this.dx;
        this.y += this.dy;
    }
    draw() {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffff00';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffff00';
        ctx.fill();
        ctx.restore();
    }
}

export class Portal {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.radius = 40;
        this.angle = 0;
        this.life = 1800; // 👈 新增：寿命 1800 帧（大约 30 秒）
    }
    
    update() {
        this.angle += 0.05; 
        this.life--; // 👈 新增：每过一帧，寿命减 1
    }

    draw() {
        // ... (保持你原本画 ASSETS.shop 的代码不变) ...
        if (ASSETS.shop && ASSETS.shop.complete) {
            ctx.drawImage(ASSETS.shop, this.x - 20, this.y - 20, 40, 40);
            ctx.fillStyle = '#FFF';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText("SHOP", this.x, this.y - 25);
        } else {
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(this.x - 20, this.y - 20, 40, 40);
        }
    }
}
export class FloatingText {
    constructor(x, y, text, color) {
        this.x = x; this.y = y;
        this.text = text; this.color = color;
        this.life = 60;
        this.dy = -1;
    }
    update() {
        this.y += this.dy;
        this.life--;
    }
    draw() {
        ctx.globalAlpha = Math.max(0, this.life / 60);
        ctx.fillStyle = this.color;
        ctx.font = 'bold 20px Arial';
        ctx.fillText(this.text, this.x, this.y);
        ctx.globalAlpha = 1;
    }
}

export class HealthDrop {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 15; // 捡起判定范围
        this.healAmount = 20 + Math.floor(Math.random() * 21);
        this.life = 600; // 存活帧数 (假设 60FPS，就是 10 秒)
        this.floatOffset = Math.random() * Math.PI * 2; // 让悬浮动画更自然
    }

    update() {
        this.life--;
        this.floatOffset += 0.05; // 增加悬浮角度
    }

    draw() {
        const drawY = this.y + Math.sin(this.floatOffset) * 5; // 上下浮动计算
        
        ctx.save();
        ctx.translate(this.x, drawY);

        // 快消失的时候闪烁提醒玩家
        if (this.life < 120 && Math.floor(this.life / 10) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        // 画一个发光的绿色小方块
        ctx.shadowColor = '#00ff44';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#00cc33';
        ctx.fillRect(-10, -10, 20, 20);
        
        // 画出上面的白色十字加号 (+)
        ctx.shadowBlur = 0; // 关闭阴影防止十字也糊掉
        ctx.fillStyle = 'white';
        ctx.fillRect(-2, -6, 4, 12); // 竖条
        ctx.fillRect(-6, -2, 12, 4); // 横条

        ctx.restore();
    }
}