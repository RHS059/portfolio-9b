import * as THREE from "three"

/** Three columns (far/middle/near), two rows (generated animation frames). */
export type LandscapeAnimation = {
  atlas: string
  waterline: number
  foreground: "grass" | "boardwalk" | "tree" | "garden" | "coast" | "rocks" | "marina"
}

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const fragmentShader = `
uniform sampler2D atlas;
uniform vec2 texel;
uniform float column;
uniform float phase;
uniform float waterline;
uniform int foreground;
varying vec2 vUv;
vec4 frame(float row) {
  // Stay inside this tile: filtering must never sample a neighbouring layer.
  vec2 p = vec2((column + vUv.x) / 3.0, (row + vUv.y) / 2.0);
  p = clamp(p, vec2(column / 3.0, row / 2.0) + texel,
    vec2((column + 1.0) / 3.0, (row + 1.0) / 2.0) - texel);
  return texture2D(atlas, p);
}
void main() {
  vec2 p = vec2(vUv.x, 1.0 - vUv.y);
  float mask = 0.0;
  if (column > 0.5 && column < 1.5) {
    // Animate water below its edge, leaving the skyline above it fixed.
    mask = smoothstep(waterline, waterline + 0.04, p.y);
  } else if (column > 1.5) {
    mask = 1.0;
    if (foreground == 1) {
      // Side grasses; preserve the boardwalk and railings.
      mask = smoothstep(0.52 + 0.65 * (p.y - 0.5), 0.62 + 0.65 * (p.y - 0.5), p.x);
    } else if (foreground == 2 || foreground == 3) {
      // Tree canopy; leave walls, fences and garden furniture still.
      mask = 1.0 - smoothstep(0.42, 0.55, p.y);
    } else if (foreground == 4) {
      mask = (1.0 - smoothstep(0.42, 0.52, p.y)) * (1.0 - smoothstep(0.3, 0.4, p.x));
    } else if (foreground == 5 || foreground == 6) {
      // Rock/dock scenes: only the leafy upper left edge moves.
      mask = (1.0 - smoothstep(0.42, 0.54, p.y)) * (1.0 - smoothstep(0.16, 0.24, p.x));
    }
  }
  vec4 a = frame(1.0);
  vec4 b = frame(0.0);
  // Slow ping-pong between real generated frames. Interpolate premultiplied
  // colors so transparent foliage does not acquire dark halos.
  float blend = phase * mask * 0.3;
  float alpha = mix(a.a, b.a, blend);
  vec3 color = mix(a.rgb * a.a, b.rgb * b.a, blend) / max(alpha, 0.0001);
  if (alpha < 0.025) discard;
  gl_FragColor = vec4(color, alpha);
  #include <colorspace_fragment>
}`

const foregrounds = ["grass", "boardwalk", "tree", "garden", "coast", "rocks", "marina"]

export function createLandscapeScene(host: HTMLDivElement, animation: LandscapeAnimation, position: string) {
  const renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, powerPreference: "low-power" })
  renderer.setClearColor("#f3ebd9", 1)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  const canvas = renderer.domElement
  canvas.setAttribute("aria-hidden", "true")
  canvas.className = "landscape-canvas"
  host.appendChild(canvas)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 30)
  camera.position.z = 6
  const geometry = new THREE.PlaneGeometry(16 / 9, 1)
  const layers: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>[] = []
  let texture: THREE.Texture | undefined
  let disposed = false
  let loaded = false
  let visible = false
  let request = 0
  let last = 0
  let elapsed = 0
  let x = 0
  let y = 0
  const target = { x: 0, y: 0 }
  const focal = position.split(" ").map((value) => parseFloat(value) / 100)

  function resize() {
    if (disposed) return
    const width = host.clientWidth
    const height = host.clientHeight
    if (!width || !height) return
    renderer.setSize(width, height)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    for (const layer of layers) {
      // Correct scale for each depth; overscan prevents exposed image edges.
      const viewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(35 / 2)) * (6 - layer.position.z)
      const fullHeight = viewHeight * Math.max(1, camera.aspect / (16 / 9)) * 1.06
      layer.scale.set(fullHeight, fullHeight, 1)
      layer.position.x = (0.5 - focal[0]) * (fullHeight * 16 / 9 - viewHeight * camera.aspect)
      layer.position.y = (focal[1] - 0.5) * (fullHeight - viewHeight)
    }
  }

  function tick(now: number) {
    request = 0
    if (disposed || !loaded || !visible || document.hidden) return
    if (!last) last = now
    const delta = Math.min((now - last) / 1000, 0.1)
    if (delta >= 1 / 30) {
      last = now
      elapsed += delta
      const ease = 1 - Math.exp(-delta * 5)
      x += (target.x - x) * ease
      y += (target.y - y) * ease
      camera.position.set(x * 0.09, y * 0.06, 6)
      camera.lookAt(0, 0, 0)
      const phase = (1 - Math.cos(elapsed * Math.PI * 2 / 12)) / 2
      for (const layer of layers) layer.material.uniforms.phase.value = phase
      renderer.render(scene, camera)
    }
    request = requestAnimationFrame(tick)
  }

  function resume() {
    if (request) cancelAnimationFrame(request)
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

  new THREE.TextureLoader().load(animation.atlas, (atlas) => {
    if (disposed) { atlas.dispose(); return }
    texture = atlas
    atlas.colorSpace = THREE.SRGBColorSpace
    atlas.minFilter = THREE.LinearFilter
    atlas.magFilter = THREE.LinearFilter
    atlas.generateMipmaps = false
    for (let column = 0; column < 3; column++) {
      const material = new THREE.ShaderMaterial({
        vertexShader, fragmentShader, transparent: true, depthWrite: false,
        uniforms: {
          atlas: { value: atlas }, texel: { value: new THREE.Vector2(0.5 / atlas.image.width, 0.5 / atlas.image.height) },
          column: { value: column }, phase: { value: 0 }, waterline: { value: animation.waterline },
          foreground: { value: foregrounds.indexOf(animation.foreground) },
        },
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.z = (column - 1) * 0.85
      mesh.renderOrder = column
      layers.push(mesh)
      scene.add(mesh)
    }
    resize()
    renderer.render(scene, camera)
    loaded = true
    host.dataset.scene = "ready"
    resume()
  }, undefined, () => dispose())

  function dispose() {
    if (disposed) return
    disposed = true
    cancelAnimationFrame(request)
    observer.disconnect()
    host.removeEventListener("pointermove", pointerMove)
    host.removeEventListener("pointerleave", pointerLeave)
    document.removeEventListener("visibilitychange", resume)
    canvas.removeEventListener("webglcontextlost", contextLost)
    geometry.dispose()
    for (const layer of layers) layer.material.dispose()
    texture?.dispose()
    renderer.dispose()
    renderer.forceContextLoss()
    canvas.remove()
    host.dataset.scene = "fallback"
  }

  return { dispose, setVisible(value: boolean) { visible = value; resume() } }
}
