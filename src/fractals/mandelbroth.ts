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
      maxIterations: f32
    };

    @group(0) @binding(0) var<uniform> uniformInput: UniformInput;

    @fragment
    fn fragmentMain(input: FragInput) -> @location(0) vec4f {
      var clipPos = (input.clipPos.xy / uniformInput.scale ) + uniformInput.offset;
      
      //var colorStep = vec3f(50, 10, 1) / uniformInput.maxIterations;
      var colorStep = vec3f(1200, 900, 600) / uniformInput.maxIterations;

      var iterations : f32 = 0;
      var x = clipPos.x;
      var y = clipPos.y;
      var x0 = x;
      var y0 = y;
      var arg = (x0 * x0) + (y0 * y0);
      var t : f32 = 0;
      var c = vec3f(0,0,0);

      while ((arg < 4) && (iterations < uniformInput.maxIterations))
      {
          t = (x * x) - (y * y) + x0;
          y = (2 * x * y) + y0;
          x = t;
          arg = (x * x) + (y * y);
          iterations += 1;
          c = stepColor(c, colorStep);
      }

      c = min(c / 255, vec3f(1,1,1));

      return vec4f(c.rgb, 1);
    }

    fn stepColor(c : vec3f, colorStep: vec3f) -> vec3f {
      if(c.r < 255){
        return vec3f(c.r + colorStep.r, c.gb);
      }

      if(c.g < 255){
        return vec3f(c.r, c.g + colorStep.g, c.b);
      }

      if(c.b < 255){
        return vec3f(c.rg, c.b + colorStep.b);
      }
      
      return c;
    }

  `;

export type MandelbrothShaderOptions = {
  scale?: number,
  offset?: { x: number, y: number },
  maxIterations?: number
}

export class MandelbrothShader extends Shader {

  private uniform: Uniform;

  constructor(options: MandelbrothShaderOptions = {}) {
    super(shaderCode);

    this.uniform = new Uniform({
      array: new Float32Array(4),
      binding: 0,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      visibility: GPUShaderStage.FRAGMENT,
      bufferType: 'uniform'
    });

    this.resources.push(this.uniform);

    this.offset = options.offset ?? { x: -1.5, y: 0 };
    this.scale = options.scale ?? 10;
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
}
