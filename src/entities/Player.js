import { ctx, game, input, entities } from '../core/context.js';
import { STATE } from '../core/constants.js';
import { Bullet } from './Objects.js';
import { ASSETS } from '../core/assets.js';
import { playSFX } from '../core/audio.js';

export class Player {
    constructor() {
        this.x = game.width / 2;
        this.y = game.height / 2;
        this.radius = 20;
        this.speed = 5;
        this.maxHp = 100;
        this.hp = 100;
        this.coins = 0;
        this.damage = 25;
        this.lastShot = 0;
        this.shootDelay = 150;
        this.iframes = 0;

        // 👇 记录最后的面朝方向 (默认 0 度，朝右)
        this.lastAngle = 0;

        // === 动画控制属性 ===
        this.frameW = 313; 
        this.frameH = 206; 
        this.cols = 20;     
        this.frameIndex = 0; 
        this.frameTimer = 0; 
        this.frameSpeed = 3; 
    }

    update(dt = 1) {
        if (game.state !== STATE.PLAYING) return;

        let isMoving = false;
        let dx = 0;
        let dy = 0;

        // === 1. 移动逻辑 (完美兼容 手机摇杆 与 键盘) ===
        // 优先检查是否正在使用手机摇杆
        if (input.joyVector && input.joyVector.active) {
            dx = input.joyVector.x;
            dy = input.joyVector.y;
        } else {
            // 如果没用摇杆，则读取 WASD
            if (input.keys.w) dy -= 1;
            if (input.keys.s) dy += 1;
            if (input.keys.a) dx -= 1;
            if (input.keys.d) dx += 1;
            
            // 归一化对角线移动 (防止斜着走变快)
            if (dx !== 0 && dy !== 0) {
                const len = Math.hypot(dx, dy);
                dx /= len;
                dy /= len;
            }
        }

        // 应用移动并记录方向
        if (dx !== 0 || dy !== 0) {
            this.x += dx * this.speed * dt;
            this.y += dy * this.speed * dt;
            
            // 💡 核心：记录角色最后的面朝方向，供手机端射击使用
            this.lastAngle = Math.atan2(dy, dx);
            isMoving = true;
        }

        // 限制不出界
        this.x = Math.max(this.radius, Math.min(game.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(game.height - this.radius, this.y));

        // === 2. 动画帧更新 ===
        if (isMoving) {
            this.frameTimer += dt; 
            if (this.frameTimer > this.frameSpeed) {
                this.frameIndex++;
                if (this.frameIndex > 19) this.frameIndex = 0; 
                this.frameTimer = 0;
            }
        } else {
            this.frameIndex = 0; 
        }

        // === 3. 射击逻辑 (完美兼容 手机按钮 与 电脑鼠标) ===
        if (input.mouse.down) {
            const now = Date.now();
            if (now - this.lastShot > this.shootDelay) {
                let shootAngle = this.lastAngle; // 默认：往人物面朝的方向射击 (手机版逻辑)

                // 如果是在电脑端 (没有搓摇杆，且有鼠标坐标)，则改用鼠标精确瞄准
                if (!(input.joyVector && input.joyVector.active) && input.mouse.x !== 0 && input.mouse.y !== 0) {
                    shootAngle = Math.atan2(input.mouse.y - this.y, input.mouse.x - this.x);
                    this.lastAngle = shootAngle; // 同步最后方向，让画图也能转过去
                }

                entities.bullets.push(new Bullet(this.x, this.y, shootAngle, this.damage));
                playSFX('shoot');
                this.lastShot = now;
            }
        }
        
        // === 4. 无敌帧 ===
        if (this.iframes > 0) this.iframes -= dt; 
    }

    draw() {
        if (this.iframes > 0 && Math.floor(Date.now() / 50) % 2 === 0) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        
        // === 面向控制 ===
        let drawAngle = this.lastAngle; // 默认看面朝方向
        // 电脑端跟随鼠标转动
        if (!(input.joyVector && input.joyVector.active) && input.mouse.x !== 0 && input.mouse.y !== 0) {
            drawAngle = Math.atan2(input.mouse.y - this.y, input.mouse.x - this.x);
        }
        ctx.rotate(drawAngle);

        // === 计算裁剪坐标 ===
        const sx = this.frameIndex * this.frameW;
        const sy = 0;

        const drawW = this.frameW * 0.4;
        const drawH = this.frameH * 0.4;

        ctx.drawImage(
            ASSETS.player, 
            sx, sy, this.frameW, this.frameH, 
            -drawW / 2 + 10, -drawH / 2, drawW, drawH 
        );

        ctx.restore();
    }
}