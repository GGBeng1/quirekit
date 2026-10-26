import type { PingPongTarget, RenderTarget, ShaderProgram } from '../types';

/**
 * 编译并链接一个着色器程序，收集全部 uniform 位置。
 * @param gl WebGL2 上下文。
 * @param vertex 顶点着色器源码。
 * @param fragment 片元着色器源码。
 * @returns 程序与 uniform 映射。
 */
export function createProgram(gl: WebGL2RenderingContext, vertex: string, fragment: string): ShaderProgram {
    const program = gl.createProgram()!;
    for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]] as const) {
        const shader = gl.createShader(type)!;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'shader compile failed');
        gl.attachShader(program, shader);
        gl.deleteShader(shader);
    }
    gl.bindAttribLocation(program, 0, 'aPosition');
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'program link failed');
    const uniforms: Record<string, WebGLUniformLocation> = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
    for (let index = 0; index < count; index++) {
        const name = gl.getActiveUniform(program, index)!.name;
        uniforms[name] = gl.getUniformLocation(program, name)!;
    }
    return { program, uniforms };
}

/**
 * 创建半精度浮点渲染目标（线性过滤、边缘钳制）。
 * @param gl WebGL2 上下文。
 * @param width 宽度。
 * @param height 高度。
 * @param format 存储格式；颜色缓存无需浮点，列轮廓使用完整浮点精度。
 * @returns 渲染目标。
 */
export function createTarget(gl: WebGL2RenderingContext, width: number, height: number, format: 'half' | 'float' | 'color' = 'half'): RenderTarget {
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, format === 'float' ? gl.NEAREST : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, format === 'float' ? gl.NEAREST : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, format === 'color' ? gl.RGBA8 : format === 'float' ? gl.RGBA32F : gl.RGBA16F, width, height, 0, gl.RGBA, format === 'color' ? gl.UNSIGNED_BYTE : format === 'float' ? gl.FLOAT : gl.HALF_FLOAT, null);
    const framebuffer = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        gl.deleteTexture(texture); gl.deleteFramebuffer(framebuffer);
        throw new Error('Ink wash framebuffer incomplete');
    }
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { texture, framebuffer, width, height };
}

/**
 * 创建一对读写交替的渲染目标。
 * @param gl WebGL2 上下文。
 * @param width 宽度。
 * @param height 高度。
 * @returns 读写对。
 */
export function createPingPong(gl: WebGL2RenderingContext, width: number, height: number): PingPongTarget {
    const pair = {
        read: createTarget(gl, width, height),
        write: createTarget(gl, width, height),
        swap() { [pair.read, pair.write] = [pair.write, pair.read]; },
    };
    return pair;
}

/**
 * 释放渲染目标。
 * @param gl WebGL2 上下文。
 * @param target 要释放的目标。
 */
export function deleteTarget(gl: WebGL2RenderingContext, target: RenderTarget): void {
    gl.deleteTexture(target.texture);
    gl.deleteFramebuffer(target.framebuffer);
}

/**
 * 创建覆盖全屏的单个三角形，并绑定到属性 0。
 * @param gl WebGL2 上下文。
 * @returns 顶点数组对象。
 */
export function createFullscreenTriangle(gl: WebGL2RenderingContext): WebGLVertexArrayObject {
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    return vao;
}

/**
 * 把纹理绑定到指定纹理单元，返回单元号供 uniform 使用。
 * @param gl WebGL2 上下文。
 * @param target 渲染目标。
 * @param unit 纹理单元。
 * @returns 纹理单元号。
 */
export function bindTexture(gl: WebGL2RenderingContext, target: RenderTarget, unit: number): number {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, target.texture);
    return unit;
}
