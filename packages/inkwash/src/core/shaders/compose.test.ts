import { describe, expect, it } from 'vitest';
import { mountains } from '../../scenes';
import { composeFragment } from './compose';
import { subjectFragment } from './subject';

describe('composed ink-wash fragment', () => {
    it('wraps a scene painter with the shared subject uniforms', () => {
        const source = subjectFragment('vec3 paintScene(vec2 uv, float aspect, float clearing, vec3 color) { return color; }');
        expect(source.startsWith('#version 300 es')).toBe(true);
        for (const uniform of ['uResolution', 'uTime', 'uReveal', 'uPaper', 'uInk', 'uClearCenter', 'uClearRadius']) {
            expect(source).toContain(`uniform`);
            expect(source).toContain(uniform);
        }
        expect(source).toContain('paintScene(vUv, aspect, clearing, uPaper)');
        expect(source.indexOf('float valueNoise')).toBeLessThan(source.indexOf('vec3 paintScene'));
    });

    it('composes cached pixels without scene geometry', () => {
        expect(composeFragment()).toContain('texture(uScene, uv)');
        expect(composeFragment()).not.toContain('paintScene(');
    });

    it('accepts the mountains scene without redeclaring pipeline uniforms', () => {
        expect(mountains.glsl).toContain('vec3 paintScene(vec2 uv, float aspect, float clearing, vec3 color)');
        expect(mountains.glsl).not.toContain('#version');
        expect(mountains.glsl).not.toMatch(/uniform\s+\w+\s+uPaper\b/u);
        expect(subjectFragment(mountains.glsl).match(/uniform vec3 uPaper;/gu)).toHaveLength(1);
    });
});
