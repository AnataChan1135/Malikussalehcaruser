import { useState } from 'react'
import { KODE_TANDA } from '../../lib/pesan.js'

const PILIHAN_JENIS = [
  { value: 'indikator_rusak', label: 'Indikator BBM atau odometer bermasalah' },
  { value: 'lupa_foto', label: 'Lupa mengambil foto sebelumnya' },
  { value: 'koreksi_km', label: 'Koreksi kilometer' },
  { value: 'lainnya', label: 'Lainnya' },
]

export default function AlasanForm({ kode, onKirim, memproses }) {
  const [jenis, setJenis] = useState('')
  const [isi, setIsi] = useState('')
  const valid = jenis !== '' && isi.trim().length >= 5

  function kirim(e) {
    e.preventDefault()
    if (!valid || memproses) return
    onKirim({ jenis, isi: isi.trim() })
  }

  return (
    <form className="kartu daftar-langkah" onSubmit={kirim}>
      <h2 className="judul">Perlu Alasan</h2>
      <p className="teks-kecil">
        Data berikut tidak sesuai dengan catatan sebelumnya. Isi alasan agar data
        bisa dikirim. Admin akan memeriksanya.
      </p>

      {kode.map((k) => (
        <p key={k} className="pesan-peringatan">
          {KODE_TANDA[k] ?? k}
        </p>
      ))}

      <div>
        <label className="label" htmlFor="jenis-alasan">Jenis alasan</label>
        <select
          id="jenis-alasan"
          className="input"
          value={jenis}
          onChange={(e) => setJenis(e.target.value)}
        >
          <option value="">Pilih alasan</option>
          {PILIHAN_JENIS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="isi-alasan">Penjelasan</label>
        <textarea
          id="isi-alasan"
          className="textarea"
          rows={3}
          value={isi}
          onChange={(e) => setIsi(e.target.value)}
          placeholder="Jelaskan kondisi sebenarnya"
        />
      </div>

      <button type="submit" className="tombol" disabled={!valid || memproses}>
        {memproses ? 'Mengirim...' : 'Kirim dengan Alasan'}
      </button>
    </form>
  )
}
