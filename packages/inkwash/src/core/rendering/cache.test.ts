import { describe, expect, it } from 'vitest';
import { SceneCache } from './cache';

describe('subject cache lifetime', () => {
    it('ignores cursor ink while a fixed scene remains unchanged', () => {
        const cache = new SceneCache();
        expect(cache.due(0, false, false)).toBe(true);
        cache.painted(0);
        for (let i = 1; i < 1000; i++) expect(cache.due(i, false, false)).toBe(false);
        cache.invalidate();
        expect(cache.due(1000, false, false)).toBe(true);
    });
    it('refreshes every browser frame for atmosphere and camera motion', () => {
        const cache = new SceneCache(); cache.painted(0);
        expect(cache.due(16.7, true, false)).toBe(true);
        expect(cache.due(84, true, false)).toBe(true);
        expect(cache.due(50, true, true)).toBe(true);
    });
});
