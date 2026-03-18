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

        // === 新增：动画控制属性 ===
        this.frameW = 313; // 单帧宽度
        this.frameH = 206; // 单帧高度
        this.cols = 20;     // 大图有几列 (用来计算换行)
        
        this.frameIndex = 0; // 当前播放到第几帧 (0~19)
        this.frameTimer = 0; // 动画计时器
        this.frameSpeed = 3; // 动画播放速度 (越小越快)
    }

 update(dt = 1) {
        if (game.state !== STATE.PLAYING) return;

        let isMoving = false;

        // === 1. 移动逻辑加上 * dt ===
        if (input.keys.w && this.y > this.radius) { this.y -= this.speed * dt; isMoving = true; }
        if (input.keys.s && this.y < game.height - this.radius) { this.y += this.speed * dt; isMoving = true; }
        if (input.keys.a && this.x > this.radius) { this.x -= this.speed * dt; isMoving = true; }
        if (input.keys.d && this.x < game.width - this.radius) { this.x += this.speed * dt; isMoving = true; }

        // === 2. 动画帧更新加上 += dt ===
        if (isMoving) {
            this.frameTimer += dt; // 👈 核心：原来是 ++，现在改成 += dt
            if (this.frameTimer > this.frameSpeed) {
                this.frameIndex++;
                if (this.frameIndex > 19) this.frameIndex = 0; // 20帧播完循环
                this.frameTimer = 0;
            }
        } else {
            // 如果没移动，停留在第0帧
            this.frameIndex = 0; 
        }

        // 射击逻辑 (不用改，因为你用了 Date.now() 真实时间，已经不受帧率影响了，非常聪明！)
        if (input.mouse.down) {
            const now = Date.now();
            if (now - this.lastShot > this.shootDelay) {
                const angle = Math.atan2(input.mouse.y - this.y, input.mouse.x - this.x);
                entities.bullets.push(new Bullet(this.x, this.y, angle, this.damage));
                playSFX('shoot');
                this.lastShot = now;
            }
        }
        
        // === 3. 无敌帧也用 dt 递减 ===
        if (this.iframes > 0) this.iframes -= dt; // 👈 防止高刷屏下无敌时间瞬间消失
    }

    draw() {
        if (this.iframes > 0 && Math.floor(Date.now() / 50) % 2 === 0) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        
        // 面向鼠标旋转
        const angle = Math.atan2(input.mouse.y - this.y, input.mouse.x - this.x);
        ctx.rotate(angle);

        // === 核心逻辑：计算裁剪坐标 (sx, sy) ===
        // 比如第 5 帧 (index 5): 5 % 4 = 1 (第2列), floor(5/4) = 1 (第2行)
        const sx = this.frameIndex * this.frameW;
        const sy = 0;

        // 图片尺寸 313x206 太大了，我们在画布上缩小一半来画
        const drawW = this.frameW * 0.4;
        const drawH = this.frameH * 0.4;

        // drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
        // dx, dy 设置为负的一半，确保图片的中心点和玩家的坐标系中心对齐
        ctx.drawImage(
            ASSETS.player, // 注意：你需要去 src/core/assets.js 里把这改成 'player'
            sx, sy, this.frameW, this.frameH, 
            -drawW / 2 + 10, -drawH / 2, drawW, drawH 
            // 提示：+10 是微调中心点，因为枪管比较长，你可以根据视觉效果自己改数字
        );

        ctx.restore();
    }
}