// src/core/assets.js

export const ASSETS = {
    player: new Image(),
    enemy: new Image(),
    floor: new Image(),
    shop: new Image(),
    spider_enemy_pure: new Image(),
    golem_walk: new Image(), 
    golem_atk: new Image() 
    // 以后可以在这里加 wall, bullet, portal 等
};

// 预加载所有图片
export function loadAssets(callback) {
    let loadedCount = 0;
    const totalCount = Object.keys(ASSETS).length;

    console.log("Loading assets...");

    // 定义图片路径 (注意：这里是相对于 index.html 的路径)
    const sources = {
        player: 'src/assets/player_move.png',
        enemy:  'src/assets/goblinsword.png',
        floor:  'src/assets/tile.png',
        shop:   'src/assets/shop.png',
        spider_enemy_pure: 'src/assets/spider_enemy_pure.png',
        golem_walk: 'src/assets/golem-walk.png', // 👈 确保路径和文件名 100% 正确
        golem_atk: 'src/assets/golem-atk.png'   // 👈 确保路径和文件名 100% 正确
    }

    // 遍历加载
    for (let key in ASSETS) {
        ASSETS[key].src = sources[key];
        
        ASSETS[key].onload = () => {
            loadedCount++;
            console.log(`Loaded: ${key}`);
            
            // 如果所有图片都加载完了，就执行回调函数(启动游戏)
            if (loadedCount === totalCount) {
                console.log("All assets loaded!");
                if (callback) callback();
            }
        };

        // 错误处理 (防止图片名字写错导致游戏卡死)
        ASSETS[key].onerror = () => {
            console.error(`Failed to load image: ${sources[key]}`);
            // 即使失败也算加载过，防止卡住
            loadedCount++; 
            if (loadedCount === totalCount && callback) callback();
        };
    }
}