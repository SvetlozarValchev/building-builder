#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { BuildingState } from "./state.js";
import {
  handlePlacePiece,
  handleRemovePiece,
  handlePlacePieces,
  handleGetBuildingState,
  handleGetPieceCatalog,
  handleGetOpenConnections,
  handleCheckPlacement,
  handleValidateBuilding,
  handleExportBuilding,
  handleClearBuilding,
} from "./tools.js";
import { takeScreenshot } from "./screenshot.js";
import type { Rotation } from "../shared/types.js";

const server = new McpServer({
  name: "building-builder",
  version: "1.0.0",
});

const state = new BuildingState();
state.loadFromDisk();

// ---- Tool Registration ----

server.tool(
  "place_piece",
  "Place a modular building piece on the grid. Returns connections, open frontier, and ASCII map.",
  {
    piece_type: z.string().describe("Piece type id from the catalog (e.g. 'corridor', 'room-small')"),
    position: z.object({
      x: z.number().int().describe("Grid X position (east-west)"),
      y: z.number().int().describe("Grid Y position (vertical level, 0 = ground)"),
      z: z.number().int().describe("Grid Z position (north-south)"),
    }).describe("Grid position to place the piece"),
    rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)])
      .describe("Clockwise rotation in degrees around Y axis"),
  },
  async ({ piece_type, position, rotation }) => {
    return handlePlacePiece(state, piece_type, position, rotation as Rotation);
  }
);

server.tool(
  "remove_piece",
  "Remove a placed piece by its ID. Returns updated map and open connections.",
  {
    piece_id: z.string().describe("The piece ID to remove (e.g. 'p001')"),
  },
  async ({ piece_id }) => {
    return handleRemovePiece(state, piece_id);
  }
);

server.tool(
  "place_pieces",
  "Place multiple pieces in a batch. Useful for corridor runs. Stops reporting errors but continues placing.",
  {
    placements: z.array(z.object({
      piece_type: z.string(),
      position: z.object({
        x: z.number().int(),
        y: z.number().int(),
        z: z.number().int(),
      }),
      rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
    })).describe("Array of pieces to place"),
  },
  async ({ placements }) => {
    return handlePlacePieces(
      state,
      placements.map((p) => ({
        ...p,
        rotation: p.rotation as Rotation,
      }))
    );
  }
);

server.tool(
  "get_building_state",
  "Get the current building state including piece list and ASCII map. Optionally filter by level.",
  {
    level: z.number().int().optional().describe("Filter to a specific Y level"),
  },
  async ({ level }) => {
    return handleGetBuildingState(state, level);
  }
);

server.tool(
  "get_piece_catalog",
  "List all available piece types with their properties, socket openings, and grid sizes.",
  {
    category: z.string().optional().describe("Filter by category: corridor, corridor-wide, room, gate, stairs, template, decorative, or all"),
  },
  async ({ category }) => {
    return handleGetPieceCatalog(category);
  }
);

server.tool(
  "get_open_connections",
  "Find all unmatched connection points (non-wall sockets facing empty cells). Shows where building can be extended.",
  {
    level: z.number().int().optional().describe("Filter to a specific Y level"),
  },
  async ({ level }) => {
    return handleGetOpenConnections(state, level);
  }
);

server.tool(
  "check_placement",
  "Preview whether a piece placement would be valid WITHOUT actually placing it.",
  {
    piece_type: z.string().describe("Piece type to check"),
    position: z.object({
      x: z.number().int(),
      y: z.number().int(),
      z: z.number().int(),
    }).describe("Grid position to check"),
    rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)])
      .describe("Rotation to check"),
  },
  async ({ piece_type, position, rotation }) => {
    return handleCheckPlacement(state, piece_type, position, rotation as Rotation);
  }
);

server.tool(
  "validate_building",
  "Run full structural validation on the building. Checks connectivity, socket compatibility, and open connections.",
  {},
  async () => {
    return handleValidateBuilding(state);
  }
);

server.tool(
  "export_building",
  "Export the current building as JSON data.",
  {},
  async () => {
    return handleExportBuilding(state);
  }
);

server.tool(
  "clear_building",
  "Remove all pieces and reset the building to empty.",
  {},
  async () => {
    return handleClearBuilding(state);
  }
);

server.tool(
  "take_screenshot",
  "Take a screenshot of the 3D renderer to see what the building looks like. You can use preset angles or specify exact camera position and look-at target in WORLD coordinates (grid_pos * 4 for X/Z, grid_pos * 4.25 for Y). Requires the renderer running (npm run dev:renderer).",
  {
    camera_angle: z.enum(["iso", "top", "front", "side"]).optional()
      .describe("Preset camera angle. Ignored if camera_position is set."),
    look_at: z.object({
      x: z.number(), y: z.number(), z: z.number(),
    }).optional().describe("World position to look at. E.g. to look at grid (3,0,1): {x:12, y:0, z:4}"),
    camera_position: z.object({
      x: z.number(), y: z.number(), z: z.number(),
    }).optional().describe("World position to place the camera"),
  },
  async ({ camera_angle, look_at, camera_position }) => {
    try {
      const { base64 } = await takeScreenshot(
        camera_angle ?? "iso",
        look_at,
        camera_position
      );
      return {
        content: [
          {
            type: "image" as const,
            data: base64,
            mimeType: "image/png",
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Screenshot failed: ${e instanceof Error ? e.message : String(e)}. Make sure the renderer is running (npm run dev:renderer).`,
          },
        ],
      };
    }
  }
);

// ---- Start Server ----

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Building Builder MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
