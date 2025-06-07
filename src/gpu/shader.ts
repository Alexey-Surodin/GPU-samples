import { Resource, Uniform } from "./resource";
export { Uniform };

export class Shader {

  shaderModule: GPUShaderModule | null = null;

  code: string;
  label: string = '';
  vertexEntryPoint = 'vertexMain';
  fragmentEntryPoint = 'fragmentMain';
  computeEntryPoint = 'computeMain';
  resources: Resource<GPUBindingResource>[] = [];

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

  dispose(): void {
    for (let i = 0; i < this.resources.length; i++)
      this.resources[i].dispose();

    this.resources = [];
    this.shaderModule = null;
  }
}

export function prepareShaderBindGroup(device: GPUDevice, shader: Shader): { layout: GPUBindGroupLayout, bindGroup: GPUBindGroup } {
  const layoutEntries: GPUBindGroupLayoutEntry[] = [];
  const bindEntries: GPUBindGroupEntry[] = [];

  for (const res of shader.resources) {
    const { layout, resource } = res.update(device);
    layoutEntries.push(layout);
    bindEntries.push({
      binding: layout.binding,
      resource: resource,
    });
  }

  const layout = device.createBindGroupLayout({
    label: shader.label + "uniform layout",
    entries: layoutEntries,
  });

  const bindGroup = device.createBindGroup({
    label: shader.label + "bind group",
    layout: layout,
    entries: bindEntries,
  });

  return { layout, bindGroup };
}

export function prepareShader(device: GPUDevice, shader: Shader): { shaderModule: GPUShaderModule, layout: GPUBindGroupLayout, bindGroup: GPUBindGroup } {
  const shaderModule = shader.shaderModule ?? shader.compile(device);
  const { layout, bindGroup } = prepareShaderBindGroup(device, shader);
  return { shaderModule, layout, bindGroup }
}