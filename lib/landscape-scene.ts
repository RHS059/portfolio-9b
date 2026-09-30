import * as THREE from "three"
import { coverPlacement, landscapeCompositions, type LandscapeAnimation } from "./landscape-composition"
import { createLandscapeLayers, EDGE_PADDING } from "./landscape-layers"

export type { LandscapeAnimation } from "./landscape-composition"

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const fragmentShader = `
uniform sampler2D artwork;
uniform sampler2D motion;
uniform vec2 texel;
uniform float time;
varying vec2 vUv;
void main() {
  vec2 mask = texture2D(motion, vUv).rg;
  // Sub-pixel ripples/breeze within explicit water and foliage regions. No
  // frame crossfade, whole-image rotation, color change, or blur filter.
  vec2 offset = vec2(
    mask.r * sin(time * 0.8) * sin(vUv.y * 170.0 + time * 0.5) * 1.1
      + mask.g * sin(time * 0.65) * sin(vUv.y * 7.0 + time * 0.25) * 1.4,
    mask.r * sin(time * 0.6) * sin(vUv.y * 210.0) * 0.25
      + mask.g * sin(time * 0.45) * 0.35
  ) * texel;
  vec4 color = texture2D(artwork, clamp(vUv + offset, texel * 0.5, 1.0 - texel * 0.5));
  if (color.a < 0.01) discard;
  gl_FragColor = color;
  #include <colorspace_fragment>
}`

export function createLandscapeScene(host: HTMLDivElement, animation: LandscapeAnimation, position: string, src: string) {
  const renderer = new THREE.WebGLRenderer({ alpha: false, antialias: false, powerPreference: "low-power" })
  renderer.setClearColor("#f3ebd9", 1)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  const canvas = renderer.domElement
  canvas.setAttribute("aria-hidden", "true")
  canvas.className = "landscape-canvas"
  host.appendChild(canvas)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 30)
  camera.position.z = 6
  // Keep the optical axis parallel to the planes. lookAt during pointer
  // movement turned the previous effect into a rotating/warping photograph.
  const geometry = new THREE.PlaneGeometry(1, 1)
  const layers: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>[] = []
  const textures: THREE.Texture[] = []
  let disposed = false
  let loaded = false
  let visible = false
  let request = 0
  let last = 0
  let elapsed = 0
  let x = 0
  let y = 0
  let imageWidth = 0
  let imageHeight = 0
  let cameraTravel = 0
  const target = { x: 0, y: 0 }
  const image = new Image()

  function resize() {
    if (disposed) return
    const width = host.clientWidth, height = host.clientHeight
    if (!width || !height) return
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    if (!imageWidth || !imageHeight) return
    const fit = coverPlacement(width, height, imageWidth, imageHeight, position)
    const viewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(35 / 2)) * 6
    // At most 3 CSS pixels of travel; less on narrow screens. Bound it by the
    // source edge padding as well, so a very small hero cannot expose a gap.
    cameraTravel = Math.min(3, width / 220, EDGE_PADDING * fit.scale * 0.4) * viewHeight / height
    for (const layer of layers) {
      const depthScale = (6 - layer.position.z) / 6
      const worldPerPixel = viewHeight / height * depthScale
      layer.scale.set((fit.width + EDGE_PADDING * 2 * fit.scale) * worldPerPixel,
        (fit.height + EDGE_PADDING * 2 * fit.scale) * worldPerPixel, 1)
      layer.position.x = (fit.left + fit.width / 2 - width / 2) * worldPerPixel
      layer.position.y = (height / 2 - fit.top - fit.height / 2) * worldPerPixel
    }
    render()
  }

  function render() {
    if (!loaded || disposed) return
    camera.position.set(x * cameraTravel, y * cameraTravel * 0.6, 6)
    for (const layer of layers) layer.material.uniforms.time.value = elapsed
    renderer.render(scene, camera)
  }

  function tick(now: number) {
    request = 0
    if (disposed || !loaded || !visible || document.hidden) return
    if (!last) last = now
    const delta = Math.min((now - last) / 1000, 0.1)
    if (delta >= 1 / 30) {
      last = now
      elapsed += delta
      const ease = 1 - Math.exp(-delta * 6)
      x += (target.x - x) * ease
      y += (target.y - y) * ease
      render()
    }
    request = requestAnimationFrame(tick)
  }

  function resume() {
    cancelAnimationFrame(request)
    request = 0
    last = 0
    if (!disposed && loaded && visible && !document.hidden) request = requestAnimationFrame(tick)
  }
  function pointerMove(event: PointerEvent) {
    if (event.pointerType !== "mouse") return
    const bounds = host.getBoundingClientRect()
    target.x = THREE.MathUtils.clamp((event.clientX - bounds.left) / bounds.width * 2 - 1, -1, 1)
    target.y = THREE.MathUtils.clamp(1 - (event.clientY - bounds.top) / bounds.height * 2, -1, 1)
  }
  function pointerLeave() { target.x = 0; target.y = 0 }
  function contextLost(event: Event) { event.preventDefault(); dispose() }
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  host.addEventListener("pointermove", pointerMove, { passive: true })
  host.addEventListener("pointerleave", pointerLeave)
  document.addEventListener("visibilitychange", resume)
  canvas.addEventListener("webglcontextlost", contextLost)

  image.onload = () => {
    if (disposed) return
    try {
      const prepared = createLandscapeLayers(image, landscapeCompositions[animation.scene])
      imageWidth = prepared.width
      imageHeight = prepared.height
      const motion = new THREE.CanvasTexture(prepared.motion)
      motion.minFilter = THREE.LinearFilter
      motion.generateMipmaps = false
      textures.push(motion)
      for (let index = 0; index < prepared.layers.length; index++) {
        const artwork = new THREE.CanvasTexture(prepared.layers[index])
        artwork.colorSpace = THREE.SRGBColorSpace
        artwork.minFilter = THREE.LinearFilter
        artwork.magFilter = THREE.LinearFilter
        artwork.generateMipmaps = false
        textures.push(artwork)
        const material = new THREE.ShaderMaterial({
          vertexShader, fragmentShader, transparent: true, depthWrite: false,
          uniforms: {
            artwork: { value: artwork }, motion: { value: motion }, time: { value: 0 },
            texel: { value: new THREE.Vector2(1 / prepared.layers[index].width, 1 / prepared.layers[index].height) },
          },
        })
        const mesh = new THREE.Mesh(geometry, material)
        mesh.position.z = (index - 1) * 0.85
        mesh.renderOrder = index
        layers.push(mesh)
        scene.add(mesh)
      }
      loaded = true
      resize()
      host.dataset.scene = "ready"
      resume()
    } catch { dispose() }
  }
  image.onerror = dispose
  image.src = src

  function dispose() {
    if (disposed) return
    disposed = true
    image.onload = null
    image.onerror = null
    cancelAnimationFrame(request)
    observer.disconnect()
    host.removeEventListener("pointermove", pointerMove)
    host.removeEventListener("pointerleave", pointerLeave)
    document.removeEventListener("visibilitychange", resume)
    canvas.removeEventListener("webglcontextlost", contextLost)
    geometry.dispose()
    for (const layer of layers) layer.material.dispose()
    for (const texture of textures) texture.dispose()
    renderer.dispose()
    renderer.forceContextLoss()
    canvas.remove()
    host.dataset.scene = "fallback"
  }

  return { dispose, setVisible(value: boolean) { visible = value; resume() } }
}
