import { Shader, Uniform } from "../gpu/shader";

const shaderCode = (workgroupSize: number) => `
    struct VertexInput {
      @location(0) pos: vec2f,
      @builtin(instance_index) instance: u32,
    };

    struct VertexOutput {
      @builtin(position) pos: vec4f,
      @location(0) cell: vec2f,
    };

    @group(0) @binding(0) var<uniform> grid: vec2f;
    @group(0) @binding(1) var<storage> cellStateIn: array<u32>;
    @group(0) @binding(2) var<storage, read_write> cellStateOut: array<u32>;

    @vertex
    fn vertexMain(input: VertexInput) -> VertexOutput {
      let i = f32(input.instance);
      let cell = vec2f(i % grid.x, floor(i / grid.x));
      let state = f32(cellStateIn[input.instance]);

      let cellOffset = cell / grid * 2;
      let gridPos = (input.pos*state+1) / grid - 1 + cellOffset;

      var output: VertexOutput;
      output.pos = vec4f(gridPos, 0, 1);
      output.cell = cell;
      return output;
    }

    @fragment
    fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
      let c = input.cell / grid;
      return vec4f(c, 1 -c.y, 1);
    }

    fn cellIndex(cell: vec2u) -> u32 {
      return (cell.y % u32(grid.y)) * u32(grid.x) +
       (cell.x % u32(grid.x));
    }

    fn cellActive(x: u32, y: u32) -> u32 {
      return cellStateIn[cellIndex(vec2(x, y))];
    }

    fn getNeighbors(cell: vec3u) -> u32 {
      return cellActive(cell.x+1, cell.y+1) +
             cellActive(cell.x+1, cell.y) +
             cellActive(cell.x+1, cell.y-1) +
             cellActive(cell.x, cell.y-1) +
             cellActive(cell.x-1, cell.y-1) +
             cellActive(cell.x-1, cell.y) +
             cellActive(cell.x-1, cell.y+1) +
             cellActive(cell.x, cell.y+1);
    }

    @compute
    @workgroup_size(${workgroupSize}, ${workgroupSize})
    fn computeMain(@builtin(global_invocation_id) cell: vec3u) {
      let i = cellIndex(cell.xy);
      let activeNeighbors = getNeighbors(cell);

      // Conway's game of life rules:
      switch activeNeighbors {
        case 2: { // Active cells with 2 neighbors stay active.
          cellStateOut[i] = cellStateIn[i];
        }
        case 3: { // Cells with 3 neighbors become or stay active.
          cellStateOut[i] = 1;
        }
        default: { // Cells with < 2 or > 3 neighbors become inactive.
          cellStateOut[i] = 0;
        }
      }
    }`;

export class ConwayCShader extends Shader {
  private uniform: Uniform;
  private cellStorageA: Uniform;
  private cellStorageB: Uniform;
  private bindGroupPairB: { layout: GPUBindGroupLayout; bindGroup: GPUBindGroup; } | null = null;

  constructor(workgroupSize: number, gridSize: number) {
    super(shaderCode(workgroupSize));

    this.uniform = new Uniform({
      label: "Grid Uniforms",
      array: new Float32Array([gridSize, gridSize]),
      binding: 0,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
      bufferType: 'uniform'
    });

    this.cellStorageA = new Uniform({
      label: "Cell State A",
      array: new Uint32Array(gridSize * gridSize),
      binding: 1,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
      bufferType: 'read-only-storage'
    });

    this.cellStorageB = new Uniform({
      label: "Cell State B",
      array: new Uint32Array(gridSize * gridSize),
      binding: 2,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      visibility: GPUShaderStage.COMPUTE,
      bufferType: 'storage'
    });

    this.resources = [this.uniform, this.cellStorageA, this.cellStorageB];

    this.initStorage();
  }

  initStorage(): void {
    const cellStateArray = this.cellStorageA.options.array;
    for (let i = 0; i < cellStateArray.length; ++i) {
      cellStateArray[i] = Math.random() > 0.6 ? 1 : 0;
    }
  }

  swapBuffers(): void {
    const t = this.cellStorageA.resource;
    this.cellStorageA.resource = this.cellStorageB.resource;
    this.cellStorageB.resource = t;

    const b = this.bindGroupPair;
    this.bindGroupPair = this.bindGroupPairB;
    this.bindGroupPairB = b;
  }

  override dispose(): void {
    super.dispose();
    this.bindGroupPairB = null;
  }
}