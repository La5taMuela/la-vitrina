"use client"

import { useState, useRef, useEffect } from "react"
import dynamic from "next/dynamic"
import { Canvas } from "@react-three/fiber"
import { Environment, OrbitControls } from "@react-three/drei"
import BuildingEditor from "./building-editor"
import MapControls from "./map-controls"
import StreetView from "./street-view"
import LeftSidebar from "./left-sidebar"
import RightSidebar from "./right-sidebar"
import "../app/globals.css"

// Tipos para los edificios
type Building = {
  id: string
  name: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  model?: string
  color: string
  coordinates?: [number, number] // Coordenadas geográficas [lat, lng]
}

// Importar dinámicamente el componente de mapa para evitar errores de SSR
const MapComponent = dynamic(() => import("./map-component"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#f0f0f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      Cargando mapa...
    </div>
  ),
})

export default function MapView() {
  // Coordenadas de Santiago, Chile
  const [center, setCenter] = useState<[number, number]>([-33.4489, -70.6693])
  const [zoom, setZoom] = useState(13)
  const [buildings, setBuildings] = useState<Building[]>([])
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null)
  const [mode, setMode] = useState<"map" | "street">("map")
  const [showEditor, setShowEditor] = useState(false)
  const [editorMode, setEditorMode] = useState<"translate" | "rotate" | "scale">("translate") // Estado para el modo del editor
  const [mouseCoordinates, setMouseCoordinates] = useState<[number, number] | null>(null)
  const [isCreatingBuilding, setIsCreatingBuilding] = useState(false)
  const mapRef = useRef(null)

  // Función para añadir un nuevo edificio
  const addBuilding = (building: Building) => {
    console.log("Añadiendo edificio:", building)
    setBuildings((prevBuildings) => [...prevBuildings, building])
  }

  // Función para actualizar un edificio existente
  const updateBuilding = (updatedBuilding: Building) => {
    setBuildings((prevBuildings) => prevBuildings.map((b) => (b.id === updatedBuilding.id ? updatedBuilding : b)))
  }

  // Función para eliminar un edificio
  const deleteBuilding = (id: string) => {
    setBuildings((prevBuildings) => prevBuildings.filter((b) => b.id !== id))
    if (selectedBuilding?.id === id) {
      setSelectedBuilding(null)
      setShowEditor(false)
    }
  }

  // Función para importar un modelo 3D
  const importModel = (file: File) => {
    if (!mouseCoordinates) {
      alert("Por favor, mueve el cursor sobre el mapa para seleccionar una ubicación")
      return
    }

    // En una implementación real, aquí subiríamos el archivo a un servidor
    // y obtendríamos una URL para el modelo
    const newBuilding: Building = {
      id: `building-${Date.now()}`,
      name: file.name.split(".")[0],
      position: [0, 0, 0], // Posición en el mundo 3D
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: "#" + Math.floor(Math.random() * 16777215).toString(16),
      coordinates: mouseCoordinates, // Coordenadas geográficas
    }

    console.log("Importando modelo:", newBuilding)
    addBuilding(newBuilding)
    setSelectedBuilding(newBuilding)
    setShowEditor(true)
  }

  // Función para manejar clics en el mapa
  const handleMapClick = (coordinates: [number, number]) => {
    console.log("Clic en el mapa en:", coordinates)

    if (isCreatingBuilding) {
      // Crear un nuevo edificio en la posición del clic
      const newBuilding: Building = {
        id: `building-${Date.now()}`,
        name: `Edificio ${buildings.length + 1}`,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        color: "#" + Math.floor(Math.random() * 16777215).toString(16),
        coordinates: coordinates,
      }

      console.log("Creando nuevo edificio:", newBuilding)
      addBuilding(newBuilding)
      setSelectedBuilding(newBuilding)
      setIsCreatingBuilding(false) // Desactivar el modo de creación después de crear un edificio
    }
  }

  // Función para manejar el movimiento del ratón sobre el mapa
  const handleMouseMove = (coordinates: [number, number]) => {
    setMouseCoordinates(coordinates)
  }

  // Función para iniciar la creación de un edificio
  const handleCreateBuilding = () => {
    setIsCreatingBuilding(true)
    setShowEditor(true)
    alert("Haz clic en el mapa para colocar el nuevo edificio")
  }

  // Efecto para registrar los edificios en la consola cuando cambian
  useEffect(() => {
    console.log("Lista de edificios actualizada:", buildings)
  }, [buildings])

  return (
    <div className="app-container">
      {/* Barra lateral izquierda */}
      <LeftSidebar
        onCreateBuilding={handleCreateBuilding}
        onImportModel={importModel}
        buildings={buildings}
        selectedBuilding={selectedBuilding}
        onSelectBuilding={setSelectedBuilding}
      />

      {/* Contenido principal */}
      <div className="main-content">
        {/* Contenedor del mapa */}
        <div className="map-container">
          {mode === "map" ? (
            <>
              <MapComponent
                center={center}
                zoom={zoom}
                onZoomChange={setZoom}
                onCenterChange={setCenter}
                onClick={handleMapClick}
                buildings={buildings}
                onSelectBuilding={setSelectedBuilding}
                selectedBuilding={selectedBuilding}
                onMouseMove={handleMouseMove}
              />

              {/* Mostrar coordenadas del cursor */}
              {mouseCoordinates && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "1rem",
                    right: "1rem",
                    backgroundColor: "white",
                    padding: "0.5rem",
                    borderRadius: "0.375rem",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                    fontSize: "0.875rem",
                    zIndex: 1000,
                  }}
                >
                  Lat: {mouseCoordinates[0].toFixed(6)}, Lng: {mouseCoordinates[1].toFixed(6)}
                </div>
              )}

              {/* Indicador de modo de creación */}
              {isCreatingBuilding && (
                <div
                  style={{
                    position: "absolute",
                    top: "1rem",
                    left: "50%",
                    transform: "translateX(-50%)",
                    backgroundColor: "#3b82f6",
                    color: "white",
                    padding: "0.5rem 1rem",
                    borderRadius: "0.375rem",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                    fontSize: "0.875rem",
                    zIndex: 1000,
                  }}
                >
                  Haz clic en el mapa para colocar el edificio
                </div>
              )}
            </>
          ) : (
            selectedBuilding && <StreetView building={selectedBuilding} onExit={() => setMode("map")} />
          )}

          {/* Controles del mapa */}
          <MapControls
            onZoomIn={() => setZoom((prev) => Math.min(prev + 1, 19))}
            onZoomOut={() => setZoom((prev) => Math.max(prev - 1, 1))}
          />

          {/* Botón para cambiar a vista de calle */}
          <button
            className="btn btn-secondary absolute"
            style={{ bottom: "1rem", left: "1rem" }}
            onClick={() => {
              if (selectedBuilding) {
                setMode(mode === "map" ? "street" : "map")
              } else {
                alert("Selecciona un edificio primero")
              }
            }}
          >
            {mode === "map" ? "Modo street view" : "Volver al mapa"}
          </button>
        </div>

        {/* Editor 3D (cuando está activo) */}
        {showEditor && selectedBuilding && mode === "map" && (
          <div
            style={{
              height: "300px",
              position: "relative",
              borderRadius: "8px",
              overflow: "hidden",
              border: "1px solid var(--border-color)",
            }}
          >
            <div
              style={{
                position: "absolute",
                bottom: "1rem",
                right: "1rem",
                display: "flex",
                gap: "0.5rem",
                zIndex: 100,
              }}
            >
              <button
                className="btn"
                style={{
                  backgroundColor: editorMode === "translate" ? "#3b82f6" : "white",
                  color: editorMode === "translate" ? "white" : "black",
                  padding: "0.5rem",
                  borderRadius: "0.375rem",
                }}
                onClick={() => setEditorMode("translate")}
              >
                Mover
              </button>
              <button
                className="btn"
                style={{
                  backgroundColor: editorMode === "rotate" ? "#3b82f6" : "white",
                  color: editorMode === "rotate" ? "white" : "black",
                  padding: "0.5rem",
                  borderRadius: "0.375rem",
                }}
                onClick={() => setEditorMode("rotate")}
              >
                Rotar
              </button>
              <button
                className="btn"
                style={{
                  backgroundColor: editorMode === "scale" ? "#3b82f6" : "white",
                  color: editorMode === "scale" ? "white" : "black",
                  padding: "0.5rem",
                  borderRadius: "0.375rem",
                }}
                onClick={() => setEditorMode("scale")}
              >
                Escalar
              </button>
            </div>

            <Canvas>
              <ambientLight intensity={0.5} />
              <directionalLight position={[10, 10, 5]} intensity={1} />
              <Environment preset="city" />

              <BuildingEditor
                building={selectedBuilding}
                selected={true}
                onSelect={() => {}}
                onUpdate={updateBuilding}
                editable={true}
                mode={editorMode}
              />

              <OrbitControls enabled={true} />
            </Canvas>
          </div>
        )}
      </div>

      {/* Barra lateral derecha (información del edificio) */}
      <RightSidebar
        selectedBuilding={selectedBuilding}
        onClose={() => setSelectedBuilding(null)}
        onEdit={() => setShowEditor(true)}
        onDelete={deleteBuilding}
      />
    </div>
  )
}

