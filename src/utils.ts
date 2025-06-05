import { BufferAttribute, Geometry } from "./gpu/geometry";
import { Shader } from "./gpu/shader";

const vertex = new Float32Array([
  -1, -1,
  1, -1,
  1, 1,

  -1, -1,
  1, 1,
  -1, 1,
]);

const index = new Uint16Array([
  0, 1, 2, 0, 2, 5
]);

const vertexAttribute = new BufferAttribute({
  array: vertex,
  format: "float32x2",
  shaderLocation: 0,
  itemSize: 2,
  label: "position",
  offset: 0,
  usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
});

const indexAttribute = new BufferAttribute({
  array: index,
  format: "uint16",
  shaderLocation: 1,
  itemSize: 1,
  label: "index",
  offset: 0,
  usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
})

export function getGeometry(shader?: Shader): Geometry {
  return new Geometry([vertexAttribute], shader);
}

export function getIndexedGeometry(shader?: Shader): Geometry {
  return new Geometry([vertexAttribute, indexAttribute], shader);
}