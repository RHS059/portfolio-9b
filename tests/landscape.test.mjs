import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"
import sharp from "sharp"
import { coverPlacement, landscapeCompositions } from "../lib/landscape-composition.ts"
import { splitLandscapePixels } from "../lib/landscape-pixels.ts"

const heroes = JSON.parse(await readFile(new URL("../content/article-heroes.json", import.meta.url), "utf8")).images

test("cover framing matches object-fit without scaling up to hide motion edges", () => {
  for (const [width, height] of [[320, 180], [390, 180], [760, 230], [1080, 310], [1720, 310]]) {
    for (const position of ["50% 54%", "50% 45%", "25% 70%"]) {
      const fit = coverPlacement(width, height, 1667, 943, position)
      assert.ok(fit.width >= width && fit.height >= height)
      assert.ok(Math.abs(fit.width - width) < 1e-9 || Math.abs(fit.height - height) < 1e-9)
      assert.equal(fit.scale, Math.max(width / 1667, height / 943))
      assert.equal(fit.left, (width - fit.width) * parseFloat(position.split(" ")[0]) / 100)
      assert.equal(fit.top, (height - fit.height) * parseFloat(position.split(" ")[1]) / 100)
    }
  }
})

for (const hero of heroes) test(`${hero.id}: full-resolution layers reconstruct every original pixel`, async () => {
  const composition = landscapeCompositions[hero.parallax.scene]
  assert.ok(composition)
  const { data, info } = await sharp(new URL(`../public${hero.src}`, import.meta.url).pathname).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = info
  assert.ok(width > 1600 && height > 900, "never substitute the 682×384 atlas tiles")
  const polygon = (points, color) => `<polygon fill="${color}" points="${points.map(([x, y]) => `${x * width},${y * height}`).join(" ")}"/>`
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="black"/>${polygon(composition.middle, "#800000")}${composition.foreground.map(p => polygon(p, "#ff0000")).join("")}</svg>`
  const mask = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer()
  const depth = Uint8Array.from({ length: width * height }, (_, p) => mask[p * 4] > 191 ? 2 : mask[p * 4] > 63 ? 1 : 0)
  const layers = splitLandscapePixels(new Uint8ClampedArray(data), depth, width, height, 16)
  const counts = [0, 0, 0]
  for (let p = 0; p < depth.length; p++) {
    counts[depth[p]]++
    let top = 2
    while (!layers[top][p * 4 + 3]) top--
    assert.equal(top, depth[p], `separation at pixel ${p}`)
    for (let c = 0; c < 4; c++) assert.equal(layers[top][p * 4 + c], data[p * 4 + c], `source pixel ${p}/${c}`)
  }
  assert.ok(counts.every(count => count > width * height * .01), "three real non-empty depth layers")
})

test("occluded edges extend only into nearer layers and never wrap across rows", () => {
  const pixels = new Uint8ClampedArray([10,0,0,255,20,0,0,255,30,0,0,255,40,0,0,255,50,0,0,255,60,0,0,255])
  const layers = splitLandscapePixels(pixels, new Uint8Array([0,1,2,0,1,2]), 3, 2, 1)
  assert.equal(layers[0][4], 10)
  assert.equal(layers[0][8 + 3], 0)
  assert.equal(layers[0][16], 40)
  assert.equal(layers[1][3], 0)
  assert.equal(layers[1][8], 20)
})
