import { useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { pesanError } from '../../lib/pesan.js'

export default function KartuMobil({
  mobil,
  supirTertaut,
  daftarSupir,
  superAdmin,
  editing,
  tauting,
  onEdit,
  onTaut,
  onSelesai,
}) {
  const [plat, setPlat] = useState(mobil.plat_tampilan)
  const [jenis, setJenis] = useState(mobil.jenis)
  const [pemilik, setPemilik] = useState(mobil.nama_pemilik)
  const [kuotaDefault, setKuotaDefault] = useState(mobil.kuota_default_liter ?? '')
  const [alasanEdit, setAlasanEdit] = useState('')
  const [supirDipilih, setSupirDipilih] = useState('')
  const [alasanTaut, setAlasanTaut] = useState('')
  const [memproses, setMemproses] = useState(false)
  const [pesan, setPesan] = useState(null)

  async function simpanEdit(e) {
    e.preventDefault()
    if (alasanEdit.trim().length < 5) {
      setPesan('Alasan wajib diisi, minimal 5 karakter.')
      return
    }
    setMemproses(true)
    setPesan(null)

    const { error } = await supabase.rpc('ubah_mobil', {
      p_vehicle: mobil.id,
      p_perubahan: {
        plat_tampilan: plat,
        jenis,
        nama_pemilik: pemilik,
        kuota_default_liter: kuotaDefault === '' ? null : Number(kuotaDefault),
      },
      p_alasan: alasanEdit.trim(),
    })
    setMemproses(false)

    if (error) {
      setPesan(
        error.code === '23505' ? 'Plat nomor ini sudah dipakai mobil lain.' : pesanError(error),
      )
      return
    }
    onSelesai()
  }

  async function ubahStatus(aktif) {
    const alasan = window.prompt(
      aktif ? 'Alasan mengaktifkan kembali mobil ini:' : 'Alasan menonaktifkan mobil ini:',
    )
    if (!alasan || alasan.trim().length < 5) return
    setMemproses(true)
    setPesan(null)
    const { error } = await supabase.rpc('ubah_mobil', {
      p_vehicle: mobil.id,
      p_perubahan: { is_active: aktif },
      p_alasan: alasan.trim(),
    })
    setMemproses(false)
    if (error) {
      setPesan(pesanError(error))
      return
    }
    onSelesai()
  }

  async function hapusMobil() {
    const alasan = window.prompt('Alasan menghapus mobil ini (data lama tetap tersimpan):')
    if (!alasan || alasan.trim().length < 5) return
    if (!window.confirm(`Yakin menghapus ${mobil.plat_tampilan}?`)) return
    setMemproses(true)
    setPesan(null)
    const { error } = await supabase.rpc('hapus_mobil', {
      p_vehicle: mobil.id,
      p_alasan: alasan.trim(),
    })
    setMemproses(false)
    if (error) {
      setPesan(pesanError(error))
      return
    }
    onSelesai()
  }

  async function tautkanSupir(e) {
    e.preventDefault()
    if (!supirDipilih) return
    if (alasanTaut.trim().length < 5) {
      setPesan('Alasan wajib diisi, minimal 5 karakter.')
      return
    }
    setMemproses(true)
    setPesan(null)
    const { error } = await supabase.rpc('tautkan_mobil', {
      p_vehicle: mobil.id,
      p_profile: supirDipilih,
      p_alasan: alasanTaut.trim(),
    })
    setMemproses(false)
    if (error) {
      setPesan(pesanError(error))
      return
    }
    onSelesai()
  }

  async function lepasSupir(profileId, nama) {
    const alasan = window.prompt(`Alasan melepas ${nama} dari mobil ini:`)
    if (!alasan || alasan.trim().length < 5) return
    setMemproses(true)
    setPesan(null)
    const { error } = await supabase.rpc('lepas_tautan_mobil', {
      p_vehicle: mobil.id,
      p_profile: profileId,
      p_alasan: alasan.trim(),
    })
    setMemproses(false)
    if (error) {
      setPesan(pesanError(error))
      return
    }
    onSelesai()
  }

  const supirBelumTertaut = daftarSupir.filter(
    (s) => !supirTertaut.some((t) => t.profile_id === s.id),
  )

  return (
    <div className={mobil.is_active ? 'kartu daftar-langkah' : 'kartu-nonaktif daftar-langkah'}>
      <div className="header">
        <div>
          <p className="nama-plat">{mobil.plat_tampilan}</p>
          <p className="teks-kecil">
            {mobil.jenis} - {mobil.nama_pemilik}
          </p>
        </div>
        {!mobil.is_active && <span className="lencana lencana-tunggu">Nonaktif</span>}
      </div>

      <p className="teks-kecil">
        Kuota default:{' '}
        {mobil.kuota_default_liter != null
          ? `${mobil.kuota_default_liter} liter/minggu`
          : 'belum diatur'}
      </p>

      <div className="daftar-langkah">
        <p className="label">Supir yang terhubung</p>
        {supirTertaut.length === 0 && (
          <p className="teks-kecil">Belum ada supir yang ditautkan.</p>
        )}
        {supirTertaut.map((t) => (
          <div key={t.profile_id} className="baris">
            <span className="lencana lencana-info">{t.nama}</span>
            {superAdmin && (
              <button
                className="tombol-sekunder admin-tombol-kecil"
                onClick={() => lepasSupir(t.profile_id, t.nama)}
                disabled={memproses}
              >
                Lepas
              </button>
            )}
          </div>
        ))}
      </div>

      {pesan && <p className="pesan-error">{pesan}</p>}

      {superAdmin && (
        <div className="baris">
          <button
            className="tombol-sekunder admin-tombol-kecil"
            onClick={onEdit}
            disabled={memproses}
          >
            {editing ? 'Batal Edit' : 'Edit'}
          </button>
          <button
            className="tombol-sekunder admin-tombol-kecil"
            onClick={onTaut}
            disabled={memproses}
          >
            {tauting ? 'Batal' : 'Tautkan Supir'}
          </button>
          {mobil.is_active ? (
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
            className="tombol-sekunder admin-tombol-kecil admin-tombol-bahaya"
            onClick={hapusMobil}
            disabled={memproses}
          >
            Hapus
          </button>
        </div>
      )}

      {editing && (
        <form className="daftar-langkah" onSubmit={simpanEdit}>
          <div>
            <label className="label">Plat</label>
            <input className="input" value={plat} onChange={(e) => setPlat(e.target.value)} />
          </div>
          <div>
            <label className="label">Jenis</label>
            <input className="input" value={jenis} onChange={(e) => setJenis(e.target.value)} />
          </div>
          <div>
            <label className="label">Nama Pemilik</label>
            <input
              className="input"
              value={pemilik}
              onChange={(e) => setPemilik(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Kuota Default (liter/minggu)</label>
            <input
              type="number"
              min="0"
              step="0.5"
              className="input"
              value={kuotaDefault}
              onChange={(e) => setKuotaDefault(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Alasan Perubahan</label>
            <input
              className="input"
              value={alasanEdit}
              onChange={(e) => setAlasanEdit(e.target.value)}
            />
          </div>
          <button type="submit" className="tombol" disabled={memproses}>
            {memproses ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </form>
      )}

      {tauting && (
        <form className="daftar-langkah" onSubmit={tautkanSupir}>
          <div>
            <label className="label">Pilih Supir</label>
            <select
              className="input"
              value={supirDipilih}
              onChange={(e) => setSupirDipilih(e.target.value)}
            >
              <option value="">Pilih supir</option>
              {supirBelumTertaut.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Alasan</label>
            <input
              className="input"
              value={alasanTaut}
              onChange={(e) => setAlasanTaut(e.target.value)}
            />
          </div>
          <button type="submit" className="tombol" disabled={memproses || !supirDipilih}>
            {memproses ? 'Menautkan...' : 'Tautkan'}
          </button>
        </form>
      )}
    </div>
  )
}
