import { describe, expect, it } from 'vitest';
import { MathAuthoringSession } from './session';

describe('panel draft lifecycle', () => {
  it('keeps valid preview and invalid draft separate until cancellation', () => {
    const session = new MathAuthoringSession('x');
    const state = session.update(String.raw`\frac{x}{`);
    expect(state.draft).toBe(String.raw`\frac{x}{`);
    expect(state.preview.latex).toBe('x');
    expect(session.prepareCommit().ok).toBe(false);
    expect(session.cancel()).toMatchObject({ draft: 'x', dirty: false });
  });
  it('restores source through undo and redo and clears rejected future steps', () => {
    const session = new MathAuthoringSession('x');
    session.update('y'); session.update('z');
    expect(session.undo().draft).toBe('y');
    expect(session.redo().draft).toBe('z');
    session.undo(); session.update('a');
    expect(session.redo().draft).toBe('a');
  });
  it('preparing a commit does not make cancellation accept a draft', () => {
    const session = new MathAuthoringSession('x');
    session.update('y');
    expect(session.prepareCommit().ok).toBe(true);
    expect(session.cancel().draft).toBe('x');
    session.update('y'); session.acceptCommit();
    expect(session.cancel().draft).toBe('y');
  });
});
