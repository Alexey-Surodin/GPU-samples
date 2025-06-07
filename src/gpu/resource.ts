import { TypedArray } from "./gpu";

export type ResourceOption = {
  label?: string,
  binding: number,
  visibility: GPUShaderStage[keyof (GPUShaderStage)],
}

export abstract class Resource<T extends GPUBindingResource> {
  options: Required<ResourceOption>;
  resource: T | null = null;
  layout: GPUBindGroupLayoutEntry | null = null;
  needsUpdate: boolean = false;

  constructor(options: ResourceOption) {
    this.options = {
      label: options.label ?? '',
      binding: options.binding,
      visibility: options.visibility
    };
  }

  abstract getLayout(device: GPUDevice): GPUBindGroupLayoutEntry;
  abstract getResource(device: GPUDevice): T;
  abstract updateResource(device: GPUDevice): void;

  update(device: GPUDevice): { layout: GPUBindGroupLayoutEntry, resource: GPUBindingResource } {
    if (this.needsUpdate)
      this.updateResource(device);

    if (!this.resource)
      this.resource = this.getResource(device);

    if (!this.layout)
      this.layout = this.getLayout(device);

    this.needsUpdate = false;
    return { layout: this.layout, resource: this.resource };
  }

  dispose(): void {
    this.resource = null;
    this.layout = null;
  }
}

export type UniformOptions = ResourceOption & {
  array: TypedArray,
  bufferType: GPUBufferBindingType,
  usage: GPUBufferUsage[keyof (GPUBufferUsage)],
}

export class Uniform extends Resource<GPUBufferBinding> {
  override options: Required<UniformOptions>;

  constructor(options: UniformOptions) {
    super(options);

    this.options = {
      label: options.label ?? '',
      binding: options.binding,
      visibility: options.visibility,
      usage: options.usage,
      array: options.array,
      bufferType: options.bufferType ?? 'uniform',
    }
  }

  override getResource(device: GPUDevice): GPUBufferBinding {
    const options = this.options;
    const array = options.array;
    const gpuBuffer = device.createBuffer({
      label: options.label,
      size: array.byteLength,
      usage: options.usage,
    });

    device.queue.writeBuffer(gpuBuffer, 0, array);
    return { buffer: gpuBuffer };
  }

  override getLayout(): GPUBindGroupLayoutEntry {
    const bufferLayout: GPUBindGroupLayoutEntry = {
      binding: this.options.binding,
      visibility: this.options.visibility,
      buffer: { type: this.options.bufferType }
    };
    return bufferLayout;
  }

  override updateResource(device: GPUDevice): void {
    if (this.resource)
      device.queue.writeBuffer(this.resource.buffer, 0, this.options.array);
  }

  override dispose(): void {
    this.resource?.buffer?.destroy();
    super.dispose();
  }
}

export type SamplerOptions = ResourceOption & {
  type?: GPUSamplerBindingType,
}

export class Sampler extends Resource<GPUSampler> {
  override options: Required<SamplerOptions>;

  constructor(options: SamplerOptions) {
    super(options);

    this.options = {
      binding: options.binding,
      label: options.label ?? ``,
      type: "non-filtering",
      visibility: options.visibility,
    }
  }

  getLayout(): GPUBindGroupLayoutEntry {
    const bufferLayout: GPUBindGroupLayoutEntry = {
      binding: this.options.binding,
      visibility: this.options.visibility,
      sampler: { type: this.options.type }
    };
    return bufferLayout;
  }

  getResource(device: GPUDevice): GPUSampler {
    return device.createSampler();
  }

  updateResource(): void { }
}

export type TextureOptions = ResourceOption & {
  array: TypedArray,
  pixelSize: number,
  texture: GPUTexture | GPUTextureDescriptor,
  sampleType: GPUTextureSampleType,
  viewDimension: GPUTextureViewDimension,
}

export class Texture extends Resource<GPUTextureView> {
  override options: Required<TextureOptions>;
  gpuTexture: GPUTexture | null = null;

  constructor(options: TextureOptions) {
    super(options);

    this.options = {
      array: options.array,
      pixelSize: options.pixelSize,
      binding: options.binding,
      label: options.label ?? ``,
      texture: options.texture,
      visibility: options.visibility,
      sampleType: options.sampleType,
      viewDimension: options.viewDimension,
    }
  }

  getTexture(device: GPUDevice): GPUTexture {
    if (!this.gpuTexture) {
      if (this.options.texture instanceof GPUTexture)
        this.gpuTexture = this.options.texture;
      else
        this.gpuTexture = device.createTexture(this.options.texture)
    }
    return this.gpuTexture;
  }

  getLayout(): GPUBindGroupLayoutEntry {
    const bufferLayout: GPUBindGroupLayoutEntry = {
      binding: this.options.binding,
      visibility: this.options.visibility,
      texture: {
        multisampled: false,
        sampleType: this.options.sampleType,
        viewDimension: this.options.viewDimension,
      }
    };
    return bufferLayout;
  }

  getResource(device: GPUDevice): GPUTextureView {
    const texture = this.getTexture(device);
    return texture.createView({
      usage: this.options.texture.usage
    });
  }

  updateResource(device: GPUDevice): void {
    const array = this.options.array;
    const texture = this.getTexture(device);

    if (!array)
      return;

    device.queue.writeTexture(
      { texture: texture },
      this.options.array,
      { bytesPerRow: texture.width * this.options.pixelSize * array.BYTES_PER_ELEMENT },
      { width: texture.width, height: texture.height },
    );

    if (this.resource)
      this.resource = null;
  }

  dispose(): void {
    super.dispose();
    this.gpuTexture?.destroy();
  }
}