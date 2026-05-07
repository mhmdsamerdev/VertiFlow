/**
 * Minimal type shim for @react-three/fiber@8.17.0
 * The shipped dist/react-three-fiber.cjs.d.ts re-exports from
 * ./declarations/src/index which is missing from the package.
 * This shim provides the types we actually use in LayoutTab.tsx.
 */
import type { ReactNode, CSSProperties, ComponentType } from 'react'
import type * as THREE from 'three'

export interface RootState {
  clock:  THREE.Clock
  camera: THREE.Camera
  scene:  THREE.Scene
  gl:     THREE.WebGLRenderer
  size:   { width: number; height: number }
}

export interface CanvasProps {
  children?:  ReactNode
  camera?:    {
    position?: [number, number, number]
    fov?:      number
    near?:     number
    far?:      number
  }
  style?:     CSSProperties
  className?: string
  gl?:        Partial<THREE.WebGLRendererParameters>
  shadows?:   boolean
}

export declare const Canvas: ComponentType<CanvasProps>
export declare function useFrame(
  cb:        (state: RootState, delta: number) => void,
  priority?: number,
): null
export declare function useThree<T = RootState>(): T
