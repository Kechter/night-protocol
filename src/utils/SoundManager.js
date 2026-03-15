export class SoundManager {
  constructor(scene) {
    this.scene = scene;
    
    // Config values (1.0 = 100%)
    this.bgmVolume = 0.65; // increased
    this.sfxVolume = 0.45; // reduced
  }

  // Initialisiere Hintergrundmusik
  playBGM() {
    if (!this.scene.sound.get("bgm")) {
      this.bgm = this.scene.sound.add("bgm", {
        loop: true,
        volume: this.bgmVolume,
      });
      this.bgm.play();
    } else {
      this.bgm = this.scene.sound.get("bgm");
      if (!this.bgm.isPlaying) {
        this.bgm.play();
      }
    }
  }

  stopBGM() {
    if (this.bgm && this.bgm.isPlaying) {
      this.bgm.stop();
    }
  }

  // --- UI Sounds ---
  playHover() {
    this.scene.sound.play("ui_hover", { volume: this.sfxVolume * 0.2 });
  }

  playClick() {
    this.scene.sound.play("ui_click", { volume: this.sfxVolume * 0.3 });
  }

  playTerminalKey() {
    const num = Math.floor(Math.random() * 3) + 1;
    this.scene.sound.play(`key_click_${num}`, { volume: this.sfxVolume * 0.15 });
  }

  // --- Interactions ---
  playDoorOpen() {
    this.scene.sound.play("door", { volume: this.sfxVolume * 1.2 });
  }

  playPickup() {
    this.scene.sound.play("pickup", { volume: this.sfxVolume * 0.8 });
  }

  // --- Minigame Feedback ---
  playSuccess() {
    this.scene.sound.play("access_granted", { volume: this.sfxVolume * 0.6 });
  }

  playError() {
    this.scene.sound.play("access_denied", { volume: this.sfxVolume * 0.35 });
  }

  playLockClick() {
    this.scene.sound.play("lock_click", { volume: this.sfxVolume * 1.0 });
  }

  playSimonTone(index) {
    // index should be 1-4
    this.scene.sound.play(`simon_${index}`, { volume: this.sfxVolume * 0.45 });
  }

  playSpark() {
    this.scene.sound.play("spark", { volume: this.sfxVolume * 0.5 });
  }

  playSlide() {
    this.scene.sound.play("slide", { volume: this.sfxVolume * 0.5 });
  }

  playSignalLock() {
    this.scene.sound.play("signal_lock", { volume: this.sfxVolume * 0.8 });
  }

  playTick() {
    this.scene.sound.play("timer_tick", { volume: this.sfxVolume * 0.4 });
  }

  playHit() {
    this.scene.sound.play("ui_click", { volume: this.sfxVolume * 0.4, detune: 500 });
  }

  playMiss() {
    this.scene.sound.play("error_blip", { volume: this.sfxVolume * 0.5 });
  }
}

// Global instance getter
let globalSoundManager = null;

export function getSoundManager(scene) {
  if (!globalSoundManager && scene) {
    globalSoundManager = new SoundManager(scene);
  } else if (globalSoundManager && scene) {
    // Update scene reference to active scene to ensure sounds play in current context
    globalSoundManager.scene = scene;
  }
  return globalSoundManager;
}
