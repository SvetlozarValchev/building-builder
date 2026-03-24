import { Suspense, useEffect, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { BuildGrid } from './components/Grid'
import { Piece } from './components/Piece'
import { useBuildingSync } from './hooks/useBuildingSync'
import type { Rotation } from '../shared/types'

// Expose camera control to window so puppeteer can call it
function CameraController() {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)

  useEffect(() => {
    (window as any).__setCameraPosition = (
      px: number, py: number, pz: number,
      tx: number, ty: number, tz: number
    ) => {
      camera.position.set(px, py, pz)
      camera.lookAt(tx, ty, tz)
      camera.updateProjectionMatrix()
      if (controlsRef.current) {
        controlsRef.current.target.set(tx, ty, tz)
        controlsRef.current.update()
      }
    }
    return () => { delete (window as any).__setCameraPosition }
  }, [camera])

  return <OrbitControls ref={controlsRef} makeDefault target={[0, 0, 0]} />
}

function Scene() {
  const building = useBuildingSync()

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[30, 40, 20]} intensity={0.9} castShadow />
      <BuildGrid />
      <CameraController />
      {building?.pieces.map((piece) => (
        <Piece
          key={piece.id}
          type={piece.type}
          position={piece.position}
          rotation={piece.rotation as Rotation}
        />
      ))}
    </>
  )
}

export function App() {
  return (
    <Canvas
      camera={{ position: [30, 25, 30], fov: 50, near: 0.1, far: 500 }}
      style={{ width: '100vw', height: '100vh', background: '#1a1a2e' }}
    >
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </Canvas>
  )
}
