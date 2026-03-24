# Building Builder - Comprehensive Project Plan

## Vision

Claude Code **is the architect**. It connects via MCP to a building system, reasons about spatial layout, places modular sci-fi pieces, validates its own work, and iterates until the structure is sound — all from a natural language prompt with zero manual input.

The point is NOT to build clever algorithms that generate buildings. The point is to give Claude the right tools and constraints, then let it solve the spatial reasoning itself. We provide: a piece catalog, a grid, placement tools, and validation feedback. Claude provides: the design intelligence.

---

## 1. Asset Inventory & Analysis

### 1.1 Source Kit

**Kenney Modular Sci-Fi Kit** - 41 GLB files, all glTF 2.0 binary (UnityGLTF export).
- Shared texture: `Textures/colormap.png` (512x512, flat-color palette atlas)
- Single material per model: `"colormap"`, `KHR_texture_transform` extension
- No animations, no normal/roughness maps, `doubleSided: true`

### 1.2 Grid System (Derived from Bounding Boxes)

| Parameter | Value |
|-----------|-------|
| Base grid unit | **4 world units** |
| Narrow corridor footprint | 4x4 (1x1 grid cells) |
| Wide corridor footprint | 8x8 (2x2 grid cells) |
| Small room footprint | 12x12 (3x3 grid cells) |
| Large room footprint | 20x20 (5x5 grid cells) |
| Wide room footprint | 20x12 (5x3 grid cells) |
| Floor height | **4.25 world units** |
| Stair span | 8.75 units (2 floors) |
| Model origin | Center XZ, bottom Y=0 |

### 1.3 Asset Catalog

**Narrow Corridors (6 pieces)** - 4x4 footprint, bbox -2 to +2

| Asset | Connections | Vertices | Notes |
|-------|------------|----------|-------|
| `corridor` | W, E (straight) | 1,432 | Basic linear connector |
| `corridor-corner` | W, S (90-degree) | 1,902 | L-turn |
| `corridor-end` | W only (dead end) | 2,144 | Terminus cap |
| `corridor-intersection` | N, S, E, W (4-way) | 464 | Mostly floor geometry |
| `corridor-junction` | W, E, S (T-junction) | 948 | 3-way split |
| `corridor-transition` | W (narrow), E (wide) | 3,452 | **Width adapter** - asymmetric bbox (-6,0,-4)→(2,4.25,4) |

**Wide Corridors (5 pieces)** - 8x8 footprint, bbox -4 to +4

| Asset | Connections | Vertices |
|-------|------------|----------|
| `corridor-wide` | W, E | 3,944 |
| `corridor-wide-corner` | W, S | 3,350 |
| `corridor-wide-end` | W only | 5,900 |
| `corridor-wide-intersection` | N, S, E, W | 488 |
| `corridor-wide-junction` | W, E, S | 2,216 |

**Rooms (7 pieces)**

| Asset | Footprint | Vertices | Notes |
|-------|----------|----------|-------|
| `room-small` | 12x12 (3x3 grid) | 8,184 | Single opening |
| `room-small-variation` | 12x12 | 7,188 | Alternate interior |
| `room-large` | 20x20 (5x5 grid) | 18,240 | |
| `room-large-variation` | 20x20 | 16,442 | |
| `room-wide` | 20x12 (5x3 grid) | 14,608 | Rectangular |
| `room-wide-variation` | 20x12 | 16,728 | |
| `room-corner` | 12x12 | 10,378 | L-shaped, two openings |

**Gates (4 pieces)** - Thin dividers, bbox 4.2 x 1.4 x 4.62

| Asset | Meshes | Notes |
|-------|--------|-------|
| `gate` | 1 | Basic archway frame |
| `gate-door` | 2 | Frame + separate door mesh (animatable) |
| `gate-door-window` | 2 | Door with window cutout |
| `gate-lasers` | 14 | Frame + 13 laser emitter meshes |

**Stairs (2 pieces)** - Span 2 vertical levels

| Asset | Width | Vertices | Bbox Z |
|-------|-------|----------|--------|
| `stairs` | Narrow (4 units) | 5,112 | -6.1 to +2.1 |
| `stairs-wide` | Wide (8 units) | 5,128 | -6.1 to +2.1 |

**Templates - Structural (12 pieces)**

| Asset | Role | Dimensions |
|-------|------|-----------|
| `template-floor` | Basic floor quad | 4x4, 8 verts |
| `template-floor-big` | Double floor + columns | 8x8, 656 verts |
| `template-floor-detail` | Raised floor panel | 4x4, slight height |
| `template-floor-detail-a` | Alt floor surface | 4x4, flat |
| `template-floor-layer` | Floor slab with thickness | 4.2x4.2x0.4 |
| `template-floor-layer-hole` | Floor with vertical opening | 4.2x4.2x3.4 |
| `template-floor-layer-raised` | Raised floor + railings | 4.2x4.2x3.4 |
| `template-wall` | Standard wall panel | 4 wide x 4.25 tall |
| `template-wall-half` | Half-width wall | 2 wide x 4.05 tall |
| `template-wall-corner` | Inner corner fill | ~1x1 x 4.05 |
| `template-wall-detail-a` | Wall with surface pipes | 4 wide, 1,604 verts |
| `template-wall-stairs` | Stairwell wall variant | 4.2 wide x 4.7 tall |

**Decorative (2 pieces)**

| Asset | Role |
|-------|------|
| `template-wall-top` | Wall cap / crown |
| `template-detail` | Decorative pillar (~1.56x1.56) |
| `cables` | Floor-level cables/pipes (0.16 tall) |

---

## 2. Architecture Overview

```
+------------------+     MCP (stdio)     +------------------+
|                  |  <================>  |                  |
|   Claude Code    |     JSON-RPC 2.0    |   MCP Server     |
|   (AI Agent)     |                     |   (Node.js)      |
|                  |                     |                  |
+------------------+                     +--------+---------+
                                                  |
                                          WebSocket / file watch
                                                  |
                                         +--------v---------+
                                         |                  |
                                         |  Three.js        |
                                         |  Renderer        |
                                         |  (Vite + R3F)    |
                                         |                  |
                                         +------------------+
```

**Three components:**
1. **MCP Server** - Building state, validation, piece catalog. Claude's interface.
2. **Three.js Renderer** - Visual representation. Loads GLBs, renders building on grid.
3. **Shared State** - JSON building definition synced between server and renderer.

---

## 3. Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| MCP Server | TypeScript + `@modelcontextprotocol/sdk` + `zod` | Official SDK, stdio transport, type-safe schemas |
| Renderer | React Three Fiber + `@react-three/drei` | Declarative scene graph, useGLTF, OrbitControls, easy UI |
| Build tool | Vite + TypeScript | Fast HMR, native GLB/static asset handling |
| State | `zustand` + `immer` | Lightweight, immutable updates, shared between R3F and UI |
| Model loading | `useGLTF` with preloading | Caches all 41 GLBs, shared colormap material |
| Communication | WebSocket or file-watch | MCP server pushes state updates to renderer |

### Project Structure

```
building-builder/
  assets/                    # Kenney GLB models + colormap (existing)
  src/
    server/                  # MCP server
      index.ts               # Entry point, StdioServerTransport
      catalog.ts             # Piece definitions, connection points, socket types
      state.ts               # BuildingState manager (grid + graph)
      validation.ts          # All validation rules
      tools.ts               # MCP tool handlers
      resources.ts           # MCP resource handlers
      types.ts               # Shared type definitions
    renderer/                # Three.js web app
      main.tsx               # Vite entry
      App.tsx                # R3F Canvas + UI layout
      components/
        Building.tsx          # Renders all placed pieces
        Piece.tsx             # Single piece (loads GLB, applies transform)
        Grid.tsx              # Visual grid helper
        Controls.tsx          # OrbitControls + camera setup
      store/
        buildingStore.ts      # Zustand store, synced with MCP server
      hooks/
        useAssetLoader.ts     # Preloads all GLBs
        useServerSync.ts      # WebSocket connection to MCP state
    shared/
      types.ts               # Types shared between server and renderer
      pieceDefinitions.ts     # Piece catalog (used by both)
  public/
    models/                  # Symlink or copy of assets/ for Vite serving
  .mcp.json                  # MCP server registration for Claude Code
  package.json
  tsconfig.json
  vite.config.ts
```

---

## 4. Connection System Design

### 4.1 Socket Types

Each face of each piece has a **socket type**. Two adjacent faces must have compatible sockets.

| Socket Type | Description | Found On |
|-------------|-------------|----------|
| `corridor-narrow` | Standard corridor opening (4-unit wide) | All narrow corridor pieces |
| `corridor-wide` | Wide corridor opening (8-unit wide) | All wide corridor pieces |
| `room-narrow` | Room opening matching narrow corridors | Room pieces |
| `gate` | Gate-compatible opening | Gate pieces, room/corridor faces adjacent to gates |
| `wall` | Sealed wall, no passage | Closed faces of any piece |
| `stairs-bottom` | Bottom of staircase | Stairs pieces (lower level) |
| `stairs-top` | Top of staircase | Stairs pieces (upper level) |
| `floor` | Standard floor/ceiling face | Vertical faces between levels |
| `floor-hole` | Floor with vertical opening | template-floor-layer-hole |

### 4.2 Compatibility Matrix

```
corridor-narrow <-> corridor-narrow    (corridor continues)
corridor-narrow <-> room-narrow        (corridor enters room)
corridor-narrow <-> gate               (gate in corridor)
corridor-wide   <-> corridor-wide      (wide corridor continues)
room-narrow     <-> gate               (gate at room entrance)
wall            <-> wall               (walls face each other)
wall            <-> [empty]            (wall at building boundary)
stairs-bottom   <-> floor              (stairs start at floor level)
stairs-top      <-> floor-hole         (stairs emerge through floor opening)
```

**Critical rule**: `corridor-narrow` NEVER connects to `corridor-wide`. The `corridor-transition` piece is the ONLY valid adapter.

### 4.3 Piece Connection Definitions

Each piece definition includes connection points in local space (before rotation):

```typescript
// Example: corridor (straight, narrow)
{
  id: "corridor",
  gridSize: { x: 1, y: 1, z: 1 },  // occupies 1x1 grid cells
  sockets: {
    north: "wall",
    south: "wall",
    east: "corridor-narrow",
    west: "corridor-narrow",
    top: "floor",
    bottom: "floor"
  },
  symmetry: "I"  // 2-fold: 0/180 are identical, 90/270 are identical
}

// Example: corridor-corner
{
  id: "corridor-corner",
  gridSize: { x: 1, y: 1, z: 1 },
  sockets: {
    north: "wall",
    south: "corridor-narrow",
    east: "wall",
    west: "corridor-narrow",
    top: "floor",
    bottom: "floor"
  },
  symmetry: "L"  // 4 distinct rotations
}

// Example: corridor-transition (narrow-to-wide adapter)
{
  id: "corridor-transition",
  gridSize: { x: 2, y: 1, z: 2 },  // occupies 2x2 grid cells
  sockets: {
    // More complex - per-cell-face sockets needed
    // West face (narrow end): corridor-narrow
    // East face (wide end): corridor-wide
  },
  symmetry: "none"
}
```

### 4.4 Rotation Transform

When a piece is rotated clockwise by R degrees around Y:
- 0:   N->N, E->E, S->S, W->W
- 90:  N->E, E->S, S->W, W->N
- 180: N->S, E->W, S->N, W->E
- 270: N->W, E->N, S->E, W->S

Up/Down are unaffected by Y rotation.

---

## 5. MCP Server Design

### 5.1 Server Registration

`.mcp.json` at project root:
```json
{
  "mcpServers": {
    "building-builder": {
      "command": "node",
      "args": ["dist/server/index.js"],
      "env": {}
    }
  }
}
```

### 5.2 MCP Tools

#### Placement Tools

**`place_piece`** - Primary building action
```
Input:  { piece_type, position: {x,y,z}, rotation: 0|90|180|270 }
Output: { success, piece_id, connections[], validation_warnings[], ascii_map }
```

**`remove_piece`** - Undo a placement
```
Input:  { piece_id }
Output: { success, orphaned_connections[] }
```

**`move_piece`** - Atomic relocate
```
Input:  { piece_id, new_position, new_rotation }
Output: (same as place_piece)
```

**`place_pieces`** - Batch placement (reduces round-trips)
```
Input:  { placements: [{piece_type, position, rotation}...] }
Output: { results: [{success, piece_id}...], aggregate_validation }
```

#### Query Tools

**`get_building_state`** - Full or filtered state
```
Input:  { level?, format: "summary"|"full" }
Output: { piece_count, levels[], pieces[], open_connections[], ascii_map }
```

**`get_piece_catalog`** - Available pieces and their properties
```
Input:  { category?: "corridor"|"room"|"gate"|"stairs"|"template"|"all" }
Output: { pieces: [{type, category, dimensions, connections, socket_map}...] }
```

**`get_open_connections`** - Unmatched connection frontier
```
Input:  { level? }
Output: { connections: [{piece_id, position, direction, width, compatible_pieces[]}...] }
```

**`check_placement`** - Preview validity without placing
```
Input:  { piece_type, position, rotation }
Output: { valid, would_connect[], would_conflict[], warnings[] }
```

#### Validation Tools

**`validate_building`** - Full structural validation
```
Input:  { checks: ["connections","enclosure","reachability","all"] }
Output: { valid, errors: [{severity, type, message, piece_ids, suggestion, fix_options[]}...] }
```

#### Export/Import

**`export_building`** - Serialize to JSON
**`import_building`** - Load from JSON
**`clear_building`** - Reset (annotated as destructive)

### 5.3 MCP Resources

| URI | Type | Description |
|-----|------|-------------|
| `building://catalog/pieces` | Static | Full piece catalog with socket definitions |
| `building://state/current` | Dynamic + subscription | Current building state (pushes updates) |
| `building://state/level/{n}` | Dynamic template | Per-level state |
| `building://rules/connections` | Static | Socket compatibility matrix |

### 5.4 MCP Prompts (Workflow Templates)

| Prompt | Arguments | Purpose |
|--------|-----------|---------|
| `build-layout` | style, rooms, levels | Design and build a complete building |
| `extend-building` | direction, size | Extend existing building |
| `fix-validation` | (none) | Run validation and fix all errors |

### 5.5 Tool Response Design

Every mutating tool returns:
1. **Action result** - What changed
2. **Local context** - Updated frontier (open connections near the change)
3. **ASCII map** - 2D text visualization of the affected level
4. **Warnings** - Immediate validation issues

```
Level 0 (after placing corridor at 3,0):
  0 1 2 3 4 5
0 . . . . . .
1 . R R . . .
2 . R R C C .
3 . . . . G .

Legend: R=room, C=corridor, G=gate, .=empty
Open connections: east at (5,0,2), south at (4,0,3)
```

This ASCII map is critical for Claude's spatial reasoning.

---

## 6. Validation Algorithms

### 6.1 Validation Rules (in priority order)

**Rule 1: No Spatial Conflicts** (checked on every placement)
- Two pieces cannot occupy the same grid cell(s)
- O(1) lookup in sparse grid map

**Rule 2: Socket Compatibility** (checked on every placement)
- Adjacent pieces must have compatible sockets on their shared face
- Width match: narrow != wide (transition piece required)
- Type match: per compatibility matrix

**Rule 3: No Wall/Opening Mismatch** (checked on every placement)
- If piece A has an opening facing piece B, piece B must have an opening facing back
- If piece A has a wall facing piece B, piece B must have a wall facing back

**Rule 4: Reachability** (checked on validate_building)
- BFS/DFS from any piece must visit all pieces
- Disconnected components are errors
- O(V + E) where V = pieces, E = connections

**Rule 5: Enclosure** (checked on validate_building)
- All connection points are either connected or intentionally capped (corridor-end)
- Open connections at boundary are warnings during building, errors at final validation

**Rule 6: Vertical Integrity** (checked on validate_building)
- Stairs must have floor-hole above them
- Every piece at level N>0 must have support below
- Floor/ceiling alignment between levels

### 6.2 Two-Tier Validation Strategy

- **Immediate** (per-placement): Rules 1-3. Fast, local checks. Instant feedback.
- **Global** (on-demand): Rules 4-6. Graph traversal. Called at milestones.

### 6.3 Error Reporting Format

Errors describe **what's wrong**, not how to fix it. Claude figures out the fix.
```typescript
{
  severity: "error",
  type: "width_mismatch",
  message: "Narrow corridor at (3,0,5) has east face facing wide corridor at (4,0,5). Socket 'corridor-narrow' is incompatible with 'corridor-wide'.",
  piece_ids: ["piece_017", "piece_022"],
  position: {x: 3, y: 0, z: 5},
  direction: "east"
}
```
The server tells Claude the problem. Claude decides whether to remove a piece, insert an adapter, rearrange the layout, or try a completely different approach. That's the whole point.

---

## 7. Building State Data Model

### 7.1 Core Data Structures

```typescript
interface BuildingState {
  pieces: Map<string, PlacedPiece>;       // piece_id -> piece data
  grid: Map<string, string>;              // "x,y,z" -> piece_id (spatial index)
  connections: ConnectionGraph;            // adjacency graph
}

interface PlacedPiece {
  id: string;
  type: string;                           // piece catalog ID
  position: { x: number; y: number; z: number };
  rotation: 0 | 90 | 180 | 270;
  resolvedSockets: Map<Direction, SocketType>;  // after rotation
}

interface ConnectionGraph {
  edges: Map<string, Set<string>>;        // piece_id -> connected piece_ids
}
```

### 7.2 Serialized Building Format (JSON)

```json
{
  "name": "Sci-Fi Outpost Alpha",
  "pieces": [
    { "id": "p001", "type": "corridor", "position": [0, 0, 0], "rotation": 0 },
    { "id": "p002", "type": "corridor", "position": [1, 0, 0], "rotation": 0 },
    { "id": "p003", "type": "corridor-corner", "position": [2, 0, 0], "rotation": 90 },
    { "id": "p004", "type": "room-small", "position": [2, 0, 1], "rotation": 0 }
  ]
}
```

---

## 8. Three.js Renderer Design

### 8.1 Loading Pipeline

1. Load `colormap.png` -> create shared `MeshStandardMaterial` (NearestFilter for crisp style)
2. Preload all 41 GLBs in parallel via `useGLTF.preload()`
3. Replace each GLB's materials with the shared material
4. On placement: clone geometry, apply grid-to-world transform, add to scene
5. Grid-to-world: `worldPos = gridPos * 4` (base grid unit = 4 world units)

### 8.2 Rendering Approach

- **< 500 pieces**: Individual cloned meshes. Simple, supports easy selection/highlighting.
- **500-2000 pieces**: `InstancedMesh` per piece type. ~15 draw calls instead of thousands.
- **2000+ pieces**: `BufferGeometryUtils.mergeGeometries()` for view-only mode.

For this prototype, individual meshes are sufficient. The entire Kenney kit is ~95K vertices total - well within budget.

### 8.3 Camera & Controls

- `OrbitControls` with damping, target at building center
- Max polar angle clamped to prevent below-ground views
- Level visibility: dim/ghost levels above active editing level

### 8.4 Server Sync

The renderer watches for building state changes (WebSocket or file watch on `building.json`):
1. MCP server writes state after each mutation
2. Renderer detects change, diffs with current scene
3. Adds/removes/updates pieces accordingly

---

## 9. Claude's Building Loop

### 9.1 The Iterative Process

```
User prompt: "Build a small outpost with 2 rooms connected by a corridor"
                                    |
                                    v
[1. UNDERSTAND] Claude reads piece catalog via get_piece_catalog
                                    |
                                    v
[2. PLAN] Claude reasons about layout (internal, no tool calls)
    "I'll place a room-small on the left, 3 corridor segments,
     then a room-small on the right. Gates at room entrances."
                                    |
                                    v
[3. BUILD] Claude places pieces iteratively:
    - place_piece("room-small", {x:0,y:0,z:0}, 90)
      -> reads response, notes open connection on east face
    - place_piece("gate-door", {x:3,y:0,z:0}, 0)
      -> gate placed at room exit
    - place_piece("corridor", {x:4,y:0,z:0}, 0)
    - place_piece("corridor", {x:5,y:0,z:0}, 0)
    - place_piece("gate-door", {x:6,y:0,z:0}, 0)
    - place_piece("room-small", {x:7,y:0,z:0}, 270)
                                    |
                                    v
[4. VALIDATE] Claude calls validate_building
    -> Gets errors/warnings
                                    |
                                    v
[5. FIX] Claude adjusts based on error suggestions
    -> Removes/replaces/adds pieces
                                    |
                                    v
[6. CONFIRM] Re-validate until clean
    -> "Building is valid. 8 pieces, 2 rooms, 1 corridor, 2 gates."
```

### 9.2 Multi-Level Building

For multi-story buildings, Claude works **bottom-up**:

1. Design level 0 completely (rooms, corridors, gates)
2. Mark stair positions (reserve cells for stairs)
3. Place stair pieces (span levels 0-1)
4. Design level 1, connecting from stair exits
5. Validate each level, then validate the full building
6. Repeat for additional levels

### 9.3 Efficiency Optimizations

- **Batch placement**: Use `place_pieces` for linear runs (corridors, walls)
- **Skip `check_placement`** for straightforward extensions
- **Validate at milestones**, not every step (after each room, after each level)
- **Rich tool responses** include frontier info, reducing need for separate queries

---

## 10. Implementation Phases

### Phase 1: Foundation (Asset Catalog + Basic Renderer)

**Goal**: Catalog all pieces in JSON, render them in Three.js, prove the grid system works.

**Tasks**:
1. Initialize project (Vite + React + TypeScript + R3F)
2. Create piece catalog JSON with all 41 assets:
   - ID, category, grid dimensions, file path
   - Socket definitions for each face
   - Symmetry class
3. Build Three.js renderer:
   - Load all GLBs with shared colormap material
   - Render pieces on a visual grid
   - OrbitControls for camera
   - Basic piece palette UI (click to place)
4. Verify grid snapping and rotation work correctly
5. Load/save building as JSON

**Deliverable**: Web app where you can manually place/rotate/remove pieces on a grid.

### Phase 2: Validation Engine

**Goal**: Implement all validation rules, prove they catch real errors.

**Tasks**:
1. Implement socket compatibility checking
2. Implement spatial conflict detection
3. Implement wall/opening mismatch detection
4. Implement graph-based reachability check (BFS)
5. Implement enclosure validation
6. Implement vertical integrity checks (stairs/floor alignment)
7. Build validation error reporting with fix suggestions
8. Visual feedback in renderer (highlight invalid pieces red)

**Deliverable**: Validation engine that catches all structural errors and suggests fixes.

### Phase 3: MCP Server

**Goal**: Claude Code can build buildings through MCP tools.

**Tasks**:
1. Set up MCP server with `@modelcontextprotocol/sdk` + StdioServerTransport
2. Implement all placement tools (place, remove, move, batch)
3. Implement all query tools (state, catalog, connections, check)
4. Implement validation tool
5. Implement export/import tools
6. Wire server state to renderer (WebSocket sync)
7. Register in `.mcp.json`
8. ASCII map generation in tool responses
9. Test: Claude builds a simple building end-to-end

**Deliverable**: Claude Code can autonomously build validated buildings via MCP.

### Phase 4: Multi-Level & Polish

**Goal**: Claude builds multi-story buildings, the whole loop is smooth.

**Tasks**:
1. Multi-level building support (stairs connecting levels)
2. Level-filtered queries and visualization
3. MCP prompts for common workflows (build-layout, extend, fix)
4. Optimize tool responses for Claude's spatial reasoning
5. Test: Claude builds a 2-3 story building from a single prompt
6. Polish renderer (shadows, SSAO, selection highlights)

**Deliverable**: Complete prototype - prompt Claude, watch it build a multi-level sci-fi station.

---

## 11. Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Grid vs free-form | **Grid** | Kenney kit is grid-aligned; simplifies validation and AI reasoning |
| Prefab pieces vs template primitives | **Prefab-first** | Rooms/corridors are self-contained; templates as advanced tier later |
| R3F vs vanilla Three.js | **R3F** | Declarative scene = less error-prone for dynamic add/remove |
| MCP transport | **stdio** | Claude Code native; no network config needed |
| State sync method | **File watch** | MCP server writes JSON; renderer watches. Simple, debuggable. |
| Validation strategy | **Two-tier** | Immediate (per-placement) + global (on-demand) |
| AI building approach | **Claude does everything** | No generation algorithms. Claude reasons, places, validates, fixes. The MCP server is dumb tools + honest feedback. |

---

## 12. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Connection points unknown from GLB data alone | Manually define from visual inspection + bounding box analysis. The catalog is only 41 pieces - feasible to hand-annotate. |
| Claude's spatial reasoning may struggle with 3D | ASCII maps in responses, rich text descriptions, frontier-based guidance (tell Claude what fits where). |
| Multi-cell pieces (rooms) complicate grid logic | Track all occupied cells per piece. Multi-cell pieces reserve all their cells in the grid map. |
| Transition piece (narrow->wide) has asymmetric bbox | Special-case handling: offset grid position to align both ends. |
| MCP round-trips slow down building | Batch placement tool, rich responses with frontier, validate at milestones not every step. |
| Renderer and MCP server state desync | Single source of truth in server; renderer is read-only view. File-based sync with sequence numbers. |

---

## 13. Design Philosophy: Claude as the Builder

### Why NOT WFC / Procedural Generation

The temptation is to write smart generation algorithms (WFC, BSP, constraint solvers) that do the spatial reasoning for us. **We explicitly reject this.** The whole point of the prototype is to test whether Claude can do this reasoning itself through MCP tool use.

What we build:
- **Dumb tools**: Place a piece, remove a piece, query state. No intelligence in the tools.
- **Honest validation**: Tell Claude what's wrong, not how to fix it. Suggestions are hints, not commands.
- **Rich feedback**: ASCII maps, open connection lists, spatial context. Give Claude the information it needs to reason.

What Claude does:
- **Plans the layout** from a natural language prompt
- **Makes spatial decisions** about where rooms and corridors go
- **Solves connection problems** when pieces don't fit
- **Iterates on validation errors** until the building is structurally sound
- **Handles multi-level assembly** by reasoning about vertical connections

The MCP server is a canvas and a ruler. Claude is the architect.

### Success Criteria

The prototype succeeds when Claude can:
1. Receive "Build a 2-room outpost" and produce a valid building with no human intervention
2. Handle validation errors by reasoning about what went wrong and fixing it
3. Build multi-level structures by planning stair placement and level connectivity
4. Produce different layouts from the same prompt (it's reasoning, not templating)

### Future Enhancements (Post-Prototype)

- **Decorative pass**: Claude makes a second pass adding cables, details, wall variants
- **Export to game engine**: Generate Unity/Godot scene from building JSON
- **Multi-agent building**: Multiple Claude instances collaborating on sections
- **Style-guided building**: "Military base" vs "Research lab" through prompt engineering, not code
- **Larger scale**: Test with bigger prompts - "Build a full space station with 20 rooms across 5 levels"

---

## References

- Kenney Modular Sci-Fi Kit: CC0 1.0 license
- [MCP Specification (2025-11-25)](https://modelcontextprotocol.io/specification/2025-11-25)
- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- [Wave Function Collapse (mxgmn)](https://github.com/mxgmn/WaveFunctionCollapse)
- [DeBroglie WFC Library](https://github.com/BorisTheBrave/DeBroglie)
- [Skyrim Modular Level Design (GDC)](https://www.gamedeveloper.com/design/skyrim-s-modular-approach-to-level-design)
- [Townscaper / Oskar Stalberg](https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making)
