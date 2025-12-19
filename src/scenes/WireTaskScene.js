import { DEPTH } from '../utils/Constants.js';

export class WireTaskScene extends Phaser.Scene {
    constructor() {
        super({ key: 'WireTaskScene' });
    }

    init(data) {
        this.onResult = data.onResult;
        
        // Farben: Rot, Blau, Gelb, Grün
        this.colors = [0xe74c3c, 0x3498db, 0xf1c40f, 0x2ecc71];
        
        this.lineGraphics = null;
        this.activeLine = null;
        this.connections = 0;
        this.totalWires = 4;
        
        // Positionen der Stecker
        this.leftSockets = [];
        this.rightSockets = [];
    }

    create() {
        // 1. Hintergrund (Dunkelgraues Panel)
        this.add.rectangle(400, 300, 800, 600, 0x000000, 0.8); // Dimmer
        
        const panel = this.add.container(400, 300);
        const bg = this.add.rectangle(0, 0, 500, 400, 0x2c3e50).setStrokeStyle(4, 0x95a5a6);
        panel.add(bg);

        // Header
        const title = this.add.text(0, -170, 'REPAIR DATA LINKS', {
            fontFamily: 'monospace', fontSize: '24px', color: '#ffffff'
        }).setOrigin(0.5);
        panel.add(title);

        // Graphics Objekt für die Kabel
        this.lineGraphics = this.add.graphics();
        panel.add(this.lineGraphics);

        // 2. Sockets erstellen
        // Wir erstellen zwei Arrays mit Farb-IDs und mischen sie
        let leftColors = [0, 1, 2, 3];
        let rightColors = [0, 1, 2, 3];
        
        // Zufall mischen (Shuffle)
        Phaser.Math.RND.shuffle(leftColors);
        Phaser.Math.RND.shuffle(rightColors);

        const startY = -100;
        const gap = 60;
        const offsetX = 200; // Abstand vom Zentrum nach links/rechts

        // Linke Seite (Startpunkte)
        leftColors.forEach((colorIndex, i) => {
            const y = startY + (i * gap);
            const color = this.colors[colorIndex];
            
            // Visueller Socket
            const socket = this.add.rectangle(-offsetX, y, 40, 40, color)
                .setStrokeStyle(2, 0xffffff)
                .setInteractive({ useHandCursor: true });
            
            // Daten speichern
            socket.colorIndex = colorIndex;
            socket.side = 'left';
            socket.isConnected = false;
            
            // Event Listener für Drag-Start
            socket.on('pointerdown', (pointer) => {
                if (!socket.isConnected) {
                    this.startDrag(socket, pointer);
                }
            });

            this.leftSockets.push(socket);
            panel.add(socket);
        });

        // Rechte Seite (Zielpunkte)
        rightColors.forEach((colorIndex, i) => {
            const y = startY + (i * gap);
            const color = this.colors[colorIndex];
            
            const socket = this.add.rectangle(offsetX, y, 40, 40, color)
                .setStrokeStyle(2, 0x000000); // Schwarz, bis verbunden
            
            socket.colorIndex = colorIndex;
            socket.side = 'right';
            
            // Hitbox für das Droppen
            socket.setInteractive();
            socket.input.dropZone = true; 

            this.rightSockets.push(socket);
            panel.add(socket);
        });

        // Globaler Input Listener für das Ziehen
        this.input.on('pointermove', (pointer) => {
            if (this.activeLine) {
                this.updateActiveLine(pointer);
            }
        });

        this.input.on('pointerup', () => {
            if (this.activeLine) {
                this.stopDrag();
            }
        });

        // Panel Referenz speichern für Koordinaten-Umrechnung
        this.panel = panel;
    }

    startDrag(socket, pointer) {
        // Startpunkt relativ zum Panel berechnen
        this.activeLine = {
            startSocket: socket,
            startX: socket.x,
            startY: socket.y,
            color: this.colors[socket.colorIndex]
        };
    }

    updateActiveLine(pointer) {
        // Mausposition ins Panel-Koordinatensystem umrechnen
        // Panel ist bei 400, 300 zentriert
        const localX = pointer.x - 400; 
        const localY = pointer.y - 300;

        this.redrawWires();
        
        // Aktuelle Linie zeichnen
        this.lineGraphics.lineStyle(10, this.activeLine.color, 1);
        this.lineGraphics.beginPath();
        this.lineGraphics.moveTo(this.activeLine.startX, this.activeLine.startY);
        this.lineGraphics.lineTo(localX, localY);
        this.lineGraphics.strokePath();
    }

    stopDrag() {
        // Wir prüfen manuell Kollision, da dropZones manchmal tricky sind mit Layern
        // Pointer Position holen
        const pointer = this.input.activePointer;
        const localX = pointer.x - 400; 
        const localY = pointer.y - 300;

        let foundTarget = null;

        // Prüfen, ob wir über einem rechten Socket sind
        this.rightSockets.forEach(socket => {
            // Einfache Distanzprüfung (Hitbox)
            if (Math.abs(socket.x - localX) < 30 && Math.abs(socket.y - localY) < 30) {
                foundTarget = socket;
            }
        });

        if (foundTarget && foundTarget.colorIndex === this.activeLine.startSocket.colorIndex && !foundTarget.isConnected) {
            // MATCH!
            this.connectWire(this.activeLine.startSocket, foundTarget);
        }

        this.activeLine = null;
        this.redrawWires();
    }

    connectWire(startSocket, endSocket) {
        startSocket.isConnected = true;
        endSocket.isConnected = true;
        
        // Dauerhafte Linie speichern
        startSocket.connectedTo = endSocket;
        endSocket.setStrokeStyle(2, 0xffffff); // Visuelles Feedback

        this.connections++;

        if (this.connections >= this.totalWires) {
            this.time.delayedCall(500, () => this.winGame());
        }
    }

    redrawWires() {
        this.lineGraphics.clear();
        
        // Zeichne alle bereits fertigen Verbindungen
        this.leftSockets.forEach(socket => {
            if (socket.isConnected && socket.connectedTo) {
                this.lineGraphics.lineStyle(10, this.colors[socket.colorIndex], 1);
                this.lineGraphics.beginPath();
                this.lineGraphics.moveTo(socket.x, socket.y);
                this.lineGraphics.lineTo(socket.connectedTo.x, socket.connectedTo.y);
                this.lineGraphics.strokePath();
            }
        });
    }

    winGame() {
        // Erfolgsnachricht
        const successText = this.add.text(400, 300, 'SYSTEM RESTORED', {
            fontFamily: 'monospace', fontSize: '32px', color: '#00ff00', backgroundColor: '#000000'
        }).setOrigin(0.5).setPadding(10);
        
        this.time.delayedCall(1500, () => {
            if (this.onResult) this.onResult(true);
            this.scene.stop();
            this.scene.resume('GameScene');
        });
    }
}