import { ctx, game } from '../core/context.js';
import { CONFIG } from '../core/constants.js';
import { ASSETS } from '../core/assets.js';

export const MapSystem = {
    tiles: [],
    
    init() {
        this.tiles = [];
        const cols = Math.ceil(game.width / CONFIG.TILE_SIZE) + 1;
        const rows = Math.ceil(game.height / CONFIG.TILE_SIZE) + 1;
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const val = 30 + Math.random() * 5;
                const color = `rgb(${val}, ${val}, ${val + 5})`;
                this.tiles.push({ x: x * CONFIG.TILE_SIZE, y: y * CONFIG.TILE_SIZE, color: color });
            }
        }
    },

    draw() {
        this.tiles.forEach(t => {
                // 使用 drawImage 画地砖
                // 假设 tiles.png 是一张单独的地板图
                ctx.drawImage(ASSETS.floor, t.x, t.y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);

                // 如果你想保留一点阴影缝隙，可以加个半透明黑框
                ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                ctx.lineWidth = 1;
                ctx.strokeRect(t.x, t.y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
            });
        
        // 暗角
        const gradient = ctx.createRadialGradient(
            game.width/2, game.height/2, game.width/3, 
            game.width/2, game.height/2, game.width
        );
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, 'rgba(0,0,0,0.8)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0,0, game.width, game.height);
    }
};