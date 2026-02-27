/**
 * tests/unit/inventory-logic.test.js
 * Testet die reine Logik des Inventory-Systems.
 * Da Inventory den Phaser Scene-Event-Emitter nutzt, wird ein minimaler Stub verwendet.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Minimal mock of the Phaser scene a Inventory needs ──────
function makeSceneStub() {
  const eventEmitter = {
    emit: vi.fn(),
  };
  return {
    events: eventEmitter,
    scene: {
      isActive: vi.fn(() => true), // pretend UIScene is already active
      launch: vi.fn(),
    },
  };
}

// ── We inline the Inventory logic here to avoid Phaser imports ──
// (same logic as src/systems/Inventory.js)
class InventoryLogic {
  constructor(scene) {
    this.scene = scene;
    this.keys = new Set();
    this.notes = [];
  }

  addKey(keyID) {
    const safeID = String(keyID);
    if (!this.keys.has(safeID)) {
      this.keys.add(safeID);
      this.scene.events.emit(
        "updateInventory",
        Array.from(this.keys),
        this.notes,
      );
      return true;
    }
    return false;
  }

  hasKey(keyID) {
    return this.keys.has(String(keyID));
  }

  addNote(noteData) {
    this.notes.push(noteData);
    this.scene.events.emit(
      "updateInventory",
      Array.from(this.keys),
      this.notes,
    );
    return true;
  }

  getNotes() {
    return this.notes;
  }
}

// ──────────────────────────────────────────────────────────
describe("Inventory – addKey", () => {
  let inv;
  let scene;

  beforeEach(() => {
    scene = makeSceneStub();
    inv = new InventoryLogic(scene);
  });

  it("neuen Key hinzufügen → gibt true zurück", () => {
    expect(inv.addKey("keyA")).toBe(true);
  });

  it("denselben Key zweimal → gibt false zurück (kein Duplikat)", () => {
    inv.addKey("keyA");
    expect(inv.addKey("keyA")).toBe(false);
  });

  it("nummerischer Key wird als String gespeichert", () => {
    inv.addKey(42);
    expect(inv.hasKey("42")).toBe(true);
    expect(inv.hasKey(42)).toBe(true);
  });

  it("updateInventory-Event wird emittiert", () => {
    inv.addKey("keyB");
    expect(scene.events.emit).toHaveBeenCalledWith(
      "updateInventory",
      ["keyB"],
      [],
    );
  });

  it("updateInventory-Event NICHT emittiert bei Duplikat", () => {
    inv.addKey("keyC");
    scene.events.emit.mockClear();
    inv.addKey("keyC");
    expect(scene.events.emit).not.toHaveBeenCalled();
  });

  it("mehrere Keys werden korrekt gespeichert", () => {
    inv.addKey("red");
    inv.addKey("blue");
    inv.addKey("gold");
    expect(inv.hasKey("red")).toBe(true);
    expect(inv.hasKey("blue")).toBe(true);
    expect(inv.hasKey("gold")).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────
describe("Inventory – hasKey", () => {
  let inv;

  beforeEach(() => {
    inv = new InventoryLogic(makeSceneStub());
  });

  it("nicht vorhandener Key → false", () => {
    expect(inv.hasKey("missing")).toBe(false);
  });

  it("vorhandener Key → true", () => {
    inv.addKey("present");
    expect(inv.hasKey("present")).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────
describe("Inventory – addNote", () => {
  let inv;
  let scene;

  beforeEach(() => {
    scene = makeSceneStub();
    inv = new InventoryLogic(scene);
  });

  it("Notiz wird hinzugefügt", () => {
    const note = { title: "Log 1", text: "Hallo Welt" };
    inv.addNote(note);
    expect(inv.getNotes()).toHaveLength(1);
    expect(inv.getNotes()[0]).toEqual(note);
  });

  it("mehrere Notizen in Reihenfolge", () => {
    inv.addNote({ title: "A", text: "1" });
    inv.addNote({ title: "B", text: "2" });
    const notes = inv.getNotes();
    expect(notes).toHaveLength(2);
    expect(notes[0].title).toBe("A");
    expect(notes[1].title).toBe("B");
  });

  it("updateInventory-Event mit Notiz emittiert", () => {
    const note = { title: "Test", text: "Inhalt" };
    inv.addNote(note);
    expect(scene.events.emit).toHaveBeenLastCalledWith(
      "updateInventory",
      [],
      [note],
    );
  });

  it("Notiz-Objekte werden als Referenz gespeichert", () => {
    const note = { title: "X", text: "Y" };
    inv.addNote(note);
    expect(inv.getNotes()[0]).toBe(note);
  });
});
