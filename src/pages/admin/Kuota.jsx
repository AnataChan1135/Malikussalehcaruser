import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../auth/useAuth.js'
import { mingguIniWIB, tambahHari, formatTanggalPendek } from '../../lib/waktu.js'
import { pesanError } from '../../lib/pesan.js'

const HARI_LABEL = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']

export default function Kuota() {
  const { profil } = useAuth()
  const superAdmin = profil?.role === 'super_admin'

  const [offsetMinggu, setOffsetMinggu] = useState(0)
  const minggu = tambahHari(mingguIniWIB(), offsetMinggu * 7)

  const [memuat, setMemuat] = useState(true)
  const [kendaraan, setKendaraan] = useState([])
  const [kuotaPerMobil, setKuotaPerMobil] = useState({})
  const [jadwal, setJadwal] = useState(null)
  const [pesan, setPesan] = useState(null)
  const [memproses, setMemproses] = useState(false)

  async function muat() {
    setMemuat(true)
    setPesan(null)
    const [{ data: v }, { data: k }, { data: p }] = await Promise.all([
      supabase
        .from('vehicles')
        .select('id, plat_tampilan, jenis, kuota_default_liter')
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('plat_tampilan'),
      supabase.rpc('kuota_minggu_admin', { p_week: minggu }),
      supabase.from('pengaturan').select('nilai').eq('kunci', 'kuota_jadwal').maybeSingle(),
    ])
    const peta = Object.fromEntries((k ?? []).map((x) => [x.vehicle_id, x]))
    setKendaraan(v ?? [])
    setKuotaPerMobil(peta)
    setJadwal(p?.nilai ?? { aktif: false, hari: 1, jam: '00:00' })
    setMemuat(false)
  }

  useEffect(() => {
    muat()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minggu])

  const adaYangMenunggu = Object.values(kuotaPerMobil).some((k) => k.status_kuota === 'menunggu')

  async function terimaSemua() {
    setMemproses(true)
    setPesan(null)
    const { error } = await supabase.rpc('setujui_semua_kuota', { p_week: minggu })
    setMemproses(false)
    if (error) {
      setPesan(pesanError(error))
      return
    }
    muat()
  }

  async function setujuiSatu(vehicleId) {
    setMemproses(true)
    setPesan(null)
    const { error } = await supabase.rpc('setujui_kuota', { p_vehicle: vehicleId, p_week: minggu })
    setMemproses(false)
    if (error) {
      setPesan(pesanError(error))
      return
    }
    muat()
  }

  return (
    <div className="daftar-langkah">
      <h1 className="judul-besar">Kuota</h1>

      <div className="baris">
        <button
          className="tombol-sekunder admin-tombol-kecil"
          onClick={() => setOffsetMinggu((o) => o - 1)}
        >
          Minggu Sebelumnya
        </button>
        <span className="lencana lencana-info">Minggu {formatTanggalPendek(minggu)}</span>
        <button
          className="tombol-sekunder admin-tombol-kecil"
          onClick={() => setOffsetMinggu((o) => o + 1)}
          disabled={offsetMinggu >= 0}
        >
          Minggu Berikutnya
        </button>
        {offsetMinggu !== 0 && (
          <button className="tombol-sekunder admin-tombol-kecil" onClick={() => setOffsetMinggu(0)}>
            Kembali ke Minggu Ini
          </button>
        )}
      </div>

      {pesan && <p className="pesan-error">{pesan}</p>}

      {adaYangMenunggu && (
        <div className="kartu daftar-langkah">
          <p className="judul">Ada Usulan Kuota Menunggu Persetujuan</p>
          <button className="tombol" onClick={terimaSemua} disabled={memproses}>
            {memproses ? 'Memproses...' : 'Terima Semua'}
          </button>
        </div>
      )}

      {memuat && <p className="teks-kecil">Memuat...</p>}

      <div className="daftar-langkah">
        {kendaraan.map((v) => (
          <KartuKuota
            key={`${v.id}-${minggu}`}
            mobil={v}
            data={kuotaPerMobil[v.id]}
            minggu={minggu}
            superAdmin={superAdmin}
            onSetujui={() => setujuiSatu(v.id)}
            onSelesai={muat}
            memprosesGlobal={memproses}
          />
        ))}
      </div>

      {superAdmin && <JadwalOtomatis jadwal={jadwal} onSelesai={muat} />}
    </div>
  )
}

function KartuKuota({ mobil, data, minggu, superAdmin, onSetujui, onSelesai, memprosesGlobal }) {
  const [editing, setEditing] = useState(false)
  const [nilai, setNilai] = useState(data?.quota_liter ?? mobil.kuota_default_liter ?? '')
  const [alasan, setAlasan] = useState('')
  const [memproses, setMemproses] = useState(false)
  const [pesan, setPesan] = useState(null)

  async function simpan(e) {
    e.preventDefault()
    if (alasan.trim().length < 5) {
      setPesan('Alasan wajib diisi, minimal 5 karakter.')
      return
    }
    if (nilai === '' || Number(nilai) < 0) {
      setPesan('Nilai kuota tidak valid.')
      return
    }
    setMemproses(true)
    setPesan(null)
    const { error } = await supabase.rpc('set_kuota_mingguan', {
      p_vehicle: mobil.id,
      p_week: minggu,
      p_nilai: Number(nilai),
      p_alasan: alasan.trim(),
    })
    setMemproses(false)
    if (error) {
      setPesan(pesanError(error))
      return
    }
    setEditing(false)
    setAlasan('')
    onSelesai()
  }

  return (
    <div className="kartu daftar-langkah">
      <div className="header">
        <div>
          <p className="nama-plat">{mobil.plat_tampilan}</p>
          <p className="teks-kecil">{mobil.jenis}</p>
        </div>
        {data?.status_kuota === 'menunggu' && (
          <span className="lencana lencana-tunggu">Menunggu Persetujuan</span>
        )}
      </div>

      {!data ? (
        <p className="teks-kecil">Belum ada kuota untuk minggu ini.</p>
      ) : (
        <p className="teks-kecil">
          Kuota: {Number(data.quota_liter).toFixed(1)} L · Terpakai:{' '}
          {Number(data.terpakai_liter).toFixed(1)} L · Sisa: {Number(data.sisa_liter).toFixed(1)} L
        </p>
      )}

      {pesan && <p className="pesan-error">{pesan}</p>}

      <div className="baris">
        {data?.status_kuota === 'menunggu' && (
          <button
            className="tombol-sekunder admin-tombol-kecil"
            onClick={onSetujui}
            disabled={memprosesGlobal}
          >
            Setujui
          </button>
        )}
        {superAdmin && (
          <button
            className="tombol-sekunder admin-tombol-kecil"
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? 'Batal' : 'Atur Manual'}
          </button>
        )}
      </div>

      {editing && (
        <form className="daftar-langkah" onSubmit={simpan}>
          <input
            type="number"
            min="0"
            step="0.5"
            className="input"
            value={nilai}
            onChange={(e) => setNilai(e.target.value)}
            placeholder="Liter untuk minggu ini"
          />
          <input
            className="input"
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            placeholder="Alasan"
          />
          <button type="submit" className="tombol" disabled={memproses}>
            {memproses ? 'Menyimpan...' : 'Simpan (otomatis disetujui)'}
          </button>
        </form>
      )}
    </div>
  )
}

function JadwalOtomatis({ jadwal, onSelesai }) {
  const [aktif, setAktif] = useState(jadwal?.aktif ?? false)
  const [hari, setHari] = useState(jadwal?.hari ?? 1)
  const [jam, setJam] = useState(jadwal?.jam ?? '00:00')
  const [alasan, setAlasan] = useState('')
  const [memproses, setMemproses] = useState(false)
  const [pesan, setPesan] = useState(null)
  const [sukses, setSukses] = useState(false)

  useEffect(() => {
    setAktif(jadwal?.aktif ?? false)
    setHari(jadwal?.hari ?? 1)
    setJam(jadwal?.jam ?? '00:00')
  }, [jadwal])

  async function simpan(e) {
    e.preventDefault()
    if (alasan.trim().length < 5) {
      setPesan('Alasan wajib diisi, minimal 5 karakter.')
      return
    }
    setMemproses(true)
    setPesan(null)
    setSukses(false)
    const { error } = await supabase.rpc('atur_jadwal_kuota', {
      p_aktif: aktif,
      p_hari: Number(hari),
      p_jam: jam,
      p_alasan: alasan.trim(),
    })
    setMemproses(false)
    if (error) {
      setPesan(pesanError(error))
      return
    }
    setAlasan('')
    setSukses(true)
    onSelesai()
  }

  return (
    <form className="kartu daftar-langkah" onSubmit={simpan}>
      <h2 className="judul">Jadwalkan Persetujuan Otomatis</h2>
      <p className="teks-kecil">
        Jika aktif, sistem otomatis menyetujui seluruh usulan kuota minggu berjalan
        pada hari dan jam yang ditentukan (WIB), tanpa perlu diklik manual setiap
        minggu.
      </p>

      <label className="baris">
        <input type="checkbox" checked={aktif} onChange={(e) => setAktif(e.target.checked)} />
        <span className="teks-kecil">Aktifkan jadwal otomatis</span>
      </label>

      <div>
        <label className="label">Hari</label>
        <select className="input" value={hari} onChange={(e) => setHari(e.target.value)}>
          {HARI_LABEL.slice(1).map((h, i) => (
            <option key={i + 1} value={i + 1}>
              {h}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Jam (WIB)</label>
        <input type="time" className="input" value={jam} onChange={(e) => setJam(e.target.value)} />
      </div>

      <div>
        <label className="label">Alasan Perubahan</label>
        <input className="input" value={alasan} onChange={(e) => setAlasan(e.target.value)} />
      </div>

      {pesan && <p className="pesan-error">{pesan}</p>}
      {sukses && <p className="pesan-sukses">Jadwal tersimpan.</p>}

      <button type="submit" className="tombol" disabled={memproses}>
        {memproses ? 'Menyimpan...' : 'Simpan Jadwal'}
      </button>
    </form>
  )
}
