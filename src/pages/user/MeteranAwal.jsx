import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../auth/useAuth.js'
import { ambilLokasi } from '../../lib/lokasi.js'
import { ambilGrant, hapusGrant } from '../../lib/scanHariIni.js'
import { pesanError, parseKodeAlasan } from '../../lib/pesan.js'
import KameraFoto from '../../components/user/KameraFoto.jsx'
import AlasanForm from '../../components/user/AlasanForm.jsx'

function perangkatInfo() {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    layar: `${window.innerWidth}x${window.innerHeight}`,
    pwa: window.matchMedia('(display-mode: standalone)').matches,
  }
}

export default function MeteranAwal() {
  const nav = useNavigate()
  const { profil } = useAuth()

  // Nilai ini tetap sama selama halaman terbuka, termasuk saat kirim ulang
  const [grantId] = useState(() => ambilGrant(profil.id))
  const [clientId] = useState(() => crypto.randomUUID())

  const [muat, setMuat] = useState(true)
  const [kendaraan, setKendaraan] = useState([])

  const [foto, setFoto] = useState(null) // { blob, ext, sha256, bytes }
  const [fotoPath, setFotoPath] = useState(null)
  const [km, setKm] = useState('')
  const [bar, setBar] = useState('')
  const [liter, setLiter] = useState('')
  const [vehicleId, setVehicleId] = useState('')

  const [kodeAlasan, setKodeAlasan] = useState(null)
  const [sedangKirim, setSedangKirim] = useState(false)
  const [pesan, setPesan] = useState(null)

  useEffect(() => {
    let aktif = true

    Promise.all([
      supabase.from('sessions').select('id').eq('status', 'aktif').maybeSingle(),
      supabase.from('vehicles').select('id, plat_tampilan, jenis, nama_pemilik'),
    ]).then(([{ data: sesiAktif }, { data: daftar }]) => {
      if (!aktif) return
      // Sudah ada perjalanan berjalan: kembali ke beranda
      if (sesiAktif) {
        nav('/', { replace: true })
        return
      }
      setKendaraan(daftar ?? [])
      setMuat(false)
    })

    return () => {
      aktif = false
    }
  }, [nav])

  function gantiFoto(hasil) {
    setFoto(hasil)
    // Foto baru harus diunggah ulang, jadi path lama dibuang
    setFotoPath(null)
  }

  const angkaValid =
    km !== '' &&
    bar !== '' &&
    liter !== '' &&
    Number.isInteger(Number(km)) &&
    Number(km) >= 0 &&
    Number.isInteger(Number(bar)) &&
    Number(bar) >= 0 &&
    Number(liter) >= 0

  const siapKirim = Boolean(foto && vehicleId && angkaValid) && !sedangKirim

  async function kirim(alasanBaru = null) {
    setPesan(null)
    if (!grantId) {
      setPesan('Scan barcode dulu sebelum memulai perjalanan.')
      return
    }

    setSedangKirim(true)
    try {
      const lok = await ambilLokasi()

      // Foto diunggah sekali. Jika data perlu alasan, foto tidak diunggah ulang.
      let path = fotoPath
      if (!path) {
        path = `${profil.id}/${clientId}/odometer-${crypto.randomUUID()}.${foto.ext}`
        const { error: errUnggah } = await supabase.storage
          .from('foto-kuota')
          .upload(path, foto.blob, {
            contentType: foto.blob.type,
            upsert: false,
          })
        if (errUnggah) throw new Error('FOTO_GAGAL')
        setFotoPath(path)
      }

      const { error } = await supabase.rpc('mulai_sesi', {
        p_client: clientId,
        p_grant: grantId,
        p_vehicle: vehicleId,
        p_data: {
          km: Number(km),
          bar: Number(bar),
          liter: Number(liter),
          foto_path: path,
          foto_sha256: foto.sha256,
          foto_bytes: foto.bytes,
          lat: lok.lat,
          lng: lok.lng,
          akurasi_m: lok.akurasi_m,
          waktu_perangkat: new Date().toISOString(),
          dari_offline: false,
          perangkat: perangkatInfo(),
          alasan_jenis: alasanBaru?.jenis ?? null,
          alasan_isi: alasanBaru?.isi ?? null,
        },
      })
      if (error) throw error

      hapusGrant(profil.id)
      nav('/', { replace: true })
    } catch (err) {
      const kode = parseKodeAlasan(err)
      if (kode) {
        setKodeAlasan(kode)
      } else {
        setPesan(pesanError(err))
      }
    } finally {
      setSedangKirim(false)
    }
  }

  if (muat) {
    return <div className="layar-tengah teks-kecil">Memuat...</div>
  }

  if (!grantId) {
    return (
      <div className="halaman-tengah">
        <p className="pesan-peringatan">
          Scan barcode terlebih dahulu sebelum memulai perjalanan.
        </p>
        <Link className="tombol" to="/scan">
          Scan Barcode
        </Link>
        <Link className="tombol-sekunder" to="/">
          Kembali
        </Link>
      </div>
    )
  }

  return (
    <div className="halaman">
      <header className="header">
        <Link className="tombol-sekunder" to="/">
          Kembali
        </Link>
        <h1 className="judul">Kilometer Awal</h1>
      </header>

      <section className="daftar-langkah">
        <h2 className="judul">1. Foto Odometer</h2>
        <p className="pesan-info">
          Sekalian foto indikator bar BBM dan jumlah liter pada dashboard, jika
          terlihat.
        </p>
        <KameraFoto onSelesai={gantiFoto} />
      </section>

      <section className="daftar-langkah">
        <h2 className="judul">2. Isi Angka dari Dashboard</h2>

        <div>
          <label className="label" htmlFor="km">Kilometer</label>
          <input
            id="km"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            className="input"
            value={km}
            onChange={(e) => setKm(e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="bar">Bar BBM</label>
          <input
            id="bar"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            className="input"
            value={bar}
            onChange={(e) => setBar(e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="liter">Liter BBM</label>
          <input
            id="liter"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            className="input"
            value={liter}
            onChange={(e) => setLiter(e.target.value)}
          />
        </div>
      </section>

      <section className="daftar-langkah">
        <h2 className="judul">3. Pilih Mobil</h2>

        {kendaraan.length === 0 ? (
          <p className="pesan-peringatan">
            Belum ada mobil yang terhubung dengan akun Anda. Hubungi admin.
          </p>
        ) : (
          <select
            className="input"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
          >
            <option value="">Pilih mobil</option>
            {kendaraan.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plat_tampilan} - {v.jenis} ({v.nama_pemilik})
              </option>
            ))}
          </select>
        )}
      </section>

      {pesan && <p className="pesan-error">{pesan}</p>}

      {kodeAlasan ? (
        <AlasanForm
          kode={kodeAlasan}
          memproses={sedangKirim}
          onKirim={(alasan) => kirim(alasan)}
        />
      ) : (
        <button
          className="tombol"
          disabled={!siapKirim}
          onClick={() => kirim()}
        >
          {sedangKirim ? 'Menyimpan...' : 'Mulai Perjalanan'}
        </button>
      )}
    </div>
  )
}
