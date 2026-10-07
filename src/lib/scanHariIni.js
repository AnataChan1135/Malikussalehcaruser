// Menyimpan grant hasil scan di sessionStorage (per tab).
// Di sisi klien berlaku 9 menit; server berlaku 10 menit dan hanya sekali pakai.
const MASA_BERLAKU_MS = 9 * 60 * 1000
const kunci = (userId) => `grant-scan-${userId}`

export function tandaScanHariIni(userId, grantId) {
  sessionStorage.setItem(
    kunci(userId),
    JSON.stringify({ grantId, sampai: Date.now() + MASA_BERLAKU_MS }),
  )
}

export function ambilGrant(userId) {
  try {
    const mentah = sessionStorage.getItem(kunci(userId))
    if (!mentah) return null
    const { grantId, sampai } = JSON.parse(mentah)
    if (!grantId || Date.now() > sampai) {
      sessionStorage.removeItem(kunci(userId))
      return null
    }
    return grantId
  } catch {
    return null
  }
}

export function hapusGrant(userId) {
  sessionStorage.removeItem(kunci(userId))
}

export const sudahScanHariIni = (userId) => ambilGrant(userId) !== null
