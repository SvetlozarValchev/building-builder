import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { CATALOG_MAP } from '../../shared/catalog'
import type { Rotation } from '../../shared/types'
import * as THREE from 'three'

interface PieceProps {
  type: string
  position: [number, number, number]
  rotation: Rotation
}

export function Piece({ type, position, rotation }: PieceProps) {
  const def = CATALOG_MAP.get(type)
  if (!def) return null

  const { scene } = useGLTF(`/models/${def.modelFile}`)

  const cloned = useMemo(() => scene.clone(true), [scene])

  // Grid-to-world transform
  // Models are center-origin in XZ. For multi-cell pieces, offset to center of the grid footprint.
  // Grid unit = 4 world units, floor height = 4.25 world units
  const gridUnit = 4
  const floorHeight = 4.25

  // For rotation, the grid footprint rotates: a 5x3 piece at rot=90 becomes 3x5
  const rotRad = (rotation * Math.PI) / 180
  const isRotated90or270 = rotation === 90 || rotation === 270
  const effectiveSizeX = isRotated90or270 ? def.gridSize.z : def.gridSize.x
  const effectiveSizeZ = isRotated90or270 ? def.gridSize.x : def.gridSize.z

  // Offset by half a grid unit so models sit in cell centers, not on grid line intersections
  const worldX = (position[0] + (effectiveSizeX - 1) / 2) * gridUnit + gridUnit / 2
  const worldY = position[1] * floorHeight
  const worldZ = (position[2] + (effectiveSizeZ - 1) / 2) * gridUnit + gridUnit / 2

  return (
    <primitive
      object={cloned}
      position={[worldX, worldY, worldZ]}
      rotation={[0, rotRad, 0]}
    />
  )
}
