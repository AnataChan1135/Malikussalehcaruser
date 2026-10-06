import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../../lib/supabase.js'

export default function ModalBarcode({ onTutup }) {
  const [token, setToken] = useState(null)
  const [gagal, setGagal] = useState(false)

  useEffect(() => {
    supabase.rpc('get_my_barcode').then(({ data, error }) => {
      if (error || !data) setGagal(true)
      else setToken(data)
    })
  }, [])

  return (
    <div className="overlay" onClick={onTutup}>
      <div className="panel-modal area-cetak" onClick={(e) => e.stopPropagation()}>
        <h2 className="judul">Barcode Saya</h2>
        <p className="teks-kecil">
          Tunjukkan saat memulai perjalanan. Jangan bagikan ke orang lain.
        </p>

        <div className="kotak-barcode">
          {token && <QRCodeSVG value={token} size={220} level="M" />}
          {!token && !gagal && <p className="teks-kecil">Memuat...</p>}
          {gagal && <p className="pesan-error">Barcode gagal dimuat.</p>}
        </div>

        <div className="daftar-langkah">
          <button
            className="tombol-sekunder"
            onClick={() => window.print()}
            disabled={!token}
          >
            Cetak
          </button>
          <button className="tombol" onClick={onTutup}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
