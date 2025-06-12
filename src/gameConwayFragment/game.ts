import { prepareGpu, runRenderLoop, StopFunc } from "../gpu/gpu";
import { getGeometry } from "../utils";
import { ParticleFragmentShader } from "./shader";

export async function runConwayGameF(): Promise<StopFunc> {
  const { context } = await prepareGpu({ usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC });
  const canvasTexture = context.getCurrentTexture();
  const w = canvasTexture.width;
  const h = canvasTexture.height;
  const array = new Uint8Array(w * h * 4);

  for (let i = 0; i < array.length;) {
    const state = Math.random() > 0.6 ? 255 : 0;
    array[i++] = state;
    array[i++] = state;
    array[i++] = state;
    array[i++] = 255;
  }

  const shader = new ParticleFragmentShader({
    array: array,
    height: h,
    width: w,
    textureFormat: canvasTexture.format,
  });

  const geometry = getGeometry(shader);

  const onFrameCallback = (_: GPUDevice, context: GPUCanvasContext, encoder: GPUCommandEncoder) => {
    const canvasTexture = context.getCurrentTexture();
    const gpuTexture = shader.texture.gpuTexture;
    if (gpuTexture)
      encoder.copyTextureToTexture(
        { texture: canvasTexture },
        { texture: gpuTexture },
        [w, h],
      );
  }

  const onStopCallback = () => {
    geometry.dispose();
    shader.dispose();
  }

  const canvasConfig = { usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC };

  return runRenderLoop(geometry, onFrameCallback, onStopCallback, canvasConfig);
}
