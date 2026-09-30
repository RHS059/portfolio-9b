import * as THREE from "three"
import { coverPlacement, landscapeCompositions, type LandscapeAnimation } from "./landscape-composition"
import { createFrameLayers, createLandscapeLayers, EDGE_PADDING, type PreparedLandscape } from "./landscape-layers"
import { createProjectedSurface, createSourceCamera, sourceFrustumHeight } from "./landscape-projection"

export type { LandscapeAnimation } from "./landscape-composition"

type FrameState = { x: number; y: number; current: number; next: number; blend: number }
type Backend = { canvas: HTMLCanvasElement; resize(): void; render(frame: FrameState): void; dispose(): void }
const depths = [-3, 0, 2]
const vertexShader = `
uniform mat4 sourceViewProjection;
varying vec4 sourceProjection;
void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  sourceProjection = sourceViewProjection * worldPosition;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`
const fragmentShader = `
uniform sampler2D artwork;
uniform sampler2D motion;
uniform sampler2D frameA;
uniform sampler2D frameB;
uniform vec2 sourceSize;
uniform vec4 frameRegionA;
uniform vec4 frameRegionB;
uniform float padding;
uniform float blend;
uniform float animated;
varying vec4 sourceProjection;
void main() {
  vec2 sourceUv = sourceProjection.xy / sourceProjection.w * 0.5 + 0.5;
  vec2 paddedUv = (sourceUv * sourceSize + padding) / (sourceSize + 2.0 * padding);
  vec4 base = texture2D(artwork, paddedUv);
  if (base.a < 0.01) discard;
  vec2 mask = texture2D(motion, paddedUv).rg;
  vec2 uvA = clamp((sourceUv - frameRegionA.xy) / frameRegionA.zw, 0.0, 1.0);
  vec2 uvB = clamp((sourceUv - frameRegionB.xy) / frameRegionB.zw, 0.0, 1.0);
  vec3 a = texture2D(frameA, uvA).rgb;
  vec3 b = texture2D(frameB, uvB).rgb;
  // Real generated keyframes are projected from the SAME fixed source camera.
  // Rigid scenery keeps its original pixels outside the water/foliage masks.
  gl_FragColor = vec4(mix(base.rgb, mix(a, b, blend), max(mask.r, mask.g) * animated), base.a);
  #include <colorspace_fragment>
}
`

function travel(width: number, scale: number) {
  // Near geometry moves up to ~9px; backdrop ~2.5px. Edge padding is outside
  // the source framing, never an enlargement/zoom of the original artwork.
  return Math.min(5, width / 110, EDGE_PADDING * scale * 0.28)
}

function webglBackend(host: HTMLDivElement, prepared: PreparedLandscape, frames: HTMLImageElement[], position: string, animation: LandscapeAnimation, failed: (reason: string) => void): Backend {
  const renderer = new THREE.WebGLRenderer({ alpha: false, antialias: false, powerPreference: "low-power" })
  renderer.setClearColor("#f3ebd9", 1)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  const canvas = renderer.domElement
  const scene = new THREE.Scene()
  const sourceCamera = createSourceCamera(prepared.width, prepared.height)
  const camera = sourceCamera.clone()
  const sourceViewProjection = new THREE.Matrix4().multiplyMatrices(sourceCamera.projectionMatrix, sourceCamera.matrixWorldInverse)
  const region = animation.frameRegion || [0, 0, 1, 1]
  const frameRegion = new THREE.Vector4(region[0], 1 - region[1] - region[3], region[2], region[3])
  const originalRegion = new THREE.Vector4(0, 0, 1, 1)
  const uprightForeground = ["lakefront-city", "backyard-sunset", "coastal-town", "lakeside-marina"].includes(animation.scene)
  const textures: THREE.Texture[] = []
  const frameTextures = frames.map((image) => {
    const texture = new THREE.Texture(image)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.minFilter = THREE.LinearFilter
    texture.generateMipmaps = false
    texture.needsUpdate = true
    textures.push(texture)
    return texture
  })
  const motion = new THREE.CanvasTexture(prepared.motion)
  motion.minFilter = THREE.LinearFilter
  motion.generateMipmaps = false
  textures.push(motion)
  const meshes = prepared.layers.map((layer, index) => {
    const artwork = new THREE.CanvasTexture(layer)
    artwork.colorSpace = THREE.SRGBColorSpace
    artwork.minFilter = THREE.LinearFilter
    artwork.generateMipmaps = false
    textures.push(artwork)
    const material = new THREE.ShaderMaterial({
      vertexShader, fragmentShader, transparent: true, depthWrite: false,
      uniforms: {
        sourceViewProjection: { value: sourceViewProjection },
        artwork: { value: artwork }, motion: { value: motion },
        frameA: { value: frameTextures[0] }, frameB: { value: frameTextures[0] },
        frameRegionA: { value: originalRegion }, frameRegionB: { value: originalRegion },
        sourceSize: { value: new THREE.Vector2(prepared.width, prepared.height) },
        padding: { value: EDGE_PADDING }, blend: { value: 0 }, animated: { value: frames.length > 1 ? 1 : 0 },
      },
    })
    const mesh = new THREE.Mesh(createProjectedSurface(index, prepared.width, prepared.height, EDGE_PADDING, uprightForeground), material)
    mesh.renderOrder = index
    scene.add(mesh)
    return mesh
  })
  let cameraTravel = 0
  let disposed = false
  function contextLost(event: Event) { event.preventDefault(); failed("webgl-context-lost") }
  canvas.addEventListener("webglcontextlost", contextLost)
  renderer.debug.onShaderError = () => failed("webgl-shader-error")
  return {
    canvas,
    resize() {
      const width = host.clientWidth, height = host.clientHeight
      if (!width || !height) return
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.setSize(width, height, false)
      const fit = coverPlacement(width, height, prepared.width, prepared.height, position)
      // Crop the SOURCE camera frustum exactly as CSS object-fit/object-position
      // does. Geometry and source-camera projection stay fixed on resize.
      camera.setViewOffset(fit.width, fit.height, -fit.left, -fit.top, width, height)
      camera.updateProjectionMatrix()
      cameraTravel = travel(width, fit.scale) * sourceFrustumHeight / fit.height

    },
    render(frame) {
      if (disposed) return
      // Pure camera translation. Never point/rotate the image toward the mouse.
      camera.position.set(frame.x * cameraTravel, frame.y * cameraTravel * .6, 6)
      for (const mesh of meshes) {
        mesh.material.uniforms.frameA.value = frameTextures[frame.current]
        mesh.material.uniforms.frameB.value = frameTextures[frame.next]
        mesh.material.uniforms.frameRegionA.value = frame.current === 0 ? originalRegion : frameRegion
        mesh.material.uniforms.frameRegionB.value = frame.next === 0 ? originalRegion : frameRegion
        mesh.material.uniforms.blend.value = frame.blend
      }
      renderer.render(scene, camera)
    },
    dispose() {
      if (disposed) return
      disposed = true
      canvas.removeEventListener("webglcontextlost", contextLost)
      for (const texture of textures) texture.dispose()
      for (const mesh of meshes) { mesh.material.dispose(); mesh.geometry.dispose() }
      renderer.dispose()
      renderer.forceContextLoss()
      canvas.remove()
    },
  }
}

/** Keep real frame animation and separated parallax when WebGL is unavailable. */
function canvasBackend(host: HTMLDivElement, prepared: PreparedLandscape, frames: HTMLImageElement[], position: string, animation: LandscapeAnimation): Backend {
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d", { alpha: false })
  if (!context) throw new Error("No landscape renderer available")
  const cache = new Map<number, HTMLCanvasElement[]>()
  let ratio = 1
  function getLayers(index: number) {
    if (!cache.has(index)) cache.set(index, frames.length > 1 ? createFrameLayers(prepared, frames[index], index === 0 ? [0, 0, 1, 1] : animation.frameRegion) : prepared.layers)
    return cache.get(index)!
  }
  return {
    canvas,
    resize() {
      ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(host.clientWidth * ratio)
      canvas.height = Math.round(host.clientHeight * ratio)
    },
    render(frame) {
      const width = host.clientWidth, height = host.clientHeight
      if (!width || !height) return
      const fit = coverPlacement(width, height, prepared.width, prepared.height, position)
      const pad = EDGE_PADDING * fit.scale
      const amount = travel(width, fit.scale)
      const current = getLayers(frame.current), next = getLayers(frame.next)
      for (const key of cache.keys()) if (key !== frame.current && key !== frame.next) cache.delete(key)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      context.globalAlpha = 1
      context.fillStyle = "#f3ebd9"
      context.fillRect(0, 0, width, height)
      for (let index = 0; index < current.length; index++) {
        const depth = 6 / (6 - depths[index])
        const left = fit.left - pad - frame.x * amount * depth
        const top = fit.top - pad + frame.y * amount * .6 * depth
        context.globalAlpha = 1
        context.drawImage(current[index], left, top, fit.width + pad * 2, fit.height + pad * 2)
        if (frame.next !== frame.current) {
          context.globalAlpha = frame.blend
          context.drawImage(next[index], left, top, fit.width + pad * 2, fit.height + pad * 2)
        }
      }
      context.globalAlpha = 1
    },
    dispose() { cache.clear(); canvas.remove() },
  }
}

export function createLandscapeScene(host: HTMLDivElement, animation: LandscapeAnimation, position: string, src: string) {
  delete host.dataset.renderer
  delete host.dataset.frameCount
  let disposed = false, visible = false
  let backend: Backend | undefined
  let prepared: PreparedLandscape | undefined
  let frames: HTMLImageElement[] = []
  let request = 0, last = 0, elapsed = 0
  const target = { x: 0, y: 0 }
  const frame: FrameState = { x: 0, y: 0, current: 0, next: 0, blend: 0 }

  function mount(next: Backend, renderer: "webgl" | "canvas") {
    backend?.dispose()
    backend = next
    next.canvas.className = "landscape-canvas"
    next.canvas.setAttribute("aria-hidden", "true")
    host.appendChild(next.canvas)
    host.dataset.renderer = renderer
    next.resize()
    next.render(frame)
    host.dataset.scene = "ready"
    resume()
  }
  function fallback(reason: string) {
    if (disposed || !prepared || host.dataset.renderer === "canvas") return
    host.dataset.sceneReason = reason
    console.warn(`Landscape: using animated canvas fallback (${reason})`)
    try { mount(canvasBackend(host, prepared, frames, position, animation), "canvas") }
    catch (error) { console.warn("Landscape rendering unavailable", error); dispose() }
  }
  function resize() { if (!disposed && backend) { backend.resize(); backend.render(frame) } }
  function tick(now: number) {
    request = 0
    if (disposed || !backend || !visible || document.hidden) return
    if (!last) last = now
    const delta = Math.min((now - last) / 1000, .1)
    if (delta >= 1 / 30) {
      last = now
      elapsed += delta
      const ease = 1 - Math.exp(-delta * 6)
      frame.x += (target.x - frame.x) * ease
      frame.y += (target.y - frame.y) * ease
      const phase = elapsed / (animation.duration || 7.2) * frames.length
      frame.current = Math.floor(phase) % frames.length
      frame.next = (frame.current + 1) % frames.length
      const blend = phase % 1
      frame.blend = blend * blend * (3 - 2 * blend)
      backend.render(frame)
    }
    request = requestAnimationFrame(tick)
  }
  function resume() {
    cancelAnimationFrame(request)
    request = 0; last = 0
    if (!disposed && backend && visible && !document.hidden) request = requestAnimationFrame(tick)
  }
  function pointerMove(event: PointerEvent) {
    if (event.pointerType !== "mouse" && event.pointerType !== "pen") return
    const bounds = host.getBoundingClientRect()
    target.x = THREE.MathUtils.clamp((event.clientX - bounds.left) / bounds.width * 2 - 1, -1, 1)
    target.y = THREE.MathUtils.clamp(1 - (event.clientY - bounds.top) / bounds.height * 2, -1, 1)
  }
  function pointerLeave() { target.x = 0; target.y = 0 }
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  host.addEventListener("pointermove", pointerMove, { passive: true })
  host.addEventListener("pointerleave", pointerLeave)
  document.addEventListener("visibilitychange", resume)

  function loadImage(path: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error(`Landscape frame failed to load: ${path}`))
      image.src = path
    })
  }
  function activate() {
    if (disposed || !prepared) return
    host.dataset.frameCount = String(frames.length)
    if (host.dataset.renderer === "canvas") {
      mount(canvasBackend(host, prepared, frames, position, animation), "canvas")
      return
    }
    try {
      mount(webglBackend(host, prepared, frames, position, animation, (reason) => queueMicrotask(() => fallback(reason))), "webgl")
    } catch { fallback("webgl-unavailable") }
  }
  // Begin parallax from the cached original immediately. The larger animation
  // frames load alongside it; they must not gate the first interactive render.
  const paths = [...new Set(animation.frames || [])].filter((path) => path !== src)
  const loadingFrames = Promise.allSettled(paths.map(loadImage))
  loadImage(src).then(async (source) => {
    if (disposed) return
    prepared = createLandscapeLayers(source, landscapeCompositions[animation.scene])
    frames = [source]
    activate()
    const results = await loadingFrames
    if (disposed) return
    const loaded = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : [])
    for (const result of results) if (result.status === "rejected") console.warn(result.reason)
    if (loaded.length) {
      frames = [source, ...loaded]
      frame.current = 0; frame.next = 1; frame.blend = 0; elapsed = 0
      activate()
    }
    if (loaded.length !== paths.length) host.dataset.sceneReason = "some-animation-frames-unavailable"
  }).catch((error) => { console.warn("Landscape setup failed", error); host.dataset.sceneReason = "asset-load-or-compositing-error"; dispose() })

  function dispose() {
    if (disposed) return
    disposed = true
    cancelAnimationFrame(request)
    observer.disconnect()
    host.removeEventListener("pointermove", pointerMove)
    host.removeEventListener("pointerleave", pointerLeave)
    document.removeEventListener("visibilitychange", resume)
    backend?.dispose()
    frames = []
    prepared = undefined
    host.dataset.scene = "fallback"
  }
  return { dispose, setVisible(value: boolean) { visible = value; resume() } }
}
