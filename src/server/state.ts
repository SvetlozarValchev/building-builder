import * as fs from "fs";
import * as path from "path";
import type {
  PlacedPiece,
  GridPosition,
  Rotation,
  BuildingData,
  ValidationError,
  Direction,
  SocketType,
} from "../shared/types.js";
import {
  posKey,
  parseKey,
  areSocketsCompatible,
  HORIZONTAL_DIRECTIONS,
} from "../shared/types.js";
import { getPieceDefinition } from "../shared/catalog.js";
import {
  getOccupiedCells,
  rotateSockets,
  rotateGridSize,
  getNeighborPosition,
  getOppositeDirection,
  getCellSocketKey,
} from "../shared/rotation.js";

// MCP server is always launched from the project root via .mcp.json
const BUILD_FILE = path.join(process.cwd(), "public", "building.json");

export class BuildingState {
  private pieces: Map<string, PlacedPiece> = new Map();
  private grid: Map<string, string> = new Map(); // "x,y,z" -> pieceId
  private nextId = 1;

  // ---- Core Operations ----

  placePiece(
    type: string,
    position: GridPosition,
    rotation: Rotation
  ): { piece: PlacedPiece; warnings: ValidationError[] } | { error: ValidationError } {
    const def = getPieceDefinition(type);
    if (!def) {
      return {
        error: {
          severity: "error",
          type: "unknown_piece",
          message: `Unknown piece type "${type}". Use get_piece_catalog to see available pieces.`,
          pieceIds: [],
        },
      };
    }

    // Compute occupied cells
    const cells = getOccupiedCells(def.gridSize, position, rotation);
    const cellKeys = cells.map(posKey);

    // Check spatial conflicts
    for (const key of cellKeys) {
      const existing = this.grid.get(key);
      if (existing) {
        const existingPiece = this.pieces.get(existing)!;
        return {
          error: {
            severity: "error",
            type: "spatial_conflict",
            message: `Cell ${key} is already occupied by piece ${existing} (${existingPiece.type}).`,
            pieceIds: [existing],
            position: parseKey(key),
          },
        };
      }
    }

    // Check socket compatibility with neighbors
    const warnings: ValidationError[] = [];
    const rotatedSockets = rotateSockets(def.sockets, def.gridSize, rotation);

    for (const cell of cells) {
      for (const dir of [...HORIZONTAL_DIRECTIONS, "top", "bottom"] as Direction[]) {
        const neighborPos = getNeighborPosition(cell, dir);
        const neighborKey = posKey(neighborPos);
        const neighborPieceId = this.grid.get(neighborKey);

        if (!neighborPieceId) continue;
        // Don't check against our own cells
        if (cellKeys.includes(neighborKey)) continue;

        const neighborPiece = this.pieces.get(neighborPieceId)!;
        const neighborDef = getPieceDefinition(neighborPiece.type)!;
        const neighborRotatedSockets = rotateSockets(
          neighborDef.sockets,
          neighborDef.gridSize,
          neighborPiece.rotation
        );

        // Get our socket for this cell-face
        const ourSocketKey = getCellSocketKey(
          cell,
          position,
          dir,
          def.gridSize,
          rotation
        );
        const ourSocket = rotatedSockets[ourSocketKey] as SocketType | undefined;

        // Get neighbor's socket for the facing face
        const oppositeDir = getOppositeDirection(dir);
        const neighborSocketKey = getCellSocketKey(
          neighborPos,
          neighborPiece.position,
          oppositeDir,
          neighborDef.gridSize,
          neighborPiece.rotation
        );
        const neighborSocket = neighborRotatedSockets[neighborSocketKey] as
          | SocketType
          | undefined;

        if (ourSocket && neighborSocket) {
          if (!areSocketsCompatible(ourSocket, neighborSocket)) {
            warnings.push({
              severity: "error",
              type: "socket_mismatch",
              message: `Socket mismatch at ${posKey(cell)} ${dir}: this piece has "${ourSocket}" facing "${neighborSocket}" on piece ${neighborPieceId} (${neighborPiece.type}) at ${posKey(neighborPos)}.`,
              pieceIds: [neighborPieceId],
              position: cell,
              direction: dir,
            });
          }
        }
      }
    }

    // If there are errors (not just warnings), reject placement
    const errors = warnings.filter((w) => w.severity === "error");
    if (errors.length > 0) {
      return { error: errors[0] };
    }

    // Place the piece
    const id = `p${String(this.nextId++).padStart(3, "0")}`;
    const piece: PlacedPiece = {
      id,
      type,
      position,
      rotation,
      occupiedCells: cellKeys,
    };

    this.pieces.set(id, piece);
    for (const key of cellKeys) {
      this.grid.set(key, id);
    }

    this.saveToDisk();
    return { piece, warnings };
  }

  removePiece(pieceId: string): PlacedPiece | undefined {
    const piece = this.pieces.get(pieceId);
    if (!piece) return undefined;

    this.pieces.delete(pieceId);
    for (const key of piece.occupiedCells) {
      this.grid.delete(key);
    }

    this.saveToDisk();
    return piece;
  }

  // ---- Queries ----

  getPiece(pieceId: string): PlacedPiece | undefined {
    return this.pieces.get(pieceId);
  }

  getPieceAt(pos: GridPosition): PlacedPiece | undefined {
    const id = this.grid.get(posKey(pos));
    return id ? this.pieces.get(id) : undefined;
  }

  getAllPieces(level?: number): PlacedPiece[] {
    const all = Array.from(this.pieces.values());
    if (level !== undefined) {
      return all.filter((p) => p.position.y === level);
    }
    return all;
  }

  getPieceCount(): number {
    return this.pieces.size;
  }

  getGrid(): Map<string, string> {
    return this.grid;
  }

  // Get connections for a piece (neighbors connected via non-wall sockets)
  getConnections(
    pieceId: string
  ): Array<{ direction: Direction; neighborId: string; neighborType: string }> {
    const piece = this.pieces.get(pieceId);
    if (!piece) return [];

    const def = getPieceDefinition(piece.type)!;
    const rotatedSockets = rotateSockets(def.sockets, def.gridSize, piece.rotation);
    const connections: Array<{
      direction: Direction;
      neighborId: string;
      neighborType: string;
    }> = [];

    const cells = getOccupiedCells(def.gridSize, piece.position, piece.rotation);

    for (const cell of cells) {
      for (const dir of [...HORIZONTAL_DIRECTIONS, "top", "bottom"] as Direction[]) {
        const socketKey = getCellSocketKey(
          cell,
          piece.position,
          dir,
          def.gridSize,
          piece.rotation
        );
        const socket = rotatedSockets[socketKey] as SocketType | undefined;
        if (!socket || socket === "wall") continue;

        const neighborPos = getNeighborPosition(cell, dir);
        const neighborId = this.grid.get(posKey(neighborPos));
        if (!neighborId || neighborId === pieceId) continue;

        // Avoid duplicates
        if (!connections.some((c) => c.neighborId === neighborId && c.direction === dir)) {
          const neighborPiece = this.pieces.get(neighborId)!;
          connections.push({
            direction: dir,
            neighborId,
            neighborType: neighborPiece.type,
          });
        }
      }
    }

    return connections;
  }

  // Get open (unmatched non-wall) connections across the building
  getOpenConnections(
    level?: number
  ): Array<{
    pieceId: string;
    pieceType: string;
    position: GridPosition;
    direction: Direction;
    socketType: SocketType;
  }> {
    const result: Array<{
      pieceId: string;
      pieceType: string;
      position: GridPosition;
      direction: Direction;
      socketType: SocketType;
    }> = [];

    const pieces = this.getAllPieces(level);

    for (const piece of pieces) {
      const def = getPieceDefinition(piece.type)!;
      const rotatedSockets = rotateSockets(
        def.sockets,
        def.gridSize,
        piece.rotation
      );
      const cells = getOccupiedCells(
        def.gridSize,
        piece.position,
        piece.rotation
      );

      for (const cell of cells) {
        for (const dir of [...HORIZONTAL_DIRECTIONS, "top", "bottom"] as Direction[]) {
          const socketKey = getCellSocketKey(
            cell,
            piece.position,
            dir,
            def.gridSize,
            piece.rotation
          );
          const socket = rotatedSockets[socketKey] as SocketType | undefined;
          if (!socket || socket === "wall" || socket === "floor") continue;

          const neighborPos = getNeighborPosition(cell, dir);
          const neighborId = this.grid.get(posKey(neighborPos));

          // If no neighbor, or neighbor is own piece, this is an open connection
          if (!neighborId || neighborId === piece.id) {
            // Skip if neighbor is our own cell
            if (neighborId === piece.id) continue;
            result.push({
              pieceId: piece.id,
              pieceType: piece.type,
              position: cell,
              direction: dir,
              socketType: socket,
            });
          }
        }
      }
    }

    return result;
  }

  // ---- Serialization ----

  toJSON(): BuildingData {
    const pieces = Array.from(this.pieces.values()).map((p) => ({
      id: p.id,
      type: p.type,
      position: [p.position.x, p.position.y, p.position.z] as [
        number,
        number,
        number,
      ],
      rotation: p.rotation,
    }));
    return { name: "Building", pieces };
  }

  fromJSON(data: BuildingData): void {
    this.pieces.clear();
    this.grid.clear();
    this.nextId = 1;

    for (const p of data.pieces) {
      const def = getPieceDefinition(p.type);
      if (!def) continue;

      const position: GridPosition = {
        x: p.position[0],
        y: p.position[1],
        z: p.position[2],
      };
      const cells = getOccupiedCells(def.gridSize, position, p.rotation);
      const cellKeys = cells.map(posKey);

      const piece: PlacedPiece = {
        id: p.id,
        type: p.type,
        position,
        rotation: p.rotation,
        occupiedCells: cellKeys,
      };

      this.pieces.set(p.id, piece);
      for (const key of cellKeys) {
        this.grid.set(key, p.id);
      }

      // Keep nextId above all imported ids
      const num = parseInt(p.id.replace("p", ""), 10);
      if (!isNaN(num) && num >= this.nextId) {
        this.nextId = num + 1;
      }
    }
  }

  clear(): void {
    this.pieces.clear();
    this.grid.clear();
    this.nextId = 1;
    this.saveToDisk();
  }

  // ---- Persistence ----

  saveToDisk(): void {
    try {
      const dir = path.dirname(BUILD_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(BUILD_FILE, JSON.stringify(this.toJSON(), null, 2));
    } catch (e) {
      console.error("Failed to save building.json:", e);
    }
  }

  loadFromDisk(): void {
    try {
      if (fs.existsSync(BUILD_FILE)) {
        const data = JSON.parse(fs.readFileSync(BUILD_FILE, "utf-8"));
        this.fromJSON(data);
      }
    } catch (e) {
      console.error("Failed to load building.json:", e);
    }
  }
}
