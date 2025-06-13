import { Resource, Uniform } from "./resource";
export { Uniform };

export class Shader {

  shaderModule: GPUShaderModule | null = null;
  bindGroupPair: { layout: GPUBindGroupLayout, bindGroup: GPUBindGroup } | null = null;

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

  getShaderModule(device: GPUDevice): GPUShaderModule {
    if (!this.shaderModule) {
      this.shaderModule = device.createShaderModule({
        label: this.label,
        code: this.code
      });
    }

    return this.shaderModule;
  }

  getBindGroupPair(device: GPUDevice): { layout: GPUBindGroupLayout, bindGroup: GPUBindGroup } {
    if (!this.bindGroupPair) {
      const layoutEntries: GPUBindGroupLayoutEntry[] = [];
      const bindEntries: GPUBindGroupEntry[] = [];

      for (const res of this.resources) {
        const { layout, resource } = res.getResourceBindPair(device);
        layoutEntries.push(layout);
        bindEntries.push({
          binding: layout.binding,
          resource: resource,
        });
      }

      const layout = device.createBindGroupLayout({
        label: this.label + "uniform layout",
        entries: layoutEntries,
      });

      const bindGroup = device.createBindGroup({
        label: this.label + "bind group",
        layout: layout,
        entries: bindEntries,
      });
      this.bindGroupPair = { layout, bindGroup };
    }

    for (const res of this.resources) {
      if (res.needsUpdate)
        res.updateResource(device);
    }

    return this.bindGroupPair;
  }

  dispose(): void {
    for (let i = 0; i < this.resources.length; i++)
      this.resources[i].dispose();

    this.resources = [];
    this.shaderModule = null;
    this.bindGroupPair = null;
  }
}

export function prepareShader(device: GPUDevice, shader: Shader): { shaderModule: GPUShaderModule, layout: GPUBindGroupLayout, bindGroup: GPUBindGroup } {
  const shaderModule = shader.getShaderModule(device);
  const bindGroup = shader.getBindGroupPair(device);
  return { shaderModule, ...bindGroup }
}