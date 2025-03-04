"use client"

import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

interface MapComponentProps {
  center: [number, number]
  zoom: number
  onZoomChange: (zoom: number) => void
  onCenterChange: (center: [number, number]) => void
  onClick: (coordinates: [number, number]) => void
  onMouseMove?: (coordinates: [number, number]) => void
  buildings?: any[]
  onSelectBuilding?: (building: any | null) => void
  selectedBuilding?: any | null
}

interface Building {
  id: number
  coordinates: [number, number]
  // other building properties
}

export default function MapComponent({
  center,
  zoom,
  onZoomChange,
  onCenterChange,
  onClick,
  onMouseMove,
}: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [isMapReady, setIsMapReady] = useState(false)
  const isInitializedRef = useRef(false)

  // Inicializar el mapa - solo se ejecuta una vez
  useEffect(() => {
    if (typeof window === "undefined" || isInitializedRef.current) return

    // Asegurarse de que el contenedor del mapa existe y tiene dimensiones
    if (!mapContainerRef.current) return

    console.log("Initializing map...")

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
      const map = L.map(mapContainerRef.current!, {
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
      console.log("Cleaning up map...")
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