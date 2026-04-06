import { ctx, game, entities } from '../core/context.js';
import { STATE } from '../core/constants.js';
import { ASSETS } from '../core/assets.js';
import { EnemyBullet } from './Objects.js';

export class Enemy {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.radius = 20;
        
        // AI 状态机属性
        this.baseSpeed = 2 + Math.random(); // 基础移动速度
        this.speed = this.baseSpeed;
        this.hp = 50 + (game.wave * 10);
        this.maxHp = this.hp;
        this.color = '#ff4444';

        // === 新增：AI 状态机 (State Machine) ===
        this.state = 'CHASE'; // 初始状态：追击 (CHASE, CHARGE, DASH, COOLDOWN)
        this.stateTimer = 0;  // 状态计时器
        this.dashAngle = 0;   // 冲刺锁定的方向

        // === 切图属性 ===
        this.frameW = 64; 
        this.frameH = 64; 
        this.frameIndex = 0; 
        this.frameTimer = 0; 
        this.frameSpeed = 5; 
    }

    update(dt = 1) {
        if (game.state !== STATE.PLAYING) return;
        
        const p = entities.player;
        if (!p) return;

        // ==========================================
        // 🧠 1. 碰撞分离系统 (Separation AI) - 防止怪物挤成一坨
        // ==========================================
        let repulseX = 0;
        let repulseY = 0;
        
        entities.enemies.forEach(other => {
            if (other !== this) { // 不和自己比
                const dx = this.x - other.x;
                const dy = this.y - other.y;
                const dist = Math.hypot(dx, dy);
                const minDist = this.radius * 2.5; // 怪物之间保持的距离
                
                // 如果两只怪物靠得太近，产生互相排斥的力
                if (dist > 0 && dist < minDist) {
                    const force = (minDist - dist) / dist; 
                    repulseX += dx * force * 0.1;
                    repulseY += dy * force * 0.1;
                }
            }
        });

        // 运用排斥力 (被推开)
        this.x += repulseX * dt;
        this.y += repulseY * dt;

        // ==========================================
        // 🤖 2. 状态机行为逻辑 (State Machine AI)
        // ==========================================
        const angleToPlayer = Math.atan2(p.y - this.y, p.x - this.x);
        const distToPlayer = Math.hypot(p.x - this.x, p.y - this.y);

        if (this.state === 'CHASE') {
            // 【追击状态】正常朝玩家移动
            this.speed = this.baseSpeed;
            this.x += Math.cos(angleToPlayer) * this.speed * dt; 
            this.y += Math.sin(angleToPlayer) * this.speed * dt; 

            // 如果离玩家足够近，有 2% 的概率突然开始蓄力准备冲刺
            if (distToPlayer < 180 && Math.random() < 0.02) {
                this.state = 'CHARGE';
                this.stateTimer = 30; // 蓄力 0.5 秒 (假设 60fps)
            }
        } 
        else if (this.state === 'CHARGE') {
            // 【蓄力状态】停在原地不动，锁定玩家现在的方向
            this.speed = 0; 
            this.dashAngle = angleToPlayer; // 锁定方向，如果你在这个时候走位可以躲开！
            
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) {
                this.state = 'DASH';
                this.stateTimer = 20; // 冲刺持续约 0.3 秒
            }
        } 
        else if (this.state === 'DASH') {
            // 【冲刺状态】以 4 倍速度像疯狗一样冲锋！
            this.speed = this.baseSpeed * 4;
            this.x += Math.cos(this.dashAngle) * this.speed * dt; 
            this.y += Math.sin(this.dashAngle) * this.speed * dt; 
            
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) {
                this.state = 'COOLDOWN';
                this.stateTimer = 60; // 冲刺完疲劳 1 秒
            }
        } 
        else if (this.state === 'COOLDOWN') {
            // 【疲劳状态】移动速度变得极其缓慢，大喘气
            this.speed = this.baseSpeed * 0.2; 
            this.x += Math.cos(angleToPlayer) * this.speed * dt; 
            this.y += Math.sin(angleToPlayer) * this.speed * dt; 
            
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) {
                this.state = 'CHASE'; // 休息够了，继续追！
            }
        }

        // ==========================================
        // 🏃 3. 动画切图逻辑 (配合 AI 状态改变速度)
        // ==========================================
        // 如果正在蓄力(速度为0)，腿就别动了；如果是冲刺，腿倒腾得极快！
        if (this.speed > 0) {
            // 速度越快，动画播放速度也按比例加快
            const currentAnimSpeed = Math.max(1, this.frameSpeed / (this.speed / this.baseSpeed));
            
            this.frameTimer += dt;
            if (this.frameTimer > currentAnimSpeed) {
                this.frameIndex++;
                if (this.frameIndex > 5) this.frameIndex = 0;
                this.frameTimer = 0;
            }
        } else {
            this.frameIndex = 0; // 蓄力时定在第一帧
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        const p = entities.player;

        // 如果哥布林处于蓄力(CHARGE)状态，让它疯狂闪烁警告玩家！
        if (this.state === 'CHARGE') {
            if (Math.floor(Date.now() / 50) % 2 === 0) {
                ctx.globalAlpha = 0.5; // 半透明闪烁效果
                // 可选：画一个感叹号
                ctx.fillStyle = 'red';
                ctx.font = 'bold 24px Arial';
                ctx.fillText("!", -5, -40);
            }
        }

        if (ASSETS.enemy && ASSETS.enemy.complete && ASSETS.enemy.naturalHeight !== 0) {
            let rowIndex = 0; 
            
            // 面朝方向的判断：如果是冲刺状态，就要看锁定的方向，否则看玩家在哪
            const faceAngle = (this.state === 'DASH' || this.state === 'CHARGE') ? this.dashAngle : (p ? Math.atan2(p.y - this.y, p.x - this.x) : 0);

            if (faceAngle > -Math.PI/4 && faceAngle <= Math.PI/4) rowIndex = 1; 
            else if (faceAngle > Math.PI/4 && faceAngle <= 3*Math.PI/4) rowIndex = 0; 
            else if (faceAngle > -3*Math.PI/4 && faceAngle <= -Math.PI/4) rowIndex = 2; 
            else rowIndex = 3; 

            const sx = this.frameIndex * this.frameW;
            const sy = rowIndex * this.frameH; 

            const drawSize = 64; 
            
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

        // 恢复透明度画血条
        ctx.globalAlpha = 1;
        if (this.hp < this.maxHp) {
            ctx.fillStyle = 'red';
            ctx.fillRect(-15, -30, 30, 5);
            ctx.fillStyle = '#0f0';
            ctx.fillRect(-15, -30, 30 * (this.hp / this.maxHp), 5);
        }

        ctx.restore();
    }
}

// ==========================================
// 🦇 敏捷型：闪电蝙蝠 (BatEnemy)
// AI 特点：极速、血量极低、使用 S型走位 (Sine Wave)，极难瞄准！
// ==========================================
export class BatEnemy {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.radius = 12; // 体型很小
        this.speed = 4 + Math.random(); // 基础速度是哥布林的两倍！
        this.hp = 20 + (game.wave * 5); // 脆皮，一两枪就死
        this.maxHp = this.hp;
        this.color = '#aa00ff'; // 紫色
        
        this.time = Math.random() * 100; // 抖动的时间轴
    }

    update(dt = 1) {
        if (game.state !== STATE.PLAYING) return;
        const p = entities.player;
        if (!p) return;

        this.time += dt * 0.15; // 翅膀拍打/抖动的频率

        const angleToPlayer = Math.atan2(p.y - this.y, p.x - this.x);

        // 1. 向玩家直线推进的速度
        const forwardX = Math.cos(angleToPlayer) * this.speed;
        const forwardY = Math.sin(angleToPlayer) * this.speed;

        // 2. 侧向偏移 (利用正弦波产生完美的 S 型走位)
        const wobbleForce = Math.sin(this.time) * 6; // 左右横跳的幅度
        const strafeX = Math.cos(angleToPlayer + Math.PI/2) * wobbleForce;
        const strafeY = Math.sin(angleToPlayer + Math.PI/2) * wobbleForce;

        // 综合移动
        this.x += (forwardX + strafeX) * dt;
        this.y += (forwardY + strafeY) * dt;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        // 如果你以后有蝙蝠的图片，可以像哥布林那样画。这里先用紫色的菱形代替
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(0, -this.radius);
        ctx.lineTo(this.radius, 0);
        ctx.moveTo(0, this.radius);
        ctx.lineTo(-this.radius, 0);
        ctx.closePath();
        ctx.fill();
        
        // 血条
        if (this.hp < this.maxHp) {
            ctx.fillStyle = 'red';
            ctx.fillRect(-10, -20, 20, 3);
            ctx.fillStyle = '#0f0';
            ctx.fillRect(-10, -20, 20 * (this.hp / this.maxHp), 3);
        }
        ctx.restore();
    }
}

// ==========================================
// 🏹 远程型：骷髅射手 (ShooterEnemy)
// AI 特点：放风筝 (Kiting)！如果你靠近，它会后退逃跑；如果你跑远，它会追你，并每隔 2 秒发射火球。
// ==========================================
export class ShooterEnemy {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.radius = 20;
        this.speed = 1.8; // 走得比较慢
        this.hp = 40 + (game.wave * 8);
        this.maxHp = this.hp;
        this.color = '#00ffff'; // 青色
        
        this.shootTimer = 60 + Math.random() * 60; // 开枪冷却 (错开它们的射击时间)
    }

    update(dt = 1) {
        if (game.state !== STATE.PLAYING) return;
        const p = entities.player;
        if (!p) return;

        const distToPlayer = Math.hypot(p.x - this.x, p.y - this.y);
        const angleToPlayer = Math.atan2(p.y - this.y, p.x - this.x);

        // 🧠 AI 风筝逻辑：保持在 200 ~ 300 的绝佳射击距离
        if (distToPlayer > 300) {
            // 太远了，往前追
            this.x += Math.cos(angleToPlayer) * this.speed * dt;
            this.y += Math.sin(angleToPlayer) * this.speed * dt;
        } else if (distToPlayer < 200) {
            // 玩家靠太近了，疯狂往后撤退逃跑！
            this.x -= Math.cos(angleToPlayer) * this.speed * dt;
            this.y -= Math.sin(angleToPlayer) * this.speed * dt;
        }

        // 射击逻辑
        this.shootTimer -= dt;
        if (this.shootTimer <= 0) {
            if (!entities.enemyBullets) entities.enemyBullets = [];
            // 发射红色敌对子弹！(我们等下在 Objects 里建这个)
            entities.enemyBullets.push(new EnemyBullet(this.x, this.y, angleToPlayer, 15));
            this.shootTimer = 120; // 冷却两秒
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        // 画一个带瞄准镜图案的圆圈代表射手
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.strokeWidth = 2;
        ctx.stroke();
        
        // 血条
        if (this.hp < this.maxHp) {
            ctx.fillStyle = 'red';
            ctx.fillRect(-15, -30, 30, 5);
            ctx.fillStyle = '#0f0';
            ctx.fillRect(-15, -30, 30 * (this.hp / this.maxHp), 5);
        }
        ctx.restore();
    }
}