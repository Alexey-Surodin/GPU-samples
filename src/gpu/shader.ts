import { TypedArray } from "./gpu";

export type UniformOptions = {
  array: TypedArray,
  binding: number,
  visibility: GPUShaderStage[keyof (GPUShaderStage)],
  usage: GPUBufferUsage[keyof (GPUBufferUsage)],
  label?: string,
  bufferType?: GPUBufferBindingType,
}

export class Uniform {
  options: Required<UniformOptions>;

  buffer: GPUBuffer | null = null;
  layout: GPUBindGroupLayoutEntry | null = null;
  needsUpdate: boolean = false;

  constructor(options: UniformOptions) {
    this.options = {
      array: options.array,
      binding: options.binding,
      visibility: options.visibility,
      usage: options.usage,
      label: options.label ?? '',
      bufferType: options.bufferType ?? 'uniform',
    };
  }

  dispose(): void {
    this.buffer?.destroy();
    this.buffer = null;
    this.layout = null;
  }
}

export class Shader {

  shaderModule: GPUShaderModule | null = null;

  code: string;
  label: string = '';
  vertexEntryPoint = 'vertexMain';
  fragmentEntryPoint = 'fragmentMain';
  computeEntryPoint = 'computeMain';
  uniforms: Uniform[] = [];

  constructor(code?: string) {

    this.code = code ?? `
    @vertex
    fn vertexMain(@location(0) position: vec2f) -> @builtin(position) vec4f {
      return vec4f(position, 0, 1);
    }

    @fragment
    fn fragmentMain() -> @location(0) vec4f {
      return vec4f(1, 0, 1, 1);
    }
  `;
  }

  compile(device: GPUDevice): GPUShaderModule {
    this.shaderModule = device.createShaderModule({
      label: this.label,
      code: this.code
    });

    return this.shaderModule;
  }
}

export function prepareUniform(device: GPUDevice, uniform: Uniform): { layout: GPUBindGroupLayoutEntry, buffer: GPUBuffer } {
  if (uniform.buffer && uniform.layout) {
    if (uniform.needsUpdate) {
      device.queue.writeBuffer(uniform.buffer, 0, uniform.options.array);
      uniform.needsUpdate = false;
    }
    return { layout: uniform.layout, buffer: uniform.buffer }
  }

  if (!uniform.buffer) {
    const options = uniform.options;
    const array = options.array;
    const gpuBuffer = device.createBuffer({
      label: options.label,
      size: array.byteLength,
      usage: options.usage,
    });

    device.queue.writeBuffer(gpuBuffer, 0, array);
    uniform.buffer = gpuBuffer;
  }

  if (!uniform.layout) {
    const bufferLayout: GPUBindGroupLayoutEntry = {
      binding: uniform.options.binding,
      visibility: uniform.options.visibility,
      buffer: { type: uniform.options.bufferType }
    };

    uniform.layout = bufferLayout;
  }

  return { layout: uniform.layout, buffer: uniform.buffer }
}

export function prepareShaderBindGroup( device: GPUDevice, shader: Shader): { layout: GPUBindGroupLayout, bindGroup: GPUBindGroup } {
  const uniformLayoutEntries: GPUBindGroupLayoutEntry[] = [];
  const uniformBindEntries: GPUBindGroupEntry[] = [];

  for (const uniform of shader.uniforms) {
    const { layout, buffer } = prepareUniform(device, uniform);
    uniformLayoutEntries.push(layout);
    uniformBindEntries.push({
      binding: layout.binding,
      resource: { buffer: buffer },
    });
  }

  const layout = device.createBindGroupLayout({
    label: shader.label + "uniform layout",
    entries: uniformLayoutEntries,
  });

  const bindGroup = device.createBindGroup({
    label: shader.label + "bind group",
    layout: layout,
    entries: uniformBindEntries,
  });

  return { layout, bindGroup };
}

export function prepareShader(device: GPUDevice, shader: Shader): { shaderModule: GPUShaderModule, layout: GPUBindGroupLayout, bindGroup: GPUBindGroup } {

  const shaderModule = shader.shaderModule ?? shader.compile(device);
  const { layout, bindGroup } = prepareShaderBindGroup(device, shader);
  return { shaderModule, layout, bindGroup }
}