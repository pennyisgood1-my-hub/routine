// SVG → PNG 아이콘 생성 (192/512 + maskable 512). `npm run icons`
import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const svg = readFileSync(join(root, 'public', 'favicon.svg'))
const outDir = join(root, 'public', 'icons')
mkdirSync(outDir, { recursive: true })

await sharp(svg).resize(192, 192).png().toFile(join(outDir, 'icon-192.png'))
await sharp(svg).resize(512, 512).png().toFile(join(outDir, 'icon-512.png'))

// maskable: 안전 영역(80%) 안에 아이콘, 바깥은 배경색으로 채움
const inner = await sharp(svg).resize(410, 410).png().toBuffer()
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#6d28d9' } })
  .composite([{ input: inner, gravity: 'centre' }])
  .png()
  .toFile(join(outDir, 'icon-512-maskable.png'))

console.log('icons written to public/icons')
