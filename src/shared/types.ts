// Cardinal directions in the grid
export type Direction = "north" | "south" | "east" | "west" | "top" | "bottom";

export const HORIZONTAL_DIRECTIONS: Direction[] = ["north", "south", "east", "west"];

// Socket types that define what can connect to what
export type SocketType =
  | "corridor-narrow"
  | "corridor-wide"
  | "room-narrow"
  | "gate"
  | "wall"
  | "stairs-bottom"
  | "stairs-top"
  | "floor"
  | "floor-hole";

// Rotation around Y axis (clockwise degrees)
export type Rotation = 0 | 90 | 180 | 270;

// Symmetry class affects how many distinct rotations matter
export type SymmetryClass = "X" | "I" | "L" | "T" | "none";

// Grid position (integer coordinates)
export interface GridPosition {
  x: number; // east-west
  y: number; // vertical level
  z: number; // north-south
}

// Grid size in cells
export interface GridSize {
  x: number;
  y: number;
  z: number;
}

export type PieceCategory =
  | "corridor"
  | "corridor-wide"
  | "room"
  | "gate"
  | "stairs"
  | "template"
  | "decorative";

// Piece definition in the catalog (static, immutable)
export interface PieceDefinition {
  id: string;
  category: PieceCategory;
  modelFile: string;
  gridSize: GridSize;
  // Socket map. For 1x1x1: keys are Direction ("north", "east", etc.)
  // For multi-cell: keys are "localX,localZ:direction" (e.g. "0,1:west")
  sockets: Record<string, SocketType>;
  symmetry: SymmetryClass;
  description: string;
}

// A piece that has been placed in the building
export interface PlacedPiece {
  id: string;
  type: string; // references PieceDefinition.id
  position: GridPosition;
  rotation: Rotation;
  occupiedCells: string[]; // "x,y,z" keys
}

// Serialized building format (written to building.json)
export interface BuildingData {
  name: string;
  pieces: Array<{
    id: string;
    type: string;
    position: [number, number, number];
    rotation: Rotation;
  }>;
}

// Validation error returned to Claude
export interface ValidationError {
  severity: "error" | "warning";
  type: string;
  message: string;
  pieceIds: string[];
  position?: GridPosition;
  direction?: Direction;
}

// Socket compatibility pairs — if (A, B) is listed, A and B can face each other
export const SOCKET_COMPATIBILITY: [SocketType, SocketType][] = [
  ["corridor-narrow", "corridor-narrow"],
  ["corridor-narrow", "room-narrow"],
  ["corridor-narrow", "gate"],
  ["corridor-wide", "corridor-wide"],
  ["room-narrow", "gate"],
  ["room-narrow", "room-narrow"],
  ["gate", "gate"],
  ["wall", "wall"],
  ["stairs-bottom", "floor"],
  ["stairs-top", "floor-hole"],
  ["floor", "floor"],
];

// Check if two socket types are compatible
export function areSocketsCompatible(a: SocketType, b: SocketType): boolean {
  return SOCKET_COMPATIBILITY.some(
    ([s1, s2]) => (s1 === a && s2 === b) || (s1 === b && s2 === a)
  );
}

// Grid position to string key
export function posKey(pos: GridPosition): string {
  return `${pos.x},${pos.y},${pos.z}`;
}

// Parse string key back to position
export function parseKey(key: string): GridPosition {
  const [x, y, z] = key.split(",").map(Number);
  return { x, y, z };
}
