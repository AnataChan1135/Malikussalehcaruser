// Semua tampilan tanggal dan jam memakai WIB, sesuai aturan kuota
const ZONA = 'Asia/Jakarta'

export function formatTanggal(iso) {
  return new Date(iso).toLocaleDateString('id-ID', {
    timeZone: ZONA,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatTanggalPendek(iso) {
  return new Date(iso).toLocaleDateString('id-ID', {
    timeZone: ZONA,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatJam(iso) {
  return new Date(iso).toLocaleTimeString('id-ID', {
    timeZone: ZONA,
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Kunci pengelompokan per hari, format YYYY-MM-DD (WIB)
export function hariWIB(iso) {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: ZONA })
}
