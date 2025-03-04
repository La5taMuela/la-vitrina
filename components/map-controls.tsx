import { Plus, Minus } from 'lucide-react';

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export default function MapControls({ onZoomIn, onZoomOut }: MapControlsProps) {
  return (
    <div 
      className="absolute"
      style={{ 
        top: "1rem", 
        right: "1rem", 
        display: "flex", 
        flexDirection: "column", 
        gap: "0.5rem",
        zIndex: 1000
      }}
    >
      <button
        className="btn btn-secondary btn-icon"
        onClick={onZoomIn}
        aria-label="Acercar"
      >
        <Plus size={20} />
      </button>
      <button
        className="btn btn-secondary btn-icon"
        onClick={onZoomOut}
        aria-label="Alejar"
      >
        <Minus size={20} />
      </button>
    </div>
  );
}
