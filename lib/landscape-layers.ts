import type { Composition, Polygon } from "./landscape-composition"
import { splitLandscapePixels } from "./landscape-pixels"

// This is hidden edge padding, not a scale/zoom. Only a few pixels can be
// exposed by the bounded camera movement. Artwork pixels are never regenerated.
export const EDGE_PADDING = 16

function canvas(width: number, height: number) {
  const element = document.createElement("canvas")
  element.width = width
  element.height = height
  const context = element.getContext("2d", { willReadFrequently: true })
  if (!context) throw new Error("Landscape compositing is unavailable")
  return { element, context }
}

function fill(context: CanvasRenderingContext2D, polygon: Polygon, width: number, height: number) {
  context.beginPath()
  polygon.forEach(([x, y], index) => index ? context.lineTo(x * width, y * height) : context.moveTo(x * width, y * height))
  context.closePath()
  context.fill()
}

export function createLandscapeLayers(image: HTMLImageElement, composition: Composition) {
  const width = image.naturalWidth
  const height = image.naturalHeight
  const size = width * height
  const source = canvas(width, height)
  source.context.drawImage(image, 0, 0)
  const pixels = source.context.getImageData(0, 0, width, height)
  const mask = canvas(width, height)
  mask.context.fillStyle = "#800000"
  fill(mask.context, composition.middle, width, height)
  mask.context.fillStyle = "#ff0000"
  for (const polygon of composition.foreground) fill(mask.context, polygon, width, height)
  const maskPixels = mask.context.getImageData(0, 0, width, height).data
  const depth = new Uint8Array(size)
  for (let p = 0; p < size; p++) depth[p] = maskPixels[p * 4] > 191 ? 2 : maskPixels[p * 4] > 63 ? 1 : 0

  const layers = splitLandscapePixels(pixels.data, depth, width, height, EDGE_PADDING).map((data) => {
    const tile = canvas(width, height)
    tile.context.putImageData(new ImageData(new Uint8ClampedArray(data), width, height), 0, 0)
    const padded = canvas(width + EDGE_PADDING * 2, height + EDGE_PADDING * 2)
    const ctx = padded.context, pad = EDGE_PADDING
    ctx.drawImage(tile.element, pad, pad)
    ctx.drawImage(tile.element, 0, 0, width, 1, pad, 0, width, pad)
    ctx.drawImage(tile.element, 0, height - 1, width, 1, pad, height + pad, width, pad)
    ctx.drawImage(padded.element, pad, 0, 1, padded.element.height, 0, 0, pad, padded.element.height)
    ctx.drawImage(padded.element, width + pad - 1, 0, 1, padded.element.height, width + pad, 0, pad, padded.element.height)
    return padded.element
  })

  // Motion masks may be feathered; the artwork itself is never blurred.
  const motion = canvas(width + EDGE_PADDING * 2, height + EDGE_PADDING * 2)
  motion.context.translate(EDGE_PADDING, EDGE_PADDING)
  motion.context.fillStyle = "black"
  motion.context.fillRect(-EDGE_PADDING, -EDGE_PADDING, motion.element.width, motion.element.height)
  motion.context.filter = "blur(4px)"
  motion.context.fillStyle = "red"
  for (const polygon of composition.water) fill(motion.context, polygon, width, height)
  motion.context.fillStyle = "lime"
  for (const polygon of composition.foliage) fill(motion.context, polygon, width, height)
  return { layers, motion: motion.element, width, height }
}
