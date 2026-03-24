import type { PieceDefinition, SocketType, Direction } from "./types.js";

// Helper: generate perimeter sockets for a rectangular piece
// All perimeter faces default to "wall", top/bottom to "floor"
// openings override specific cell-faces
function makeRectSockets(
  sizeX: number,
  sizeZ: number,
  openings: Array<{
    localX: number;
    localZ: number;
    direction: Direction;
    socket: SocketType;
  }> = []
): Record<string, SocketType> {
  const sockets: Record<string, SocketType> = {};

  for (let lx = 0; lx < sizeX; lx++) {
    for (let lz = 0; lz < sizeZ; lz++) {
      // North face (lz === 0)
      if (lz === 0) sockets[`${lx},${lz}:north`] = "wall";
      // South face (lz === sizeZ - 1)
      if (lz === sizeZ - 1) sockets[`${lx},${lz}:south`] = "wall";
      // West face (lx === 0)
      if (lx === 0) sockets[`${lx},${lz}:west`] = "wall";
      // East face (lx === sizeX - 1)
      if (lx === sizeX - 1) sockets[`${lx},${lz}:east`] = "wall";
      // Top and bottom for all cells
      sockets[`${lx},${lz}:top`] = "floor";
      sockets[`${lx},${lz}:bottom`] = "floor";
    }
  }

  // Apply openings
  for (const o of openings) {
    sockets[`${o.localX},${o.localZ}:${o.direction}`] = o.socket;
  }

  return sockets;
}

// Helper: simple 1x1x1 sockets
function make1x1Sockets(
  faces: Partial<Record<Direction, SocketType>>
): Record<string, SocketType> {
  return {
    north: "wall",
    south: "wall",
    east: "wall",
    west: "wall",
    top: "floor",
    bottom: "floor",
    ...faces,
  };
}

export const PIECE_CATALOG: PieceDefinition[] = [
  // ===== NARROW CORRIDORS (1x1x1 grid, 4x4 world) =====
  {
    id: "corridor",
    category: "corridor",
    modelFile: "corridor.glb",
    gridSize: { x: 1, y: 1, z: 1 },
    sockets: make1x1Sockets({
      east: "corridor-narrow",
      west: "corridor-narrow",
    }),
    symmetry: "I",
    description:
      "Straight narrow corridor, open on east and west, walls on north and south",
  },
  {
    id: "corridor-corner",
    category: "corridor",
    modelFile: "corridor-corner.glb",
    gridSize: { x: 1, y: 1, z: 1 },
    sockets: make1x1Sockets({
      north: "corridor-narrow",
      west: "corridor-narrow",
    }),
    symmetry: "L",
    description:
      "90-degree narrow corridor turn, open on north and west",
  },
  {
    id: "corridor-end",
    category: "corridor",
    modelFile: "corridor-end.glb",
    gridSize: { x: 1, y: 1, z: 1 },
    sockets: make1x1Sockets({
      east: "corridor-narrow",
    }),
    symmetry: "L",
    description:
      "Dead-end narrow corridor cap, open only on east",
  },
  {
    id: "corridor-intersection",
    category: "corridor",
    modelFile: "corridor-intersection.glb",
    gridSize: { x: 1, y: 1, z: 1 },
    sockets: make1x1Sockets({
      north: "corridor-narrow",
      south: "corridor-narrow",
      east: "corridor-narrow",
      west: "corridor-narrow",
    }),
    symmetry: "X",
    description:
      "4-way narrow corridor intersection, open on all sides",
  },
  {
    id: "corridor-junction",
    category: "corridor",
    modelFile: "corridor-junction.glb",
    gridSize: { x: 1, y: 1, z: 1 },
    sockets: make1x1Sockets({
      north: "corridor-narrow",
      east: "corridor-narrow",
      west: "corridor-narrow",
    }),
    symmetry: "T",
    description:
      "T-junction narrow corridor, open on north, east, and west, wall on south",
  },
  {
    id: "corridor-transition",
    category: "corridor",
    modelFile: "corridor-transition.glb",
    gridSize: { x: 2, y: 1, z: 2 },
    sockets: {
      // West face (narrow end) — only the cells at lx=0
      "0,0:west": "corridor-narrow",
      "0,1:west": "corridor-narrow",
      "0,0:north": "wall",
      "0,1:south": "wall",
      // East face (wide end) — cells at lx=1
      "1,0:east": "corridor-wide",
      "1,1:east": "corridor-wide",
      "1,0:north": "wall",
      "1,1:south": "wall",
      // Top and bottom
      "0,0:top": "floor",
      "0,0:bottom": "floor",
      "0,1:top": "floor",
      "0,1:bottom": "floor",
      "1,0:top": "floor",
      "1,0:bottom": "floor",
      "1,1:top": "floor",
      "1,1:bottom": "floor",
    },
    symmetry: "none",
    description:
      "Transition piece from narrow (west) to wide (east) corridor. 2x2 grid cells.",
  },

  // ===== WIDE CORRIDORS (2x1x2 grid, 8x8 world) =====
  {
    id: "corridor-wide",
    category: "corridor-wide",
    modelFile: "corridor-wide.glb",
    gridSize: { x: 2, y: 1, z: 2 },
    sockets: makeRectSockets(2, 2, [
      { localX: 0, localZ: 0, direction: "west", socket: "corridor-wide" },
      { localX: 0, localZ: 1, direction: "west", socket: "corridor-wide" },
      { localX: 1, localZ: 0, direction: "east", socket: "corridor-wide" },
      { localX: 1, localZ: 1, direction: "east", socket: "corridor-wide" },
    ]),
    symmetry: "I",
    description:
      "Straight wide corridor, open on east and west, walls on north and south",
  },
  {
    id: "corridor-wide-corner",
    category: "corridor-wide",
    modelFile: "corridor-wide-corner.glb",
    gridSize: { x: 2, y: 1, z: 2 },
    sockets: makeRectSockets(2, 2, [
      { localX: 0, localZ: 0, direction: "west", socket: "corridor-wide" },
      { localX: 0, localZ: 1, direction: "west", socket: "corridor-wide" },
      { localX: 0, localZ: 1, direction: "south", socket: "corridor-wide" },
      { localX: 1, localZ: 1, direction: "south", socket: "corridor-wide" },
    ]),
    symmetry: "L",
    description:
      "90-degree wide corridor turn, open on west and south",
  },
  {
    id: "corridor-wide-end",
    category: "corridor-wide",
    modelFile: "corridor-wide-end.glb",
    gridSize: { x: 2, y: 1, z: 2 },
    sockets: makeRectSockets(2, 2, [
      { localX: 0, localZ: 0, direction: "west", socket: "corridor-wide" },
      { localX: 0, localZ: 1, direction: "west", socket: "corridor-wide" },
    ]),
    symmetry: "L",
    description: "Dead-end wide corridor, open only on west",
  },
  {
    id: "corridor-wide-intersection",
    category: "corridor-wide",
    modelFile: "corridor-wide-intersection.glb",
    gridSize: { x: 2, y: 1, z: 2 },
    sockets: makeRectSockets(2, 2, [
      { localX: 0, localZ: 0, direction: "west", socket: "corridor-wide" },
      { localX: 0, localZ: 1, direction: "west", socket: "corridor-wide" },
      { localX: 1, localZ: 0, direction: "east", socket: "corridor-wide" },
      { localX: 1, localZ: 1, direction: "east", socket: "corridor-wide" },
      { localX: 0, localZ: 0, direction: "north", socket: "corridor-wide" },
      { localX: 1, localZ: 0, direction: "north", socket: "corridor-wide" },
      { localX: 0, localZ: 1, direction: "south", socket: "corridor-wide" },
      { localX: 1, localZ: 1, direction: "south", socket: "corridor-wide" },
    ]),
    symmetry: "X",
    description:
      "4-way wide corridor intersection, open on all sides",
  },
  {
    id: "corridor-wide-junction",
    category: "corridor-wide",
    modelFile: "corridor-wide-junction.glb",
    gridSize: { x: 2, y: 1, z: 2 },
    sockets: makeRectSockets(2, 2, [
      { localX: 0, localZ: 0, direction: "west", socket: "corridor-wide" },
      { localX: 0, localZ: 1, direction: "west", socket: "corridor-wide" },
      { localX: 1, localZ: 0, direction: "east", socket: "corridor-wide" },
      { localX: 1, localZ: 1, direction: "east", socket: "corridor-wide" },
      { localX: 0, localZ: 1, direction: "south", socket: "corridor-wide" },
      { localX: 1, localZ: 1, direction: "south", socket: "corridor-wide" },
    ]),
    symmetry: "T",
    description:
      "T-junction wide corridor, open on west, east, and south, wall on north",
  },

  // ===== ROOMS =====
  {
    id: "room-small",
    category: "room",
    modelFile: "room-small.glb",
    gridSize: { x: 3, y: 1, z: 3 },
    sockets: makeRectSockets(3, 3, [
      // Single opening on east face, center cell
      { localX: 2, localZ: 1, direction: "east", socket: "room-narrow" },
    ]),
    symmetry: "L",
    description:
      "Small room (3x3 grid), single narrow opening on east center",
  },
  {
    id: "room-small-variation",
    category: "room",
    modelFile: "room-small-variation.glb",
    gridSize: { x: 3, y: 1, z: 3 },
    sockets: makeRectSockets(3, 3, [
      { localX: 2, localZ: 1, direction: "east", socket: "room-narrow" },
    ]),
    symmetry: "L",
    description:
      "Small room variant (3x3 grid), single narrow opening on east center",
  },
  {
    id: "room-large",
    category: "room",
    modelFile: "room-large.glb",
    gridSize: { x: 5, y: 1, z: 5 },
    sockets: makeRectSockets(5, 5, [
      // Single opening on east face, center cell
      { localX: 4, localZ: 2, direction: "east", socket: "room-narrow" },
    ]),
    symmetry: "L",
    description:
      "Large room (5x5 grid), single narrow opening on east center",
  },
  {
    id: "room-large-variation",
    category: "room",
    modelFile: "room-large-variation.glb",
    gridSize: { x: 5, y: 1, z: 5 },
    sockets: makeRectSockets(5, 5, [
      { localX: 4, localZ: 2, direction: "east", socket: "room-narrow" },
    ]),
    symmetry: "L",
    description:
      "Large room variant (5x5 grid), single narrow opening on east center",
  },
  {
    id: "room-wide",
    category: "room",
    modelFile: "room-wide.glb",
    gridSize: { x: 5, y: 1, z: 3 },
    sockets: makeRectSockets(5, 3, [
      // Single opening on east face, center cell
      { localX: 4, localZ: 1, direction: "east", socket: "room-narrow" },
    ]),
    symmetry: "L",
    description:
      "Wide rectangular room (5x3 grid), single narrow opening on east center",
  },
  {
    id: "room-wide-variation",
    category: "room",
    modelFile: "room-wide-variation.glb",
    gridSize: { x: 5, y: 1, z: 3 },
    sockets: makeRectSockets(5, 3, [
      { localX: 4, localZ: 1, direction: "east", socket: "room-narrow" },
    ]),
    symmetry: "L",
    description:
      "Wide room variant (5x3 grid), single narrow opening on east center",
  },
  {
    id: "room-corner",
    category: "room",
    modelFile: "room-corner.glb",
    gridSize: { x: 3, y: 1, z: 3 },
    sockets: makeRectSockets(3, 3, [
      // Two openings on adjacent faces — east and north
      { localX: 2, localZ: 1, direction: "east", socket: "room-narrow" },
      { localX: 1, localZ: 0, direction: "north", socket: "room-narrow" },
    ]),
    symmetry: "L",
    description:
      "L-shaped corner room (3x3 grid), openings on east and north",
  },

  // ===== GATES (1x1x1, thin dividers) =====
  {
    id: "gate",
    category: "gate",
    modelFile: "gate.glb",
    gridSize: { x: 1, y: 1, z: 1 },
    sockets: make1x1Sockets({
      north: "gate",
      south: "gate",
    }),
    symmetry: "I",
    description: "Basic gate archway, passable north-south",
  },
  {
    id: "gate-door",
    category: "gate",
    modelFile: "gate-door.glb",
    gridSize: { x: 1, y: 1, z: 1 },
    sockets: make1x1Sockets({
      north: "gate",
      south: "gate",
    }),
    symmetry: "I",
    description: "Gate with door, passable north-south",
  },
  {
    id: "gate-door-window",
    category: "gate",
    modelFile: "gate-door-window.glb",
    gridSize: { x: 1, y: 1, z: 1 },
    sockets: make1x1Sockets({
      north: "gate",
      south: "gate",
    }),
    symmetry: "I",
    description: "Gate with door and window, passable north-south",
  },
  {
    id: "gate-lasers",
    category: "gate",
    modelFile: "gate-lasers.glb",
    gridSize: { x: 1, y: 1, z: 1 },
    sockets: make1x1Sockets({
      north: "gate",
      south: "gate",
    }),
    symmetry: "I",
    description: "Gate with laser barriers, passable north-south",
  },

  // ===== STAIRS (span 2 vertical levels) =====
  {
    id: "stairs",
    category: "stairs",
    modelFile: "stairs.glb",
    gridSize: { x: 1, y: 2, z: 1 },
    sockets: {
      // Bottom level (y=0): entrance on south
      south: "corridor-narrow",
      north: "wall",
      east: "wall",
      west: "wall",
      bottom: "floor",
      // Top level opening handled via multi-level connection
      top: "stairs-top",
    },
    symmetry: "L",
    description:
      "Narrow staircase spanning 2 levels, entrance on south at bottom",
  },
  {
    id: "stairs-wide",
    category: "stairs",
    modelFile: "stairs-wide.glb",
    gridSize: { x: 2, y: 2, z: 2 },
    sockets: makeRectSockets(2, 2, [
      { localX: 0, localZ: 1, direction: "south", socket: "corridor-wide" },
      { localX: 1, localZ: 1, direction: "south", socket: "corridor-wide" },
    ]),
    symmetry: "L",
    description:
      "Wide staircase spanning 2 levels, entrance on south at bottom",
  },

  // ===== TEMPLATE FLOORS =====
  {
    id: "template-floor",
    category: "template",
    modelFile: "template-floor.glb",
    gridSize: { x: 1, y: 1, z: 1 },
    sockets: make1x1Sockets({
      north: "wall",
      south: "wall",
      east: "wall",
      west: "wall",
    }),
    symmetry: "X",
    description: "Basic floor tile (1x1 grid), flat quad",
  },
  {
    id: "template-floor-big",
    category: "template",
    modelFile: "template-floor-big.glb",
    gridSize: { x: 2, y: 1, z: 2 },
    sockets: makeRectSockets(2, 2, []),
    symmetry: "X",
    description: "Large floor tile (2x2 grid) with column supports",
  },
  {
    id: "template-floor-detail",
    category: "template",
    modelFile: "template-floor-detail.glb",
    gridSize: { x: 1, y: 1, z: 1 },
    sockets: make1x1Sockets({}),
    symmetry: "X",
    description: "Floor tile with raised detail panel",
  },
  {
    id: "template-floor-detail-a",
    category: "template",
    modelFile: "template-floor-detail-a.glb",
    gridSize: { x: 1, y: 1, z: 1 },
    sockets: make1x1Sockets({}),
    symmetry: "X",
    description: "Floor tile with alternative surface treatment",
  },
  {
    id: "template-floor-layer",
    category: "template",
    modelFile: "template-floor-layer.glb",
    gridSize: { x: 1, y: 1, z: 1 },
    sockets: make1x1Sockets({}),
    symmetry: "X",
    description: "Floor slab with thickness, used as floor layer between levels",
  },
  {
    id: "template-floor-layer-hole",
    category: "template",
    modelFile: "template-floor-layer-hole.glb",
    gridSize: { x: 1, y: 1, z: 1 },
    sockets: make1x1Sockets({
      top: "floor-hole",
      bottom: "floor-hole",
    }),
    symmetry: "X",
    description:
      "Floor layer with vertical opening for stairs or shafts",
  },
  {
    id: "template-floor-layer-raised",
    category: "template",
    modelFile: "template-floor-layer-raised.glb",
    gridSize: { x: 1, y: 1, z: 1 },
    sockets: make1x1Sockets({}),
    symmetry: "X",
    description: "Raised floor layer with railings",
  },

  // ===== TEMPLATE WALLS =====
  {
    id: "template-wall",
    category: "template",
    modelFile: "template-wall.glb",
    gridSize: { x: 1, y: 1, z: 1 },
    sockets: make1x1Sockets({}),
    symmetry: "L",
    description: "Standard wall panel, 1 cell wide",
  },
  {
    id: "template-wall-half",
    category: "template",
    modelFile: "template-wall-half.glb",
    gridSize: { x: 1, y: 1, z: 1 },
    sockets: make1x1Sockets({}),
    symmetry: "L",
    description: "Half-width wall segment",
  },
  {
    id: "template-wall-corner",
    category: "template",
    modelFile: "template-wall-corner.glb",
    gridSize: { x: 1, y: 1, z: 1 },
    sockets: make1x1Sockets({}),
    symmetry: "L",
    description: "Inner corner fill wall piece",
  },
  {
    id: "template-wall-detail-a",
    category: "template",
    modelFile: "template-wall-detail-a.glb",
    gridSize: { x: 1, y: 1, z: 1 },
    sockets: make1x1Sockets({}),
    symmetry: "L",
    description: "Wall panel with surface pipes and detail",
  },
  {
    id: "template-wall-stairs",
    category: "template",
    modelFile: "template-wall-stairs.glb",
    gridSize: { x: 1, y: 1, z: 1 },
    sockets: make1x1Sockets({}),
    symmetry: "L",
    description: "Wall variant for alongside stairwells, slightly taller",
  },

  // ===== TEMPLATE OTHER =====
  {
    id: "template-corner",
    category: "template",
    modelFile: "template-corner.glb",
    gridSize: { x: 1, y: 1, z: 1 },
    sockets: make1x1Sockets({}),
    symmetry: "L",
    description: "Structural corner piece with walls on two sides",
  },
  {
    id: "template-wall-top",
    category: "template",
    modelFile: "template-wall-top.glb",
    gridSize: { x: 1, y: 1, z: 1 },
    sockets: make1x1Sockets({}),
    symmetry: "L",
    description: "Wall cap / crown piece that sits atop walls",
  },
  {
    id: "template-detail",
    category: "decorative",
    modelFile: "template-detail.glb",
    gridSize: { x: 1, y: 1, z: 1 },
    sockets: make1x1Sockets({}),
    symmetry: "X",
    description: "Decorative pillar/column, small footprint",
  },

  // ===== DECORATIVE =====
  {
    id: "cables",
    category: "decorative",
    modelFile: "cables.glb",
    gridSize: { x: 1, y: 1, z: 1 },
    sockets: make1x1Sockets({}),
    symmetry: "none",
    description: "Floor-level decorative cables/pipes",
  },
];

// Quick lookup by id
export const CATALOG_MAP = new Map(
  PIECE_CATALOG.map((p) => [p.id, p])
);

export function getPieceDefinition(id: string): PieceDefinition | undefined {
  return CATALOG_MAP.get(id);
}
