import { useEffect, useRef, useState } from 'react'
import { ambilFotoKompres, hitungSha256 } from '../../lib/kompresi.js'

// Komponen ini HANYA membuka kamera perangkat. Tidak ada input file / galeri.
export default function KameraFoto({ onSelesai }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [siap, setSiap] = useState(false)
  const [pratinjau, setPratinjau] = useState(null)
  const [error, setError] = useState(() =>
    navigator.mediaDevices?.getUserMedia
      ? null
      : 'Kamera tidak didukung di browser ini.',
  )
  const [memproses, setMemproses] = useState(false)

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) return

    let aktif = true

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      .then((stream) => {
        if (!aktif) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
        setSiap(true)
      })
      .catch(() => {
        if (aktif) {
          setError(
            'Kamera tidak bisa dibuka. Izinkan akses kamera lalu muat ulang halaman.',
          )
        }
      })

    return () => {
      aktif = false
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  // Membebaskan memori URL pratinjau saat diganti atau komponen dilepas
  useEffect(() => {
    return () => {
      if (pratinjau) URL.revokeObjectURL(pratinjau)
    }
  }, [pratinjau])

  async function ambil() {
    const video = videoRef.current
    if (!video || !siap) return

    setMemproses(true)
    setError(null)
    try {
      const { blob, ext } = await ambilFotoKompres(video)
      const sha256 = await hitungSha256(blob)
      setPratinjau(URL.createObjectURL(blob))
      onSelesai({ blob, ext, sha256, bytes: blob.size })
    } catch {
      setError('Foto gagal diproses. Silakan coba lagi.')
    } finally {
      setMemproses(false)
    }
  }

  function ulangi() {
    setPratinjau(null)
    onSelesai(null)
  }

  return (
    <div className="daftar-langkah">
      {error && <p className="pesan-error">{error}</p>}

      <div className="kamera-wadah">
        <video
          ref={videoRef}
          playsInline
          muted
          className={pratinjau ? 'kamera-video kamera-sembunyi' : 'kamera-video'}
        />
        {pratinjau && (
          <img src={pratinjau} alt="Pratinjau foto odometer" className="kamera-video" />
        )}
      </div>

      {pratinjau ? (
        <button className="tombol-sekunder" onClick={ulangi}>
          Ulangi Foto
        </button>
      ) : (
        <button className="tombol" onClick={ambil} disabled={!siap || memproses}>
          {memproses ? 'Memproses...' : 'Ambil Foto'}
        </button>
      )}
    </div>
  )
}
