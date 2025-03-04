import { Edit, Trash2, X, Info } from 'lucide-react';

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

interface RightSidebarProps {
  selectedBuilding: Building | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: (id: string) => void;
}

export default function RightSidebar({ 
  selectedBuilding, 
  onClose, 
  onEdit, 
  onDelete 
}: RightSidebarProps) {
  if (!selectedBuilding) {
    return (
      <div className="info-panel" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <Info size={48} style={{ color: "var(--secondary-color)", marginBottom: "1rem" }} />
        <p style={{ textAlign: "center", color: "var(--secondary-color)" }}>
          Selecciona un edificio para ver su información
        </p>
      </div>
    );
  }
  
  return (
    <div className="info-panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 className="section-title" style={{ margin: 0 }}>Info del edificio</h2>
        <button 
          onClick={onClose} 
          style={{ background: "none", border: "none", color: "var(--secondary-color)", cursor: "pointer" }}
        >
          <X size={20} />
        </button>
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>{selectedBuilding.name}</h3>
          
          {selectedBuilding.coordinates && (
            <div style={{ fontSize: "0.875rem", color: "var(--secondary-color)" }}>
              Ubicación: {selectedBuilding.coordinates[0].toFixed(6)}, {selectedBuilding.coordinates[1].toFixed(6)}
            </div>
          )}
        </div>
        
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Propiedades</h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div>
              <span style={{ fontWeight: 500 }}>Posición:</span> 
              <div style={{ marginLeft: "0.5rem", fontSize: "0.875rem" }}>
                <div>X: {selectedBuilding.position[0].toFixed(2)}</div>
                <div>Y: {selectedBuilding.position[1].toFixed(2)}</div>
                <div>Z: {selectedBuilding.position[2].toFixed(2)}</div>
              </div>
            </div>
            <div>
              <span style={{ fontWeight: 500 }}>Rotación:</span>
              <div style={{ marginLeft: "0.5rem", fontSize: "0.875rem" }}>
                <div>X: {(selectedBuilding.rotation[0] * (180/Math.PI)).toFixed(2)}°</div>
                <div>Y: {(selectedBuilding.rotation[1] * (180/Math.PI)).toFixed(2)}°</div>
                <div>Z: {(selectedBuilding.rotation[2] * (180/Math.PI)).toFixed(2)}°</div>
              </div>
            </div>
            <div>
              <span style={{ fontWeight: 500 }}>Escala:</span>
              <div style={{ marginLeft: "0.5rem", fontSize: "0.875rem" }}>
                <div>X: {selectedBuilding.scale[0].toFixed(2)}</div>
                <div>Y: {selectedBuilding.scale[1].toFixed(2)}</div>
                <div>Z: {selectedBuilding.scale[2].toFixed(2)}</div>
              </div>
            </div>
            {selectedBuilding.model && (
              <div>
                <span style={{ fontWeight: 500 }}>Modelo:</span> {selectedBuilding.model.split('/').pop()}
              </div>
            )}
            <div>
              <span style={{ fontWeight: 500 }}>Color:</span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ 
                  width: "20px", 
                  height: "20px", 
                  backgroundColor: selectedBuilding.color,
                  border: "1px solid var(--border-color)",
                  borderRadius: "4px"
                }}></div>
                {selectedBuilding.color}
              </div>
            </div>
          </div>
        </div>
        
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem" }}
            onClick={onEdit}
          >
            <Edit size={16} />
            <span>Editar</span>
          </button>
          <button
            className="btn btn-danger"
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem" }}
            onClick={() => onDelete(selectedBuilding.id)}
          >
            <Trash2 size={16} />
            <span>Eliminar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
