import { Shader, Uniform } from "../gpu/shader";

const shaderCode = `
    struct Options {
      width: f32,
      height: f32,
      friction: f32,
      bounce: f32,
      wallHeat: f32,
      mouseHeat: f32,
      mouseX: f32,
      mouseY: f32,
      radius: f32,
    };

    struct Particle {
      pos: vec2f,
      spd: vec2f,
    }

    fn calcMouseHeat(particle: Particle) -> Particle {
      if(options.mouseX < 0 || options.mouseY < 0){
        return particle;
      }

      var dir = particle.pos - vec2f(options.mouseX, options.mouseY);
      var distance = length(dir);
      dir = normalize(dir);

      var spd = particle.spd + dir * options.mouseHeat * max( 1.0 - 0.01 * distance, 0.0);

      return Particle(particle.pos, spd);
    }

    fn moveParticle(particle: Particle) -> Particle {
      var spd = particle.spd;
      var pos = particle.pos;
      spd *= (1.0 - options.friction);
      pos += particle.spd;
      return Particle(pos, spd);
    }

    fn calcWallCollision(particle: Particle) -> Particle {
      var spd = particle.spd;
      var pos = particle.pos;

      if(pos.x < options.radius){
        pos.x = options.radius;
        spd.x = options.wallHeat;
      }

      if(pos.x > options.width - options.radius){
        pos.x = options.width - options.radius;
        spd.x = -options.wallHeat;
      }

      if(pos.y > options.height - options.radius){
        pos.y = options.height - options.radius;
        spd.y = -options.wallHeat;
      }

      if(pos.y < options.radius){
        pos.y = options.radius;
        spd.y = options.wallHeat;
      }
      
      return Particle(pos, spd);
    }

    fn calcParticleCollision(a: Particle, b: Particle, index: u32) -> Particle {
      var dir = b.pos - a.pos;
      var l = length(dir);
      var r2 =  2 * options.radius;

      if(l < 0.01){
        return handleStuckParticles(a, index);
      }

      if(l < r2) {
        var r = Particle(a.pos, a.spd);

        var dn = normalize(dir);
        var an = dn * dot(a.spd, dn);
        var at = a.spd - an;
        var bn = dn * dot(b.spd, dn);
        var bt = b.spd - bn;

        r.spd = at + options.bounce * bn;
        r.pos -= dn * options.radius * smoothstep(r2, 0, l ); 
        return r;
      }
      return a;
    }

    fn handleStuckParticles(a: Particle, index: u32) -> Particle {
      var i = f32(index);
      var v = vec2f(cos(i), sin(i));
      return Particle(a.pos + v, a.spd);
    }

    @group(0) @binding(0) var<uniform> options: Options;
    @group(0) @binding(1) var<storage> particlesIn: array<Particle>;
    @group(0) @binding(2) var<storage, read_write> particlesOut: array<Particle>;

    @compute
    @workgroup_size(64)
    fn computeMain(@builtin(global_invocation_id) id: vec3u) {
      let length = arrayLength( &particlesIn );
      let index = u32(id.x);

      if(index >= length){
        return;
      }

      var a = particlesIn[index];
      for(var i : u32 = 0; i < length; i++ ){
        if(i == index){
          continue;
        }
        var b = particlesIn[i];
        a = calcParticleCollision(a, b, index);
      }

      a = moveParticle(a);
      a = calcMouseHeat(a);
      a = calcWallCollision(a);

      particlesOut[index] = a;
    }

    struct VertexInput {
      @location(0) pos: vec2f,
      @builtin(instance_index) instance: u32,
    };

    struct VertexOutput {
      @builtin(position) pos: vec4f,
      @location(0) uv: vec2f,
      @location(1) color: vec3f,
    }

    @vertex
    fn vertexMain(input: VertexInput) -> VertexOutput {
      let particle = particlesIn[input.instance];
      let screen = vec2f(options.width, options.height);

      var pos = 2.0 * (particle.pos + input.pos * options.radius) / screen - 1.0;
      var spd = length(particle.spd);
      var r = smoothstep(0.0, 0.5 * options.radius, spd);
      var g = smoothstep(0.0, options.radius, spd);
      var b = smoothstep(0.0, 2.0 * options.radius, spd);

      var output: VertexOutput;
      output.color = vec3f(0.2) + 0.8 * vec3f(r,g,b);
      output.pos = vec4f(pos, 0.0, 1.0);
      output.uv = input.pos;

      return output;
    }

    @fragment
    fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
      var d = length(input.uv);

      if(d > 0.99){
        discard;
      }
      var alpha = 1.0 - smoothstep(0.9, 1.0, d);
      return vec4f(input.color, alpha);
    }
`;

export enum UniformOptionsOffset {
  width = 0,
  height,
  friction,
  bounce,
  wallHeat,
  mouseHeat,
  mouseX,
  mouseY,
  radius
}
const optionsUniformLength = Object.keys(UniformOptionsOffset).length / 2;

export type ParticleShaderOptions = {
  [property in UniformOptionKeys]: number
} & {
  numOfParticles: number,
  speed: number,
  workgroupCount: number,
};

type UniformOptionKeys = keyof typeof UniformOptionsOffset;


export class ParticleComputeShader extends Shader {

  uniformOptions: Uniform;
  particlesA: Uniform;
  particlesB: Uniform;

  constructor(options: ParticleShaderOptions) {
    super(shaderCode);

    this.uniformOptions = new Uniform({
      array: new Float32Array(optionsUniformLength),
      binding: 0,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
      bufferType: "uniform",
    });

    this.particlesA = new Uniform({
      array: new Float32Array(options.numOfParticles * 4),
      binding: 1,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX,
      bufferType: "read-only-storage"
    });

    this.particlesB = new Uniform({
      array: new Float32Array(options.numOfParticles * 4),
      binding: 2,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      visibility: GPUShaderStage.COMPUTE,
      bufferType: "storage"
    });


    this.resources = [this.uniformOptions, this.particlesA, this.particlesB];

    for (const key in options) {
      const optionKey = key as keyof typeof UniformOptionsOffset;
      this.setUniformOption(UniformOptionsOffset[optionKey], options[optionKey]);
    }

    this.init(options.speed, options.width, options.height);
  }

  setUniformOption(offset: UniformOptionsOffset | string, value: number): void {
    if (typeof offset == 'string') {
      const optionKey = offset as keyof typeof UniformOptionsOffset;
      this.setUniformOption(UniformOptionsOffset[optionKey], value);
    }
    else if (offset != undefined) {
      this.uniformOptions.options.array[offset] = value;
      this.uniformOptions.needsUpdate = true;
    }
  }

  init(speed: number, width: number, height: number): void {
    const particleArray = this.particlesA.options.array;
    for (let i = 0; i < particleArray.length;) {

      particleArray[i++] = Math.random() * width;
      particleArray[i++] = Math.random() * height;
      particleArray[i++] = (Math.random() * 2 - 1) * speed;
      particleArray[i++] = (Math.random() * 2 - 1) * speed;
    }
  }

  swapBuffers(): void {
    const t = this.particlesA.resource;
    this.particlesA.resource = this.particlesB.resource;
    this.particlesB.resource = t;
  }
}

export class ParticleRenderShader extends Shader {

  constructor(computeShader: ParticleComputeShader) {
    super(shaderCode);

    this.resources = computeShader.resources;
  }
}