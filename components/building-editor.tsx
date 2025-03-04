"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import { TransformControls, Box } from "@react-three/drei"
import type { Group } from "three"

type Building = {
  id: string
  name: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  model?: string
  color: string
}

interface BuildingEditorProps {
  building: Building
  selected: boolean
  onSelect: () => void
  onUpdate: (building: Building) => void
  editable: boolean
  mode: "translate" | "rotate" | "scale"
}

export default function BuildingEditor({
  building,
  selected,
  onSelect,
  onUpdate,
  editable,
  mode,
}: BuildingEditorProps) {
  const groupRef = useRef<Group>(null)
  const [lastUpdateTime, setLastUpdateTime] = useState(0)
  const [lastPosition, setLastPosition] = useState<[number, number, number]>(building.position)
  const [lastRotation, setLastRotation] = useState<[number, number, number]>(building.rotation)
  const [lastScale, setLastScale] = useState<[number, number, number]>(building.scale)
  const transformControlsRef = useRef<any>(null)

  // Sincronizar la posición del grupo con las propiedades del edificio
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(building.position[0], building.position[1], building.position[2])
      groupRef.current.rotation.set(building.rotation[0], building.rotation[1], building.rotation[2])
      groupRef.current.scale.set(building.scale[0], building.scale[1], building.scale[2])

      setLastPosition(building.position)
      setLastRotation(building.rotation)
      setLastScale(building.scale)
    }
  }, [building.position, building.rotation, building.scale])

  // Función para actualizar el edificio con throttling
  const updateBuildingWithThrottle = useCallback(() => {
    if (!groupRef.current) return

    const now = Date.now()
    // Limitar actualizaciones a una cada 100ms
    if (now - lastUpdateTime < 100) return

    const newPosition: [number, number, number] = [
      groupRef.current.position.x,
      groupRef.current.position.y,
      groupRef.current.position.z,
    ]

    const newRotation: [number, number, number] = [
      groupRef.current.rotation.x,
      groupRef.current.rotation.y,
      groupRef.current.rotation.z,
    ]

    const newScale: [number, number, number] = [
      groupRef.current.scale.x,
      groupRef.current.scale.y,
      groupRef.current.scale.z,
    ]

    // Verificar si hay cambios significativos
    const hasPositionChanged =
      Math.abs(newPosition[0] - lastPosition[0]) > 0.01 ||
      Math.abs(newPosition[1] - lastPosition[1]) > 0.01 ||
      Math.abs(newPosition[2] - lastPosition[2]) > 0.01

    const hasRotationChanged =
      Math.abs(newRotation[0] - lastRotation[0]) > 0.01 ||
      Math.abs(newRotation[1] - lastRotation[1]) > 0.01 ||
      Math.abs(newRotation[2] - lastRotation[2]) > 0.01

    const hasScaleChanged =
      Math.abs(newScale[0] - lastScale[0]) > 0.01 ||
      Math.abs(newScale[1] - lastScale[1]) > 0.01 ||
      Math.abs(newScale[2] - lastScale[2]) > 0.01

    if (hasPositionChanged || hasRotationChanged || hasScaleChanged) {
      onUpdate({
        ...building,
        position: newPosition,
        rotation: newRotation,
        scale: newScale,
      })

      setLastPosition(newPosition)
      setLastRotation(newRotation)
      setLastScale(newScale)
      setLastUpdateTime(now)
    }
  }, [building, lastPosition, lastRotation, lastScale, lastUpdateTime, onUpdate])

  // Manejar el evento de finalización de transformación
  const handleTransformEnd = useCallback(() => {
    if (groupRef.current) {
      const newPosition: [number, number, number] = [
        groupRef.current.position.x,
        groupRef.current.position.y,
        groupRef.current.position.z,
      ]

      const newRotation: [number, number, number] = [
        groupRef.current.rotation.x,
        groupRef.current.rotation.y,
        groupRef.current.rotation.z,
      ]

      const newScale: [number, number, number] = [
        groupRef.current.scale.x,
        groupRef.current.scale.y,
        groupRef.current.scale.z,
      ]

      onUpdate({
        ...building,
        position: newPosition,
        rotation: newRotation,
        scale: newScale,
      })

      setLastPosition(newPosition)
      setLastRotation(newRotation)
      setLastScale(newScale)
    }
  }, [building, onUpdate])

  // Solo actualizamos durante la transformación activa
  useFrame(() => {
    if (editable && groupRef.current) {
      updateBuildingWithThrottle()
    }
  })

  return (
    <group>
      {editable && groupRef.current && (
        <TransformControls
          ref={transformControlsRef}
          object={groupRef.current}
          mode={mode}
          size={1}
          onMouseUp={handleTransformEnd}
        />
      )}

      <group
        ref={groupRef}
        position={building.position}
        rotation={building.rotation}
        scale={building.scale}
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
      >
        {/* Siempre usamos un modelo básico para evitar errores de carga */}
        <Box args={[1, 2, 1]}>
          <meshStandardMaterial color={building.color} />
        </Box>
      </group>
    </group>
  )
}

