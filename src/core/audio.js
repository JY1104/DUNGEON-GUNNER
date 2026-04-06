// src/core/audio.js
import { game } from './context.js';

export const AUDIO = {
    bgm: new Audio('src/assets/bgm.mp3'),
    shoot: new Audio('src/assets/shoot.mp3')
};

// 设置背景音乐循环播放
AUDIO.bgm.loop = true;

// 播放背景音乐 (根据菜单里的 bgmVolume 设置音量)
export function playBGM() {
    // HTML5 的音量范围是 0.0 到 1.0，所以要把我们菜单里的 0-10 除以 10
    AUDIO.bgm.volume = game.bgmVolume / 10; 
    
    if (AUDIO.bgm.paused) {
        // 捕捉错误，防止浏览器拦截自动播放导致报错
        AUDIO.bgm.play().catch(e => console.log("BGM waiting for user interaction..."));
    }
}

// 实时更新背景音乐音量 (在设置里点击 + - 时调用)
export function updateBGMVolume() {
    AUDIO.bgm.volume = game.bgmVolume / 10;
}

// 播放短促音效 (根据 sfxVolume 设置音量)
export function playSFX(name) {
    if (AUDIO[name] && game.sfxVolume > 0) {
        // 使用 cloneNode() 是为了支持“机关枪连发”：
        // 这样即使上一个开枪音效还没播完，下一个也能立刻叠加上去发声
        const sound = AUDIO[name].cloneNode(); 
        sound.volume = game.sfxVolume / 10;
        sound.play().catch(e => {});
    }
}