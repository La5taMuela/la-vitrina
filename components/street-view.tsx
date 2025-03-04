"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls, PerspectiveCamera, Environment, Box } from "@react-three/drei"
import { X } from "lucide-react"

type Building = {
  id: string
  name: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  model?: string
  color: string
}

interface StreetViewProps {
  building: Building
  onExit: () => void
}

export default function StreetView({ building, onExit }: StreetViewProps) {
  return (
    <div className="absolute inset-0" style={{ backgroundColor: "#f0f0f0" }}>
      <button
        className="btn btn-secondary btn-icon absolute z-10"
        style={{ top: "1rem", right: "1rem" }}
        onClick={onExit}
      >
        <X size={24} />
      </button>

      <div
        className="absolute z-10"
        style={{
          top: "1rem",
          left: "1rem",
          backgroundColor: "white",
          padding: "0.5rem",
          borderRadius: "0.375rem",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        }}
      >
        <h3 style={{ fontWeight: 500 }}>Modo Street View: {building.name}</h3>
      </div>

      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 1.6, 5]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <Environment preset="city" />

        <BuildingModel building={building} />

        <OrbitControls
          enableZoom={true}
          enablePan={true}
          enableRotate={true}
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 1.5}
          minDistance={2}
          maxDistance={20}
        />
      </Canvas>
    </div>
  )
}

function BuildingModel({ building }: { building: Building }) {
  // Siempre usamos un modelo básico para evitar errores de carga
  return (
    <Box args={[2, 4, 2]} position={[0, 1, 0]}>
      <meshStandardMaterial color={building.color} />
    </Box>
  )
}

