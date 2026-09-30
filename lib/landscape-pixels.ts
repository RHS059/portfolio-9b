/** Split original RGBA pixels into depth cutouts with hidden edge padding. */
export function splitLandscapePixels(pixels: Uint8ClampedArray, depth: Uint8Array, width: number, height: number, padding: number) {
  const size = width * height
  return [0, 1, 2].map((level) => {
    const data = new Uint8ClampedArray(size * 4)
    const queue = new Int32Array(size)
    const distance = new Uint8Array(size).fill(255)
    let end = 0
    for (let p = 0; p < size; p++) {
      if (depth[p] !== level) continue
      const i = p * 4
      data[i] = pixels[i]; data[i + 1] = pixels[i + 1]; data[i + 2] = pixels[i + 2]; data[i + 3] = 255
      distance[p] = 0
      // Seed only boundaries adjacent to nearer layers, not the whole image.
      if ((p % width && depth[p - 1] > level) || (p % width < width - 1 && depth[p + 1] > level) || (p >= width && depth[p - width] > level) || (p < size - width && depth[p + width] > level)) queue[end++] = p
    }
    // Extend hidden edges from the closest visible pixel. This avoids duplicate
    // silhouettes and transparent cracks when separated planes reveal an edge.
    for (let head = 0; head < end; head++) {
      const p = queue[head]
      if (distance[p] >= padding) continue
      const neighbors = [p % width ? p - 1 : -1, p % width < width - 1 ? p + 1 : -1, p - width, p + width]
      for (const n of neighbors) {
        if (n < 0 || n >= size || distance[n] !== 255 || depth[n] <= level) continue
        distance[n] = distance[p] + 1
        const i = n * 4, previous = p * 4
        data[i] = data[previous]; data[i + 1] = data[previous + 1]; data[i + 2] = data[previous + 2]; data[i + 3] = 255
        queue[end++] = n
      }
    }
    return data
  })
}
