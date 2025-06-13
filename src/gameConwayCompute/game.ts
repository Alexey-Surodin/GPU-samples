import { runComputePass, runRenderLoop, StopFunc } from "../gpu/gpu";
import { ConwayCShader } from "./shaders";
import { getGeometry } from "../utils";

const WORKGROUP_SIZE = 16; // due to maxComputeInvocationsPerWorkgroup = 256 = 16 * 16

export function runConwayGameC(gridSize: number = 1024): Promise<StopFunc> {

  const shader = new ConwayCShader(WORKGROUP_SIZE, gridSize);
  const workgroupCount = Math.ceil(gridSize / WORKGROUP_SIZE);
  const geometry = getGeometry(shader);
  geometry.instanceCount = gridSize * gridSize;

  const updateCallback = (device: GPUDevice, context: GPUCanvasContext, encoder: GPUCommandEncoder) => {
    runComputePass(encoder, device, shader, { x: workgroupCount, y: workgroupCount });
    shader.swapBuffers();
  }

  const stopCallback = () => {
    geometry.dispose();
    shader.dispose();
  }

  return runRenderLoop(geometry, updateCallback, stopCallback);
}
