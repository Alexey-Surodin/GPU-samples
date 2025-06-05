import { Shader } from "./shader";
import { TypedArray } from "./gpu";

export type AttributeLabel = 'index' | 'position' | string;

export type BufferAttributeOptions = {
  array: TypedArray,
  format: GPUVertexFormat,
  shaderLocation: number,
  offset?: number,
  itemSize?: number,
  label?: AttributeLabel,
  usage?: GPUBufferUsage[keyof (GPUBufferUsage)]
}

export class BufferAttribute {
  options: Required<BufferAttributeOptions>;

  buffer: GPUBuffer | null = null;
  layout: GPUVertexBufferLayout | null = null;

  constructor(options: BufferAttributeOptions) {
    this.options = {
      array: options.array,
      format: options.format,
      shaderLocation: options.shaderLocation,
      offset: options.offset ?? 0,
      itemSize: options.itemSize ?? 1,
      label: options.label ?? '',
      usage: options.usage ?? GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    };
  }

  dispose(): void {
    this.buffer?.destroy();
    this.buffer = null;
    this.layout = null;
  }
}

export class Geometry {

  shader?: Shader;
  instanceCount?: number;

  constructor(public attributes: BufferAttribute[], shader?: Shader) {
    this.shader = shader;
  }

  dispose(): void {
    for (const attribute of this.attributes)
      attribute.dispose();
  }
}

export function prepareAttribute(device: GPUDevice, attribute: BufferAttribute): { layout: GPUVertexBufferLayout, buffer: GPUBuffer } {
  if (attribute.buffer && attribute.layout)
    return { layout: attribute.layout, buffer: attribute.buffer }

  const attrOptions = attribute.options;
  const array = attrOptions.array;
  const gpuBuffer = device.createBuffer({
    label: attrOptions.label,
    size: array.byteLength,
    usage: attrOptions.usage,
  });

  device.queue.writeBuffer(gpuBuffer, 0, array);

  const bufferLayout: GPUVertexBufferLayout = {
    arrayStride: attrOptions.itemSize * array.BYTES_PER_ELEMENT,
    attributes: [{
      format: attrOptions.format,
      offset: attrOptions.offset,
      shaderLocation: attrOptions.shaderLocation,
    }],
  };

  attribute.buffer = gpuBuffer;
  attribute.layout = bufferLayout;
  return { layout: attribute.layout, buffer: attribute.buffer }
}

export function prepareGeometry(device: GPUDevice, geometry: Geometry): {
  index?: BufferAttribute,
  vertexCount: number,
  attrLayout: GPUVertexBufferLayout[],
  attrToDraw: Map<number, GPUBuffer>
} {
  let index: BufferAttribute | undefined;
  let vertexCount: number = 0;
  const attrLayout: GPUVertexBufferLayout[] = [];
  const attrToDraw: Map<number, GPUBuffer> = new Map();

  for (const attribute of geometry.attributes) {
    const { layout, buffer } = prepareAttribute(device, attribute);
    if (attribute.options.label == 'index') {
      index = attribute;
      continue;
    }

    if (attribute.options.label == 'position')
      vertexCount = attribute.options.array.length / attribute.options.itemSize;

    if (attribute.layout && attribute.buffer) {
      attrLayout.push(layout);
      attrToDraw.set(attribute.options.shaderLocation, buffer);
    }
  }

  return { index, vertexCount, attrLayout, attrToDraw };
}