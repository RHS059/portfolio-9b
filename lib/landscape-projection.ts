import * as THREE from "three"

export const SOURCE_CAMERA_DISTANCE = 6
export const SOURCE_CAMERA_FOV = 35
export const sourceFrustumHeight = 2 * Math.tan(THREE.MathUtils.degToRad(SOURCE_CAMERA_FOV / 2)) * SOURCE_CAMERA_DISTANCE

export function createSourceCamera(width: number, height: number) {
  const camera = new THREE.PerspectiveCamera(SOURCE_CAMERA_FOV, width / height, .1, 40)
  camera.position.z = SOURCE_CAMERA_DISTANCE
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld(true)
  return camera
}

/**
 * Build simple world-space scenery by intersecting rays from the source camera
 * with a distant backdrop and two receding ground surfaces. Their UVs are NOT
 * stretched to fit a rectangle: the shader projects the original source camera
 * onto this geometry, preserving every landmark in the neutral view.
 */
export function createProjectedSurface(layer: number, width: number, height: number, padding: number, uprightForeground: boolean) {
  const geometry = new THREE.PlaneGeometry(1, 1, 48, 28)
  const positions = geometry.getAttribute("position")
  const coordinates = geometry.getAttribute("uv")
  const fullWidth = sourceFrustumHeight * width / height
  for (let index = 0; index < positions.count; index++) {
    const u = (coordinates.getX(index) * (width + 2 * padding) - padding) / width
    const v = (coordinates.getY(index) * (height + 2 * padding) - padding) / height
    const rayY = (v - .5) * sourceFrustumHeight
    let distance = 2 // Distant sky/backdrop, z = -6.
    if (layer === 1) {
      // Level water/land recedes toward the horizon; distant hills are a cap.
      distance = rayY < -.01 ? THREE.MathUtils.clamp(-1.3 / rayY, .8, 1.9) : 1.9
    } else if (layer === 2) {
      // Boardwalk/dunes/grass occupy a nearer ground plane. Tall trees and
      // shrubs use an upright foreground surface instead of lying on the land.
      distance = uprightForeground ? .58 : rayY < -.01 ? THREE.MathUtils.clamp(-.85 / rayY, .55, 1.4) : 1.4
    }
    positions.setXYZ(index, (u - .5) * fullWidth * distance, rayY * distance, SOURCE_CAMERA_DISTANCE * (1 - distance))
  }
  positions.needsUpdate = true
  geometry.computeBoundingSphere()
  return geometry
}
