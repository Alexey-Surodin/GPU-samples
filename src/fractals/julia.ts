import { Shader, Uniform } from "../gpu/shader";
import { TypedArray } from "../gpu/gpu";

const shaderCode = `
    struct VertexOutput {
      @builtin(position) pos: vec4f,
      @location(0) clipPos: vec3f,
    };

    @vertex
    fn vertexMain(@location(0) position: vec2f) -> VertexOutput {
      var output: VertexOutput;
      output.pos = vec4f(position, 0, 1);
      output.clipPos = vec3f(position, 0);
      return output;
    }

    struct FragInput {
      @location(0) clipPos: vec3f,
    };

    struct UniformInput {
      offset: vec2f,
      scale: f32,
      maxIterations: f32,
      c0: vec2f,
    };

    @group(0) @binding(0) var<uniform> uniformInput: UniformInput;

    @fragment
    fn fragmentMain(input: FragInput) -> @location(0) vec4f {
      var clipPos = (input.clipPos.xy / uniformInput.scale ) + uniformInput.offset;

      var iterations : f32 = 0;
      var x = clipPos.x;
      var y = clipPos.y;
      var x0 = uniformInput.c0.x;
      var y0 = uniformInput.c0.y;
      var arg = 0.0;
      var t : f32 = 0;
      var c = vec3f(0,0,0);

      while ((arg < 4) && (iterations < uniformInput.maxIterations))
      {
          t = (x * x) - (y * y) + x0;
          y = (2 * x * y) + y0;
          x = t;
          arg = (x * x) + (y * y);
          iterations += 1;
      }

      c = getColor(iterations, uniformInput.maxIterations);

      return vec4f(c.rgb, 1);
    }

    fn getColor(i: f32, maxIterations: f32) -> vec3f {
      return (vec3f(i * 3, i * 7, i * 19)  % 255) / 255;
    }

  `;

export type JuliaShaderOptions = {
  scale?: number,
  offset?: { x: number, y: number },
  maxIterations?: number
}

export class JuliaShader extends Shader {

  private uniform: Uniform;

  constructor(options: JuliaShaderOptions = {}) {
    super(shaderCode);

    this.uniform = new Uniform({
      array: new Float32Array(6),
      binding: 0,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      visibility: GPUShaderStage.FRAGMENT,
      bufferType: 'uniform'
    });

    this.resources.push(this.uniform);

    this.offset = options.offset ?? { x: 0, y: 0 };
    this.scale = options.scale ?? 1;
    this.maxIteration = options.maxIterations ?? 150;
  }

  private get uniformArray(): TypedArray {
    return this.uniform.options.array;
  }

  get offset(): { x: number, y: number } {
    return { x: this.uniformArray[0], y: this.uniformArray[1] };
  }

  set offset(value: { x: number, y: number }) {
    this.uniformArray[0] = value.x;
    this.uniformArray[1] = value.y;
    this.uniform.needsUpdate = true;
  }

  get scale(): number {
    return this.uniformArray[2];
  }

  set scale(value: number) {
    this.uniformArray[2] = value;
    this.uniform.needsUpdate = true;
  }

  get maxIterations(): number {
    return this.uniformArray[3];
  }

  set maxIteration(value: number) {
    this.uniformArray[3] = value;
    this.uniform.needsUpdate = true;
  }

  get coeff(): { x: number, y: number } {
    return { x: this.uniformArray[4], y: this.uniformArray[5] };
  }

  set coeff(value: { x: number, y: number }) {
    this.uniformArray[4] = value.x;
    this.uniformArray[5] = value.y;
    this.uniform.needsUpdate = true;
  }
}
