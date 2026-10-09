import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../auth/useAuth.js'
import FormTambahMobil from '../../components/admin/FormTambahMobil.jsx'
import KartuMobil from '../../components/admin/KartuMobil.jsx'

export default function Mobil() {
  const { profil } = useAuth()
  const superAdmin = profil?.role === 'super_admin'

  const [memuat, setMemuat] = useState(true)
  const [kendaraan, setKendaraan] = useState([])
  const [tautan, setTautan] = useState({})
  const [supir, setSupir] = useState([])
  const [formTambah, setFormTambah] = useState(false)
  const [diedit, setDiedit] = useState(null)
  const [ditautkan, setDitautkan] = useState(null)

  async function muat() {
    setMemuat(true)
    const [{ data: v }, { data: va }, { data: s }] = await Promise.all([
      supabase
        .from('vehicles')
        .select('id, plat_tampilan, jenis, nama_pemilik, kuota_default_liter, is_active, deleted_at')
        .is('deleted_at', null)
        .order('plat_tampilan'),
      supabase.from('vehicle_accounts').select('vehicle_id, profile_id, profiles(nama)'),
      supabase
        .from('profiles')
        .select('id, nama')
        .eq('role', 'supir')
        .eq('is_active', true)
        .order('nama'),
    ])

    const grup = {}
    for (const x of va ?? []) {
      if (!grup[x.vehicle_id]) grup[x.vehicle_id] = []
      grup[x.vehicle_id].push({ profile_id: x.profile_id, nama: x.profiles?.nama ?? '-' })
    }

    setKendaraan(v ?? [])
    setTautan(grup)
    setSupir(s ?? [])
    setMemuat(false)
  }

  useEffect(() => {
    muat()
  }, [])

  function selesaiAksi() {
    setFormTambah(false)
    setDiedit(null)
    setDitautkan(null)
    muat()
  }

  return (
    <div className="daftar-langkah">
      <div className="header">
        <h1 className="judul-besar">Mobil</h1>
        {superAdmin && (
          <button
            className="tombol-sekunder admin-tombol-kecil"
            onClick={() => setFormTambah((v) => !v)}
          >
            {formTambah ? 'Tutup' : 'Tambah Mobil'}
          </button>
        )}
      </div>

      {!superAdmin && (
        <p className="pesan-info">
          Anda masuk sebagai Admin Operasional. Data mobil hanya bisa dilihat, bukan
          diubah.
        </p>
      )}

      {formTambah && <FormTambahMobil onSelesai={selesaiAksi} />}

      {memuat && <p className="teks-kecil">Memuat...</p>}
      {!memuat && kendaraan.length === 0 && (
        <p className="teks-kecil">Belum ada mobil terdaftar.</p>
      )}

      <div className="daftar-langkah">
        {kendaraan.map((k) => (
          <KartuMobil
            key={k.id}
            mobil={k}
            supirTertaut={tautan[k.id] ?? []}
            daftarSupir={supir}
            superAdmin={superAdmin}
            editing={diedit === k.id}
            tauting={ditautkan === k.id}
            onEdit={() => setDiedit(diedit === k.id ? null : k.id)}
            onTaut={() => setDitautkan(ditautkan === k.id ? null : k.id)}
            onSelesai={selesaiAksi}
          />
        ))}
      </div>
    </div>
  )
}
