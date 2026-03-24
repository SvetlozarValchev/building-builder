import { Grid as DreiGrid } from '@react-three/drei'

export function BuildGrid() {
  return (
    <DreiGrid
      args={[160, 160]}
      cellSize={4}
      cellThickness={0.5}
      cellColor="#444466"
      sectionSize={4}
      sectionThickness={1}
      sectionColor="#6666aa"
      fadeDistance={200}
      fadeStrength={1}
      infiniteGrid
      position={[0, -0.01, 0]}
    />
  )
}
