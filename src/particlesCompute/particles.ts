import { runComputePass, runRenderLoop, StopFunc } from "../gpu/gpu";
import { getGeometry } from "../utils";
import { ParticleComputeShader, ParticleRenderShader } from "./shader";

const NUM_PARTICLES = 1000;
const UPDATE_INTERVAL = 20;

export function runParticles(): Promise<StopFunc> {

  const computeShader = new ParticleComputeShader({
    areaHeight: 512,
    areaWidth: 512,
    friction: 0.9,
    gravity: 0,
    speed: 10,
    numOfParticles: NUM_PARTICLES,
  });
  const renderShader = new ParticleRenderShader(computeShader);

  const geometry = getGeometry(renderShader);
  geometry.instanceCount = NUM_PARTICLES;

  const updateCallback = (device: GPUDevice) => {
    const encoder = device.createCommandEncoder();

    runComputePass(encoder, device, computeShader, { x: NUM_PARTICLES });

    device.queue.submit([encoder.finish()]);

    computeShader.swapBuffers();
  }

  const stopCallback = () => {
    geometry.dispose();
  }

  return runRenderLoop(geometry, UPDATE_INTERVAL, updateCallback, stopCallback);
}
