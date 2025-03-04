"use client"

import type React from "react"

import { useState } from "react"
import { PlusCircle, Upload, Menu, X } from "lucide-react"

interface SidebarProps {
  onCreateBuilding: () => void
  onImportModel: (file: File) => void
}

export default function Sidebar({ onCreateBuilding, onImportModel }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Verificar que sea un archivo GLB o GLTF
      if (file.name.endsWith(".glb") || file.name.endsWith(".gltf")) {
        onImportModel(file)
      } else {
        alert("Por favor, sube un archivo 3D en formato GLB o GLTF")
      }
    }
  }

  return (
    <>
      {/* Botón para abrir/cerrar el menú */}
      <button
        className="btn btn-secondary absolute z-10"
        style={{ top: "1rem", left: "1rem" }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Panel lateral */}
      <div
        className="absolute z-10"
        style={{
          top: 0,
          left: 0,
          height: "100%",
          width: isOpen ? "250px" : "0",
          backgroundColor: "white",
          boxShadow: "2px 0 5px rgba(0,0,0,0.1)",
          transition: "width 0.3s, transform 0.3s",
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "1rem", paddingTop: "4rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1.5rem" }}>
            Menu crear edificio/importar
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <button
              className="btn btn-primary"
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              onClick={onCreateBuilding}
            >
              <PlusCircle size={20} />
              <span>Crear nuevo edificio</span>
            </button>

            <label
              className="btn btn-secondary"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer",
              }}
            >
              <Upload size={20} />
              <span>Importar modelo 3D</span>
              <input type="file" accept=".glb,.gltf" style={{ display: "none" }} onChange={handleFileUpload} />
            </label>
          </div>
        </div>
      </div>
    </>
  )
}

