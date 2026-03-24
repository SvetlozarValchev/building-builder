import { useState, useEffect, useRef } from 'react'
import type { BuildingData } from '../../shared/types'

export function useBuildingSync(): BuildingData | null {
  const [building, setBuilding] = useState<BuildingData | null>(null)
  const lastJson = useRef<string>('')

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/building.json?' + Date.now())
        if (!res.ok) return
        const text = await res.text()
        if (text !== lastJson.current) {
          lastJson.current = text
          setBuilding(JSON.parse(text))
        }
      } catch {
        // file doesn't exist yet — that's fine
      }
    }

    // Poll immediately, then every 500ms
    poll()
    const interval = setInterval(poll, 500)
    return () => clearInterval(interval)
  }, [])

  return building
}
