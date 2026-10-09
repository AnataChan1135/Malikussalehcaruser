import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'

// Mengambil path dari tabel photos, lalu membuat signed URL sementara
// (bucket privat, jadi tidak ada URL publik langsung). Dimuat hanya saat
// komponen ini benar-benar dirender (detail sesi/pengisian dibuka).
export default function FotoAdmin({ photoId, label }) {
  const [url, setUrl] = useState(null)
  const [gagal, setGagal] = useState(false)

  useEffect(() => {
    if (!photoId) {
      setGagal(true)
      return
    }
    let aktif = true

    async function muat() {
      const { data: foto, error: errFoto } = await supabase
        .from('photos')
        .select('storage_path')
        .eq('id', photoId)
        .maybeSingle()

      if (!aktif) return
      if (errFoto || !foto) {
        setGagal(true)
        return
      }

      const { data: signed, error: errSigned } = await supabase.storage
        .from('foto-kuota')
        .createSignedUrl(foto.storage_path, 300)

      if (!aktif) return
      if (errSigned || !signed) {
        setGagal(true)
        return
      }
      setUrl(signed.signedUrl)
    }

    muat()
    return () => {
      aktif = false
    }
  }, [photoId])

  if (gagal) return <p className="pesan-error">Foto tidak bisa dimuat.</p>
  if (!url) return <p className="teks-kecil">Memuat foto...</p>

  return (
    <a href={url} target="_blank" rel="noreferrer" className="daftar-langkah">
      <p className="label">{label}</p>
      <img src={url} alt={label} className="admin-foto-pratinjau" />
    </a>
  )
}
