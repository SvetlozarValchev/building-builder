import type { GridPosition, Rotation } from "../shared/types.js";
import { posKey } from "../shared/types.js";
import { PIECE_CATALOG, getPieceDefinition } from "../shared/catalog.js";
import { getOccupiedCells, rotateSockets, getNeighborPosition, getOppositeDirection, getCellSocketKey } from "../shared/rotation.js";
import { areSocketsCompatible } from "../shared/types.js";
import type { SocketType, Direction } from "../shared/types.js";
import { HORIZONTAL_DIRECTIONS } from "../shared/types.js";
import type { BuildingState } from "./state.js";
import { validateBuilding } from "./validation.js";
import { generateAsciiMap } from "./ascii.js";

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

// ---- Tool Handlers ----

export function handlePlacePiece(
  state: BuildingState,
  pieceType: string,
  position: GridPosition,
  rotation: Rotation
) {
  const result = state.placePiece(pieceType, position, rotation);

  if ("error" in result) {
    return textResult(
      `PLACEMENT FAILED: ${result.error.message}`
    );
  }

  const { piece, warnings } = result;
  const connections = state.getConnections(piece.id);
  const ascii = generateAsciiMap(state, position.y);

  let text = `Placed ${pieceType} as ${piece.id} at (${position.x},${position.y},${position.z}) rotation=${rotation}\n\n`;

  if (connections.length > 0) {
    text += "Connections:\n";
    for (const c of connections) {
      text += `  ${c.direction} -> ${c.neighborId} (${c.neighborType})\n`;
    }
    text += "\n";
  } else {
    text += "No connections to adjacent pieces.\n\n";
  }

  // Show open connections for the frontier
  const openConns = state.getOpenConnections(position.y);
  if (openConns.length > 0) {
    text += `Open connections on level ${position.y}:\n`;
    for (const c of openConns) {
      text += `  ${c.pieceId} (${c.pieceType}) at (${c.position.x},${c.position.y},${c.position.z}) ${c.direction} [${c.socketType}]\n`;
    }
    text += "\n";
  }

  if (warnings.length > 0) {
    text += "Warnings:\n";
    for (const w of warnings) {
      text += `  ${w.message}\n`;
    }
    text += "\n";
  }

  text += ascii;
  return textResult(text);
}

export function handleRemovePiece(state: BuildingState, pieceId: string) {
  const removed = state.removePiece(pieceId);
  if (!removed) {
    return textResult(`No piece found with id "${pieceId}".`);
  }

  const ascii = generateAsciiMap(state, removed.position.y);
  let text = `Removed ${removed.type} (${pieceId}) from (${removed.position.x},${removed.position.y},${removed.position.z})\n\n`;

  const openConns = state.getOpenConnections(removed.position.y);
  if (openConns.length > 0) {
    text += `Open connections on level ${removed.position.y}:\n`;
    for (const c of openConns) {
      text += `  ${c.pieceId} (${c.pieceType}) at (${c.position.x},${c.position.y},${c.position.z}) ${c.direction} [${c.socketType}]\n`;
    }
    text += "\n";
  }

  text += ascii;
  return textResult(text);
}

export function handlePlacePieces(
  state: BuildingState,
  placements: Array<{
    piece_type: string;
    position: { x: number; y: number; z: number };
    rotation: Rotation;
  }>
) {
  const results: Array<{ success: boolean; piece_id?: string; error?: string }> = [];
  let anyLevel = 0;

  for (const p of placements) {
    const pos: GridPosition = { x: p.position.x, y: p.position.y, z: p.position.z };
    anyLevel = pos.y;
    const result = state.placePiece(p.piece_type, pos, p.rotation);

    if ("error" in result) {
      results.push({ success: false, error: result.error.message });
    } else {
      results.push({ success: true, piece_id: result.piece.id });
    }
  }

  const ascii = generateAsciiMap(state, anyLevel);
  let text = `Batch placement results:\n`;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const p = placements[i];
    if (r.success) {
      text += `  [OK] ${p.piece_type} -> ${r.piece_id} at (${p.position.x},${p.position.y},${p.position.z})\n`;
    } else {
      text += `  [FAIL] ${p.piece_type} at (${p.position.x},${p.position.y},${p.position.z}): ${r.error}\n`;
    }
  }

  text += "\n" + ascii;
  return textResult(text);
}

export function handleGetBuildingState(
  state: BuildingState,
  level?: number
) {
  const pieces = state.getAllPieces(level);
  const ascii = generateAsciiMap(state, level);

  let text = `Building state: ${pieces.length} piece(s)`;
  if (level !== undefined) text += ` on level ${level}`;
  text += `\nTotal pieces in building: ${state.getPieceCount()}\n\n`;
  text += ascii;

  return textResult(text);
}

export function handleGetPieceCatalog(category?: string) {
  let pieces = PIECE_CATALOG;
  if (category && category !== "all") {
    pieces = pieces.filter((p) => p.category === category);
  }

  let text = `Piece catalog (${pieces.length} pieces):\n\n`;

  const grouped = new Map<string, typeof pieces>();
  for (const p of pieces) {
    const cat = p.category;
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(p);
  }

  for (const [cat, catPieces] of grouped) {
    text += `=== ${cat.toUpperCase()} ===\n`;
    for (const p of catPieces) {
      text += `  ${p.id}: ${p.description}\n`;
      text += `    Grid size: ${p.gridSize.x}x${p.gridSize.y}x${p.gridSize.z}, Symmetry: ${p.symmetry}\n`;
      // Show non-wall horizontal sockets
      const openings: string[] = [];
      for (const [key, socket] of Object.entries(p.sockets)) {
        if (
          socket !== "wall" &&
          socket !== "floor" &&
          !key.includes("top") &&
          !key.includes("bottom")
        ) {
          openings.push(`${key}=${socket}`);
        }
      }
      if (openings.length > 0) {
        text += `    Openings: ${openings.join(", ")}\n`;
      }
    }
    text += "\n";
  }

  return textResult(text);
}

export function handleGetOpenConnections(
  state: BuildingState,
  level?: number
) {
  const open = state.getOpenConnections(level);

  if (open.length === 0) {
    return textResult(
      level !== undefined
        ? `No open connections on level ${level}.`
        : "No open connections in the building."
    );
  }

  let text = `${open.length} open connection(s)`;
  if (level !== undefined) text += ` on level ${level}`;
  text += ":\n\n";

  for (const c of open) {
    text += `  ${c.pieceId} (${c.pieceType}) at (${c.position.x},${c.position.y},${c.position.z}) ${c.direction} [${c.socketType}]\n`;
  }

  return textResult(text);
}

export function handleCheckPlacement(
  state: BuildingState,
  pieceType: string,
  position: GridPosition,
  rotation: Rotation
) {
  const def = getPieceDefinition(pieceType);
  if (!def) {
    return textResult(`Unknown piece type "${pieceType}".`);
  }

  const cells = getOccupiedCells(def.gridSize, position, rotation);
  const cellKeys = cells.map(posKey);

  // Check spatial conflicts
  const conflicts: string[] = [];
  for (const key of cellKeys) {
    const existing = state.getGrid().get(key);
    if (existing) {
      const p = state.getPiece(existing)!;
      conflicts.push(`Cell ${key} occupied by ${existing} (${p.type})`);
    }
  }

  // Check socket compatibility
  const rotatedSockets = rotateSockets(def.sockets, def.gridSize, rotation);
  const wouldConnect: string[] = [];
  const socketIssues: string[] = [];

  for (const cell of cells) {
    for (const dir of [...HORIZONTAL_DIRECTIONS, "top", "bottom"] as Direction[]) {
      const neighborPos = getNeighborPosition(cell, dir);
      const neighborKey = posKey(neighborPos);
      const neighborId = state.getGrid().get(neighborKey);

      if (!neighborId || cellKeys.includes(neighborKey)) continue;

      const neighborPiece = state.getPiece(neighborId)!;
      const neighborDef = getPieceDefinition(neighborPiece.type)!;
      const neighborRotatedSockets = rotateSockets(
        neighborDef.sockets,
        neighborDef.gridSize,
        neighborPiece.rotation
      );

      const ourSocketKey = getCellSocketKey(cell, position, dir, def.gridSize, rotation);
      const ourSocket = rotatedSockets[ourSocketKey] as SocketType | undefined;

      const oppositeDir = getOppositeDirection(dir);
      const neighborSocketKey = getCellSocketKey(
        neighborPos,
        neighborPiece.position,
        oppositeDir,
        neighborDef.gridSize,
        neighborPiece.rotation
      );
      const neighborSocket = neighborRotatedSockets[neighborSocketKey] as SocketType | undefined;

      if (ourSocket && neighborSocket) {
        if (areSocketsCompatible(ourSocket, neighborSocket)) {
          wouldConnect.push(`${dir} -> ${neighborId} (${neighborPiece.type})`);
        } else {
          socketIssues.push(
            `${dir} face "${ourSocket}" incompatible with ${neighborId} (${neighborPiece.type}) "${neighborSocket}"`
          );
        }
      }
    }
  }

  const valid = conflicts.length === 0 && socketIssues.length === 0;

  let text = `Check placement: ${pieceType} at (${position.x},${position.y},${position.z}) rot=${rotation}\n`;
  text += `Valid: ${valid ? "YES" : "NO"}\n\n`;

  if (conflicts.length > 0) {
    text += `Conflicts:\n${conflicts.map((c) => `  ${c}`).join("\n")}\n\n`;
  }
  if (wouldConnect.length > 0) {
    text += `Would connect:\n${wouldConnect.map((c) => `  ${c}`).join("\n")}\n\n`;
  }
  if (socketIssues.length > 0) {
    text += `Socket issues:\n${socketIssues.map((c) => `  ${c}`).join("\n")}\n\n`;
  }

  return textResult(text);
}

export function handleValidateBuilding(state: BuildingState) {
  if (state.getPieceCount() === 0) {
    return textResult("Building is empty. Nothing to validate.");
  }

  const errors = validateBuilding(state);

  if (errors.length === 0) {
    return textResult(
      `Building is VALID. ${state.getPieceCount()} piece(s), no errors.`
    );
  }

  let text = `Validation found ${errors.length} issue(s):\n\n`;
  for (const e of errors) {
    text += `[${e.severity.toUpperCase()}] ${e.type}: ${e.message}\n`;
    if (e.position) text += `  at (${e.position.x},${e.position.y},${e.position.z})`;
    if (e.direction) text += ` ${e.direction}`;
    if (e.position || e.direction) text += "\n";
    text += "\n";
  }

  return textResult(text);
}

export function handleExportBuilding(state: BuildingState) {
  const data = state.toJSON();
  return textResult(JSON.stringify(data, null, 2));
}

export function handleClearBuilding(state: BuildingState) {
  state.clear();
  return textResult("Building cleared. All pieces removed.");
}
