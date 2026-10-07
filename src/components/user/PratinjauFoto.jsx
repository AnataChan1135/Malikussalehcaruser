import { useState } from 'react'

// Menampilkan foto yang sudah diambil. Kamera sudah dimatikan oleh komponen induk.
export default function PratinjauFoto({ foto, label, onUlangi, terkunci = false }) {
  const [url] = useState(() => URL.createObjectURL(foto.blob))

  return (
    <div className="daftar-langkah">
      <p className="label">{label}</p>
      <div className="kamera-wadah">
        <img src={url} alt={label} className="kamera-video" />
      </div>
      <button className="tombol-sekunder" onClick={onUlangi} disabled={terkunci}>
        Ulangi Foto
      </button>
    </div>
  )
}
