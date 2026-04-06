import { ctx, game, input, entities } from '../core/context.js';
import { STATE } from '../core/constants.js';
import { ASSETS } from '../core/assets.js';


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

export class SpiderEnemy {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.radius = 15;
        this.speed = 3.5; // 蜘蛛稍微快一点
        this.hp = 40;
        this.maxHp = 40;

        // 🛠️ 关键参数校对
        this.frameW = 64; 
        this.frameH = 64; 
        this.frameIndex = 0;
        this.frameTimer = 0;
        this.frameSpeed = 4; // 10帧比较多，播快一点才丝滑
        
        this.time = Math.random() * 100; // S型走位计时
    }

    update(dt = 1) {
        if (game.state !== STATE.PLAYING) return;
        const p = entities.player;
        
        // 🧠 S型走位 AI
        this.time += dt * 0.15;
        const angle = Math.atan2(p.y - this.y, p.x - this.x);
        const wobble = Math.sin(this.time) * 6;
        
        this.x += (Math.cos(angle) * this.speed + Math.cos(angle + Math.PI/2) * wobble) * dt;
        this.y += (Math.sin(angle) * this.speed + Math.sin(angle + Math.PI/2) * wobble) * dt;

        // 📈 动画更新：每行有 10 帧
        this.frameTimer += dt;
        if (this.frameTimer > this.frameSpeed) {
            this.frameIndex = (this.frameIndex + 1) % 10; // 👈 这里必须是 10
            this.frameTimer = 0;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        // 🛡️ 防崩检查
        const isReady = ASSETS.spider_enemy_pure && 
                        ASSETS.spider_enemy_pure.complete && 
                        ASSETS.spider_enemy_pure.naturalWidth !== 0;

        if (isReady) {
            // 🎯 根据玩家位置计算 4 个方向的 Row Index
            const p = entities.player;
            const angle = Math.atan2(p.y - this.y, p.x - this.x);
            let degrees = angle * (180 / Math.PI);
            degrees = (degrees + 360) % 360;

            let rowIndex = 0; // 默认向下 (Row 0)
            if (degrees >= 45 && degrees < 135) rowIndex = 0;      // 下 (Row 0)
            else if (degrees >= 135 && degrees < 225) rowIndex = 1; // 左 (Row 3)
            else if (degrees >= 225 && degrees < 315) rowIndex = 2; // 上 (Row 2)
            else rowIndex = 3;                                     // 右 (Row 1)

            const sx = this.frameIndex * this.frameW;
            const sy = rowIndex * this.frameH;

            ctx.drawImage(
                ASSETS.spider_enemy_pure,
                sx, sy, 64, 64,
                -32, -32, 64, 64
            );
        } else {
            // 占位圆圈
            ctx.fillStyle = '#00ff44';
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI*2);
            ctx.fill();
        }
        ctx.restore();
    }
}

// src/entities/Enemy.js

// src/entities/Enemy.js 里的 GolemEnemy 类

export class GolemEnemy {
    constructor(x, y) {
        this.x = x; this.y = y;
        
        this.radius = 40; 
        this.speed = 1.0; 
        this.hp = 300 + (game.wave * 50); 
        this.maxHp = this.hp;
        
        this.isAttacking = false; 
        this.frameIndex = 0; 
        this.frameTimer = 0; 

        // 🌟 当前朝向对应的行数 (默认 2: 向下)
        this.directionRow = 2; 

        // == 行走图参数校对 ==
        this.walkParams = {
            w: 64, // ⚠️ 请根据你的实际单帧宽度修改 (如果是高清图可能是 128)
            h: 64, // ⚠️ 请根据你的实际单帧高度修改
            totalFrames: 7, // 👈 你的行走图每行是 7 帧！
            speed: 8 
        };

        // == 攻击图参数校对 (假设) ==
        this.atkParams = {
            w: 64, // ⚠️ 需根据 golem-atk.png 的单帧尺寸调整
            h: 64, 
            totalFrames: 7, // 你的攻击图每行也是 7 帧
            speed: 5 
        };

        this.attackRange = 100; 
    }

    update(dt = 1) {
        if (game.state !== STATE.PLAYING) return;
        const p = entities.player;
        if (!p) return;

        const distToPlayer = Math.hypot(this.x - p.x, this.y - p.y);
        const angle = Math.atan2(p.y - this.y, p.x - this.x);

        if (!this.isAttacking) {
            // == 1. 移动逻辑 ==
            this.x += Math.cos(angle) * this.speed * dt;
            this.y += Math.sin(angle) * this.speed * dt;

            // 🎯 2. 计算 4 个方向的行数 (Row 0 到 3)
            let degrees = angle * (180 / Math.PI);
            degrees = (degrees + 360) % 360; // 转换到 0-360 度

            if (degrees >= 45 && degrees < 135) {
                this.directionRow = 2; // 向下 (Row 2)
            } else if (degrees >= 135 && degrees < 225) {
                this.directionRow = 1; // 向左 (Row 1)
            } else if (degrees >= 225 && degrees < 315) {
                this.directionRow = 0; // 向上 (Row 0)
            } else {
                this.directionRow = 3; // 向右 (Row 3)
            }

            // 3. 检查是否进入攻击距离
            if (distToPlayer < this.attackRange) {
                this.isAttacking = true; 
                this.frameIndex = 0; 
                this.frameTimer = 0;
            }
        } 

        // === 动画循环 ===
        const params = this.isAttacking ? this.atkParams : this.walkParams;
        
        this.frameTimer += dt;
        if (this.frameTimer > params.speed) {
            this.frameIndex++;
            if (this.frameIndex >= params.totalFrames) {
                if (this.isAttacking) {
                    this.isAttacking = false;
                    this.frameIndex = 0; 
                } else {
                    this.frameIndex = 0; 
                }
            }
            this.frameTimer = 0;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        const isWalkReady = ASSETS.golem_walk && ASSETS.golem_walk.complete && ASSETS.golem_walk.naturalWidth !== 0;
        const isAtkReady = ASSETS.golem_atk && ASSETS.golem_atk.complete && ASSETS.golem_atk.naturalWidth !== 0;

        if (isWalkReady && isAtkReady) {
            let sourceImage;
            let p;
            let sy; // Y轴切图起始位置

            if (this.isAttacking) {
                sourceImage = ASSETS.golem_atk;
                p = this.atkParams;
                // 如果你的 golem-atk.png 也是 4 行方向的，请取消下面这行的注释：
                // sy = this.directionRow * p.h; 
                
                // 如果你的攻击图只有 1 行，就固定为 0
                sy = 0; 
            } else {
                sourceImage = ASSETS.golem_walk;
                p = this.walkParams;
                // 🚶‍♂️ 根据当前计算好的方向，选择对应的行！
                sy = this.directionRow * p.h; 
            }

            const sx = this.frameIndex * p.w;

            ctx.drawImage(
                sourceImage, 
                sx, sy, p.w, p.h,   
                -p.w/2, -p.h/2, p.w, p.h 
            );

        } else {
            ctx.fillStyle = '#1a237e'; 
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        if (this.hp < this.maxHp) {
            ctx.fillStyle = 'red'; ctx.fillRect(-25, -50, 50, 5);
            ctx.fillStyle = '#0f0'; ctx.fillRect(-25, -50, 50 * (this.hp / this.maxHp), 5);
        }
        ctx.restore();
    }
}