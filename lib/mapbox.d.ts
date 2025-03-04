declare module "react-map-gl" {
    export interface ViewState {
      longitude: number
      latitude: number
      zoom: number
      pitch?: number
      bearing?: number
      padding?: {
        top: number
        bottom: number
        left: number
        right: number
      }
    }
  
    export interface MapProps {
      mapboxAccessToken?: string
      mapStyle?: string
      longitude?: number
      latitude?: number
      zoom?: number
      pitch?: number
      bearing?: number
      padding?: {
        top: number
        bottom: number
        left: number
        right: number
      }
      onMove?: (evt: { viewState: ViewState }) => void
      children?: React.ReactNode
      ref?: React.Ref<any>
    }
  
    export const Map: React.FC<MapProps>
  }
  
  