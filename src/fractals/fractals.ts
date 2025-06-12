import { runRenderLoop, StopFunc } from "../gpu/gpu";
import { getGeometry, getIndexedGeometry } from "../utils";
import { JuliaShader } from "./julia";
import { MandelbrothShader } from "./mandelbroth";

export function runMandelbroth(): Promise<StopFunc> {
  const mandelbrothShader = new MandelbrothShader({ scale: 0.1 });
  const geometry = getIndexedGeometry(mandelbrothShader);
  let scaleDirection = true;

  const updateCallback = () => {
    const scale = mandelbrothShader.scale;

    if (scale > 30000)
      scaleDirection = false;

    if (scale < 0.5)
      scaleDirection = true;

    mandelbrothShader.scale = scale * (scaleDirection ? 1.01 : 0.99);
  };

  const stopCallback = () => {
    geometry.dispose();
    mandelbrothShader.dispose();
  }

  return runRenderLoop(geometry, updateCallback, stopCallback);
}

export function runJulia(): Promise<StopFunc> {
  const juliaShader = new JuliaShader({ scale: 0.5, });
  const geometry = getGeometry(juliaShader);
  const r = 0.7885;
  let angle = 0;

  const updateCallback = () => {
    angle = (angle + 0.01) % (2 * Math.PI);
    juliaShader.coeff = { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
  };

  const stopCallback = () => {
    geometry.dispose();
    juliaShader.dispose();
  }

  return runRenderLoop(geometry, updateCallback, stopCallback);
}