import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { formatTanggal, formatJam } from '../../lib/waktu.js'

const AKSI_LABEL = {
  buat_mobil: 'Buat mobil',
  ubah: 'Ubah data',
  set_kuota: 'Atur kuota',
  setujui_kuota: 'Setujui kuota',
  atur_jadwal_kuota: 'Atur jadwal kuota',
  tautkan_mobil: 'Tautkan mobil',
  lepas_tautan_mobil: 'Lepas tautan mobil',
  set_status_akun: 'Ubah status akun',
  putuskan_review: 'Putuskan laporan',
  buat_akun: 'Buat akun',
  hapus_riwayat: 'Hapus riwayat',
  sisa_hangus: 'Catat sisa kuota hangus',
}

export default function AuditLog() {
  const [memuat, setMemuat] = useState(true)
  const [daftar, setDaftar] = useState([])
  const [cari, setCari] = useState('')

  async function muat() {
    setMemuat(true)
    const { data: logs } = await supabase
      .from('audit_logs')
      .select('id, actor_id, aksi, tabel, record_id, detail, created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    // audit_logs.actor_id sengaja tidak punya foreign key (lihat skema),
    // jadi nama pelaku diambil terpisah lalu digabung di sisi klien.
    const idUnik = [...new Set((logs ?? []).map((l) => l.actor_id).filter(Boolean))]
    let namaPeta = {}
    if (idUnik.length > 0) {
      const { data: profil } = await supabase.from('profiles').select('id, nama').in('id', idUnik)
      namaPeta = Object.fromEntries((profil ?? []).map((p) => [p.id, p.nama]))
    }

    setDaftar(
      (logs ?? []).map((l) => ({
        ...l,
        actor_nama: l.actor_id ? (namaPeta[l.actor_id] ?? 'Akun terhapus') : 'Sistem (otomatis)',
      })),
    )
    setMemuat(false)
  }

  useEffect(() => {
    muat()
  }, [])

  const difilter = daftar.filter((l) => {
    const teks = `${l.aksi} ${l.tabel ?? ''} ${l.actor_nama}`.toLowerCase()
    return teks.includes(cari.toLowerCase())
  })

  return (
    <div className="daftar-langkah">
      <h1 className="judul-besar">Audit Log</h1>
      <p className="teks-kecil">
        Menampilkan 100 aktivitas terbaru. Catatan ini bersifat permanen — tidak
        bisa diubah atau dihapus oleh siapa pun, termasuk Super Admin.
      </p>

      <input
        className="input"
        placeholder="Cari aksi, tabel, atau nama..."
        value={cari}
        onChange={(e) => setCari(e.target.value)}
      />

      {memuat && <p className="teks-kecil">Memuat...</p>}
      {!memuat && difilter.length === 0 && <p className="teks-kecil">Tidak ada data.</p>}

      <div className="daftar-langkah">
        {difilter.map((l) => (
          <div key={l.id} className="kartu daftar-langkah">
            <div className="header">
              <div>
                <p className="nama-plat">{AKSI_LABEL[l.aksi] ?? l.aksi}</p>
                <p className="teks-kecil">
                  {l.actor_nama} · {formatTanggal(l.created_at)} {formatJam(l.created_at)}
                </p>
              </div>
              {l.tabel && <span className="lencana lencana-info">{l.tabel}</span>}
            </div>
            {l.detail && <pre className="admin-json">{JSON.stringify(l.detail, null, 2)}</pre>}
          </div>
        ))}
      </div>
    </div>
  )
}
