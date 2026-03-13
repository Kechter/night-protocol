/**
 * LootLockerBackend - Final Working Version (Verified by Diagnostics)
 */
class LootLockerBackend {
  constructor() {
    this.apiKey = "dev_45cad154c0224969b0cbc7330cd384d3";
    this.baseUrl = "https://api.lootlocker.io/game";
    this.sessionToken = null;
    this.playerId = null;
    this.isEnabled = false;

    this.leaderboardIds = {
      easy: "33601",
      normal: "33602",
      hard: "33603",
      hardcore: "33604",
    };

    // Auto-init
    this.init();
  }

  async init() {
    try {
      await this.startSession();
      this.isEnabled = true;
      console.log("LootLocker: Session Ready!");
    } catch (e) {
      console.error("LootLocker: Init failed:", e.message);
    }
  }

  async startSession() {
    const response = await fetch(`${this.baseUrl}/v2/session/guest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        game_key: this.apiKey,
        game_version: "1.0.0",
      }),
    });
    const data = await response.json();
    this.sessionToken = data.session_token;
    this.playerId = data.public_uid;
  }

  /**
   * Submit score using the verified pattern: /game/leaderboards/{id}/submit
   */
  async submitScore(difficultyKey, score) {
    if (!this.isEnabled) return;
    const leaderboardId = this.leaderboardIds[difficultyKey];
    if (!leaderboardId) return;

    const finalScore = Math.floor(score);
    const url = `${this.baseUrl}/leaderboards/${leaderboardId}/submit`;
    
    const response = await fetch(url, {
        method: "POST",
        headers: {
          "x-session-token": this.sessionToken,
          "x-game-key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ score: finalScore, member_id: this.playerId.toString() }),
      }
    );

    if (!response.ok) {
        console.error("LootLocker: Submit failed:", await response.text());
    }
  }

  /**
   * Set player name using pattern: /game/player/name
   */
  async setPlayerName(name) {
    if (!this.isEnabled) return;
    const url = `${this.baseUrl}/player/name`;

    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "x-session-token": this.sessionToken,
        "x-game-key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
        console.error("LootLocker: Name update failed:", await response.text());
    }
  }

  /**
   * Get scores using verified pattern: /game/leaderboards/{id}/list
   */
  async getTopScores(difficultyKey) {
    if (!this.isEnabled) return [];
    const leaderboardId = this.leaderboardIds[difficultyKey];
    if (!leaderboardId) return [];

    const url = `${this.baseUrl}/leaderboards/${leaderboardId}/list?count=10`;
    const response = await fetch(url, {
        method: "GET",
        headers: { 
            "x-session-token": this.sessionToken,
            "x-game-key": this.apiKey
        },
    });

    if (!response.ok) return [];
    const data = await response.json();
    return (data.items || []).map((item) => ({
      name: (item.player && item.player.name) ? item.player.name : "ANON",
      score: item.score,
    }));
  }

  formatTime(ms) {
    const totalSeconds = ms / 1000;
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    const msRemainder = Math.floor((ms % 1000) / 10);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${msRemainder.toString().padStart(2, "0")}`;
  }
}

export const lootLocker = new LootLockerBackend();
