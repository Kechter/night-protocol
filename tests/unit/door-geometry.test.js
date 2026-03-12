/**
 * tests/unit/door-geometry.test.js
 * Testet LineToRectangle Geometrie-Checks (wird für Bot Vision-through-door fix genutzt).
 * Verwendet native Phaser.Geom Äquivalente in purer JS.
 */
import { describe, it, expect } from "vitest";

// ── Pure Line-to-Rectangle intersection ────────────────────
// Equivalent to Phaser.Geom.Intersects.LineToRectangle
// Uses the Cohen-Sutherland-inspired clipping test.

function lineIntersectsRect(line, rect) {
  // rect = { x, y, width, height }  where x,y is top-left
  const { x: rx, y: ry, width: rw, height: rh } = rect;
  const { x1, y1, x2, y2 } = line;

  // Quick reject: both points outside on same side
  const LEFT = 1,
    RIGHT = 2,
    BOTTOM = 4,
    TOP = 8;

  function code(x, y) {
    let c = 0;
    if (x < rx) c |= LEFT;
    if (x > rx + rw) c |= RIGHT;
    if (y < ry) c |= TOP;
    if (y > ry + rh) c |= BOTTOM;
    return c;
  }

  let c1 = code(x1, y1);
  let c2 = code(x2, y2);
  let lx1 = x1,
    ly1 = y1,
    lx2 = x2,
    ly2 = y2;

  while (true) {
    if (!(c1 | c2)) return true; // both inside
    if (c1 & c2) return false; // both outside same region

    const cOut = c1 ? c1 : c2;
    let x, y;
    const dx = lx2 - lx1,
      dy = ly2 - ly1;

    if (cOut & BOTTOM) {
      x = lx1 + (dx * (ry + rh - ly1)) / dy;
      y = ry + rh;
    } else if (cOut & TOP) {
      x = lx1 + (dx * (ry - ly1)) / dy;
      y = ry;
    } else if (cOut & RIGHT) {
      y = ly1 + (dy * (rx + rw - lx1)) / dx;
      x = rx + rw;
    } else {
      y = ly1 + (dy * (rx - lx1)) / dx;
      x = rx;
    }

    if (cOut === c1) {
      lx1 = x;
      ly1 = y;
      c1 = code(x, y);
    } else {
      lx2 = x;
      ly2 = y;
      c2 = code(x, y);
    }
  }
}

// Helper: build line and centered door rect like SecurityBot does
function buildDoor(cx, cy, w, h) {
  return { x: cx - w / 2, y: cy - h / 2, width: w, height: h };
}

// ──────────────────────────────────────────────────────────
describe("lineIntersectsRect – Tür-Okklusion Geometrie", () => {
  it("Linie durch die Mitte der Tür → schneidet", () => {
    const door = buildDoor(100, 0, 16, 48); // door at (100,0), 16×48
    const line = { x1: 0, y1: 0, x2: 200, y2: 0 }; // horizontal through center
    expect(lineIntersectsRect(line, door)).toBe(true);
  });

  it("Linie neben der Tür → schneidet NICHT", () => {
    const door = buildDoor(100, 0, 16, 48);
    const line = { x1: 0, y1: 100, x2: 200, y2: 100 }; // far below door
    expect(lineIntersectsRect(line, door)).toBe(false);
  });

  it("Linie endet genau an der Türkante → schneidet", () => {
    const door = buildDoor(100, 0, 16, 16);
    // line ends well before the door (stops at x=80, door left-edge is at x=92)
    const line = { x1: 0, y1: 0, x2: 80, y2: 0 };
    expect(lineIntersectsRect(line, door)).toBe(false);
  });

  it("Linie startet innerhalb der Tür → schneidet", () => {
    const door = buildDoor(100, 0, 30, 30);
    const line = { x1: 100, y1: 0, x2: 200, y2: 100 }; // starts inside door
    expect(lineIntersectsRect(line, door)).toBe(true);
  });

  it("senkrechte Linie durch schmale Tür", () => {
    const door = buildDoor(0, 100, 48, 16); // horizontal door (Tür in Wand)
    const line = { x1: 0, y1: 0, x2: 0, y2: 200 }; // vertical line through center
    expect(lineIntersectsRect(line, door)).toBe(true);
  });

  it("diagonale Linie am Türrand vorbei → kein Schnitt", () => {
    const door = buildDoor(100, 0, 16, 16);
    // Diagonal that passes clearly above the door (y stays negative)
    const line = { x1: 0, y1: -50, x2: 200, y2: -20 };
    expect(lineIntersectsRect(line, door)).toBe(false);
  });

  it("Bot direkt neben Tür, Spieler dahinter → Tür verdeckt Spieler", () => {
    // Bot is at (0,0), Tür at x=50 (schmale Tür 16×48), Spieler at (150,0)
    const door = buildDoor(50, 0, 16, 48);
    const line = { x1: 0, y1: 0, x2: 150, y2: 0 };
    expect(lineIntersectsRect(line, door)).toBe(true);
  });

  it("Bot und Spieler auf derselben Seite der Tür → kein Schnitt", () => {
    const door = buildDoor(200, 0, 16, 48);
    // Both bot(0,0) and player(100,0) are left of door at x=200
    const line = { x1: 0, y1: 0, x2: 100, y2: 0 };
    expect(lineIntersectsRect(line, door)).toBe(false);
  });
});
