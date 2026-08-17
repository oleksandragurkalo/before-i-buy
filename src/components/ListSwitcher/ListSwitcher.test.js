import { describe, it, expect } from 'vitest';
import { computeMenuPosition } from './ListSwitcher';

describe('computeMenuPosition', () => {
  it('stays standard (flush with the trigger) when the menu fits before the right margin', () => {
    const pos = computeMenuPosition({ wrapperLeft: 202.45, wrapperRight: 228.45, menuWidth: 249.56, viewportWidth: 500 });
    expect(pos).toEqual({ mode: 'standard', maxWidth: 300 });
  });

  it('switches to right-anchored when standard placement would overflow the right margin', () => {
    const pos = computeMenuPosition({ wrapperLeft: 202.45, wrapperRight: 228.45, menuWidth: 249.56, viewportWidth: 359 });
    expect(pos.mode).toBe('right');
    expect(pos.maxWidth).toBe(300);
    // right edge (viewport-relative) should land exactly at viewportWidth - 16
    expect(pos.right).toBeCloseTo(228.45 - (359 - 16));
  });

  it('treats an exact fit (natural width == available space) as standard, not right', () => {
    // available = viewportWidth - 16 - wrapperLeft = 400 - 16 - 100 = 284
    const pos = computeMenuPosition({ wrapperLeft: 100, wrapperRight: 126, menuWidth: 284, viewportWidth: 400 });
    expect(pos.mode).toBe('standard');
  });

  it('caps maxWidth below the 300px ceiling on a narrow viewport, in both modes', () => {
    const standard = computeMenuPosition({ wrapperLeft: 20, wrapperRight: 46, menuWidth: 240, viewportWidth: 300 });
    expect(standard.maxWidth).toBe(268); // 300 - 16*2

    const right = computeMenuPosition({ wrapperLeft: 250, wrapperRight: 276, menuWidth: 260, viewportWidth: 300 });
    expect(right.mode).toBe('right');
    expect(right.maxWidth).toBe(268);
  });

  it('clamps the natural width used for the fit check to maxWidth, not the raw menu width', () => {
    // menuWidth (320) exceeds maxWidth (300), so the fit check should use 300 —
    // with 300px available to the right, this must still resolve to standard.
    const pos = computeMenuPosition({ wrapperLeft: 0, wrapperRight: 26, menuWidth: 320, viewportWidth: 332 });
    expect(pos.mode).toBe('standard');
  });
});
