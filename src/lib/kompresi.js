const MAKS_SISI_PX = 1280
const KUALITAS_WEBP = 0.8
const KUALITAS_JPEG = 0.85

function keBlob(canvas, tipe, kualitas) {
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), tipe, kualitas),
  )
}

// Mengambil frame langsung dari kamera (bukan galeri), lalu mengecilkannya ke WebP.
// Browser yang belum mendukung WebP (beberapa Safari lama) memakai JPEG kualitas tinggi.
export async function ambilFotoKompres(video) {
  const lebar = video.videoWidth
  const tinggi = video.videoHeight
  if (!lebar || !tinggi) throw new Error('KAMERA_BELUM_SIAP')

  const skala = Math.min(1, MAKS_SISI_PX / Math.max(lebar, tinggi))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(lebar * skala)
  canvas.height = Math.round(tinggi * skala)

  const ctx = canvas.getContext('2d')
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

  let blob = await keBlob(canvas, 'image/webp', KUALITAS_WEBP)
  if (blob && blob.type === 'image/webp') return { blob, ext: 'webp' }

  blob = await keBlob(canvas, 'image/jpeg', KUALITAS_JPEG)
  if (!blob) throw new Error('FOTO_GAGAL')
  return { blob, ext: 'jpg' }
}

export async function hitungSha256(blob) {
  const buffer = await blob.arrayBuffer()
  const hash = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
