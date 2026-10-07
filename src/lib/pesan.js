const PESAN = {
  BELUM_LOGIN: 'Sesi login habis. Silakan login ulang.',
  SCAN_KADALUARSA: 'Hasil scan sudah kedaluwarsa. Silakan scan barcode ulang.',
  BARCODE_TIDAK_COCOK: 'Barcode ini bukan milik akun Anda.',
  MOBIL_TIDAK_TERDAFTAR: 'Mobil ini tidak terdaftar untuk akun Anda.',
  SESI_MASIH_AKTIF: 'Perjalanan sebelumnya belum selesai.',
  SESI_TIDAK_AKTIF: 'Sesi perjalanan sudah tidak aktif.',
  FOTO_TIDAK_DITEMUKAN: 'Foto belum terunggah. Silakan coba lagi.',
  FOTO_GAGAL: 'Foto gagal diunggah. Silakan coba lagi.',
  KAMERA_BELUM_SIAP: 'Kamera belum siap. Tunggu sebentar lalu coba lagi.',
  DATA_TIDAK_VALID: 'Data tidak valid. Silakan muat ulang halaman.',
  REVIEW_TIDAK_TERSEDIA: 'Review untuk perjalanan ini sudah ditutup.',
}

// Keterangan singkat untuk setiap tanda pemeriksaan
export const KODE_TANDA = {
  KM_MUNDUR: 'Kilometer lebih kecil dari catatan terakhir.',
  BAR_NAIK_TANPA_ISI: 'Bar BBM naik, padahal tidak ada pengisian.',
  LITER_NAIK_TANPA_ISI: 'Liter BBM naik, padahal tidak ada pengisian.',
  KM_MUNDUR_ISI: 'Kilometer saat isi lebih kecil dari catatan terakhir.',
  ISI_BAR_TIDAK_NAIK: 'Bar BBM tidak naik setelah pengisian.',
  ISI_LITER_TIDAK_NAIK: 'Liter BBM tidak naik setelah pengisian.',
}

// Mengambil daftar kode dari pesan PERLU_ALASAN, atau null jika bukan itu
export function parseKodeAlasan(err) {
  const teks = err?.message ?? ''
  const cocok = teks.match(/^PERLU_ALASAN:\s*(.*)$/)
  if (!cocok) return null
  return cocok[1].split(',').map((s) => s.trim()).filter(Boolean)
}

export function pesanError(err) {
  const teks = err?.message ?? ''
  if (teks.startsWith('GPS')) {
    return 'Lokasi wajib aktif. Izinkan lokasi lalu coba lagi.'
  }
  return PESAN[teks] ?? 'Terjadi kesalahan. Silakan coba lagi.'
}
