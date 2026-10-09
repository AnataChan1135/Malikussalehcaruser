import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../auth/useAuth.js'
import { pesanError } from '../../lib/pesan.js'
import FormBuatAkun from '../../components/admin/FormBuatAkun.jsx'

export default function Pengguna() {
  const { profil } = useAuth()
  const superAdmin = profil?.role === 'super_admin'

  const [memuat, setMemuat] = useState(true)
  const [supir, setSupir] = useState([])
  const [tautan, setTautan] = useState({})
  const [mobilAktif, setMobilAktif] = useState([])
  const [formBuat, setFormBuat] = useState(false)

  async function muat() {
    setMemuat(true)
    const [{ data: p }, { data: va }, { data: v }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, nama, role, is_active, created_at')
        .eq('role', 'supir')
        .order('nama'),
      supabase.from('vehicle_accounts').select('profile_id, vehicles(plat_tampilan)'),
      supabase
        .from('vehicles')
        .select('id, plat_tampilan, jenis')
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('plat_tampilan'),
    ])

    const grup = {}
    for (const x of va ?? []) {
      if (!grup[x.profile_id]) grup[x.profile_id] = []
      grup[x.profile_id].push(x.vehicles?.plat_tampilan ?? '-')
    }

    setSupir(p ?? [])
    setTautan(grup)
    setMobilAktif(v ?? [])
    setMemuat(false)
  }

  useEffect(() => {
    muat()
  }, [])

  return (
    <div className="daftar-langkah">
      <div className="header">
        <h1 className="judul-besar">Pengguna</h1>
        {superAdmin && (
          <button
            className="tombol-sekunder admin-tombol-kecil"
            onClick={() => setFormBuat((v) => !v)}
          >
            {formBuat ? 'Tutup' : 'Buat Akun Supir'}
          </button>
        )}
      </div>

      {!superAdmin && (
        <p className="pesan-info">
          Anda masuk sebagai Admin Operasional. Pembuatan dan pengelolaan akun hanya
          bisa dilakukan Super Admin.
        </p>
      )}

      {formBuat && (
        <FormBuatAkun
          daftarMobil={mobilAktif}
          onSelesai={() => {
            setFormBuat(false)
            muat()
          }}
        />
      )}

      {memuat && <p className="teks-kecil">Memuat...</p>}
      {!memuat && supir.length === 0 && <p className="teks-kecil">Belum ada akun supir.</p>}

      <div className="daftar-langkah">
        {supir.map((s) => (
          <KartuSupir
            key={s.id}
            supir={s}
            mobil={tautan[s.id] ?? []}
            superAdmin={superAdmin}
            onSelesai={muat}
          />
        ))}
      </div>
    </div>
  )
}

function KartuSupir({ supir, mobil, superAdmin, onSelesai }) {
  const [memproses, setMemproses] = useState(false)
  const [pesan, setPesan] = useState(null)
  const [barcodeDiterbitkan, setBarcodeDiterbitkan] = useState(false)

  async function ubahStatus(aktif) {
    const alasan = window.prompt(
      aktif
        ? `Alasan mengaktifkan kembali ${supir.nama}:`
        : `Alasan menonaktifkan ${supir.nama}:`,
    )
    if (!alasan || alasan.trim().length < 5) return
    setMemproses(true)
    setPesan(null)
    const { error } = await supabase.rpc('set_status_akun', {
      p_profile: supir.id,
      p_aktif: aktif,
      p_alasan: alasan.trim(),
    })
    setMemproses(false)
    if (error) {
      setPesan(pesanError(error))
      return
    }
    onSelesai()
  }

  async function cetakUlangBarcode() {
    const alasan = window.prompt(`Alasan menerbitkan ulang barcode untuk ${supir.nama}:`)
    if (!alasan || alasan.trim().length < 5) return
    if (!window.confirm('Barcode lama langsung tidak berlaku. Lanjutkan?')) return

    setMemproses(true)
    setPesan(null)
    setBarcodeDiterbitkan(false)

    const { data, error } = await supabase.rpc('regenerate_barcode', {
      p_profile: supir.id,
      p_alasan: alasan.trim(),
    })
    setMemproses(false)

    if (error) {
      setPesan(pesanError(error))
      return
    }
    setBarcodeDiterbitkan(Boolean(data))
  }

  return (
    <div className={supir.is_active ? 'kartu daftar-langkah' : 'kartu-nonaktif daftar-langkah'}>
      <div className="header">
        <div>
          <p className="nama-plat">{supir.nama}</p>
          <p className="teks-kecil">
            {mobil.length > 0 ? mobil.join(', ') : 'Belum ditautkan ke mobil'}
          </p>
        </div>
        {!supir.is_active && <span className="lencana lencana-tunggu">Nonaktif</span>}
      </div>

      {pesan && <p className="pesan-error">{pesan}</p>}

      {barcodeDiterbitkan && (
        <p className="pesan-sukses">
          Barcode baru diterbitkan. Minta supir membuka aplikasi dan mencetak barcode
          dari menu barcode pribadi; token lama sudah tidak berlaku.
        </p>
      )}

      {superAdmin && (
        <div className="baris">
          {supir.is_active ? (
            <button
              className="tombol-sekunder admin-tombol-kecil"
              onClick={() => ubahStatus(false)}
              disabled={memproses}
            >
              Nonaktifkan
            </button>
          ) : (
            <button
              className="tombol-sekunder admin-tombol-kecil"
              onClick={() => ubahStatus(true)}
              disabled={memproses}
            >
              Aktifkan
            </button>
          )}
          <button
            className="tombol-sekunder admin-tombol-kecil"
            onClick={cetakUlangBarcode}
            disabled={memproses}
          >
            Terbitkan Ulang Barcode
          </button>
        </div>
      )}
    </div>
  )
}
