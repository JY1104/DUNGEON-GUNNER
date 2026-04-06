import { game, entities } from '../core/context.js';
import { FloatingText } from '../entities/Objects.js';

const SAVE_KEY = 'DungeonGunner_Save_v1';

export const DataSystem = {
    // === 保存游戏 ===
    save() {
        if (!entities.player) return;

        const saveData = {
            score: game.score,
            wave: game.wave,
            player: {
                hp: entities.player.hp,
                maxHp: entities.player.maxHp,
                damage: entities.player.damage,
                coins: entities.player.coins,
                // 我们不保存位置 (x, y)，每次读档都回城比较安全
            }
        };

        try {
            const jsonString = JSON.stringify(saveData);
            localStorage.setItem(SAVE_KEY, jsonString);
            console.log("Game Saved:", saveData);
            
            // 提示玩家保存成功
            entities.texts.push(
                new FloatingText(entities.player.x, entities.player.y - 30, "GAME SAVED!", "#00ff00")
            );
        } catch (e) {
            console.error("Save Failed:", e);
        }
    },

    // === 读取游戏 ===
    load() {
        const jsonString = localStorage.getItem(SAVE_KEY);
        if (!jsonString) {
            console.log("No save data found. Starting fresh.");
            return false; // 没有存档
        }

        try {
            const data = JSON.parse(jsonString);
            
            // 恢复游戏全局数据
            game.score = data.score || 0;
            game.wave = data.wave || 1;

            // 恢复玩家属性 (注意：这里假设 entities.player 已经 new 出来了)
            if (entities.player) {
                entities.player.hp = data.player.hp;
                entities.player.maxHp = data.player.maxHp;
                entities.player.damage = data.player.damage;
                entities.player.coins = data.player.coins;
            }

            console.log("Game Loaded:", data);
            return true;
        } catch (e) {
            console.error("Load Failed:", e);
            return false;
        }
    },

    // === 清除存档 (调试用) ===
    reset() {
        localStorage.removeItem(SAVE_KEY);
        console.log("Save data cleared.");
    }
};