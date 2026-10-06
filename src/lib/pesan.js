const PESAN = {
  BELUM_LOGIN: 'Sesi login habis. Silakan login ulang.',
  BARCODE_TIDAK_COCOK: 'Barcode ini bukan milik akun Anda.',
  MOBIL_TIDAK_TERDAFTAR: 'Mobil ini tidak terdaftar untuk akun Anda.',
  SESI_MASIH_AKTIF: 'Perjalanan sebelumnya belum selesai.',
  SESI_TIDAK_AKTIF: 'Sesi perjalanan sudah tidak aktif.',
  FOTO_TIDAK_DITEMUKAN: 'Foto belum terunggah. Silakan coba lagi.',
}

export function pesanError(err) {
  const teks = err?.message ?? ''
  if (teks.startsWith('PERLU_ALASAN')) {
    return 'Data ini perlu alasan sebelum bisa dikirim.'
  }
  return PESAN[teks] ?? 'Terjadi kesalahan. Silakan coba lagi.'
}
