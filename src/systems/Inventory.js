export class Inventory {
  constructor(scene) {
    this.scene = scene;
    this.keys = new Set();
    this.notes = [];

    if (!this.scene.scene.isActive("UIScene")) {
      this.scene.scene.launch("UIScene");
    }
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
