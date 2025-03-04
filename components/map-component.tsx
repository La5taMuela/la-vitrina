"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

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

interface MapComponentProps {
  center: [number, number]
  zoom: number
  onZoomChange: (zoom: number) => void
  onCenterChange: (center: [number, number]) => void
  onClick: (coordinates: [number, number]) => void
  buildings: Building[]
  onSelectBuilding: (building: Building | null) => void
  selectedBuilding: Building | null
  onMouseMove?: (coordinates: [number, number]) => void
}

export default function MapComponent({
  center,
  zoom,
  onZoomChange,
  onCenterChange,
  onClick,
  buildings,
  onSelectBuilding,
  selectedBuilding,
  onMouseMove,
}: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<{ [key: string]: L.Marker }>({})
  const [isMapReady, setIsMapReady] = useState(false)
  const isInitializedRef = useRef(false)

  // Inicializar el mapa - solo se ejecuta una vez
  useEffect(() => {
    if (typeof window === "undefined" || isInitializedRef.current) return

    // Asegurarse de que el contenedor del mapa existe y tiene dimensiones
    if (!mapContainerRef.current) return

    // Esperar a que el DOM esté completamente cargado
    const initMap = () => {
      isInitializedRef.current = true

      // Corregir el problema de los iconos de Leaflet en Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
      })

      // Crear el mapa
      const map = L.map(mapContainerRef.current, {
        center: center,
        zoom: zoom,
        zoomControl: false, // Desactivamos los controles de zoom predeterminados
      })

      // Añadir la capa de OpenStreetMap
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map)

      // Configurar eventos
      const handleZoom = () => {
        onZoomChange(map.getZoom())
      }

      const handleMoveEnd = () => {
        const mapCenter = map.getCenter()
        onCenterChange([mapCenter.lat, mapCenter.lng])
      }

      const handleClick = (e: L.LeafletMouseEvent) => {
        onClick([e.latlng.lat, e.latlng.lng])
      }

      const handleMouseMove = (e: L.LeafletMouseEvent) => {
        if (onMouseMove) {
          onMouseMove([e.latlng.lat, e.latlng.lng])
        }
      }

      map.on("zoom", handleZoom)
      map.on("moveend", handleMoveEnd)
      map.on("click", handleClick)

      // Usar un enfoque más seguro para el evento mousemove
      // Solo activar cuando el mouse está sobre el mapa
      mapContainerRef.current.addEventListener("mouseover", () => {
        map.on("mousemove", handleMouseMove)
      })

      mapContainerRef.current.addEventListener("mouseout", () => {
        map.off("mousemove", handleMouseMove)
      })

      mapRef.current = map
      setIsMapReady(true)

      // Invalidar el tamaño del mapa para asegurarse de que se renderiza correctamente
      setTimeout(() => {
        map.invalidateSize()
      }, 100)
    }

    // Inicializar el mapa después de un pequeño retraso para asegurar que el DOM está listo
    setTimeout(initMap, 100)

    // Limpiar el mapa al desmontar el componente
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      isInitializedRef.current = false
    }
  }, [onZoomChange, onCenterChange, onMouseMove])

  // Actualizar el centro y zoom del mapa cuando cambien las props
  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady) return

    try {
      // Solo actualizamos la vista si ha cambiado significativamente
      const currentCenter = map.getCenter()
      const currentZoom = map.getZoom()

      const centerChanged =
        Math.abs(currentCenter.lat - center[0]) > 0.0001 || Math.abs(currentCenter.lng - center[1]) > 0.0001

      const zoomChanged = currentZoom !== zoom

      if (centerChanged || zoomChanged) {
        map.setView(center, zoom, { animate: true })
      }

      // Invalidar el tamaño del mapa para asegurarse de que se renderiza correctamente
      map.invalidateSize()
    } catch (error) {
      console.error("Error al actualizar la vista del mapa:", error)
    }
  }, [center, zoom, isMapReady])

  // Función para crear un icono de edificio
  const createBuildingIcon = useCallback((building: Building, isSelected: boolean) => {
    const iconSize = isSelected ? 30 : 25

    return L.divIcon({
      className: "custom-div-icon",
      html: `<div style="
        width: ${iconSize}px; 
        height: ${iconSize}px; 
        background-color: ${building.color}; 
        border: ${isSelected ? "3px solid #3b82f6" : "1px solid #000"};
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 12px;
      ">B</div>`,
      iconSize: [iconSize, iconSize],
      iconAnchor: [iconSize / 2, iconSize / 2],
    })
  }, [])

  // Actualizar los marcadores de los edificios
  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady) return

    try {
      // Eliminar marcadores que ya no existen
      Object.keys(markersRef.current).forEach((id) => {
        if (!buildings.find((b) => b.id === id)) {
          markersRef.current[id].remove()
          delete markersRef.current[id]
        }
      })

      // Añadir o actualizar marcadores
      buildings.forEach((building) => {
        if (building.coordinates) {
          console.log(`Procesando edificio ${building.id} en coordenadas:`, building.coordinates)

          const isSelected = selectedBuilding?.id === building.id
          const buildingIcon = createBuildingIcon(building, isSelected)

          if (markersRef.current[building.id]) {
            // Actualizar marcador existente
            markersRef.current[building.id].setLatLng(building.coordinates)
            markersRef.current[building.id].setIcon(buildingIcon)
            console.log(`Marcador actualizado para edificio ${building.id}`)
          } else {
            // Crear nuevo marcador
            try {
              const marker = L.marker(building.coordinates, {
                icon: buildingIcon,
              }).addTo(map)

              // Añadir evento de clic
              marker.on("click", () => {
                onSelectBuilding(building)
              })

              markersRef.current[building.id] = marker
              console.log(`Nuevo marcador creado para edificio ${building.id}`)
            } catch (error) {
              console.error(`Error al crear marcador para edificio ${building.id}:`, error)
            }
          }
        } else {
          console.warn(`Edificio ${building.id} no tiene coordenadas definidas`)
        }
      })
    } catch (error) {
      console.error("Error al actualizar marcadores:", error)
    }
  }, [buildings, selectedBuilding, isMapReady, onSelectBuilding, createBuildingIcon])

  // Invalidar el tamaño del mapa cuando cambie el tamaño de la ventana
  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current && isMapReady) {
        mapRef.current.invalidateSize()
      }
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [isMapReady])

  return <div id="map" ref={mapContainerRef} style={{ width: "100%", height: "100%" }}></div>
}

