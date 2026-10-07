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

  // undefined = belum dimuat, null = gagal dimuat, object = hasil
  const [aal, setAal] = useState(undefined)

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

  // Status verifikasi dua langkah (TOTP). Dibutuhkan khusus oleh halaman admin.
  const segarkanAal = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    setAal(error ? null : data)
  }, [])

  useEffect(() => {
    if (!userId) {
      setAal(undefined)
      return
    }
    segarkanAal()
  }, [userId, segarkanAal])

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
    setProfilVersi((n) => n + 1)
  }

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
