

import { runComputePass, runRenderLoop, StopFunc } from "../gpu/gpu";
import { CellShader, ComputeShader } from "./shaders";
import { getGeometry } from "../utils";

const WORKGROUP_SIZE = 8;
const UPDATE_INTERVAL = 200;

export function runGame(gridSize: number = 64): Promise<StopFunc> {

  const cellShader = new CellShader(gridSize);
  const computeShader = new ComputeShader(WORKGROUP_SIZE, cellShader);
  const workgroupCount = Math.ceil(gridSize / WORKGROUP_SIZE);
  const geometry = getGeometry(cellShader);
  geometry.instanceCount = gridSize * gridSize;

  const updateCallback = (device: GPUDevice) => {
    const encoder = device.createCommandEncoder();

    runComputePass(encoder, device, computeShader, { x: workgroupCount, y: workgroupCount });

    device.queue.submit([encoder.finish()]);

    cellShader.swapBuffers();
  }

  const stopCallback = () => {
    geometry.dispose();
  }

  return runRenderLoop(geometry, UPDATE_INTERVAL, updateCallback, stopCallback);
}
