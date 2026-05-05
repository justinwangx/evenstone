import { createTextureFromImage, linkProgram, type PhotoTexture } from "./gl";

const VERT = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// Smooth crossfade of two photos. Two things differ from the photo shader:
//   1. The source is stretched anamorphically across the canvas, smearing the
//      photo's vertical color zones (sky/mountain/beach) sideways so they
//      don't show as horizontal bands after the blur.
//   2. The result is washed heavily with cream so the photo only tints the
//      ambient color rather than dominating it.
const BLEND_FRAG = `
precision highp float;
uniform sampler2D u_photoA;
uniform sampler2D u_photoB;
uniform float u_progress;
varying vec2 v_uv;

void main() {
  vec4 a = texture2D(u_photoA, v_uv);
  vec4 b = texture2D(u_photoB, v_uv);
  float t = smoothstep(0.0, 1.0, u_progress);
  vec3 photo = mix(a.rgb, b.rgb, t);

  // Pull toward gray to soften saturation, then mix heavily with cream.
  float luma = dot(photo, vec3(0.299, 0.587, 0.114));
  vec3 desaturated = mix(vec3(luma), photo, 0.90);
  vec3 cream = vec3(0.965, 0.935, 0.870);
  vec3 washed = mix(desaturated, cream, 0.30);

  gl_FragColor = vec4(washed, 1.0);
}
`;

// One-dimensional 17-tap Gaussian (sigma ≈ 7). Run twice — once horizontally,
// once vertically — to get a full 2D blur. Weights are normalized so the
// truncated kernel still sums to 1.
const BLUR_FRAG = `
precision highp float;
uniform sampler2D u_source;
uniform vec2 u_texelStep;
varying vec2 v_uv;

void main() {
  vec3 c = vec3(0.0);
  c += texture2D(u_source, v_uv + u_texelStep * -8.0).rgb * 0.0382;
  c += texture2D(u_source, v_uv + u_texelStep * -7.0).rgb * 0.0446;
  c += texture2D(u_source, v_uv + u_texelStep * -6.0).rgb * 0.0509;
  c += texture2D(u_source, v_uv + u_texelStep * -5.0).rgb * 0.0569;
  c += texture2D(u_source, v_uv + u_texelStep * -4.0).rgb * 0.0624;
  c += texture2D(u_source, v_uv + u_texelStep * -3.0).rgb * 0.0670;
  c += texture2D(u_source, v_uv + u_texelStep * -2.0).rgb * 0.0705;
  c += texture2D(u_source, v_uv + u_texelStep * -1.0).rgb * 0.0727;
  c += texture2D(u_source, v_uv).rgb                       * 0.0735;
  c += texture2D(u_source, v_uv + u_texelStep *  1.0).rgb * 0.0727;
  c += texture2D(u_source, v_uv + u_texelStep *  2.0).rgb * 0.0705;
  c += texture2D(u_source, v_uv + u_texelStep *  3.0).rgb * 0.0670;
  c += texture2D(u_source, v_uv + u_texelStep *  4.0).rgb * 0.0624;
  c += texture2D(u_source, v_uv + u_texelStep *  5.0).rgb * 0.0569;
  c += texture2D(u_source, v_uv + u_texelStep *  6.0).rgb * 0.0509;
  c += texture2D(u_source, v_uv + u_texelStep *  7.0).rgb * 0.0446;
  c += texture2D(u_source, v_uv + u_texelStep *  8.0).rgb * 0.0382;
  gl_FragColor = vec4(c, 1.0);
}
`;

interface Fbo {
  fb: WebGLFramebuffer;
  tex: WebGLTexture;
  w: number;
  h: number;
}

export interface HaloDrawOptions {
  photoA: PhotoTexture;
  photoB: PhotoTexture;
  progress: number;
  canvasWidth: number;
  canvasHeight: number;
}

export class Halo {
  private gl: WebGLRenderingContext;
  private quad: WebGLBuffer;
  private blendProgram: WebGLProgram;
  private blurProgram: WebGLProgram;
  private blendLoc: {
    aPosition: number;
    uPhotoA: WebGLUniformLocation | null;
    uPhotoB: WebGLUniformLocation | null;
    uProgress: WebGLUniformLocation | null;
  };
  private blurLoc: {
    aPosition: number;
    uSource: WebGLUniformLocation | null;
    uTexelStep: WebGLUniformLocation | null;
  };
  private fboA: Fbo;
  private fboB: Fbo;

  constructor(gl: WebGLRenderingContext, width: number, height: number) {
    this.gl = gl;
    this.blendProgram = linkProgram(gl, VERT, BLEND_FRAG);
    this.blurProgram = linkProgram(gl, VERT, BLUR_FRAG);

    const buffer = gl.createBuffer();
    if (!buffer) throw new Error("createBuffer failed");
    this.quad = buffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    this.blendLoc = {
      aPosition: gl.getAttribLocation(this.blendProgram, "a_position"),
      uPhotoA: gl.getUniformLocation(this.blendProgram, "u_photoA"),
      uPhotoB: gl.getUniformLocation(this.blendProgram, "u_photoB"),
      uProgress: gl.getUniformLocation(this.blendProgram, "u_progress"),
    };
    this.blurLoc = {
      aPosition: gl.getAttribLocation(this.blurProgram, "a_position"),
      uSource: gl.getUniformLocation(this.blurProgram, "u_source"),
      uTexelStep: gl.getUniformLocation(this.blurProgram, "u_texelStep"),
    };

    this.fboA = this.makeFbo(width, height);
    this.fboB = this.makeFbo(width, height);
  }

  private makeFbo(w: number, h: number): Fbo {
    const gl = this.gl;
    const tex = gl.createTexture();
    if (!tex) throw new Error("createTexture failed");
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const fb = gl.createFramebuffer();
    if (!fb) throw new Error("createFramebuffer failed");
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { fb, tex, w, h };
  }

  resize(w: number, h: number): void {
    if (this.fboA.w === w && this.fboA.h === h) return;
    const gl = this.gl;
    gl.deleteFramebuffer(this.fboA.fb);
    gl.deleteTexture(this.fboA.tex);
    gl.deleteFramebuffer(this.fboB.fb);
    gl.deleteTexture(this.fboB.tex);
    this.fboA = this.makeFbo(w, h);
    this.fboB = this.makeFbo(w, h);
  }

  loadPhoto(image: HTMLImageElement): PhotoTexture {
    return {
      texture: createTextureFromImage(this.gl, image),
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  }

  destroyPhoto(photo: PhotoTexture): void {
    this.gl.deleteTexture(photo.texture);
  }

  draw(opts: HaloDrawOptions): void {
    const { gl, quad, fboA, fboB, blendProgram, blurProgram, blendLoc, blurLoc } = this;

    gl.bindBuffer(gl.ARRAY_BUFFER, quad);

    // Pass 1: anamorphic crossfade → fboA (low resolution)
    gl.useProgram(blendProgram);
    gl.enableVertexAttribArray(blendLoc.aPosition);
    gl.vertexAttribPointer(blendLoc.aPosition, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, opts.photoA.texture);
    gl.uniform1i(blendLoc.uPhotoA, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, opts.photoB.texture);
    gl.uniform1i(blendLoc.uPhotoB, 1);
    gl.uniform1f(blendLoc.uProgress, opts.progress);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboA.fb);
    gl.viewport(0, 0, fboA.w, fboA.h);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Pass 2: horizontal Gaussian blur → fboB
    gl.useProgram(blurProgram);
    gl.enableVertexAttribArray(blurLoc.aPosition);
    gl.vertexAttribPointer(blurLoc.aPosition, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fboA.tex);
    gl.uniform1i(blurLoc.uSource, 0);
    gl.uniform2f(blurLoc.uTexelStep, 1 / fboA.w, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboB.fb);
    gl.viewport(0, 0, fboB.w, fboB.h);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Pass 3: vertical Gaussian blur → canvas
    gl.bindTexture(gl.TEXTURE_2D, fboB.tex);
    gl.uniform2f(blurLoc.uTexelStep, 0, 1 / fboB.h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, opts.canvasWidth, opts.canvasHeight);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
