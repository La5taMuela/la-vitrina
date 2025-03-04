"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import dynamic from "next/dynamic"
import { Canvas } from "@react-three/fiber"
import { Environment, OrbitControls, Stats, Text } from "@react-three/drei"
import { Layers, MapIcon, ZoomIn, ZoomOut, Eye, EyeOff, Settings } from "lucide-react"
import * as THREE from "three"
import "../app/globals.css"

// Tipos para los edificios
type Building = {
  id: string
  name: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  height: number
  width: number
  depth: number
  color: string
  coordinates: [number, number] // Coordenadas geográficas [lat, lng]
  type?: string // Tipo de edificio (residencial, comercial, etc.)
  year?: number // Año de construcción
  distance?: number // Distancia a la cámara (para LOD)
}

// Tipo para las calles
type Street = {
  id: string
  name: string
  points: [number, number][] // Array de coordenadas [lat, lng]
  width: number
  type: "primary" | "secondary" | "tertiary" | "residential"
  color: string
}

// Tipo para los barrios
type District = {
  id: string
  name: string
  bounds: [number, number, number, number] // [sur, oeste, norte, este]
  center: [number, number]
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

// Definición de barrios de Santiago
const SANTIAGO_DISTRICTS: District[] = [
  {
    id: "santiago-centro",
    name: "Santiago Centro",
    bounds: [-33.455, -70.675, -33.425, -70.64],
    center: [-33.44, -70.65],
  },
  {
    id: "providencia",
    name: "Providencia",
    bounds: [-33.435, -70.635, -33.415, -70.605],
    center: [-33.425, -70.62],
  },
  {
    id: "las-condes",
    name: "Las Condes",
    bounds: [-33.42, -70.59, -33.38, -70.55],
    center: [-33.4, -70.57],
  },
  {
    id: "vitacura",
    name: "Vitacura",
    bounds: [-33.405, -70.6, -33.375, -70.56],
    center: [-33.39, -70.58],
  },
  {
    id: "nunoa",
    name: "Ñuñoa",
    bounds: [-33.47, -70.63, -33.44, -70.59],
    center: [-33.455, -70.61],
  },
]

export default function Santiago3DMap() {
  // Estado para el mapa y la visualización
  const [center, setCenter] = useState<[number, number]>([-33.4489, -70.6693]) // Santiago centro
  const [zoom, setZoom] = useState(15)
  const [buildings, setBuildings] = useState<Building[]>([])
  const [streets, setStreets] = useState<Street[]>([])
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null)
  const [mode, setMode] = useState<"map" | "3d">("map")
  const [loading, setLoading] = useState(false)
  const [mouseCoordinates, setMouseCoordinates] = useState<[number, number] | null>(null)
  const [selectedDistrict, setSelectedDistrict] = useState<District>(SANTIAGO_DISTRICTS[0])
  const [showStats, setShowStats] = useState(false)
  const [quality, setQuality] = useState<"low" | "medium" | "high">("medium")
  const [showStreets, setShowStreets] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
    
  const mapRef = useRef(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)


  // Configuración de calidad
  const qualitySettings = useMemo(
    () => ({
      low: {
        maxBuildings: 500,
        maxDistance: 500,
        lodLevels: 2,
      },
      medium: {
        maxBuildings: 1000,
        maxDistance: 1000,
        lodLevels: 3,
      },
      high: {
        maxBuildings: 2000,
        maxDistance: 2000,
        lodLevels: 4,
      },
    }),
    [],
  )

  // Función para cargar edificios desde OpenStreetMap
  const loadBuildingsFromOSM = useCallback(
    async (bounds: [number, number, number, number]) => {
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

                // Calcular dimensiones aproximadas del edificio
                // Esto es una simplificación, idealmente calcularíamos el área real
                const width = Math.random() * 10 + 5
                const depth = Math.random() * 10 + 5

                // Crear el edificio
                newBuildings.push({
                  id: `osm-${element.id}`,
                  name: element.tags.name || `Edificio ${element.id}`,
                  position: [0, 0, 0], // Se calculará después
                  rotation: [0, 0, 0],
                  scale: [1, 1, 1],
                  height,
                  width,
                  depth,
                  color,
                  coordinates: [lat, lon],
                  type: type,
                  year: element.tags.start_date ? Number.parseInt(element.tags.start_date) : undefined,
                })
              }
            }
          })
        }

        // Limitar el número de edificios según la configuración de calidad
        const limitedBuildings = newBuildings.slice(0, qualitySettings[quality].maxBuildings)
        console.log(`Se encontraron ${newBuildings.length} edificios, mostrando ${limitedBuildings.length}`)
        setBuildings(limitedBuildings)

        // Cargar calles
        loadStreetsFromOSM(bounds)
      } catch (error) {
        console.error("Error al cargar edificios desde OSM:", error)
        alert("Error al cargar edificios. Intente nuevamente más tarde.")
      } finally {
        setLoading(false)
      }
    },
    [quality, qualitySettings],
  )

  // Función para cargar calles desde OpenStreetMap
  const loadStreetsFromOSM = async (bounds: [number, number, number, number]) => {
    try {
      // Consulta Overpass API para obtener calles en el área
      const query = `
        [out:json];
        (
          way["highway"="primary"](${bounds[0]},${bounds[1]},${bounds[2]},${bounds[3]});
          way["highway"="secondary"](${bounds[0]},${bounds[1]},${bounds[2]},${bounds[3]});
          way["highway"="tertiary"](${bounds[0]},${bounds[1]},${bounds[2]},${bounds[3]});
          way["highway"="residential"](${bounds[0]},${bounds[1]},${bounds[2]},${bounds[3]});
        );
        out body;
        >;
        out skel qt;
      `

      // Usar un proxy CORS si es necesario en desarrollo
      const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`)
      const data = await response.json()

      // Procesar los datos para extraer calles
      const newStreets: Street[] = []

      if (data.elements) {
        // Crear un mapa de nodos para buscar coordenadas
        const nodes: Record<string, [number, number]> = {}
        data.elements.forEach((element: any) => {
          if (element.type === "node") {
            nodes[element.id] = [element.lat, element.lon]
          }
        })

        // Procesar ways que son calles
        data.elements.forEach((element: any) => {
          if (element.type === "way" && element.tags && element.tags.highway) {
            const points: [number, number][] = []

            // Recopilar todos los puntos de la calle
            element.nodes.forEach((nodeId: number) => {
              if (nodes[nodeId]) {
                points.push(nodes[nodeId])
              }
            })

            if (points.length > 1) {
              // Determinar el tipo de calle y su ancho
              let type: "primary" | "secondary" | "tertiary" | "residential" = "residential"
              let width = 5
              let color = "#A9A9A9" // Gris oscuro

              switch (element.tags.highway) {
                case "primary":
                  type = "primary"
                  width = 12
                  color = "#FFA500" // Naranja
                  break
                case "secondary":
                  type = "secondary"
                  width = 10
                  color = "#FFFF00" // Amarillo
                  break
                case "tertiary":
                  type = "tertiary"
                  width = 8
                  color = "#FFFFFF" // Blanco
                  break
                case "residential":
                  type = "residential"
                  width = 6
                  color = "#D3D3D3" // Gris claro
                  break
              }

              // Crear la calle
              newStreets.push({
                id: `street-${element.id}`,
                name: element.tags.name || "",
                points,
                width,
                type,
                color,
              })
            }
          }
        })
      }

      console.log(`Se encontraron ${newStreets.length} calles`)
      setStreets(newStreets)
    } catch (error) {
      console.error("Error al cargar calles desde OSM:", error)
    }
  }

  // Función para cargar datos de un barrio específico
  const loadDistrictData = (district: District) => {
    setSelectedDistrict(district)
    setCenter(district.center)
    setZoom(15)
    loadBuildingsFromOSM(district.bounds)
  }

  // Función para manejar el movimiento del ratón sobre el mapa
  const handleMouseMove = (coordinates: [number, number]) => {
    setMouseCoordinates(coordinates)
  }

  // Función para cambiar la calidad visual
  const handleQualityChange = (newQuality: "low" | "medium" | "high") => {
    setQuality(newQuality)
    // Recargar los datos con la nueva configuración de calidad
    loadBuildingsFromOSM(selectedDistrict.bounds)
  }

  // Cargar datos iniciales
  useEffect(() => {
    loadDistrictData(SANTIAGO_DISTRICTS[0])
  }, [])

  // Actualizar distancias de edificios para LOD cuando la cámara se mueve en modo 3D
  const updateBuildingDistances = useCallback(() => {
    if (mode !== "3d" || !cameraRef.current) return

    const cameraPosition = cameraRef.current.position

    setBuildings((prevBuildings) =>
      prevBuildings.map((building) => {
        const [x, z] = convertGeoToWorld(building.coordinates)
        const distance = Math.sqrt(Math.pow(cameraPosition.x - x, 2) + Math.pow(cameraPosition.z - z, 2))
        return { ...building, distance }
      }),
    )
  }, [mode])

  return (
    <div className="app-container">
      {/* Barra lateral izquierda */}
      <div className="sidebar">
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1.5rem" }}>Mapa 3D de Santiago</h1>

        <div style={{ marginBottom: "1.5rem" }}>
          <h2 className="section-title">Barrios</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {SANTIAGO_DISTRICTS.map((district) => (
              <button
                key={district.id}
                className={`btn ${selectedDistrict.id === district.id ? "btn-primary" : "btn-secondary"}`}
                onClick={() => loadDistrictData(district)}
              >
                {district.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <h2 className="section-title">Estadísticas</h2>
          <div style={{ fontSize: "0.875rem" }}>
            <p>Edificios cargados: {buildings.length}</p>
            <p>Calles cargadas: {streets.length}</p>
            <p>Barrio actual: {selectedDistrict.name}</p>
            {loading && <p>Cargando datos...</p>}
          </div>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <h2 className="section-title">Configuración</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div>
              <label style={{ fontSize: "0.875rem", display: "block", marginBottom: "0.25rem" }}>Calidad visual:</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  className={`btn ${quality === "low" ? "btn-primary" : "btn-secondary"}`}
                  style={{ flex: 1, padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                  onClick={() => handleQualityChange("low")}
                >
                  Baja
                </button>
                <button
                  className={`btn ${quality === "medium" ? "btn-primary" : "btn-secondary"}`}
                  style={{ flex: 1, padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                  onClick={() => handleQualityChange("medium")}
                >
                  Media
                </button>
                <button
                  className={`btn ${quality === "high" ? "btn-primary" : "btn-secondary"}`}
                  style={{ flex: 1, padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                  onClick={() => handleQualityChange("high")}
                >
                  Alta
                </button>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="checkbox"
                id="show-streets"
                checked={showStreets}
                onChange={() => setShowStreets(!showStreets)}
              />
              <label htmlFor="show-streets" style={{ fontSize: "0.875rem" }}>
                Mostrar calles
              </label>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input type="checkbox" id="show-stats" checked={showStats} onChange={() => setShowStats(!showStats)} />
              <label htmlFor="show-stats" style={{ fontSize: "0.875rem" }}>
                Mostrar estadísticas de rendimiento
              </label>
            </div>
          </div>
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

          <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
            <button
              className="btn btn-secondary"
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              onClick={() => setShowStreets(!showStreets)}
              title={showStreets ? "Ocultar calles" : "Mostrar calles"}
            >
              {showStreets ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>

            <button
              className="btn btn-secondary"
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              onClick={() => setShowSettings(!showSettings)}
              title="Configuración"
            >
              <Settings size={18} />
            </button>
          </div>
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

              {/* Controles de zoom */}
              <div
                style={{
                  position: "absolute",
                  top: "1rem",
                  right: "1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  zIndex: 1000,
                }}
              >
                <button
                  className="btn btn-secondary"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0.5rem" }}
                  onClick={() => setZoom((prev) => Math.min(prev + 1, 19))}
                >
                  <ZoomIn size={18} />
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0.5rem" }}
                  onClick={() => setZoom((prev) => Math.max(prev - 1, 10))}
                >
                  <ZoomOut size={18} />
                </button>
              </div>

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
                  <p style={{ marginTop: "0.5rem" }}>Cargando datos de {selectedDistrict.name}...</p>
                </div>
              )}
            </>
          ) : (
            <Canvas
            camera={{ position: [0, 200, 500], fov: 60 }}
            onCreated={({ camera }) => {
              // Asegurarnos de que la cámara es del tipo correcto
              if (camera instanceof THREE.PerspectiveCamera) {
                // Usar MutableRefObject nos permite asignar a .current
                cameraRef.current = camera
              }
            }}
            >
              {showStats && <Stats />}

              <ambientLight intensity={0.5} />
              <directionalLight position={[10, 10, 5]} intensity={1} />
              <Environment preset="city" />

              {/* Renderizar edificios en 3D con LOD */}
              <BuildingsGroup
                buildings={buildings}
                selectedBuilding={selectedBuilding}
                onSelectBuilding={setSelectedBuilding}
                quality={quality}
                qualitySettings={qualitySettings[quality]}
              />

              {/* Renderizar calles en 3D */}
              {showStreets && <StreetsGroup streets={streets} quality={quality} />}

              {/* Plano base */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
                <planeGeometry args={[2000, 2000]} />
                <meshStandardMaterial color="#f0f0f0" />
              </mesh>

              {/* Etiquetas de calles principales */}
              {showStreets && quality !== "low" && (
                <StreetLabels streets={streets.filter((s) => s.type === "primary" || s.type === "secondary")} />
              )}

              <OrbitControls
                enableZoom={true}
                enablePan={true}
                enableRotate={true}
                minDistance={10}
                maxDistance={1000}
                onChange={updateBuildingDistances}
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

// Componente para agrupar edificios y optimizar el rendimiento
function BuildingsGroup({
  buildings,
  selectedBuilding,
  onSelectBuilding,
  quality,
  qualitySettings,
}: {
  buildings: Building[]
  selectedBuilding: Building | null
  onSelectBuilding: (building: Building) => void
  quality: "low" | "medium" | "high"
  qualitySettings: { maxBuildings: number; maxDistance: number; lodLevels: number }
}) {
  // Agrupar edificios por tipo para instancing
  const buildingsByType = useMemo(() => {
    const groups: Record<string, Building[]> = {}

    buildings.forEach((building) => {
      const type = building.type || "unknown"
      if (!groups[type]) {
        groups[type] = []
      }
      groups[type].push(building)
    })

    return groups
  }, [buildings])

  return (
    <group>
      {Object.entries(buildingsByType).map(([type, buildingsOfType]) => (
        <group key={type}>
          {buildingsOfType.map((building) => {
            // Aplicar LOD basado en la distancia
            const distance = building.distance || 0
            let detail = "high"

            if (distance > qualitySettings.maxDistance * 0.3) {
              detail = "medium"
            }
            if (distance > qualitySettings.maxDistance * 0.6) {
              detail = "low"
            }

            // No renderizar edificios muy lejanos
            if (distance > qualitySettings.maxDistance) {
              return null
            }

            return (
              <BuildingModel
                key={building.id}
                building={building}
                selected={selectedBuilding?.id === building.id}
                onClick={() => onSelectBuilding(building)}
                detail={detail as "high" | "medium" | "low"}
              />
            )
          })}
        </group>
      ))}
    </group>
  )
}

// Componente para renderizar un edificio en 3D con diferentes niveles de detalle
function BuildingModel({
  building,
  selected,
  onClick,
  detail = "high",
}: {
  building: Building
  selected: boolean
  onClick: () => void
  detail?: "high" | "medium" | "low"
}) {
  // Convertir coordenadas geográficas a coordenadas 3D
  const [x, z] = convertGeoToWorld(building.coordinates)

  // Altura del edificio
  const height = building.height || 10

  // Tamaño base del edificio
  const width = building.width || 10
  const depth = building.depth || 10

  // Ajustar la geometría según el nivel de detalle
  const segments = detail === "high" ? 4 : detail === "medium" ? 2 : 1

  return (
    <mesh
      position={[x, height / 2, z]}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <boxGeometry args={[width, height, depth, segments, segments, segments]} />
      <meshStandardMaterial
        color={building.color}
        emissive={selected ? "#ffffff" : "#000000"}
        emissiveIntensity={selected ? 0.2 : 0}
        roughness={detail === "high" ? 0.7 : 0.9}
        metalness={detail === "high" ? 0.2 : 0}
      />
    </mesh>
  )
}

// Componente para renderizar calles en 3D
function StreetsGroup({
  streets,
  quality,
}: {
  streets: Street[]
  quality: "low" | "medium" | "high"
}) {
  // Filtrar calles según la calidad
  const filteredStreets = useMemo(() => {
    if (quality === "low") {
      // Solo calles principales y secundarias
      return streets.filter((street) => street.type === "primary" || street.type === "secondary")
    } else if (quality === "medium") {
      // Excluir algunas calles residenciales
      return streets.filter((street) => street.type !== "residential" || Math.random() > 0.5)
    } else {
      // Todas las calles
      return streets
    }
  }, [streets, quality])

  return (
    <group position={[0, 0.1, 0]}>
      {filteredStreets.map((street) => (
        <StreetModel key={street.id} street={street} />
      ))}
    </group>
  )
}

// Componente para renderizar una calle en 3D
function StreetModel({ street }: { street: Street }) {
  const points = useMemo(() => {
    return street.points.map((point) => {
      const [x, z] = convertGeoToWorld(point)
      return new THREE.Vector3(x, 0, z)
    })
  }, [street.points])

  // Crear una curva a partir de los puntos
  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3(points)
  }, [points])

  // Parámetros de la geometría según el tipo de calle
  const tubularSegments = street.type === "primary" ? 64 : street.type === "secondary" ? 32 : 16
  const radius = street.width / 2
  const radialSegments = street.type === "primary" ? 8 : street.type === "secondary" ? 6 : 4

  return (
    <mesh>
      <tubeGeometry args={[curve, tubularSegments, radius, radialSegments, false]} />
      <meshStandardMaterial color={street.color} roughness={0.8} />
    </mesh>
  )
}

// Componente para mostrar etiquetas de calles
function StreetLabels({ streets }: { streets: Street[] }) {
  return (
    <group>
      {streets
        .filter((street) => street.name)
        .map((street) => {
          // Usar el punto medio de la calle para la etiqueta
          const midIndex = Math.floor(street.points.length / 2)
          const point = street.points[midIndex]
          const [x, z] = convertGeoToWorld(point)

          return (
            <Text
              key={street.id}
              position={[x, 10, z]}
              rotation={[0, 0, 0]}
              fontSize={10}
              color="black"
              anchorX="center"
              anchorY="middle"
              maxWidth={200}
              outlineWidth={0.5}
              outlineColor="white"
            >
              {street.name}
            </Text>
          )
        })}
    </group>
  )
}

// Función para convertir coordenadas geográficas a coordenadas del mundo 3D
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

