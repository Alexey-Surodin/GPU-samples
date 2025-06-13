/// <reference types="@webgpu/types" />

import { runJulia, runMandelbrot } from "./fractals/fractals";
import { runConwayGameC } from "./gameConwayCompute/game";
import { runConwayGameF } from "./gameConwayFragment/game";
import { runParticles } from "./particlesCompute/particles";
import { StopFunc } from "./gpu/gpu";
import { GUI } from 'lil-gui';

type Tab = {
  stop?: StopFunc,
} & {
  [key: string]: () => any | undefined,
}

const gui = new GUI();
const tabs: Tab[] = [];


function init() {

  addButton('Conway using compute shader', () => runConwayGameC());
  addButton('Conway using fragment shader', () => runConwayGameF());
  addButton('Mandelbrot', () => runMandelbrot());
  addButton('Julia', () => runJulia());
  addButton('Particles', () => runParticles(gui));
}

function addButton(key: string, onClick: () => Promise<StopFunc>): void {
  const tab: Tab = {
    [key]: async () => {
      gui.title(key);
      tabs.forEach(tab => tab?.stop?.apply(tab));
      tab.stop = await onClick();
    }
  };
  tabs.push(tab);
  gui.add(tab, key);
}

init();