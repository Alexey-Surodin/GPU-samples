import { Geometry, prepareGeometry } from "./geometry";
import { prepareShader, Shader } from "./shader";

export type StopFunc = () => void;

export type TypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array;

async function getCanvas(id?: string): Promise<HTMLCanvasElement> {
  const canvas = id ? document.getElementById(id) as HTMLCanvasElement : document.querySelector("canvas");
  if (!canvas) {
    throw new Error("Failed to get canvas.");
  }
  return canvas;
}

async function getGpuAdapter(): Promise<GPUAdapter> {
  if (!navigator.gpu) {
    throw new Error("WebGPU not supported on this browser.");
  }
  const adapter = await navigator.gpu.requestAdapter();

  if (!adapter) {
    throw new Error("No appropriate GPUAdapter found.");
  }
  return adapter;
}

export async function prepareGpu(config?: Partial<GPUCanvasConfiguration>): Promise<{ device: GPUDevice, context: GPUCanvasContext }> {
  const canvas = await getCanvas();
  const context = canvas.getContext('webgpu');
  if (!context)
    throw new Error("Failed to get GPU canvas context");

  const adapter = await getGpuAdapter();
  const device = await adapter.requestDevice();

  const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
  const c: GPUCanvasConfiguration = { device: device, format: canvasFormat };
  context.configure(Object.assign(c, config));

  return { device, context };
}

export function runRenderPass(encoder: GPUCommandEncoder, renderPassDescriptor: GPURenderPassDescriptor, device: GPUDevice, format: GPUTextureFormat, geometry: Geometry): void {
  if (!geometry.shader)
    throw new Error("Geometry shader is not defined");

  const { bindGroup, layout, shaderModule } = prepareShader(device, geometry.shader);
  const { index, attrLayout, attrToDraw, vertexCount } = prepareGeometry(device, geometry);

  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [layout],
  });

  const pipeline: GPURenderPipeline = device.createRenderPipeline({
    layout: pipelineLayout,
    vertex: {
      module: shaderModule,
      entryPoint: geometry.shader.vertexEntryPoint,
      buffers: attrLayout
    },
    fragment: {
      module: shaderModule,
      entryPoint: geometry.shader.fragmentEntryPoint,
      targets: [{
        format: format
      }]
    }
  });

  const renderPass = encoder.beginRenderPass(renderPassDescriptor);
  renderPass.setPipeline(pipeline);
  renderPass.setBindGroup(0, bindGroup);

  for (const [location, buffer] of attrToDraw) {
    renderPass.setVertexBuffer(location, buffer);
  }

  if (index?.buffer) {
    renderPass.setIndexBuffer(index.buffer, index.options.format as GPUIndexFormat, index.options.offset);
    renderPass.drawIndexed(index.options.array.length, geometry.instanceCount);
  }
  else if (vertexCount) {
    renderPass.draw(vertexCount, geometry.instanceCount);
  }
  renderPass.end();
}

export function runComputePass(encoder: GPUCommandEncoder, device: GPUDevice, shader: Shader, workgroupCount: { x: number, y?: number, z?: number }): void {

  const computePass = encoder.beginComputePass();
  const { bindGroup, layout, shaderModule } = prepareShader(device, shader);

  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [layout],
  });

  const computePipeline = device.createComputePipeline({
    layout: pipelineLayout,
    compute: {
      module: shaderModule,
      entryPoint: shader.computeEntryPoint,
    }
  });

  computePass.setPipeline(computePipeline);
  computePass.setBindGroup(0, bindGroup);
  computePass.dispatchWorkgroups(workgroupCount.x, workgroupCount.y, workgroupCount.z);
  computePass.end();
}

export async function runRenderLoop(geometry: Geometry, delay: number, onFrameCallback?: (device: GPUDevice, context: GPUCanvasContext, encoder: GPUCommandEncoder) => void, onStopCallback?: (device: GPUDevice, context: GPUCanvasContext) => void, config?: Partial<GPUCanvasConfiguration>): Promise<StopFunc> {
  const { device, context } = await prepareGpu(config);

  const intervalId = setInterval(() => {
    const encoder = device.createCommandEncoder();
    const texture = context.getCurrentTexture();

    const colorAttachment: GPURenderPassColorAttachment = {
      view: texture.createView(),
      loadOp: "clear",
      storeOp: "store",
      clearValue: [0, 0, 0, 1]
    }

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [colorAttachment]
    }

    runRenderPass(encoder, renderPassDescriptor, device, texture.format, geometry);

    if (onFrameCallback)
      onFrameCallback(device, context, encoder);

    device.queue.submit([encoder.finish()]);
  }, delay);

  const stop = () => {
    clearInterval(intervalId);

    if (onStopCallback)
      onStopCallback(device, context);

    device.destroy();
  }

  return stop;
}