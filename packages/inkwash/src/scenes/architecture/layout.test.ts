import { describe, expect, it } from 'vitest';
import { subjectFragment } from '../../core/shaders/subject';
import { architecture } from './scene';
import { HALLS, packHalls } from './layout';
import { HALL_COUNT } from './shader';

describe('architecture scene', () => {
    it('plugs into the shared pipeline through the scene contract alone', () => {
        expect(architecture.glsl).toContain('vec3 paintScene(vec2 uv, float aspect, float clearing, vec3 color)');
        expect(architecture.glsl).not.toMatch(/uniform\s+\w+\s+(uPaper|uInk|uTime|uReveal|uResolution)\b/u);
        expect(architecture.glsl).not.toMatch(/\bhalf\b/u);
        expect(subjectFragment(architecture.glsl)).toContain(`uniform vec4 uHalls[${HALL_COUNT * 2}];`);
    });

    it('packs halls far to near for the shader', () => {
        expect(HALLS).toHaveLength(HALL_COUNT);
        for (let i = 1; i < HALLS.length; i++) expect(HALLS[i - 1]!.z).toBeGreaterThanOrEqual(HALLS[i]!.z);
        const packed = packHalls();
        expect(packed).toHaveLength(HALL_COUNT * 8);
        expect(Array.from(packed.slice(56, 64))).toEqual([0, 30, 2, expect.closeTo(17.2, 5), expect.closeTo(1.9, 5), 1.5, 0, 0]);
    });
});
