import { createTextureFromImage, linkProgram, type PhotoTexture } from "./gl";

export type { PhotoTexture };

const VERT_SOURCE = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAG_SOURCE = `
precision highp float;

uniform sampler2D u_photoA;
uniform sampler2D u_photoB;
uniform vec2  u_aspectA;
uniform vec2  u_aspectB;
uniform vec2  u_resolution;
uniform float u_progress;
uniform float u_blockSize;

varying vec2 v_uv;

// Object-fit: cover. Scale UVs so that the smaller image dimension fills
// the canvas and the larger one is cropped symmetrically.
vec2 coverUv(vec2 uv, vec2 imgAspect, vec2 canvasAspect) {
  float imgRatio    = imgAspect.x    / imgAspect.y;
  float canvasRatio = canvasAspect.x / canvasAspect.y;
  vec2 scale = vec2(1.0);
  if (canvasRatio > imgRatio) {
    scale.y = imgRatio / canvasRatio;
  } else {
    scale.x = canvasRatio / imgRatio;
  }
  return (uv - 0.5) * scale + 0.5;
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uvA = coverUv(v_uv, u_aspectA, u_resolution);
  vec2 uvB = coverUv(v_uv, u_aspectB, u_resolution);

  vec4 colA = texture2D(u_photoA, uvA);
  vec4 colB = texture2D(u_photoB, uvB);

  // Each block gets a transition threshold. We bias the threshold by distance
  // from center so center blocks cross it first — the dissolve blooms outward
  // and the corners hold longest. The hash adds randomness so it isn't a
  // clean radial wipe.
  vec2 block = floor(v_uv * u_resolution / u_blockSize);
  float jitter = hash(block);
  float dist = length(v_uv - 0.5) * 1.414;     // 0 at center, ~1 at corners
  float n = mix(jitter, dist, 0.22);            // mostly random, gently biased outward
  float edge = 0.08;
  float mask = smoothstep(u_progress - edge, u_progress + edge, n);

  gl_FragColor = mix(colB, colA, mask);
}
`;

export interface DrawOptions {
  photoA: PhotoTexture;
  photoB: PhotoTexture;
  progress: number;
  blockSize: number;
  canvasWidth: number;
  canvasHeight: number;
}

export class Scene {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private quad: WebGLBuffer;
  private loc: {
    aPosition: number;
    uPhotoA: WebGLUniformLocation | null;
    uPhotoB: WebGLUniformLocation | null;
    uAspectA: WebGLUniformLocation | null;
    uAspectB: WebGLUniformLocation | null;
    uResolution: WebGLUniformLocation | null;
    uProgress: WebGLUniformLocation | null;
    uBlockSize: WebGLUniformLocation | null;
  };

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.program = linkProgram(gl, VERT_SOURCE, FRAG_SOURCE);

    const buffer = gl.createBuffer();
    if (!buffer) throw new Error("createBuffer failed");
    this.quad = buffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    this.loc = {
      aPosition: gl.getAttribLocation(this.program, "a_position"),
      uPhotoA: gl.getUniformLocation(this.program, "u_photoA"),
      uPhotoB: gl.getUniformLocation(this.program, "u_photoB"),
      uAspectA: gl.getUniformLocation(this.program, "u_aspectA"),
      uAspectB: gl.getUniformLocation(this.program, "u_aspectB"),
      uResolution: gl.getUniformLocation(this.program, "u_resolution"),
      uProgress: gl.getUniformLocation(this.program, "u_progress"),
      uBlockSize: gl.getUniformLocation(this.program, "u_blockSize"),
    };
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

  draw(opts: DrawOptions): void {
    const { gl, program, loc, quad } = this;

    gl.viewport(0, 0, opts.canvasWidth, opts.canvasHeight);
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(loc.aPosition);
    gl.vertexAttribPointer(loc.aPosition, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, opts.photoA.texture);
    gl.uniform1i(loc.uPhotoA, 0);
    gl.uniform2f(loc.uAspectA, opts.photoA.width, opts.photoA.height);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, opts.photoB.texture);
    gl.uniform1i(loc.uPhotoB, 1);
    gl.uniform2f(loc.uAspectB, opts.photoB.width, opts.photoB.height);

    gl.uniform2f(loc.uResolution, opts.canvasWidth, opts.canvasHeight);
    gl.uniform1f(loc.uProgress, opts.progress);
    gl.uniform1f(loc.uBlockSize, opts.blockSize);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
