import { useEffect, useRef } from 'react'
import L from 'leaflet'
import '../../lib/leafletIcons.js'

// Menampilkan titik lokasi satu sesi di peta OpenStreetMap, diurutkan
// menurut waktu, dengan garis putus-putus penghubung sebagai penanda
// urutan saja (bukan rute jalan sebenarnya). Tidak ada penilaian otomatis
// di sini — admin yang menilai sendiri kewajarannya.
export default function PetaSesi({ titik }) {
  const elRef = useRef(null)

  useEffect(() => {
    if (!elRef.current || titik.length === 0) return

    const peta = L.map(elRef.current, { scrollWheelZoom: false })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(peta)

    const titikUrut = [...titik].sort((a, b) => new Date(a.waktu) - new Date(b.waktu))
    const garis = []

    titikUrut.forEach((t, i) => {
      const marker = L.marker([t.lat, t.lng]).addTo(peta)
      marker.bindPopup(`<strong>${i + 1}. ${t.label}</strong><br/>${t.keterangan ?? ''}`)
      garis.push([t.lat, t.lng])
    })

    if (garis.length > 1) {
      L.polyline(garis, { color: '#0b5ea8', weight: 3, dashArray: '6 6' }).addTo(peta)
      peta.fitBounds(garis, { padding: [30, 30] })
    } else {
      peta.setView(garis[0], 15)
    }

    return () => {
      peta.remove()
    }
  }, [titik])

  if (titik.length === 0) {
    return <p className="teks-kecil">Tidak ada titik lokasi untuk sesi ini.</p>
  }

  return <div ref={elRef} className="admin-peta" />
}
