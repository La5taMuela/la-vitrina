"use client"

import { useState, useRef } from "react"
import dynamic from "next/dynamic"
import { Canvas } from "@react-three/fiber"
import { Environment, OrbitControls } from "@react-three/drei"
import { Download, Layers, MapIcon } from "lucide-react"
import "../app/globals.css"

// Tipos para los edificios
export type Building = {
  id: string
  name: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  height: number
  color: string
  coordinates: [number, number] // Coordenadas geográficas [lat, lng]
  type?: string // Tipo de edificio (residencial, comercial, etc.)
  year?: number // Año de construcción
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

export default function MapViewChile() {
  // Coordenadas de Santiago, Chile como punto de inicio
  const [center, setCenter] = useState<[number, number]>([-33.4489, -70.6693])
  const [zoom, setZoom] = useState(13)
  const [buildings, setBuildings] = useState<Building[]>([])
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null)
  const [mode, setMode] = useState<"map" | "3d">("map")
  const [loading, setLoading] = useState(false)
  const [mouseCoordinates, setMouseCoordinates] = useState<[number, number] | null>(null)
  const [selectedCity, setSelectedCity] = useState<string>("santiago")
  const mapRef = useRef(null)

  // Función para cargar edificios desde OpenStreetMap
  const loadBuildingsFromOSM = async (bounds: [number, number, number, number]) => {
    setLoading(true)
    try {
      // Consulta Overpass API para obtener edificios en el área
      const query = `
        [out:json];
        (
          way["building"](${bounds[0]},${bounds[1]},${bounds[2]},${bounds[3]});
          relation["building"](${bounds[0]},${bounds[1]},${bounds[2]},${bounds[3]});
        );
        out body;
        >;
        out skel qt;
      `

      console.log("Consultando Overpass API con bounds:", bounds)

      // Usar un proxy CORS si es necesario en desarrollo
      const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`)
      const data = await response.json()

      console.log("Datos recibidos de OSM:", data)

      // Procesar los datos para extraer edificios
      const newBuildings: Building[] = []

      // Procesar ways (la mayoría de los edificios son ways en OSM)
      if (data.elements) {
        // Crear un mapa de nodos para buscar coordenadas
        const nodes: Record<string, [number, number]> = {}
        data.elements.forEach((element: any) => {
          if (element.type === "node") {
            nodes[element.id] = [element.lat, element.lon]
          }
        })

        // Procesar ways que son edificios
        data.elements.forEach((element: any) => {
          if (element.type === "way" && element.tags && element.tags.building) {
            // Calcular el centro del edificio
            let lat = 0,
              lon = 0
            const validNodes = element.nodes.filter((nodeId: number) => nodes[nodeId])

            if (validNodes.length > 0) {
              validNodes.forEach((nodeId: number) => {
                lat += nodes[nodeId][0]
                lon += nodes[nodeId][1]
              })

              lat /= validNodes.length
              lon /= validNodes.length

              // Determinar la altura (si está disponible)
              let height = 10 // Altura predeterminada en metros
              if (element.tags.height) {
                height = Number.parseFloat(element.tags.height)
              } else if (element.tags.building_levels) {
                height = Number.parseFloat(element.tags.building_levels) * 3 // ~3m por nivel
              }

              // Determinar el tipo de edificio
              let type = element.tags.building
              if (type === "yes") {
                type = element.tags.building_use || "unknown"
              }

              // Generar un color basado en el tipo de edificio
              let color
              switch (type) {
                case "residential":
                case "apartments":
                  color = "#4682B4" // Azul acero
                  break
                case "commercial":
                case "retail":
                  color = "#CD5C5C" // Rojo indio
                  break
                case "industrial":
                  color = "#708090" // Gris pizarra
                  break
                case "office":
                  color = "#4169E1" // Azul real
                  break
                case "public":
                case "civic":
                  color = "#9370DB" // Púrpura medio
                  break
                default:
                  // Color aleatorio pero consistente basado en el ID
                  const hash = element.id
                    .toString()
                    .split("")
                    .reduce((a: number, b: string) => {
                      return a + b.charCodeAt(0)
                    }, 0)
                  color = `hsl(${hash % 360}, 70%, 60%)`
              }

              // Crear el edificio
              newBuildings.push({
                id: `osm-${element.id}`,
                name: element.tags.name || `Edificio ${element.id}`,
                position: [0, 0, 0], // Posición en el mundo 3D
                rotation: [0, 0, 0],
                scale: [1, 1, 1],
                height,
                color,
                coordinates: [lat, lon],
                type: type,
                year: element.tags.start_date ? Number.parseInt(element.tags.start_date) : undefined,
              })
            }
          }
        })
      }

      console.log(`Se encontraron ${newBuildings.length} edificios`)
      setBuildings(newBuildings)
    } catch (error) {
      console.error("Error al cargar edificios desde OSM:", error)
      alert("Error al cargar edificios. Intente nuevamente más tarde.")
    } finally {
      setLoading(false)
    }
  }

  // Función para cargar edificios para una ciudad específica
  const loadCityBuildings = (city: string) => {
    setSelectedCity(city)

    // Coordenadas y límites para diferentes ciudades chilenas
    const cityData: Record<string, { center: [number, number]; bounds: [number, number, number, number] }> = {
      santiago: {
        center: [-33.4489, -70.6693],
        bounds: [-33.47, -70.68, -33.42, -70.63], // [sur, oeste, norte, este]
      },
      valparaiso: {
        center: [-33.0472, -71.6127],
        bounds: [-33.06, -71.64, -33.03, -71.59],
      },
      concepcion: {
        center: [-36.8201, -73.044],
        bounds: [-36.84, -73.06, -36.8, -73.02],
      },
      antofagasta: {
        center: [-23.6509, -70.3975],
        bounds: [-23.67, -70.42, -23.63, -70.37],
      },
      laserena: {
        center: [-29.9027, -71.2525],
        bounds: [-29.92, -71.27, -29.88, -71.23],
      },
    }

    if (cityData[city]) {
      setCenter(cityData[city].center)
      setZoom(14)
      loadBuildingsFromOSM(cityData[city].bounds)
    }
  }

  // Función para manejar el movimiento del ratón sobre el mapa
  const handleMouseMove = (coordinates: [number, number]) => {
    setMouseCoordinates(coordinates)
  }

  // Función para exportar los datos de edificios
  const exportBuildings = () => {
    const dataStr = JSON.stringify(buildings, null, 2)
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)

    const exportFileDefaultName = `edificios-${selectedCity}-${new Date().toISOString().slice(0, 10)}.json`

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()
  }

  return (
    <div className="app-container">
      {/* Barra lateral izquierda */}
      <div className="sidebar">
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1.5rem" }}>Mapa 3D de Chile</h1>

        <div style={{ marginBottom: "1.5rem" }}>
          <h2 className="section-title">Ciudades</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <button
              className={`btn ${selectedCity === "santiago" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => loadCityBuildings("santiago")}
            >
              Santiago
            </button>
          </div>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <h2 className="section-title">Estadísticas</h2>
          <div style={{ fontSize: "0.875rem" }}>
            <p>Edificios cargados: {buildings.length}</p>
            <p>Ciudad actual: {selectedCity.charAt(0).toUpperCase() + selectedCity.slice(1)}</p>
            {loading && <p>Cargando datos...</p>}
          </div>
        </div>

        <div style={{ marginTop: "auto" }}>
          <button
            className="btn btn-primary w-full"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
            onClick={exportBuildings}
            disabled={buildings.length === 0}
          >
            <Download size={18} />
            <span>Exportar datos</span>
          </button>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="main-content">
        {/* Selector de modo */}
        <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem" }}>
          <button
            className={`btn ${mode === "map" ? "btn-primary" : "btn-secondary"}`}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            onClick={() => setMode("map")}
          >
            <MapIcon size={18} />
            <span>Mapa 2D</span>
          </button>
          <button
            className={`btn ${mode === "3d" ? "btn-primary" : "btn-secondary"}`}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            onClick={() => setMode("3d")}
          >
            <Layers size={18} />
            <span>Vista 3D</span>
          </button>
        </div>

        {/* Contenedor del mapa o vista 3D */}
        <div className="map-container">
          {mode === "map" ? (
            <>
              <MapComponent
                center={center}
                zoom={zoom}
                onZoomChange={setZoom}
                onCenterChange={setCenter}
                onClick={() => {}}
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

              {/* Indicador de carga */}
              {loading && (
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    padding: "1rem",
                    borderRadius: "0.375rem",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                    zIndex: 1000,
                  }}
                >
                  <div className="loading-spinner"></div>
                  <p style={{ marginTop: "0.5rem" }}>Cargando edificios...</p>
                </div>
              )}
            </>
          ) : (
            <Canvas camera={{ position: [0, 200, 500], fov: 60 }}>
              <ambientLight intensity={0.5} />
              <directionalLight position={[10, 10, 5]} intensity={1} />
              <Environment preset="city" />

              {/* Renderizar edificios en 3D */}
              {buildings.map((building) => (
                <BuildingModel
                  key={building.id}
                  building={building}
                  selected={selectedBuilding?.id === building.id}
                  onClick={() => setSelectedBuilding(building)}
                />
              ))}

              {/* Plano base */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
                <planeGeometry args={[2000, 2000]} />
                <meshStandardMaterial color="#f0f0f0" />
              </mesh>

              <OrbitControls
                enableZoom={true}
                enablePan={true}
                enableRotate={true}
                minDistance={10}
                maxDistance={1000}
              />
            </Canvas>
          )}
        </div>

        {/* Panel de información del edificio seleccionado */}
        {selectedBuilding && (
          <div className="card" style={{ marginTop: "1rem", padding: "1rem" }}>
            <h3 style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>{selectedBuilding.name}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.875rem" }}>
              <div>
                <strong>Tipo:</strong> {selectedBuilding.type || "No especificado"}
              </div>
              <div>
                <strong>Altura:</strong> {selectedBuilding.height}m
              </div>
              <div>
                <strong>Año:</strong> {selectedBuilding.year || "No especificado"}
              </div>
              <div>
                <strong>Coordenadas:</strong> {selectedBuilding.coordinates[0].toFixed(6)},{" "}
                {selectedBuilding.coordinates[1].toFixed(6)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Componente para renderizar un edificio en 3D
function BuildingModel({
  building,
  selected,
  onClick,
}: {
  building: Building
  selected: boolean
  onClick: () => void
}) {
  // Convertir coordenadas geográficas a coordenadas 3D
  // Esto es una simplificación. En un sistema real, necesitarías una proyección adecuada.
  const [x, z] = convertGeoToWorld(building.coordinates)

  // Altura del edificio (escala Y)
  const height = building.height || 10

  // Tamaño base del edificio
  const width = 10
  const depth = 10

  return (
    <mesh
      position={[x, height / 2, z]}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial
        color={building.color}
        emissive={selected ? "#ffffff" : "#000000"}
        emissiveIntensity={selected ? 0.2 : 0}
      />
    </mesh>
  )
}

// Función para convertir coordenadas geográficas a coordenadas del mundo 3D
// Esta es una simplificación. En un sistema real, necesitarías una proyección adecuada.
function convertGeoToWorld(coordinates: [number, number]): [number, number] {
  // Centro de referencia (Santiago)
  const refLat = -33.4489
  const refLng = -70.6693

  // Factor de escala (metros por grado)
  const latScale = 111000 // ~111km por grado de latitud
  const lngScale = 111000 * Math.cos((refLat * Math.PI) / 180) // Ajuste por latitud

  // Convertir a coordenadas X, Z (Y es la altura en Three.js)
  const x = (coordinates[1] - refLng) * lngScale
  const z = (refLat - coordinates[0]) * latScale

  return [x, z]
}

