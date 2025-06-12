

import { runComputePass, runRenderLoop, StopFunc } from "../gpu/gpu";
import { CellShader, ComputeShader } from "./shaders";
import { getGeometry } from "../utils";

const WORKGROUP_SIZE = 8;

export function runConwayGameC(gridSize: number = 1024): Promise<StopFunc> {

  const cellShader = new CellShader(gridSize);
  const computeShader = new ComputeShader(WORKGROUP_SIZE, cellShader);
  const workgroupCount = Math.ceil(gridSize / WORKGROUP_SIZE);
  const geometry = getGeometry(cellShader);
  geometry.instanceCount = gridSize * gridSize;

  const updateCallback = (device: GPUDevice, context: GPUCanvasContext, encoder: GPUCommandEncoder) => {
    runComputePass(encoder, device, computeShader, { x: workgroupCount, y: workgroupCount });
    cellShader.swapBuffers();
  }

  const stopCallback = () => {
    geometry.dispose();
    cellShader.dispose();
    computeShader.dispose();
  }

  return runRenderLoop(geometry, updateCallback, stopCallback);
}
