import { useState } from "react";
import { PlusCircle, Upload, Building, Layers } from 'lucide-react';

type Building = {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  model?: string;
  color: string;
  coordinates?: [number, number];
};

interface LeftSidebarProps {
  onCreateBuilding: () => void;
  onImportModel: (file: File) => void;
  buildings: Building[];
  selectedBuilding: Building | null;
  onSelectBuilding: (building: Building) => void;
}

export default function LeftSidebar({ 
  onCreateBuilding, 
  onImportModel, 
  buildings,
  selectedBuilding,
  onSelectBuilding
}: LeftSidebarProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'buildings'>('create');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Verificar que sea un archivo GLB o GLTF
      if (file.name.endsWith('.glb') || file.name.endsWith('.gltf')) {
        onImportModel(file);
      } else {
        alert('Por favor, sube un archivo 3D en formato GLB o GLTF');
      }
    }
  };

  return (
    <div className="sidebar">
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1.5rem" }}>
        Arquitectura 3D
      </h1>
      
      {/* Tabs */}
      <div style={{ display: "flex", marginBottom: "1rem", borderBottom: "1px solid var(--border-color)" }}>
        <button 
          className={`btn ${activeTab === 'create' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, borderRadius: "0.375rem 0 0 0.375rem" }}
          onClick={() => setActiveTab('create')}
        >
          Crear
        </button>
        <button 
          className={`btn ${activeTab === 'buildings' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, borderRadius: "0 0.375rem 0.375rem 0" }}
          onClick={() => setActiveTab('buildings')}
        >
          Edificios
        </button>
      </div>
      
      {/* Contenido según la pestaña activa */}
      {activeTab === 'create' ? (
        <div className="flex-col gap-4" style={{ display: "flex", gap: "1rem" }}>
          <h2 className="section-title">Menu crear edificio/importar</h2>
          
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
              cursor: "pointer" 
            }}
          >
            <Upload size={20} />
            <span>Importar modelo 3D</span>
            <input 
              type="file" 
              accept=".glb,.gltf" 
              style={{ display: "none" }} 
              onChange={handleFileUpload}
            />
          </label>
          
          <div style={{ marginTop: "1rem" }}>
            <p style={{ fontSize: "0.875rem", color: "var(--secondary-color)" }}>
              Para crear un edificio, haz clic en "Crear nuevo edificio" y luego haz clic en el mapa para colocarlo.
            </p>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="section-title">Edificios</h2>
          
          {buildings.length === 0 ? (
            <p style={{ color: "var(--secondary-color)", fontSize: "0.875rem" }}>
              No hay edificios creados. Crea uno nuevo o importa un modelo 3D.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {buildings.map(building => (
                <div 
                  key={building.id}
                  className={`menu-item ${selectedBuilding?.id === building.id ? 'active' : ''}`}
                  onClick={() => onSelectBuilding(building)}
                >
                  <Building size={18} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {building.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      <div style={{ marginTop: "auto", paddingTop: "1rem", borderTop: "1px solid var(--border-color)"}}>
        <div className="menu-item">
          <Layers size={18} />
          <span>Capas del mapa</span>
        </div>
      </div>
    </div>
  );
}
