import { describe, it, expect } from 'vitest';
import {
  ARCH_HANDLE_ANCHORS,
  ARCH_HANDLE_STYLES,
  ARCH_SHAPE_SIZES,
  ARCH_NODE_TYPES,
} from '../src/config/architectureTypes.js';

describe('shape box vs SVG viewBox', () => {
  it('aspect matches the viewBox (no letterbox, anchor fractions are SVG coords)', () => {
    const person = ARCH_SHAPE_SIZES[ARCH_NODE_TYPES.PERSON];
    const database = ARCH_SHAPE_SIZES[ARCH_NODE_TYPES.DATABASE];

    expect(person.width / person.height).toBe(40 / 70);
    expect(database.width / database.height).toBe(60 / 40);
  });

  it('only person and database have a fixed shape box', () => {
    expect(Object.keys(ARCH_SHAPE_SIZES).sort()).toEqual(['database', 'person']);
  });
});

describe('handle anchors sit on the visual shape', () => {
  it('person: top of head, foot, arm tips', () => {
    const person = ARCH_HANDLE_ANCHORS[ARCH_NODE_TYPES.PERSON];

    expect(person.top.x * 40).toBe(20);
    expect(person.top.y * 70).toBe(3); // head apex (cy 10, r 7)
    expect(person.bottom.y * 70).toBe(64); // foot tips
    expect(person.left.x * 40).toBe(8); // left arm tip
    expect(person.right.x * 40).toBe(32); // right arm tip
    expect(person.left.y * 70).toBe(26); // arm line
  });

  it('database: cylinder rim (ellipse apex, arc bottom, walls)', () => {
    const db = ARCH_HANDLE_ANCHORS[ARCH_NODE_TYPES.DATABASE];

    expect(db.top.y * 40).toBe(1); // ellipse apex (cy 8, ry 7)
    expect(db.bottom.y * 40).toBe(39); // arc bottom (32 + 7)
    expect(db.left.x * 60).toBe(4); // wall
    expect(db.right.x * 60).toBe(56); // wall
    expect(db.left.y).toBe(0.5);
    expect(db.right.y).toBe(0.5);
  });

  it('container/system/boundary: middle of the node box edge', () => {
    for (const subtype of [
      ARCH_NODE_TYPES.CONTAINER,
      ARCH_NODE_TYPES.SYSTEM,
      ARCH_NODE_TYPES.BOUNDARY,
    ]) {
      expect(ARCH_HANDLE_ANCHORS[subtype]).toEqual({
        top: { x: 0.5, y: 0 },
        right: { x: 1, y: 0.5 },
        bottom: { x: 0.5, y: 1 },
        left: { x: 0, y: 0.5 },
      });
    }
  });
});

describe('ARCH_HANDLE_STYLES', () => {
  it('centers the handle on the anchor', () => {
    for (const sides of Object.values(ARCH_HANDLE_STYLES)) {
      for (const style of Object.values(sides)) {
        expect(style.transform).toBe('translate(-50%, -50%)');
      }
    }
  });

  it('auto-cancels the opposite axis (RF handle classes set -4px there)', () => {
    for (const sides of Object.values(ARCH_HANDLE_STYLES)) {
      for (const style of Object.values(sides)) {
        expect(style.right).toBe('auto');
        expect(style.bottom).toBe('auto');
      }
    }
  });

  it('left/top are anchor percentages', () => {
    const style = ARCH_HANDLE_STYLES[ARCH_NODE_TYPES.DATABASE].left;

    expect(style.left).toBe(`${(4 / 60) * 100}%`);
    expect(style.top).toBe('50%');
  });

  it('covers every subtype', () => {
    expect(Object.keys(ARCH_HANDLE_STYLES).sort()).toEqual(
      Object.values(ARCH_NODE_TYPES).sort(),
    );
  });
});
