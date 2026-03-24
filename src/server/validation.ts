import type {
  ValidationError,
  Direction,
  SocketType,
} from "../shared/types.js";
import {
  posKey,
  HORIZONTAL_DIRECTIONS,
  areSocketsCompatible,
} from "../shared/types.js";
import { getPieceDefinition } from "../shared/catalog.js";
import {
  getOccupiedCells,
  rotateSockets,
  getNeighborPosition,
  getOppositeDirection,
  getCellSocketKey,
} from "../shared/rotation.js";
import type { BuildingState } from "./state.js";

// Full building validation — run on demand
export function validateBuilding(state: BuildingState): ValidationError[] {
  const errors: ValidationError[] = [];

  errors.push(...checkReachability(state));
  errors.push(...checkOpenConnections(state));
  errors.push(...checkAllSocketCompatibility(state));

  return errors;
}

// BFS reachability: all pieces must be connected
function checkReachability(state: BuildingState): ValidationError[] {
  const pieces = state.getAllPieces();
  if (pieces.length <= 1) return [];

  const grid = state.getGrid();
  const visited = new Set<string>();
  const queue: string[] = [];

  // Start from first piece
  const startId = pieces[0].id;
  visited.add(startId);
  queue.push(startId);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const connections = state.getConnections(currentId);

    for (const conn of connections) {
      if (!visited.has(conn.neighborId)) {
        visited.add(conn.neighborId);
        queue.push(conn.neighborId);
      }
    }
  }

  if (visited.size < pieces.length) {
    const unreached = pieces
      .filter((p) => !visited.has(p.id))
      .map((p) => p.id);

    return [
      {
        severity: "error",
        type: "disconnected",
        message: `${unreached.length} piece(s) are not connected to the main structure: ${unreached.join(", ")}. All pieces must be reachable from each other via compatible connections.`,
        pieceIds: unreached,
      },
    ];
  }

  return [];
}

// Check for open (non-wall, non-floor) sockets facing empty space
function checkOpenConnections(state: BuildingState): ValidationError[] {
  const open = state.getOpenConnections();
  if (open.length === 0) return [];

  return [
    {
      severity: "warning",
      type: "open_connections",
      message: `${open.length} open connection(s) found: ${open
        .map(
          (c) =>
            `${c.pieceId} (${c.pieceType}) at ${posKey(c.position)} facing ${c.direction} (${c.socketType})`
        )
        .join("; ")}`,
      pieceIds: [...new Set(open.map((c) => c.pieceId))],
    },
  ];
}

// Verify all adjacent pieces have compatible sockets
function checkAllSocketCompatibility(
  state: BuildingState
): ValidationError[] {
  const errors: ValidationError[] = [];
  const checked = new Set<string>(); // "pieceA:pieceB:dir" to avoid duplicates

  for (const piece of state.getAllPieces()) {
    const def = getPieceDefinition(piece.type);
    if (!def) continue;

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
      for (const dir of [
        ...HORIZONTAL_DIRECTIONS,
        "top",
        "bottom",
      ] as Direction[]) {
        const neighborPos = getNeighborPosition(cell, dir);
        const neighborKey = posKey(neighborPos);
        const neighborId = state.getGrid().get(neighborKey);

        if (!neighborId || neighborId === piece.id) continue;

        const checkKey = `${piece.id}:${neighborId}:${dir}`;
        const reverseKey = `${neighborId}:${piece.id}:${getOppositeDirection(dir)}`;
        if (checked.has(checkKey) || checked.has(reverseKey)) continue;
        checked.add(checkKey);

        const neighborPiece = state.getPiece(neighborId);
        if (!neighborPiece) continue;

        const neighborDef = getPieceDefinition(neighborPiece.type);
        if (!neighborDef) continue;

        const neighborRotatedSockets = rotateSockets(
          neighborDef.sockets,
          neighborDef.gridSize,
          neighborPiece.rotation
        );

        const ourSocketKey = getCellSocketKey(
          cell,
          piece.position,
          dir,
          def.gridSize,
          piece.rotation
        );
        const ourSocket = rotatedSockets[ourSocketKey] as
          | SocketType
          | undefined;

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
            errors.push({
              severity: "error",
              type: "socket_mismatch",
              message: `Socket mismatch between ${piece.id} (${piece.type}) at ${posKey(cell)} ${dir} face "${ourSocket}" and ${neighborId} (${neighborPiece.type}) at ${posKey(neighborPos)} ${oppositeDir} face "${neighborSocket}".`,
              pieceIds: [piece.id, neighborId],
              position: cell,
              direction: dir,
            });
          }
        }
      }
    }
  }

  return errors;
}
