import type { PlacedPiece } from "../shared/types.js";
import { getPieceDefinition } from "../shared/catalog.js";
import type { BuildingState } from "./state.js";

const CATEGORY_CHARS: Record<string, string> = {
  corridor: "C",
  "corridor-wide": "W",
  room: "R",
  gate: "G",
  stairs: "S",
  template: "T",
  decorative: "D",
};

export function generateAsciiMap(
  state: BuildingState,
  level?: number
): string {
  const pieces = state.getAllPieces(level);
  if (pieces.length === 0) {
    return level !== undefined
      ? `Level ${level}: (empty)`
      : "(empty building)";
  }

  // Find bounding box from the grid
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;

  const cellMap = new Map<string, { pieceId: string; char: string }>();

  for (const piece of pieces) {
    const def = getPieceDefinition(piece.type);
    if (!def) continue;

    const char = CATEGORY_CHARS[def.category] || "?";

    for (const key of piece.occupiedCells) {
      const [x, y, z] = key.split(",").map(Number);
      // Filter by level if specified
      if (level !== undefined && y !== level) continue;

      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);

      cellMap.set(`${x},${z}`, { pieceId: piece.id, char });
    }
  }

  if (cellMap.size === 0) {
    return level !== undefined
      ? `Level ${level}: (empty)`
      : "(empty building)";
  }

  // Add 1 cell padding
  minX -= 1;
  maxX += 1;
  minZ -= 1;
  maxZ += 1;

  // Build the map
  const lines: string[] = [];
  const levelLabel = level !== undefined ? `Level ${level}` : "All levels (top-down)";
  lines.push(levelLabel + ":");

  // Column headers
  const colWidth = 3;
  let header = "     ";
  for (let x = minX; x <= maxX; x++) {
    header += String(x).padStart(colWidth);
  }
  lines.push(header);

  // Rows
  for (let z = minZ; z <= maxZ; z++) {
    let row = String(z).padStart(4) + " ";
    for (let x = minX; x <= maxX; x++) {
      const cell = cellMap.get(`${x},${z}`);
      row += (cell ? ` ${cell.char} ` : " . ").padStart(colWidth);
    }
    lines.push(row);
  }

  // Legend
  lines.push("");
  lines.push(
    "Legend: C=corridor W=wide-corridor R=room G=gate S=stairs T=template D=decorative .=empty"
  );

  // Piece list
  lines.push("");
  lines.push("Pieces:");
  for (const piece of pieces) {
    const { x, y, z } = piece.position;
    lines.push(
      `  ${piece.id}: ${piece.type} at (${x},${y},${z}) rot=${piece.rotation}`
    );
  }

  return lines.join("\n");
}
