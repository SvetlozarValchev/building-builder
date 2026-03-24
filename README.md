# Building Builder

An MCP-powered modular building system where Claude acts as the architect. Claude places, connects, validates, and visually inspects 3D sci-fi buildings using [Kenney's Modular Sci-Fi Kit](https://kenney.nl/assets/modular-sci-fi-kit) — all through natural language.

## How It Works

```
You (prompt) → Claude Code → MCP Server → building.json → 3D Renderer
                                  ↓
                            Puppeteer screenshot → Claude (visual feedback loop)
```

1. You describe what you want: *"Build two rooms connected by a corridor with a second floor"*
2. Claude calls MCP tools to place pieces, check sockets, and validate structure
3. The renderer polls `building.json` and updates the 3D scene in real-time
4. Claude takes screenshots to visually verify the result and self-correct

## Quick Start

### Prerequisites

- Node.js 18+
- Git LFS (`git lfs install`) — models and textures are stored in LFS

### Setup

```bash
git clone <repo-url>
cd building-builder
npm install
git lfs pull          # fetch .glb models and .png textures
npm run build:server  # compile MCP server
```

### Run

Start the renderer and server in two terminals:

```bash
# Terminal 1: 3D renderer
npm run dev:renderer
# Opens at http://localhost:5173

# Terminal 2: build the server (watch mode)
npm run dev:server
```

Then open the project in Claude Code — the `.mcp.json` auto-registers the MCP server. Start prompting:

> *"Place a corridor junction at the origin, then add rooms on the east and west sides connected by gates."*

Claude will call `place_piece`, `validate_building`, and `take_screenshot` tools automatically.

## MCP Tools

| Tool | Description |
|------|-------------|
| `place_piece` | Place a piece with collision and socket validation |
| `place_pieces` | Batch placement (continues on errors) |
| `remove_piece` | Remove a piece by ID |
| `get_building_state` | ASCII map + piece list, filterable by level |
| `get_piece_catalog` | List all available pieces with socket info |
| `get_open_connections` | Show unmatched sockets ready for expansion |
| `check_placement` | Dry-run validation without placing |
| `validate_building` | Full structural check (connectivity, sockets) |
| `export_building` | Export state as JSON |
| `clear_building` | Reset to empty |
| `take_screenshot` | Capture the 3D view (preset angles or custom camera) |

## Piece Catalog

41 models across 6 categories:

| Category | Pieces | Examples |
|----------|--------|----------|
| **Corridors** | 6 narrow + 5 wide | straight, corner, junction, intersection, end, transition |
| **Rooms** | 7 | small (3x3), large (5x5), wide (5x3), each with variations, plus corner |
| **Gates** | 4 | basic, door, door+window, lasers |
| **Stairs** | 2 | narrow (1x2x1), wide (2x2x2) — span 2 vertical levels |
| **Templates** | 17 | floor, wall, corner, detail, decorative pieces |

## Grid System

- **Grid unit**: 1 cell = 4 world units (X/Z)
- **Floor height**: 1 level = 4.25 world units (Y)
- **Coordinates**: X = east/west, Y = vertical level, Z = north/south
- **Rotation**: 0/90/180/270 degrees clockwise around Y axis

## Socket System

Pieces connect via directional sockets. Adjacent faces must have compatible socket types:

| Socket A | Socket B |
|----------|----------|
| `corridor-narrow` | `corridor-narrow` |
| `corridor-wide` | `corridor-wide` |
| `corridor-narrow` | `gate` |
| `room-narrow` | `gate` |
| `floor` | `floor` |
| `floor-hole` | `floor-hole` |
| `stairs-top` | `stairs-top` |

`wall` sockets are inert — they don't connect but don't conflict with empty space.

## Architecture

```
src/
├── server/                # MCP server (Node.js)
│   ├── index.ts           # Tool registration + MCP transport
│   ├── state.ts           # BuildingState: grid, persistence, placement logic
│   ├── tools.ts           # Tool handler implementations
│   ├── validation.ts      # BFS reachability + socket compatibility checks
│   ├── ascii.ts           # ASCII map generation for CLI feedback
│   └── screenshot.ts      # Puppeteer headless screenshot capture
├── renderer/              # 3D viewer (React Three Fiber)
│   ├── App.tsx            # Canvas, lights, camera controller
│   ├── components/
│   │   ├── Piece.tsx      # GLB loading, grid→world transform
│   │   └── Grid.tsx       # Infinite ground grid
│   └── hooks/
│       ├── useAssetLoader.ts   # Model preloading + shared texture
│       └── useBuildingSync.ts  # Polls building.json for live updates
└── shared/                # Shared between server + renderer
    ├── types.ts           # Directions, sockets, grid types, compatibility
    ├── catalog.ts         # 44 piece definitions with sockets + grid sizes
    └── rotation.ts        # Rotation math for sockets + grid coordinates
```

## How the Renderer Syncs

No WebSocket needed. The MCP server writes `public/building.json` after every placement/removal. The renderer polls this file every 500ms and re-renders when it changes. This means you see pieces appear in the 3D view as Claude places them.

## Screenshot System

The `take_screenshot` tool launches a headless Chromium via Puppeteer, navigates to the renderer, positions the camera, and returns a 1280x720 PNG. This lets Claude visually inspect its work and catch misaligned pieces or incorrect orientations.

Preset angles: `iso`, `top`, `front`, `side`
Custom: specify `camera_position` and `look_at` in world coordinates.

## Assets

All 3D models are from [Kenney's Modular Sci-Fi Kit](https://kenney.nl/assets/modular-sci-fi-kit) (CC0 license). Models share a single `colormap.png` texture atlas. Preview thumbnails are in `public/previews/`.

## License

Assets: [CC0 1.0 (Kenney)](https://creativecommons.org/publicdomain/zero/1.0/)
