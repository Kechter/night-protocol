# Dokumentation: Night Protocol

## 1. Vision & Konzept
**"Night Protocol"** ist ein Top-Down Stealth-Adventure, das in der nächtlichen Atmosphäre der Technischen Hochschule spielt. Der Spieler übernimmt die Rolle eines Studenten, der nach Ladenschluss eingeschlossen wurde und nun einen Weg nach draußen finden muss. Dabei muss er patrouillierenden Sicherheits-Bots ausweichen und technische Hürden in Form von Minigames überwinden.

---

## 2. Gameplay & Mechaniken

### 2.1 Game Loop
Der Kern-Loop besteht aus **Exploration**, **Stealth** und **Interaktion**:
1. Durchqueren der Hochschule (Flure, Labore, Aula).
2. Beobachten von Bot-Patrouillen und Nutzen von Deckung.
3. Hacken von Terminals oder Finden von Schlüsseln, um neue Bereiche freizuschalten.
4. Ziel: Erreichen des Serverraums/Ausgangs.

### 2.2 Steuerung & Kamera
*   **Bewegung:** WASD oder Pfeiltasten. Diagonale Bewegungen werden normalisiert, um eine konsistente Geschwindigkeit zu gewährleisten.
*   **Kamera:** Nutzt ein "Smooth Follow" (Lerp: 0.1) und einen hohen Zoom-Faktor (4.5x), um ein beklemmendes "Fog of War"-Gefühl zu erzeugen. Der Spieler sieht nur den unmittelbaren Bereich, was die Spannung erhöht.
*   **Licht:** Mit 'L' kann eine Taschenlampe (Atmosphäre) umgeschaltet werden.

### 2.3 Die KI der Security-Bots (Deep Dive)
Die Bots nutzen eine State Machine mit vier Zuständen:
*   **Patrol:** Bewegung auf fest definierten Pfaden (Wegpunkte).
*   **Chase:** Aktive Verfolgung des Spielers bei Sichtkontakt (Raycasting-Sichtkegel).
*   **Search:** Verliert der Bot das Ziel, sucht er am letzten bekannten Ort.
*   **Return (Breadcrumb-System):** Ein Highlight der KI. Die Bots legen während der Jagd unsichtbare Marker (Breadcrumbs) ab. Beim Abbruch der Jagd laufen sie diese Spur rückwärts ab (LIFO-Prinzip), anstatt direkt zum Pfad zu teleportieren. Dies wirkt organisch und realistisch.

### 2.4 Interaktionssystem & Minigames
Interaktionen werden durch das Drücken von 'E' oder Linksklick ausgelöst:
*   **Türen:** Farblich codierte Schlösser (Rot, Blau, Grün, Gelb) erfordern passende Items oder Hacking.
*   **Hacking Overlay:** Minispiele (wie in *Among Us*) pausieren das Hauptspiel und liefern Callbacks für Erfolg/Misserfolg.
*   **Minigames:** WireTask (Verkabelung), simonSays, TimingHack, PatternUnlock, SlidePuzzle und SignalTuning.

---

## 3. Technische Umsetzung

### 3.1 Architektur & Pipeline
Das Projekt ist modular aufgebaut, um Wartbarkeit und Erweiterbarkeit zu garantieren:
*   `/entities`: Kapselung von Logik für Player, Bots und interaktive Objekte.
*   `/scenes`: Trennung von Spielwelt, UI und den verschiedenen Minigames.
*   `/utils`: Zentrale Steuerung über `Constants.js` und `Config.js` (Tuning von Geschwindigkeiten, Schwierigkeitsgraden etc.).

### 3.2 Audio-Design
Nach initialen Versuchen mit Standard-Assets wurde ein **dynamisches Sound-System** implementiert:
*   **SoundManager:** Zentrale Steuerung von BGM und SFX mit intelligenter Lautstärken-Ausbalancierung.
*   **Realismus:** Einsatz von hochwertigen MP3s für Türen (soundreality) und prozedural generierten Tönen (Simon Says, Terminal-Clicks) für ein technisches Hacker-Ambiente.

### 3.3 Lighting & Atmosphäre
Um die Dunkelheit performant darzustellen, nutzt das Spiel ein **Destination-Out Masking**:
*   Ein schwarzes Overlay bedeckt die Map.
*   Ein Licht-Gradient wird um den Spieler herum "ausgestochen".
*   Dies schont die Performance im Vergleich zu echtem dynamischen Schattenwurf, erzielt aber denselben visuellen Effekt.

---

## 4. Entwicklungsprozess & KI-Integration

### 4.1 Die Evolution des Workflows
Der Entwicklungsprozess war geprägt von einem dreistufigen KI-Workflow:
1.  **ChatGPT (Snippet-Phase):** Lösung isolierter Probleme (z.B. "Wie funktioniert Raycasting in Phaser?").
2.  **Gemini & Gems (Kontext-Phase):** Nutzung dauerhafter Projekt-Instanzen, um den Tech-Stack (Phaser 3, ES Modules) konsistent zu halten.
3.  **Antigravity (Full-Context Phase):** Integration eines Agenten, der die gesamte Codebasis versteht. Dies ermöglichte Architektur-Entscheidungen (z.B. Refactoring der Minigame-Integration), die über einzelne Dateien hinausgehen.

### 4.2 AI Learnings (Erkenntnisse)
*   **KI als Pair Programmer:** Die effektivste Nutzung war nicht das "Generieren lassen", sondern das gemeinsame Iterieren. Die KI fungierte als Reviewer für Architektur-Entscheidungen.
*   **Modularität ist Pflicht:** Um KI effektiv zu nutzen, muss der Code sauber getrennt sein. Nur so kann der Agent gezielte Änderungen vornehmen, ohne Seiteneffekte in anderen Modulen zu verursachen.
*   **Prompting von Design-Patterns:** Die explizite Anweisung, Patterns wie "State Machine" für Bots oder "Observer" für UI-Events zu nutzen, steigerte die Code-Qualität massiv.

### 4.3 Herausforderungen mit KI (AI Problems)
*   **Konstanz der visuellen Sprache:** Bild-KI (DALL-E, Midjourney) scheiterte oft daran, Pixel-Art in der exakten Top-Down-Perspektive und Farbpalette konsistent über mehrere Assets hinweg zu halten. Dies führte zur Entscheidung, ein professionell lizenziertes Tileset zu nutzen.
*   **Kontext-Limitierung:** Bei herkömmlichen Chats verlor die KI bei wachsender Projektgröße oft den Überblick über globale Variablen oder Scene-Keys. Der Wechsel zu agentenbasierten Systemen (Antigravity), die das Dateisystem durchsuchen können, war hier die Lösung.
*   **Over-Engineering:** Ohne klare Führung neigt KI dazu, Probleme komplizierter zu lösen als nötig (z.B. zu komplexe Physik-Berechnungen für einfache Kollisionen). Hier war menschliche Kontrolle ("Keep It Simple") entscheidend.
*   **UI/UX Blindheit:** KI kann Code generieren, der logisch funktioniert, aber visuell schlecht aussieht (z.B. Text-Überlappungen). Die Integration von **Readability Audits** (Screenshots durch den Agenten) war essentiell, um das grafische User-Interface zu polieren.

---

## 5. Fazit & Ausblick
Durch die synergetische Nutzung von moderner Game-Engine-Technologie und fortgeschrittener KI-Assistenz konnte "Night Protocol" in rekordverdächtiger Zeit von einem Prototyp zu einem voll spielbaren Stealth-Adventure entwickelt werden. Zukünftige Erweiterungen könnten ein Level-Editor-System oder komplexere Flucht-Szenarien beinhalten.

---
**Entwickelt im Rahmen des Retrohm Projekts @ TH Nürnberg.**
