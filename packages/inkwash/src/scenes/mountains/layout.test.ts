import { describe, expect, it } from 'vitest';
import { computeSilhouettes, MOUNTAINS, SILHOUETTE_COLUMNS } from './layout';
import { MOUNTAIN_ROWS } from './shader';

describe('mountain silhouettes', () => {
    it('produces one sorted row per mountain and finds the main peak', () => {
        const frame = computeSilhouettes(0, 1.1, 16 / 9);
        expect(MOUNTAINS).toHaveLength(MOUNTAIN_ROWS);
        expect(frame.heights).toHaveLength(MOUNTAIN_ROWS * SILHOUETTE_COLUMNS);
        expect(frame.mainRow).toBeGreaterThanOrEqual(0);
        for (let row = 1; row < MOUNTAIN_ROWS; row++) expect(frame.distances[row - 1]).toBeGreaterThanOrEqual(frame.distances[row]!);
    });

    it('is deterministic for a view and changes when the view orbits', () => {
        const a = computeSilhouettes(0.2, 1.1, 1.5);
        expect(computeSilhouettes(0.2, 1.1, 1.5).heights).toEqual(a.heights);
        expect(computeSilhouettes(-0.2, 1.1, 1.5).heights).not.toEqual(a.heights);
    });
});
