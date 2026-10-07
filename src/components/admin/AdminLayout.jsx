import { NavLink } from 'react-router-dom'

const MENU = [
  { to: '/admin', label: 'Ringkasan', end: true },
  { to: '/admin/mobil', label: 'Mobil' },
  { to: '/admin/pengguna', label: 'Pengguna' },
  { to: '/admin/sesi', label: 'Sesi & Meteran' },
  { to: '/admin/isi-minyak', label: 'Isi Minyak' },
  { to: '/admin/alasan', label: 'Alasan & Laporan' },
  { to: '/admin/kuota', label: 'Kuota' },
  { to: '/admin/peta', label: 'Peta Lokasi' },
  { to: '/admin/audit', label: 'Audit Log' },
  { to: '/admin/ekspor', label: 'Ekspor' },
]

const MENU_SUPER_ADMIN = [{ to: '/admin/pengaturan', label: 'Pengaturan' }]

export default function AdminLayout({ profil, onKeluar, children }) {
  const menu = profil.role === 'super_admin' ? [...MENU, ...MENU_SUPER_ADMIN] : MENU

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div>
          <p className="judul">Kuota BBM Mobil Dinas</p>
          <p className="teks-kecil">
            {profil.nama} -{' '}
            {profil.role === 'super_admin' ? 'Super Admin' : 'Admin Operasional'}
          </p>
        </div>
        <button className="tombol-sekunder admin-tombol-keluar" onClick={onKeluar}>
          Keluar
        </button>
      </header>

      <nav className="admin-nav">
        {menu.map((m) => (
          <NavLink
            key={m.to}
            to={m.to}
            end={m.end}
            className={({ isActive }) =>
              isActive ? 'admin-nav-link admin-nav-link-aktif' : 'admin-nav-link'
            }
          >
            {m.label}
          </NavLink>
        ))}
      </nav>

      <main className="admin-konten">{children}</main>
    </div>
  )
}
