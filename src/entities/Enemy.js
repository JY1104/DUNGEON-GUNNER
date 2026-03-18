import { ctx, game, entities } from '../core/context.js';
import { STATE } from '../core/constants.js';
import { ASSETS } from '../core/assets.js';

export class Enemy {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.radius = 20;
        this.speed = 2 + Math.random();
        this.hp = 50 + (game.wave * 10);
        this.maxHp = this.hp;
        this.color = '#ff4444';

        // === 新增：动画切图属性 ===
        // 假设这张图宽 704，高 320。11列，5行。
        // 所以单帧宽：704 / 11 = 64，单帧高：320 / 5 = 64
        // ⚠️ 如果你的图片尺寸不一样，请手动修改下面这两个数字！
        this.frameW = 64; 
        this.frameH = 64; 
        
        this.frameIndex = 0; // 当前在播哪一帧
        this.frameTimer = 0; // 计时器
        this.frameSpeed = 5; // 多少帧切换一次动作 (数字越小，腿倒腾得越快)
    }

    update(dt = 1) { // 👈 1. 接收 dt 参数
        if (game.state !== STATE.PLAYING) return;
        
        const p = entities.player;
        if (!p) return;

        // 追逐玩家的移动逻辑
        const angle = Math.atan2(p.y - this.y, p.x - this.x);
        
        // 👈 2. 移动距离乘以 dt，保证不同屏幕下跑得一样快
        this.x += Math.cos(angle) * this.speed * dt; 
        this.y += Math.sin(angle) * this.speed * dt; 

        // === 动画帧更新逻辑 ===
        this.frameTimer += dt; // 👈 3. 原来的 ++ 改成 += dt，防止高刷屏下哥布林腿抽筋
        
        if (this.frameTimer > this.frameSpeed) {
            this.frameIndex++;
            // 哥布林一个走路循环大概是 6 帧，所以播到第 6 帧就回到 0
            if (this.frameIndex > 5) {
                this.frameIndex = 0;
            }
            this.frameTimer = 0;
        }
    }

draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        const p = entities.player;

        if (ASSETS.enemy && ASSETS.enemy.complete && ASSETS.enemy.naturalHeight !== 0) {
            // === 核心逻辑：计算玩家在哥布林的哪个方向 ===
            let rowIndex = 0; // 默认第一排 (向下)
            
            if (p) {
                // 计算哥布林看向玩家的角度 (弧度)
                const angle = Math.atan2(p.y - this.y, p.x - this.x);
                
                // 根据角度分配方向 (将 360 度切成 4 块披萨)
                if (angle > -Math.PI/4 && angle <= Math.PI/4) {
                    rowIndex = 1; // 向右 (第二排)
                } else if (angle > Math.PI/4 && angle <= 3*Math.PI/4) {
                    rowIndex = 0; // 向下 (第一排)
                } else if (angle > -3*Math.PI/4 && angle <= -Math.PI/4) {
                    rowIndex = 2; // 向上 (第三排)
                } else {
                    rowIndex = 3; // 向左 (第四排)
                }
            }

            // 切图位置：X 轴算帧数，Y 轴算方向 (排数)
            const sx = this.frameIndex * this.frameW;
            const sy = rowIndex * this.frameH; // 👈 这里是关键！动态切换排数

            const drawSize = 64; 
            
            // ⚠️ 注意：不要用 ctx.scale(-1, 1) 了，直接画！
            ctx.drawImage(
                ASSETS.enemy, 
                sx, sy, this.frameW, this.frameH, 
                -drawSize/2, -drawSize/2, drawSize, drawSize 
            );
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }

        // ...血条代码保持不变...
        if (this.hp < this.maxHp) {
            ctx.fillStyle = 'red';
            ctx.fillRect(-15, -30, 30, 5);
            ctx.fillStyle = '#0f0';
            ctx.fillRect(-15, -30, 30 * (this.hp / this.maxHp), 5);
        }

        ctx.restore();
    }
}