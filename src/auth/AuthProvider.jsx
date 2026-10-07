import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { AuthContext } from './AuthContext.js'

const KOLOM_PROFIL = 'id, nama, role, is_active'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [siap, setSiap] = useState(false)
  // Profil disimpan bersama userId, sehingga data user lama tidak pernah dipakai untuk user baru
  const [profilState, setProfilState] = useState({
    userId: null,
    status: 'memuat',
    data: null,
  })
  const [versi, setVersi] = useState(0)

  // Sesi awal dan perubahan login/logout
  useEffect(() => {
    let aktif = true

    supabase.auth.getSession().then(({ data }) => {
      if (!aktif) return
      setSession(data.session ?? null)
      setSiap(true)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (aktif) setSession(s ?? null)
    })

    return () => {
      aktif = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const userId = session?.user?.id ?? null

  // Ambil profil setiap user berubah atau saat diminta ulang
  useEffect(() => {
    if (!userId) return
    let aktif = true

    supabase
      .from('profiles')
      .select(KOLOM_PROFIL)
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!aktif) return

        if (error) {
          // Detail error hanya untuk developer, tidak ditampilkan ke user
          if (import.meta.env.DEV) console.error('[profil]', error)
          setProfilState({ userId, status: 'gagal', data: null })
          return
        }

        setProfilState({
          userId,
          status: data ? 'ada' : 'kosong',
          data: data ?? null,
        })
      })

    return () => {
      aktif = false
    }
  }, [userId, versi])

  // Status yang berlaku hanya jika profil itu milik user yang sedang login
  let statusProfil = 'memuat'
  let profil = null

  if (!userId) {
    statusProfil = 'tanpa-sesi'
  } else if (profilState.userId === userId) {
    statusProfil = profilState.status
    profil = profilState.status === 'ada' ? profilState.data : null
  }

  const signOut = () => supabase.auth.signOut()
  const ulangiProfil = () => {
    setProfilState((s) => ({ ...s, status: 'memuat' }))
    setVersi((n) => n + 1)
  }

  return (
    <AuthContext.Provider
      value={{ session, profil, statusProfil, siap, signOut, ulangiProfil }}
    >
      {children}
    </AuthContext.Provider>
  )
}