import { runRenderLoop, StopFunc } from "../gpu/gpu";
import { getGeometry, getIndexedGeometry } from "../utils";
import { JuliaShader } from "./julia";
import { MandelbrotShader } from "./mandelbrot";

export function runMandelbrot(): Promise<StopFunc> {
  const mandelbrotShader = new MandelbrotShader({ scale: 0.1 });
  const geometry = getIndexedGeometry(mandelbrotShader);
  let scaleDirection = true;

  const updateCallback = () => {
    const scale = mandelbrotShader.scale;

    if (scale > 30000)
      scaleDirection = false;

    if (scale < 0.5)
      scaleDirection = true;

    mandelbrotShader.scale = scale * (scaleDirection ? 1.01 : 0.99);
  };

  const stopCallback = () => {
    geometry.dispose();
    mandelbrotShader.dispose();
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