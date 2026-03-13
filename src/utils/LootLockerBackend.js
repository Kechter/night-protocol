/**
 * LootLockerBackend - Handles global highscores using LootLocker REST API.
 *
 * To use this, the user must set their Game API Key and Leaderboard IDs.
 */
class LootLockerBackend {
  constructor() {
    this.apiKey = "dev_45cad154c0224969b0cbc7330cd384d3";
    this.baseUrl = "https://g9mnb7id.api.lootlocker.io";
    this.sessionToken = null;
    this.isEnabled = false;

    // Leaderboard IDs from your screenshot
    this.leaderboardIds = {
      easy: "33601",
      normal: "33602",
      hard: "33603",
      hardcore: "33604",
    };

    // Mock data for testing without API keys
    this.mockScores = {
      easy: [{ name: "EASY_USER", score: 42000 }],
      normal: [{ name: "NORMAL_USER", score: 55000 }],
      hard: [{ name: "HARD_USER", score: 78000 }],
      hardcore: [{ name: "PRO_HACKER", score: 120000 }],
    };

    if (this.apiKey !== "YOUR_LOOTLOCKER_API_KEY") {
      this.init();
    } else {
      console.warn(
        "LootLockerBackend: MOCK MODE - Add your API key in LootLockerBackend.js",
      );
    }
  }

  async init() {
    try {
      await this.startSession();
      this.isEnabled = true;
      console.log("LootLocker: Session Started!");
    } catch (e) {
      console.error("LootLocker init failed:", e);
    }
  }

  async startSession() {
    // Simple guest login
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
  }

  async submitScore(difficultyKey, score, memberId = null) {
    if (!this.isEnabled) {
      console.log(`Mock Submit: Score ${score} to ${difficultyKey}`);
      return;
    }

    const leaderboardId = this.leaderboardIds[difficultyKey];
    if (!leaderboardId) return;

    // Note: score in LL is usually integer, so we send ms
    await fetch(
      `${this.baseUrl}/v1/player/leaderboard/${leaderboardId}/submit`,
      {
        method: "POST",
        headers: {
          "x-session-token": this.sessionToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ score, member_id: memberId }),
      },
    );
  }

  /**
   * Set player name in LootLocker
   */
  async setPlayerName(name) {
    if (!this.isEnabled) return;
    await fetch(`${this.baseUrl}/v1/player/name`, {
      method: "PATCH",
      headers: {
        "x-session-token": this.sessionToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });
  }

  async getTopScores(difficultyKey) {
    if (!this.isEnabled) {
      return this.mockScores[difficultyKey] || [];
    }

    const leaderboardId = this.leaderboardIds[difficultyKey];
    if (!leaderboardId) return [];

    const response = await fetch(
      `${this.baseUrl}/v1/player/leaderboard/${leaderboardId}/list?count=10`,
      {
        method: "GET",
        headers: { "x-session-token": this.sessionToken },
      },
    );
    const data = await response.json();

    // Map LootLocker response to our format
    return (data.items || []).map((item) => ({
      name: item.player.name || "ANON",
      score: item.score,
    }));
  }

  formatTime(ms) {
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const milis = Math.floor((ms % 1000) / 10);

    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${milis.toString().padStart(2, "0")}`;
  }
}

export const lootLocker = new LootLockerBackend();
