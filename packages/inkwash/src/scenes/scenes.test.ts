import { describe, expect, it } from 'vitest';
import { subjectFragment } from '../core/shaders/subject';
import { architecture, bamboo, clouds, mountains, plum, waves } from './index';
import { growPlum, packPlum, PLUM_BLOSSOMS, PLUM_SEGMENTS } from './plum/layout';

const all = [mountains, architecture, clouds, waves, bamboo, plum];
// Identifiers that GLSL ES 3.00 reserves or defines as built-in functions.
const reserved = /\bfloat\s+(half|far|distance|dot|length|mix|step|input|output|filter|sample)\b/u;

describe('ink-wash scenes', () => {
    it.each(all.map((scene) => [scene.name, scene] as const))('%s plugs into the pipeline through the scene contract', (_name, scene) => {
        expect(scene.glsl).toContain('vec3 paintScene(vec2 uv, float aspect, float clearing, vec3 color)');
        expect(scene.glsl).not.toMatch(/uniform\s+\w+\s+(uPaper|uInk|uTime|uReveal|uResolution)\b/u);
        expect(scene.glsl).not.toMatch(reserved);
        expect(subjectFragment(scene.glsl).startsWith('#version 300 es')).toBe(true);
        expect(scene.orbit.angle).toBeGreaterThan(0);
    });

    it('has unique scene names', () => {
        expect(new Set(all.map((scene) => scene.name)).size).toBe(all.length);
    });

    it('grows the same plum within the shader capacity', () => {
        const layout = growPlum();
        expect(growPlum()).toEqual(layout);
        expect(layout.segments.length).toBeGreaterThan(10);
        expect(layout.segments.length).toBeLessThanOrEqual(PLUM_SEGMENTS);
        expect(layout.blossoms.length).toBeGreaterThan(4);
        expect(layout.blossoms.length).toBeLessThanOrEqual(PLUM_BLOSSOMS);
        expect(packPlum(layout).segments).toHaveLength(PLUM_SEGMENTS * 4);
    });
});
