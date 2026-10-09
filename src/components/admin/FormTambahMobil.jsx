import { useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { pesanError } from '../../lib/pesan.js'

export default function FormTambahMobil({ onSelesai }) {
  const [plat, setPlat] = useState('')
  const [jenis, setJenis] = useState('')
  const [pemilik, setPemilik] = useState('')
  const [kuotaDefault, setKuotaDefault] = useState('')
  const [memproses, setMemproses] = useState(false)
  const [pesan, setPesan] = useState(null)

  async function simpan(e) {
    e.preventDefault()
    setMemproses(true)
    setPesan(null)

    const { error } = await supabase.rpc('buat_mobil', {
      p_plat: plat,
      p_jenis: jenis,
      p_pemilik: pemilik,
      p_kuota_default: kuotaDefault === '' ? null : Number(kuotaDefault),
    })
    setMemproses(false)

    if (error) {
      setPesan(
        error.code === '23505' ? 'Plat nomor ini sudah terdaftar.' : pesanError(error),
      )
      return
    }
    onSelesai()
  }

  return (
    <form className="kartu daftar-langkah" onSubmit={simpan}>
      <h2 className="judul">Tambah Mobil Baru</h2>

      <div>
        <label className="label" htmlFor="plat-baru">Plat Nomor</label>
        <input
          id="plat-baru"
          className="input"
          value={plat}
          onChange={(e) => setPlat(e.target.value)}
          placeholder="BL 1234 AA"
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="jenis-baru">Jenis Mobil</label>
        <input
          id="jenis-baru"
          className="input"
          value={jenis}
          onChange={(e) => setJenis(e.target.value)}
          placeholder="Avanza"
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="pemilik-baru">Nama Pemilik</label>
        <input
          id="pemilik-baru"
          className="input"
          value={pemilik}
          onChange={(e) => setPemilik(e.target.value)}
          placeholder="Universitas Malikussaleh"
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="kuota-default-baru">
          Kuota Default (liter/minggu)
        </label>
        <input
          id="kuota-default-baru"
          type="number"
          min="0"
          step="0.5"
          className="input"
          value={kuotaDefault}
          onChange={(e) => setKuotaDefault(e.target.value)}
          placeholder="Kosongkan jika belum ditentukan"
        />
        <p className="teks-kecil">
          Dipakai sistem untuk membuat usulan kuota otomatis setiap Senin.
        </p>
      </div>

      {pesan && <p className="pesan-error">{pesan}</p>}

      <button type="submit" className="tombol" disabled={memproses}>
        {memproses ? 'Menyimpan...' : 'Simpan Mobil'}
      </button>
    </form>
  )
}
