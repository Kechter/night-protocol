---
description: run all tests (unit + e2e browser) for Night Protocol
---

## Night Protocol – Tests ausführen

### Voraussetzungen (einmalig)

// turbo

1. Dependencies installieren:

```powershell
cd "c:\Workspace\Uni Ohm\Retrohm Projekt Phaser\Retrohm\Night Protocol"
npm install
npx playwright install chromium
```

### Unit-Tests (Vitest) – kein Browser nötig

// turbo 2. Unit-Tests ausführen:

```powershell
cd "c:\Workspace\Uni Ohm\Retrohm Projekt Phaser\Retrohm\Night Protocol"
npm test
```

Testet: DifficultyConfig, Mastermind-Hint-Logik, Vision-Math, Inventory-Logik, Tür-Geometrie.

### Browser E2E-Tests (Playwright)

3. E2E-Tests ausführen (startet automatisch einen lokalen Server):

```powershell
cd "c:\Workspace\Uni Ohm\Retrohm Projekt Phaser\Retrohm\Night Protocol"
npm run test:e2e
```

Testet: Seite lädt, kein JS-Fehler, DifficultySelect Klicks, ESC-Flow in IntroScene.

### Alles zusammen

// turbo 4. Beide Test-Suites hintereinander:

```powershell
cd "c:\Workspace\Uni Ohm\Retrohm Projekt Phaser\Retrohm\Night Protocol"
npm run test:all
```

### Nach Codeänderungen

Führe immer `npm test` für schnelle Unit-Tests aus.
Für größere Änderungen an Scenes oder Flow: `npm run test:all`.
