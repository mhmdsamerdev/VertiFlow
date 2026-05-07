/// <reference types="vite/client" />

export {} // makes this a module → declaration below is a global augmentation, not ambient

// Augment the global JSX namespace with Three.js / R3F intrinsic elements.
// @react-three/fiber@8.17.0 ships a broken .d.ts (references non-existent
// ./declarations/src/index), so we declare them here instead.
declare global {
  namespace JSX {
    interface IntrinsicElements {
      // scene graph
      group:                any
      mesh:                 any
      lineSegments:         any
      instancedMesh:        any
      // geometries
      boxGeometry:          any
      planeGeometry:        any
      sphereGeometry:       any
      cylinderGeometry:     any
      torusGeometry:        any
      edgesGeometry:        any
      bufferGeometry:       any
      // materials
      meshStandardMaterial: any
      meshBasicMaterial:    any
      meshPhongMaterial:    any
      lineBasicMaterial:    any
      // lights
      ambientLight:         any
      directionalLight:     any
      pointLight:           any
      spotLight:            any
      hemisphereLight:      any
      // helpers / misc
      gridHelper:           any
      axesHelper:           any
      // scene primitives
      color:                any
      fog:                  any
      primitive:            any
    }
  }
}
