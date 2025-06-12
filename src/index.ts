/// <reference types="@webgpu/types" />

import { runJulia, runMandelbroth } from "./fractals/fractals";
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

  addButton('Conway on compute shader', () => runConwayGameC());
  addButton('Conway on fragment shader', () => runConwayGameF());
  addButton('Mandelbroth', () => runMandelbroth());
  addButton('Julia', () => runJulia());
  addButton('Particles', () => runParticles(gui));
}

function addButton(key: string, onClick: () => Promise<StopFunc>): void {
  const tab: Tab = {
    [key]: async () => {
      tabs.forEach(tab => tab?.stop?.apply(tab));
      tab.stop = await onClick();
    }
  };
  tabs.push(tab);
  gui.add(tab, key);
}

init();