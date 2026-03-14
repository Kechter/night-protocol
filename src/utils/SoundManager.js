export class SoundManager {
  constructor(scene) {
    this.scene = scene;
    
    // Config values (1.0 = 100%)
    this.bgmVolume = 0.4;
    this.sfxVolume = 0.8;
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
    this.scene.sound.play("ui_hover", { volume: this.sfxVolume * 0.3 });
  }

  playClick() {
    this.scene.sound.play("ui_click", { volume: this.sfxVolume * 0.5 });
  }

  // --- Interactions ---
  playDoorOpen() {
    this.scene.sound.play("door", { volume: this.sfxVolume });
  }

  // --- Minigame Feedback ---
  playSuccess() {
    this.scene.sound.play("success", { volume: this.sfxVolume });
  }

  playError() {
    this.scene.sound.play("error", { volume: this.sfxVolume * 0.7 });
  }

  playHit() {
    this.scene.sound.play("ui_click", { volume: this.sfxVolume * 0.4, detune: 500 }); // High pitched click for hit
  }

  playMiss() {
    this.scene.sound.play("error", { volume: this.sfxVolume * 0.3, detune: -500 }); // Low dull buzz for miss
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
