import type { Direction, Rotation, GridSize, GridPosition } from "./types.js";

// Rotate a horizontal direction clockwise by the given rotation
export function rotateDirection(dir: Direction, rotation: Rotation): Direction {
  if (dir === "top" || dir === "bottom") return dir;

  const order: Direction[] = ["north", "east", "south", "west"];
  const steps = rotation / 90;
  const idx = order.indexOf(dir);
  return order[(idx + steps) % 4];
}

// Get the opposite direction
export function getOppositeDirection(dir: Direction): Direction {
  const opposites: Record<Direction, Direction> = {
    north: "south",
    south: "north",
    east: "west",
    west: "east",
    top: "bottom",
    bottom: "top",
  };
  return opposites[dir];
}

// Get the neighbor position one step in the given direction
export function getNeighborPosition(
  pos: GridPosition,
  dir: Direction
): GridPosition {
  switch (dir) {
    case "north":
      return { x: pos.x, y: pos.y, z: pos.z - 1 };
    case "south":
      return { x: pos.x, y: pos.y, z: pos.z + 1 };
    case "east":
      return { x: pos.x + 1, y: pos.y, z: pos.z };
    case "west":
      return { x: pos.x - 1, y: pos.y, z: pos.z };
    case "top":
      return { x: pos.x, y: pos.y + 1, z: pos.z };
    case "bottom":
      return { x: pos.x, y: pos.y - 1, z: pos.z };
  }
}

// Rotate local coordinates (lx, lz) within a grid of size (sizeX, sizeZ)
function rotateLocalCoords(
  lx: number,
  lz: number,
  sizeX: number,
  sizeZ: number,
  rotation: Rotation
): [number, number] {
  switch (rotation) {
    case 0:
      return [lx, lz];
    case 90:
      return [sizeZ - 1 - lz, lx];
    case 180:
      return [sizeX - 1 - lx, sizeZ - 1 - lz];
    case 270:
      return [lz, sizeX - 1 - lx];
  }
}

// Get the rotated grid size
export function rotateGridSize(size: GridSize, rotation: Rotation): GridSize {
  if (rotation === 90 || rotation === 270) {
    return { x: size.z, y: size.y, z: size.x };
  }
  return { ...size };
}

// Remap socket keys for a rotated piece
// Input sockets use canonical keys: "direction" for 1x1 or "lx,lz:direction" for multi-cell
// Output sockets use the same format but with rotated directions and local coords
export function rotateSockets(
  sockets: Record<string, string>,
  gridSize: GridSize,
  rotation: Rotation
): Record<string, string> {
  if (rotation === 0) return { ...sockets };

  const result: Record<string, string> = {};

  for (const [key, socketType] of Object.entries(sockets)) {
    const colonIdx = key.indexOf(":");
    if (colonIdx === -1) {
      // Simple key like "north" — single-cell piece
      const dir = key as Direction;
      const newDir = rotateDirection(dir, rotation);
      result[newDir] = socketType;
    } else {
      // Multi-cell key like "0,1:west"
      const coordPart = key.substring(0, colonIdx);
      const dir = key.substring(colonIdx + 1) as Direction;
      const [lx, lz] = coordPart.split(",").map(Number);

      const newDir = rotateDirection(dir, rotation);

      if (dir === "top" || dir === "bottom") {
        // Top/bottom: rotate the local coords but keep direction
        const [nlx, nlz] = rotateLocalCoords(
          lx,
          lz,
          gridSize.x,
          gridSize.z,
          rotation
        );
        result[`${nlx},${nlz}:${newDir}`] = socketType;
      } else {
        // Horizontal: rotate both coords and direction
        const [nlx, nlz] = rotateLocalCoords(
          lx,
          lz,
          gridSize.x,
          gridSize.z,
          rotation
        );
        result[`${nlx},${nlz}:${newDir}`] = socketType;
      }
    }
  }

  return result;
}

// Get all occupied cells for a piece placed at a position with rotation
export function getOccupiedCells(
  gridSize: GridSize,
  position: GridPosition,
  rotation: Rotation
): GridPosition[] {
  const rotatedSize = rotateGridSize(gridSize, rotation);
  const cells: GridPosition[] = [];

  for (let lx = 0; lx < rotatedSize.x; lx++) {
    for (let ly = 0; ly < rotatedSize.y; ly++) {
      for (let lz = 0; lz < rotatedSize.z; lz++) {
        cells.push({
          x: position.x + lx,
          y: position.y + ly,
          z: position.z + lz,
        });
      }
    }
  }

  return cells;
}

// Get the socket key for a specific cell within a placed piece
// cellPos is the absolute grid position of the cell
// piecePos is the anchor position of the piece
// direction is the face we're querying
// Returns the key to look up in the rotated sockets map
export function getCellSocketKey(
  cellPos: GridPosition,
  piecePos: GridPosition,
  direction: Direction,
  gridSize: GridSize,
  rotation: Rotation
): string {
  const rotatedSize = rotateGridSize(gridSize, rotation);

  // For 1x1x1 pieces, use simple direction keys
  if (rotatedSize.x === 1 && rotatedSize.z === 1 && rotatedSize.y === 1) {
    return direction;
  }

  // Local position within the rotated piece
  const lx = cellPos.x - piecePos.x;
  const lz = cellPos.z - piecePos.z;

  return `${lx},${lz}:${direction}`;
}
