import { Shader, Uniform } from "../gpu/shader";


const computeShaderCode = `
    struct Options {
      width: f32,
      height: f32,
      gravity: f32,
      friction: f32,
    };

    struct Particle {
      pos: vec2f,
      spd: vec2f,
    }

    @group(0) @binding(0) var<uniform> options: Options;
    @group(0) @binding(1) var<storage> particlesIn: array<Particle>;
    @group(0) @binding(2) var<storage, read_write> particlesOut: array<Particle>;

    @compute
    @workgroup_size(64)
    fn computeMain(@builtin(global_invocation_id) id: vec3u) {

      var particle = particlesIn[id.x];

      particle.pos += particle.spd;

      if(particle.pos.x < 0){
        particle.pos.x = abs(particle.pos.x);
        particle.spd.x *= -options.friction;
      }

      if(particle.pos.x > options.width){
        particle.pos.x = 2 * options.width - particle.pos.x;
        particle.spd.x *= -options.friction;
      }

      if(particle.pos.y > options.height){
        particle.pos.y = 2 * options.height - particle.pos.y;
        particle.spd.y *= -options.friction;
      }

      if(particle.pos.y < 0){
        particle.pos.y = abs(particle.pos.y);
        particle.spd.y *= -options.friction;
      }

      particle.spd += vec2f(0, -options.gravity);
      //particle.spd *= options.friction;

      particlesOut[id.x] = particle;
    }
`;


export type ParticleShaderOptions = {
  numOfParticles: number;
  areaWidth: number,
  areaHeight: number,
  gravity: number,
  friction: number,
  speed: number,
}

export class ParticleComputeShader extends Shader {

  uniformOptions: Uniform;
  particlesA: Uniform;
  particlesB: Uniform;

  constructor(options: ParticleShaderOptions) {
    super(computeShaderCode);

    this.uniformOptions = new Uniform({
      array: new Float32Array(4),
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

    this.areaHeight = options.areaHeight;
    this.areaWidth = options.areaWidth;
    this.gravity = options.gravity;
    this.friction = options.friction;

    this.init(options.speed);
  }

  set areaWidth(value: number) {
    this.uniformOptions.options.array[0] = value;
    this.uniformOptions.needsUpdate = true;
  }

  get areaWidth(): number {
    return this.uniformOptions.options.array[0];
  }

  set areaHeight(value: number) {
    this.uniformOptions.options.array[1] = value;
    this.uniformOptions.needsUpdate = true;
  }

  get areaHeight(): number {
    return this.uniformOptions.options.array[1];
  }

  set gravity(value: number) {
    this.uniformOptions.options.array[2] = value;
    this.uniformOptions.needsUpdate = true;
  }

  set friction(value: number) {
    this.uniformOptions.options.array[3] = value;
    this.uniformOptions.needsUpdate = true;
  }

  init(speed:number): void {
    const particleArray = this.particlesA.options.array;
    for (let i = 0; i < particleArray.length;) {

      particleArray[i++] = Math.random() * this.areaWidth;
      particleArray[i++] = Math.random() * this.areaHeight;
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

const renderShaderCode = `
    struct Options {
      width: f32,
      height: f32,
      gravity: f32,
      friction: f32,
    };

    struct Particle {
      pos: vec2f,
      spd: vec2f,
    }

    @group(0) @binding(0) var<uniform> options: Options;
    @group(0) @binding(1) var<storage> particlesIn: array<Particle>;

    struct VertexInput {
      @location(0) pos: vec2f,
      @builtin(instance_index) instance: u32,
    };

    @vertex
    fn vertexMain(input: VertexInput) -> @builtin(position) vec4f {
      let particle = particlesIn[input.instance];
      let screen = vec2f(options.width, options.height);

      let pos = 2.0 * (particle.pos + input.pos) / screen - 1.0;
      return vec4f(pos, 0, 1);
    }

    @fragment
    fn fragmentMain() -> @location(0) vec4f  {
      return vec4f(0.5, 1, 0.5, 1);
    }
`

export class ParticleRenderShader extends Shader {

  constructor(computeShader: ParticleComputeShader) {
    super(renderShaderCode);

    this.resources = computeShader.resources;
  }
}