import { TypedArray } from "../gpu/gpu";
import { Sampler, Texture } from "../gpu/resource";
import { Shader, Uniform } from "../gpu/shader";

const shaderCode = `
    struct Options {
      width: f32,
      height: f32,
    };

    @group(0) @binding(0) var<uniform> options: Options;

    @vertex
    fn vertexMain(@location(0) position: vec2f) -> @builtin(position) vec4f {
      return vec4f(position, 0, 1);
    }

    @group(0) @binding(1) var ourTexture: texture_2d<f32>;
    @group(0) @binding(2) var ourSampler: sampler;

    fn state(coord : vec2f, size : vec2f ) -> f32 {
      var sum : f32 = 0.0;
      let p = textureSample(ourTexture, ourSampler, fract(coord / size)).r;

      for(var i:i32=-1; i <= 1; i++){
        for(var j:i32=-1; j<=1; j++ ){
          sum += textureSample(ourTexture, ourSampler, fract((coord + vec2f(f32(i),f32(j))) / size)).r;
        }
      }
      let isAlive = (sum > (3.0 + p) || (sum < 3.0));
      if(isAlive){
        return 0.0;
        }
      else {
        return 1.0;
      }
    }

    @fragment
    fn fragmentMain( @builtin(position) fragCoord: vec4f ) -> @location(0) vec4f {
      let size = vec2f(options.width, options.height);
      let s = state(fragCoord.xy, size);
      let c = fragCoord.xy / size;
      return vec4f(s, c.x * s, s * (1.0 - c.x), s);
    }
`

export type ConwayFShaderOptions = {
  width: number,
  height: number,
  array: TypedArray,
  textureFormat: GPUTextureFormat,
}

export class ConwayFShader extends Shader {
  uniform: Uniform;
  sampler: Sampler;
  texture: Texture;

  constructor(options: ConwayFShaderOptions) {
    super(shaderCode);

    this.uniform = new Uniform({
      array: new Float32Array(2),
      binding: 0,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
      visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
      bufferType: "uniform",
      label: "texture"
    });

    const d: GPUTextureDescriptor = {
      format: options.textureFormat,
      size: [options.width, options.height],
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
      dimension: "2d",
    }

    this.texture = new Texture({
      array: options.array,
      binding: 1,
      visibility: GPUShaderStage.FRAGMENT,
      texture: d,
      pixelSize: 4,
      sampleType: 'float',
      viewDimension: '2d',
    });

    this.sampler = new Sampler({
      binding: 2,
      visibility: GPUShaderStage.FRAGMENT,
      type: "non-filtering",
      label: "sampler"
    });

    this.width = options.width;
    this.height = options.height;

    this.texture.needsUpdate = true;

    this.resources = [this.uniform, this.texture, this.sampler];
  }

  set width(value: number) {
    this.uniform.options.array[0] = value;
    this.uniform.needsUpdate = true;
  }

  set height(value: number) {
    this.uniform.options.array[1] = value;
    this.uniform.needsUpdate = true;
  }
}