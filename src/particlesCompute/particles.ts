import { getCanvas, runComputePass, runRenderLoop, StopFunc } from "../gpu/gpu";
import { getGeometry } from "../utils";
import { ParticleShader, ParticleShaderOptions, UniformOptionsOffset } from "./shader";
import { GUI } from 'lil-gui';

const NUM_PARTICLES = 2000;
const WORKGROUP_COUNT = 64;

export async function runParticles(gui: GUI): Promise<StopFunc> {

  const shaderOptions: ParticleShaderOptions = {
    height: 1024,
    width: 1024,
    friction: 0.0,
    bounce: 0.9,
    wallHeat: 1.2,
    mouseHeat: 1.0,
    mouseX: 0,
    mouseY: 0,
    radius: 2,
    speed: 0,
    numOfParticles: NUM_PARTICLES,
    workgroupCount: WORKGROUP_COUNT,
  };

  let shader = new ParticleShader(shaderOptions);
  const geometry = getGeometry(shader);
  geometry.instanceCount = shaderOptions.numOfParticles;
  const pFolder = gui.addFolder('Particles Options');

  const onMouseMove = (ev: MouseEvent) => {
    const canvas = ev.target as HTMLCanvasElement;
    if (!canvas)
      return;

    const canvasSize = canvas.getClientRects()[0];

    const x = ev.x;
    const y = canvasSize.height - ev.y;
    if (x < canvasSize.width && x > 0 && y > 0 && y < canvasSize.width) {
      shader.setUniformOption(UniformOptionsOffset.mouseX, x);
      shader.setUniformOption(UniformOptionsOffset.mouseY, y);
    }
  }

  const onMouseLeave = () => {
    shader.setUniformOption(UniformOptionsOffset.mouseX, -1);
    shader.setUniformOption(UniformOptionsOffset.mouseY, -1);
  }

  const addGUI = async () => {
    const canvas = await getCanvas();
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);

    pFolder.add(shaderOptions, 'numOfParticles', 100, 20000);
    pFolder.add(shaderOptions, 'bounce', 0.7, 1);
    pFolder.add(shaderOptions, 'friction', 0, 0.01);
    pFolder.add(shaderOptions, 'radius', 1, 4);
    pFolder.add(shaderOptions, 'mouseHeat', 0, 8);
    pFolder.add(shaderOptions, 'wallHeat', 0, 4);

    pFolder.onChange((ev) => {
      if (ev.property == 'numOfParticles') {
        shader.dispose();
        geometry.shader = shader = new ParticleShader(shaderOptions);
        geometry.instanceCount = shaderOptions.numOfParticles
      }
      else {
        shader.setUniformOption(ev.property, ev.value);
      }
    });
  }

  const removeGUI = async () => {
    const canvas = await getCanvas();
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mouseleave', onMouseLeave);
    pFolder.destroy();
  }

  const updateCallback = (device: GPUDevice) => {
    const encoder = device.createCommandEncoder();
    runComputePass(encoder, device, shader, { x: Math.ceil(shaderOptions.numOfParticles / WORKGROUP_COUNT) });
    device.queue.submit([encoder.finish()]);
    shader.swapBuffers();
  }

  const stopCallback = async () => {
    geometry.dispose();
    shader.dispose();
    await removeGUI();
  }

  addGUI();

  return await runRenderLoop(geometry, updateCallback, stopCallback, { alphaMode: "premultiplied" });
}