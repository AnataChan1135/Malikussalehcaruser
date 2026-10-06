import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../auth/useAuth.js'
import { ambilLokasi } from '../../lib/lokasi.js'
import { tandaScanHariIni } from '../../lib/scanHariIni.js'
import { pesanError } from '../../lib/pesan.js'

const ID_PEMBACA = 'pembaca-barcode'

export default function Scan() {
  const nav = useNavigate()
  const { profil } = useAuth()
  const [pesan, setPesan] = useState(null)
  const [memproses, setMemproses] = useState(false)
  const [versi, setVersi] = useState(0)
  const sudahDiproses = useRef(false)

  useEffect(() => {
    sudahDiproses.current = false
    const scanner = new Html5Qrcode(ID_PEMBACA)

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (teks) => {
          if (sudahDiproses.current) return
          sudahDiproses.current = true
          await scanner.stop().catch(() => {})
          setMemproses(true)

          try {
            const lok = await ambilLokasi()
            const { data: cocok, error } = await supabase.rpc('scan_barcode', {
              p_token: teks,
              p_lat: lok.lat,
              p_lng: lok.lng,
              p_akurasi: lok.akurasi_m,
            })
            if (error) throw error

            if (cocok) {
              tandaScanHariIni(profil.id)
              nav('/', { replace: true })
            } else {
              setPesan('Barcode ini bukan milik akun Anda.')
            }
          } catch (err) {
            setPesan(
              err.message?.startsWith('GPS')
                ? 'Lokasi wajib aktif untuk scan. Izinkan lokasi lalu coba lagi.'
                : pesanError(err),
            )
          } finally {
            setMemproses(false)
          }
        },
        () => {},
      )
      .catch(() => {
        setPesan(
          'Kamera tidak bisa dibuka. Izinkan akses kamera lalu muat ulang halaman.',
        )
      })

    return () => {
      scanner
        .stop()
        .catch(() => {})
        .finally(() => {
          try {
            scanner.clear()
          } catch {
            // scanner sudah dibersihkan
          }
        })
    }
  }, [versi, nav, profil])

  function scanUlang() {
    setPesan(null)
    setVersi((v) => v + 1)
  }

  return (
    <div className="halaman">
      <header className="header">
        <Link className="tombol-sekunder" to="/">
          Kembali
        </Link>
        <h1 className="judul">Scan Barcode</h1>
      </header>

      <p className="teks-kecil">
        Arahkan kamera ke barcode pribadi Anda. Barcode harus milik akun yang
        sedang login.
      </p>

      <div id={ID_PEMBACA} className="kamera-kotak" />

      {memproses && <p className="teks-kecil">Memverifikasi barcode...</p>}

      {pesan && (
        <div className="daftar-langkah">
          <p className="pesan-error">{pesan}</p>
          <button className="tombol" onClick={scanUlang}>
            Scan Ulang
          </button>
        </div>
      )}
    </div>
  )
}