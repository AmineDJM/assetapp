/**
 * Génère les icônes PNG de l'application (PWA, favicon, écran d'accueil iOS).
 *
 * Aucune dépendance : l'encodeur PNG tient en une trentaine de lignes et
 * évite d'ajouter une bibliothèque d'images au projet. Le rendu est
 * suréchantillonné 4×4 par pixel pour des bords nets.
 *
 *   npm run generate:icons
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const INK = [24, 24, 27]
const WHITE = [255, 255, 255]

// ---------------------------------------------------------------------------
// Encodeur PNG (RGBA 8 bits)
// ---------------------------------------------------------------------------
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // profondeur
  ihdr[9] = 6 // RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  // Un octet de filtre (0 = aucun) par scanline.
  const raw = Buffer.alloc(height * (width * 4 + 1))
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ---------------------------------------------------------------------------
// Formes — fonctions de distance signée (négatif = à l'intérieur)
// ---------------------------------------------------------------------------
function roundedRect(x, y, cx, cy, halfW, halfH, radius) {
  const dx = Math.abs(x - cx) - (halfW - radius)
  const dy = Math.abs(y - cy) - (halfH - radius)
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0))
  return outside + Math.min(Math.max(dx, dy), 0) - radius
}

/**
 * « P » géométrique : un fût vertical et un demi-anneau.
 * Boîte englobante : largeur 0,52 × S, hauteur S.
 */
function letterP(x, y, cx, cy, size) {
  const left = cx - 0.26 * size
  const top = cy - 0.5 * size
  const stemW = 0.2 * size
  const outerR = 0.32 * size
  const innerR = 0.16 * size
  const bowlCx = left + stemW
  const bowlCy = top + outerR

  const stem = roundedRect(
    x,
    y,
    left + stemW / 2,
    top + size / 2,
    stemW / 2,
    size / 2,
    stemW / 2.6,
  )

  const distanceToCenter = Math.hypot(x - bowlCx, y - bowlCy)
  const ring = Math.max(distanceToCenter - outerR, innerR - distanceToCenter)
  // On ne garde que la moitié droite de l'anneau.
  const bowl = Math.max(ring, bowlCx - x)

  return Math.min(stem, bowl)
}

// ---------------------------------------------------------------------------
// Rendu
// ---------------------------------------------------------------------------
const SAMPLES = 4

function render(size, { background, inset }) {
  const rgba = Buffer.alloc(size * size * 4)
  const center = size / 2
  const markSize = size * (inset ? 0.42 : 0.52)
  const radius = size * 0.22

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let bgCoverage = 0
      let markCoverage = 0

      for (let sy = 0; sy < SAMPLES; sy += 1) {
        for (let sx = 0; sx < SAMPLES; sx += 1) {
          const px = x + (sx + 0.5) / SAMPLES
          const py = y + (sy + 0.5) / SAMPLES

          if (background) {
            const d = inset
              ? -1 // maskable : le fond couvre tout le carré
              : roundedRect(px, py, center, center, center, center, radius)
            if (d <= 0) bgCoverage += 1
          }
          if (letterP(px, py, center, center, markSize) <= 0) markCoverage += 1
        }
      }

      const total = SAMPLES * SAMPLES
      const bgAlpha = background ? bgCoverage / total : 0
      const markAlpha = markCoverage / total
      const alpha = Math.max(bgAlpha, markAlpha)

      const offset = (y * size + x) * 4
      if (alpha === 0) {
        rgba.writeUInt32BE(0, offset)
        continue
      }

      // La marque blanche est composée par-dessus le fond encre.
      for (let c = 0; c < 3; c += 1) {
        const color = background
          ? INK[c] * (1 - markAlpha) + WHITE[c] * markAlpha
          : WHITE[c]
        rgba[offset + c] = Math.round(color)
      }
      rgba[offset + 3] = Math.round(alpha * 255)
    }
  }

  return encodePng(size, size, rgba)
}

const OUTPUTS = [
  { path: 'public/icons/icon-192.png', size: 192, background: true, inset: false },
  { path: 'public/icons/icon-512.png', size: 512, background: true, inset: false },
  { path: 'public/icons/icon-maskable-512.png', size: 512, background: true, inset: true },
  // Android masque l'icône de badge : seule l'opacité compte.
  { path: 'public/icons/badge-96.png', size: 96, background: false, inset: false },
  { path: 'app/icon.png', size: 64, background: true, inset: false },
  { path: 'app/apple-icon.png', size: 180, background: true, inset: true },
]

for (const output of OUTPUTS) {
  const target = resolve(ROOT, output.path)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, render(output.size, output))
  console.log(`✓ ${output.path} (${output.size}×${output.size})`)
}
