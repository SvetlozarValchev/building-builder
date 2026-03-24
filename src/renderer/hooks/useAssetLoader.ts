import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { PIECE_CATALOG, CATALOG_MAP } from '../../shared/catalog'
import * as THREE from 'three'

// Preload all GLB models at module level
const MODEL_PATHS = PIECE_CATALOG.map(p => `/models/${p.modelFile}`)
for (const path of MODEL_PATHS) {
  useGLTF.preload(path)
}

// Shared colormap texture — loaded once and reused
let sharedTexture: THREE.Texture | null = null

function getSharedTexture(): THREE.Texture {
  if (!sharedTexture) {
    const loader = new THREE.TextureLoader()
    sharedTexture = loader.load('/models/Textures/colormap.png')
    sharedTexture.magFilter = THREE.NearestFilter
    sharedTexture.minFilter = THREE.NearestFilter
    sharedTexture.colorSpace = THREE.SRGBColorSpace
    sharedTexture.flipY = false
  }
  return sharedTexture
}

export function useModel(pieceType: string): THREE.Group {
  const def = CATALOG_MAP.get(pieceType)
  if (!def) throw new Error(`Unknown piece type: ${pieceType}`)

  const { scene } = useGLTF(`/models/${def.modelFile}`)

  const cloned = useMemo(() => {
    const clone = scene.clone(true)
    const texture = getSharedTexture()

    // Apply shared colormap material to all meshes
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const oldMat = child.material as THREE.MeshStandardMaterial
        // Reuse the existing material's UV settings but ensure our texture
        const mat = new THREE.MeshStandardMaterial({
          map: texture,
          side: THREE.DoubleSide,
        })
        // Copy UV transform if the original material has one
        if (oldMat.map) {
          mat.map = oldMat.map
        }
        child.material = mat
      }
    })

    return clone
  }, [scene])

  return cloned
}
