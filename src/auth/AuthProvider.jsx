import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { AuthContext } from './AuthContext.js'

const KOLOM_PROFIL = 'id, nama, role, is_active'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [siap, setSiap] = useState(false)

  const [profilState, setProfilState] = useState({
    userId: null,
    status: 'memuat',
    data: null,
  })
  const [profilVersi, setProfilVersi] = useState(0)

  // data: undefined = belum dimuat, null = gagal dimuat, object = hasil
  const [aalState, setAalState] = useState({ userId: null, data: undefined })
  const [aalVersi, setAalVersi] = useState(0)

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

  // Ambil profil setiap user berubah atau saat diminta ulang.
  // Saat !userId, efek ini sengaja TIDAK memanggil setState sama sekali.
  // Nilai "statusProfil"/"profil" di bawah diturunkan saat render, bukan
  // di-reset lewat pemanggilan setState langsung di sini.
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
  }, [userId, profilVersi])

  // Status verifikasi dua langkah (TOTP). Pola sama persis dengan profil
  // di atas: efek tidak pernah memanggil setState pada cabang !userId.
  useEffect(() => {
    if (!userId) return
    let aktif = true

    supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data, error }) => {
      if (!aktif) return
      setAalState({ userId, data: error ? null : data })
    })

    return () => {
      aktif = false
    }
  }, [userId, aalVersi])

  // Diturunkan saat render: jika userId berubah (termasuk menjadi null saat
  // logout) sebelum hasil fetch untuk userId itu tersedia, nilai efektifnya
  // otomatis undefined tanpa perlu setState tambahan.
  let statusProfil = 'memuat'
  let profil = null
  if (!userId) {
    statusProfil = 'tanpa-sesi'
  } else if (profilState.userId === userId) {
    statusProfil = profilState.status
    profil = profilState.status === 'ada' ? profilState.data : null
  }

  const aal = userId && aalState.userId === userId ? aalState.data : undefined

  const signOut = () => supabase.auth.signOut()

  const ulangiProfil = () => {
    setProfilState((s) => ({ ...s, status: 'memuat' }))
    setProfilVersi((n) => n + 1)
  }

  // Memicu pengambilan ulang status aal lewat efek di atas (fire-and-forget).
  // Tetap aman dipanggil dengan "await" di tempat lain karena nilai bukan
  // Promise tidak masalah di-"await".
  const segarkanAal = useCallback(() => {
    setAalVersi((n) => n + 1)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        session,
        profil,
        statusProfil,
        siap,
        aal,
        segarkanAal,
        signOut,
        ulangiProfil,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
