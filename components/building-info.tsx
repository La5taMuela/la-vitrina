import { Edit, Trash2, X } from "lucide-react"

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

interface BuildingInfoProps {
  building: Building
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function BuildingInfo({ building, onClose, onEdit, onDelete }: BuildingInfoProps) {
  return (
    <div
      className="absolute card"
      style={{
        bottom: "4rem",
        right: "1rem",
        width: "20rem",
        padding: "1rem",
        zIndex: 1000,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h3 style={{ fontSize: "1.125rem", fontWeight: 500 }}>Info del edificio</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer" }}>
          <X size={20} />
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div>
          <span style={{ fontWeight: 500 }}>Nombre:</span> {building.name}
        </div>
        <div>
          <span style={{ fontWeight: 500 }}>Posición:</span>
          <div style={{ marginLeft: "0.5rem", fontSize: "0.875rem" }}>
            <div>X: {building.position[0].toFixed(2)}</div>
            <div>Y: {building.position[1].toFixed(2)}</div>
            <div>Z: {building.position[2].toFixed(2)}</div>
          </div>
        </div>
        <div>
          <span style={{ fontWeight: 500 }}>Rotación:</span>
          <div style={{ marginLeft: "0.5rem", fontSize: "0.875rem" }}>
            <div>X: {(building.rotation[0] * (180 / Math.PI)).toFixed(2)}°</div>
            <div>Y: {(building.rotation[1] * (180 / Math.PI)).toFixed(2)}°</div>
            <div>Z: {(building.rotation[2] * (180 / Math.PI)).toFixed(2)}°</div>
          </div>
        </div>
        <div>
          <span style={{ fontWeight: 500 }}>Escala:</span>
          <div style={{ marginLeft: "0.5rem", fontSize: "0.875rem" }}>
            <div>X: {building.scale[0].toFixed(2)}</div>
            <div>Y: {building.scale[1].toFixed(2)}</div>
            <div>Z: {building.scale[2].toFixed(2)}</div>
          </div>
        </div>
        {building.coordinates && (
          <div>
            <span style={{ fontWeight: 500 }}>Coordenadas:</span>
            <div style={{ marginLeft: "0.5rem", fontSize: "0.875rem" }}>
              <div>Lat: {building.coordinates[0].toFixed(6)}</div>
              <div>Lng: {building.coordinates[1].toFixed(6)}</div>
            </div>
          </div>
        )}
        {building.model && (
          <div>
            <span style={{ fontWeight: 500 }}>Modelo:</span> {building.model.split("/").pop()}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
        <button
          className="btn btn-primary"
          style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
          onClick={onEdit}
        >
          <Edit size={16} />
          <span>Editar</span>
        </button>
        <button
          className="btn btn-danger"
          style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
          onClick={onDelete}
        >
          <Trash2 size={16} />
          <span>Eliminar</span>
        </button>
      </div>
    </div>
  )
}

