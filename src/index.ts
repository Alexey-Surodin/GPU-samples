/// <reference types="@webgpu/types" />

import { runJulia, runMandelbroth } from "./fractals/fractals";
import { runConwayGameC } from "./game/game";
import { runConwayGameF } from "./gameConwayFragment/game";
import { runParticles } from "./particlesCompute/particles";

const activeTab = {
  title: '',
  stop: () => { },
}

function init() {
  const toolbar = document.getElementById('toolbar') as HTMLDivElement;

  if (!toolbar)
    return;

  addGameOfLifeButton(toolbar);
  addGameOfLifeFragmentButton(toolbar);
  addMandelbrothButton(toolbar);
  addJuliaButton(toolbar);
  addParticlesButton(toolbar);
}

function addGameOfLifeButton(contentDiv: HTMLDivElement): void {
  const button = document.createElement('button');
  button.innerHTML = "game of life";

  button.onclick = async () => {
    activeTab.stop();
    activeTab.title = 'game of life';
    activeTab.stop = await runConwayGameC();
  };

  contentDiv.appendChild(button);
}

function addGameOfLifeFragmentButton(contentDiv: HTMLDivElement): void {
  const button = document.createElement('button');
  button.innerHTML = "game of life F ";

  button.onclick = async () => {
    activeTab.stop();
    activeTab.title = 'game of life';
    activeTab.stop = await runConwayGameF();
  };

  contentDiv.appendChild(button);
}

function addMandelbrothButton(contentDiv: HTMLDivElement): void {
  const button = document.createElement('button');
  button.innerHTML = "Mandelbroth";

  button.onclick = async () => {
    activeTab.stop();
    activeTab.title = 'Mandelbroth';
    activeTab.stop = await runMandelbroth();
  };

  contentDiv.appendChild(button);
}

function addJuliaButton(contentDiv: HTMLDivElement): void {
  const button = document.createElement('button');
  button.innerHTML = "Julia";

  button.onclick = async () => {
    activeTab.stop();
    activeTab.title = 'Julia';
    activeTab.stop = await runJulia();
  };

  contentDiv.appendChild(button);
}

function addParticlesButton(contentDiv: HTMLDivElement): void {
  const button = document.createElement('button');
  button.innerHTML = "Particles";

  button.onclick = async () => {
    activeTab.stop();
    activeTab.title = 'Particles';
    activeTab.stop = await runParticles();
  };

  contentDiv.appendChild(button);
}

init();