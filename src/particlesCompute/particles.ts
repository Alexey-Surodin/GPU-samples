import { getCanvas, runComputePass, runRenderLoop, StopFunc } from "../gpu/gpu";
import { getGeometry } from "../utils";
import { ParticleComputeShader, ParticleRenderShader, ParticleShaderOptions, UniformOptionsOffset } from "./shader";
import { GUI } from 'lil-gui';

const NUM_PARTICLES = 2000;
const WORKGROUP_COUNT = 64;

export class ParticleSystem {
  private _boundOnMouseMove = this.onMouseMove.bind(this);
  private _boundOnMouseLeave = this.onMouseLeave.bind(this);

  shaderOptions: ParticleShaderOptions;
  computeShader?: ParticleComputeShader;
  renderShader?: ParticleRenderShader;
  gui?: GUI;
  stopLoop?: StopFunc;

  constructor() {
    this.shaderOptions = {
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
  }

  async run(): Promise<void> {
    await this.addGUI();

    const computeShader = this.computeShader = new ParticleComputeShader(this.shaderOptions);
    this.renderShader = new ParticleRenderShader(this.computeShader);
    const geometry = getGeometry(this.renderShader);
    geometry.instanceCount = NUM_PARTICLES;

    const updateCallback = (device: GPUDevice) => {
      const encoder = device.createCommandEncoder();
      runComputePass(encoder, device, computeShader, { x: Math.ceil(NUM_PARTICLES / WORKGROUP_COUNT) });
      device.queue.submit([encoder.finish()]);
      computeShader.swapBuffers();
    }

    this.stopLoop = await runRenderLoop(geometry, updateCallback, () => geometry.dispose());
  }

  async stop(): Promise<void> {
    if (this.stopLoop)
      this.stopLoop();

    this.computeShader?.dispose();
    this.computeShader = undefined;
    this.renderShader?.dispose();
    this.renderShader = undefined;

    await this.removeGUI();
  }

  onMouseMove(ev: MouseEvent): void {
    const canvas = ev.target as HTMLCanvasElement;
    if (!canvas)
      return;

    const canvasSize = canvas.getClientRects()[0];

    const x = ev.x;
    const y = canvasSize.height - ev.y;
    if (x < canvasSize.width && x > 0 && y > 0 && y < canvasSize.width) {
      this.computeShader?.setUniformOption(UniformOptionsOffset.mouseX, x);
      this.computeShader?.setUniformOption(UniformOptionsOffset.mouseY, y);
    }
  }

  onMouseLeave(): void {
    this.computeShader?.setUniformOption(UniformOptionsOffset.mouseX, -1);
    this.computeShader?.setUniformOption(UniformOptionsOffset.mouseY, -1);
  }

  async addGUI(): Promise<void> {
    const canvas = await getCanvas();
    canvas.addEventListener('mousemove', this._boundOnMouseMove);
    canvas.addEventListener('mouseleave', this._boundOnMouseLeave);

    this.gui ??= new GUI();

    this.gui.add(this.shaderOptions, 'bounce', 0.7, 1);
    this.gui.add(this.shaderOptions, 'friction', 0, 0.01);
    this.gui.add(this.shaderOptions, 'radius', 1, 8);
    this.gui.add(this.shaderOptions, 'mouseHeat', 0, 8);
    this.gui.add(this.shaderOptions, 'wallHeat', 0, 4);

    this.gui.onChange((ev) => {
      this.computeShader?.setUniformOption(ev.property, ev.value);
    });
  }

  async removeGUI(): Promise<void> {
    const canvas = await getCanvas();
    canvas.removeEventListener('mousemove', this._boundOnMouseMove);
    canvas.removeEventListener('mouseleave', this._boundOnMouseLeave);
    this.gui?.destroy();
    this.gui = undefined;
  }
}
