// Semua tampilan tanggal dan jam memakai WIB, sesuai aturan kuota.
// WIB tidak memakai DST, jadi offset UTC+7 selalu tetap.
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

// Tanggal Senin (00:00 WIB) dari minggu berjalan, format YYYY-MM-DD.
// Dipakai di sisi admin untuk mencocokkan week_start di database,
// yang dihitung server dengan app_minggu(now()) memakai zona yang sama.
export function mingguIniWIB() {
  const now = new Date()

  const bagian = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(now)

  const ambil = (tipe) => bagian.find((p) => p.type === tipe)?.value
  const tahun = Number(ambil('year'))
  const bulan = Number(ambil('month'))
  const hari = Number(ambil('day'))
  const indeksHari = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[
    ambil('weekday')
  ] ?? 1

  const senin = new Date(Date.UTC(tahun, bulan - 1, hari))
  senin.setUTCDate(senin.getUTCDate() - (indeksHari - 1))
  return senin.toISOString().slice(0, 10)
}
