import { describe, expect, test } from "bun:test";
import { SPECIMEN_PANEL, specimenLayouts, type LayoutBox } from "../scripts/specimen";

// The README's specimen is the first thing a reader sees. Its geometry comes from
// panelLayout(), so overlap is checked here rather than by eye.

const CARD_PADDING = 12;
const GAP = 4;

function overlaps(a: LayoutBox, b: LayoutBox, gap: number): boolean {
  return a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;
}

function inside(child: LayoutBox, parent: { x: number; y: number; w: number; h: number }, pad: number): boolean {
  return (
    child.x >= parent.x + pad &&
    child.y >= parent.y + pad &&
    child.x + child.w <= parent.x + parent.w - pad &&
    child.y + child.h <= parent.y + parent.h - pad
  );
}

describe("specimen layout", () => {
  const layouts = specimenLayouts();

  test("draws four panels", () => {
    expect(layouts.map((l) => l.name)).toEqual(["editorial light", "editorial dark", "vivid light", "vivid dark"]);
  });

  for (const { name, boxes } of layouts) {
    test(`${name}: no two elements in the same container overlap`, () => {
      const clashes: string[] = [];
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i]!;
          const b = boxes[j]!;
          if (a.parent !== b.parent) continue;
          if (overlaps(a, b, GAP)) clashes.push(`${a.id} × ${b.id}`);
        }
      }
      expect(clashes).toEqual([]);
    });

    test(`${name}: every element stays inside its container`, () => {
      const panel = { x: 0, y: 0, w: SPECIMEN_PANEL.w, h: SPECIMEN_PANEL.h };
      const byId = Object.fromEntries(boxes.map((b) => [b.id, b]));
      const escapes: string[] = [];
      for (const b of boxes) {
        const parent = b.parent === "panel" ? panel : byId[b.parent]!;
        const pad = b.parent === "card" ? CARD_PADDING : b.parent === "panel" ? 16 : 0;
        if (!inside(b, parent, pad)) escapes.push(`${b.id} outside ${b.parent}`);
      }
      expect(escapes).toEqual([]);
    });
  }
});
