# Night Protocol – Stealth & Hacking Adventure

**Night Protocol** ist ein 2D-Top-Down-Stealth-Spiel, das im Rahmen eines Projekts an der **TH Nürnberg (Georg Simon Ohm)** entwickelt wurde. Spieler schlüpfen in die Rolle eines Hackers, der in ein gesichertes System eindringen muss, während er Sicherheitsbots ausweicht und verschiedene Minispiele löst.

---

## 🚀 Schnellanleitung (Lokal starten)

Um das Spiel lokal auf deinem Rechner zu starten, benötigst du **Node.js**.

1. **Abhängigkeiten installieren:**

   ```bash
   npm install
   ```

2. **Webserver starten:**
   ```bash
   npm run serve
   ```
   Das Spiel ist dann unter [http://localhost:5500](http://localhost:5500) erreichbar.

---

## 🕹️ Gameplay & Steuerung

### Hauptspiel

- **WASD / Pfeiltasten:** Bewegen
- **E / Linksklick:** Interaktion mit Objekten (Türen, Terminals, Notizen)
- **Wichtig:** Weiche den Sichtkegeln der Sicherheitsbots aus! Erwischt dich ein Bot, verlierst du ein Leben.

### Minispiele

Das Spiel enthält eine Vielzahl von Hacker- und Mechanik-Minispielen:

- **Lockpicking:** Drehe den Dietrich mit **A/D** in den Sweetspot und halte **SPACE**.
- **Simon Says:** Merke dir die Tonfolge und klicke die Buttons nach.
- **Signal-Kalibrierung:** Justiere Frequenz und Amplitude mit den On-Screen-Buttons.
- **Timing-Hack:** Drücke **SPACE**, wenn der Balken im grünen Zielbereich ist.
- **Password Cracker:** Errate den Code basierend auf farblichem Feedback (Mastermind-Prinzip).

---

## 🛠️ Technologie-Stack

- **Engine:** [Phaser 3](https://phaser.io/) (Web-basiertes Game Framework)
- **Sprache:** Modernes JavaScript (ES Modules)
- **Grafik:** Pixel-Art (16x16 Tilesets)
- **Level-Design:** Tiled Map Editor (.json & .tmx)
- **Audio:** Custom generated Sound-Assets & MP3-Dateien

---

## 📂 Projektstruktur

- `/src`: Der Quellcode des Spiels
  - `/scenes`: Alle Spielszenen (Level, Menüs, Minispiele)
  - `/entities`: Spielobjekte wie Player, Bots und Items
  - `/utils`: Hilfsklassen wie `SoundManager` und Konfigurationen
- `/assets`: Bilder, Spritesheets und Audio-Dateien
- `/Tilemap`: Die Level-Daten aus Tiled
- `index.html`: Der Einstiegspunkt für den Browser

---

## 🌐 Deployment (VM / Webserver)

Um das Spiel auf einem Webserver (z. B. Nginx, Apache oder einer VM) bereitzustellen, müssen folgende Dateien hochgeladen werden:

- `index.html`
- Ordner: `src/`, `assets/`, `Tilemap/`

**Wichtig:** Das Spiel muss über HTTP geladen werden (z. B. via `http-server`). Das einfache Öffnen der `index.html` als lokale Datei (`file://`) funktioniert aufgrund von Browser-Sicherheitsrichtlinien für Module und Assets nicht.

---

## 🧪 Tests

Das Projekt enthält automatisierte Tests:

- **Unit Tests:** `npm run test` (Vitest)
- **E2E Tests:** `npm run test:e2e` (Playwright)

---
