import { bindTexture, createPingPong, createProgram, createTarget, deleteTarget } from './gl';
import { fullscreenVertex } from './shaders/common';
import * as fragments from './shaders/fluid';
import type { InkSplat, PingPongTarget, RenderTarget, ShaderProgram } from '../types';

const SIM_SHORT_SIDE = 128;
const DYE_SHORT_SIDE = 512;
const PRESSURE_ITERATIONS = 18;

/**
 * 墨水流体：二维不可压缩流体（平流、涡量约束、压力投影），墨浓度随速度场平流并缓慢消散。
 */
export class InkFluid {
    private readonly programs: Record<keyof typeof fragments, ShaderProgram>;
    private velocity!: PingPongTarget;
    private dyeField!: PingPongTarget;
    private pressure!: PingPongTarget;
    private divergence!: RenderTarget;
    private curl!: RenderTarget;
    private aspect = 1;
    private allocated = false;

    /**
     * @param gl WebGL2 上下文（需支持半精度浮点渲染）。
     * @param vao 全屏三角形。
     */
    constructor(private readonly gl: WebGL2RenderingContext, private readonly vao: WebGLVertexArrayObject) {
        this.programs = Object.fromEntries(Object.entries(fragments).map(([name, source]) => [name, createProgram(gl, fullscreenVertex, source)])) as Record<keyof typeof fragments, ShaderProgram>;
    }

    /** 当前墨浓度纹理。 */
    get dye(): RenderTarget { return this.dyeField.read; }

    /** 当前速度场纹理。 */
    get velocityField(): RenderTarget { return this.velocity.read; }

    /**
     * 按画面宽高比重建全部场（清空已有墨迹）。
     * @param aspect 画面宽高比。
     */
    resize(aspect: number): void {
        if (this.allocated && Math.abs(this.aspect - aspect) < 0.005) return;
        this.dispose();
        this.aspect = aspect;
        // 超宽和竖屏也有网格预算，不能通过长边绕过短边限制。
        const size = (short: number): [number, number] => {
            const w = aspect >= 1 ? short * aspect : short;
            const h = aspect >= 1 ? short : short / aspect;
            const scale = Math.min(1, short * 2 / Math.max(w, h));
            return [Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale))];
        };
        const [simWidth, simHeight] = size(SIM_SHORT_SIDE);
        const [dyeWidth, dyeHeight] = size(DYE_SHORT_SIDE);
        this.velocity = createPingPong(this.gl, simWidth, simHeight);
        this.pressure = createPingPong(this.gl, simWidth, simHeight);
        this.divergence = createTarget(this.gl, simWidth, simHeight);
        this.curl = createTarget(this.gl, simWidth, simHeight);
        this.dyeField = createPingPong(this.gl, dyeWidth, dyeHeight);
        this.allocated = true;
    }

    /**
     * 注入一次墨与速度。
     * @param splat 注入参数。
     */
    splat(splat: InkSplat): void {
        this.splatInto(this.velocity, splat, [splat.dx, splat.dy, 0], splat.radius, splat.burst ? 1 : 0);
        if (splat.ink > 0) this.splatInto(this.dyeField, splat, [splat.ink, 0, 0], splat.radius, 0);
    }

    /**
     * 推进一步模拟。
     * @param dt 有界的平流时间步长（秒）。
     * @param elapsed 实际经过时间，用于墨量消散，避免掉帧延长尾迹。
     */
    step(dt: number, elapsed = dt): void {
        const { velocity, pressure } = this;
        const texel = (target: RenderTarget): [number, number] => [1 / target.width, 1 / target.height];
        const simTexel = texel(velocity.read);
        // 1. 涡量约束：先求旋度，再把旋转补回速度场。
        this.pass('curlFragment', this.curl, simTexel, (u, gl) => gl.uniform1i(u.uVelocity!, bindTexture(gl, velocity.read, 0)));
        this.pass('vorticityFragment', velocity.write, simTexel, (u, gl) => {
            gl.uniform1i(u.uVelocity!, bindTexture(gl, velocity.read, 0));
            gl.uniform1i(u.uCurl!, bindTexture(gl, this.curl, 1));
            gl.uniform1f(u.uStrength!, 5);
            gl.uniform1f(u.uDt!, dt);
        });
        velocity.swap();
        // 2. 压力投影：散度 → 雅可比迭代 → 减梯度，保证不可压缩。
        this.pass('divergenceFragment', this.divergence, simTexel, (u, gl) => gl.uniform1i(u.uVelocity!, bindTexture(gl, velocity.read, 0)));
        this.pass('scaleFragment', pressure.write, simTexel, (u, gl) => { gl.uniform1i(u.uSource!, bindTexture(gl, pressure.read, 0)); gl.uniform1f(u.uScale!, 0.8); });
        pressure.swap();
        for (let iteration = 0; iteration < PRESSURE_ITERATIONS; iteration++) {
            this.pass('pressureFragment', pressure.write, simTexel, (u, gl) => {
                gl.uniform1i(u.uPressure!, bindTexture(gl, pressure.read, 0));
                gl.uniform1i(u.uDivergence!, bindTexture(gl, this.divergence, 1));
            });
            pressure.swap();
        }
        this.pass('gradientFragment', velocity.write, simTexel, (u, gl) => {
            gl.uniform1i(u.uPressure!, bindTexture(gl, pressure.read, 0));
            gl.uniform1i(u.uVelocity!, bindTexture(gl, velocity.read, 1));
        });
        velocity.swap();
        // 3. 平流：速度自平流，墨沿速度场平流；墨消散得慢，能停留数秒。
        this.advect(velocity, simTexel, dt, elapsed, 2.2);
        this.advect(this.dyeField, simTexel, dt, elapsed, 0.55);
    }

    /** 在墨迹已充分消散时清空场，允许管线停止模拟。 */
    clear(): void {
        if (!this.allocated) return;
        for (const target of [this.velocity.read, this.velocity.write, this.pressure.read, this.pressure.write, this.dyeField.read, this.dyeField.write, this.divergence, this.curl]) {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, target.framebuffer);
            this.gl.clearColor(0, 0, 0, 0); this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        }
    }

    /** 释放全部场。 */
    dispose(): void {
        if (!this.allocated) return;
        this.allocated = false;
        for (const pair of [this.velocity, this.pressure, this.dyeField]) { deleteTarget(this.gl, pair.read); deleteTarget(this.gl, pair.write); }
        deleteTarget(this.gl, this.divergence);
        deleteTarget(this.gl, this.curl);
    }

    private advect(field: PingPongTarget, simTexel: [number, number], dt: number, elapsed: number, dissipation: number): void {
        this.pass('advectionFragment', field.write, simTexel, (u, gl) => {
            gl.uniform1i(u.uVelocity!, bindTexture(gl, this.velocity.read, 0));
            gl.uniform1i(u.uSource!, bindTexture(gl, field.read, 1));
            gl.uniform1f(u.uDt!, dt);
            gl.uniform1f(u.uDissipation!, Math.exp(-dissipation * elapsed));
        });
        field.swap();
    }

    private splatInto(field: PingPongTarget, splat: InkSplat, value: [number, number, number], radius: number, radial: number): void {
        this.pass('splatFragment', field.write, [1 / field.read.width, 1 / field.read.height], (u, gl) => {
            gl.uniform1i(u.uTarget!, bindTexture(gl, field.read, 0));
            gl.uniform2f(u.uPoint!, splat.x, splat.y);
            gl.uniform3f(u.uValue!, ...value);
            gl.uniform1f(u.uRadius!, radius);
            gl.uniform1f(u.uAspect!, this.aspect);
            gl.uniform1f(u.uRadial!, radial);
        });
        field.swap();
    }

    private pass(name: keyof typeof fragments, target: RenderTarget, texel: [number, number], setup: (uniforms: Record<string, WebGLUniformLocation>, gl: WebGL2RenderingContext) => void): void {
        const { gl } = this;
        const program = this.programs[name];
        gl.useProgram(program.program);
        gl.bindVertexArray(this.vao);
        if (program.uniforms.uTexel) gl.uniform2f(program.uniforms.uTexel, ...texel);
        setup(program.uniforms, gl);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
        gl.viewport(0, 0, target.width, target.height);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
}
