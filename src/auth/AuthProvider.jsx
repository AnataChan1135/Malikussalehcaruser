import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { AuthContext } from './AuthContext.js'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [siap, setSiap] = useState(false)
  const [profilMentah, setProfilMentah] = useState({
    userId: null,
    data: null,
    error: null,
  })
  const [muatUlang, setMuatUlang] = useState(0)

  // Sesi awal dan perubahan login/logout
  useEffect(() => {
    let aktif = true

    supabase.auth.getSession().then(({ data }) => {
      if (!aktif) return
      setSession(data.session)
      setSiap(true)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })

    return () => {
      aktif = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const userId = session?.user?.id ?? null

  // Ambil profil saat user berubah atau saat diminta muat ulang
  useEffect(() => {
    if (!userId) return
    let aktif = true

    supabase
      .from('profiles')
      .select('id, nama, role, is_active')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!aktif) return
        setProfilMentah({
          userId,
          data: data ?? null,
          error: error ? `${error.code ?? ''} ${error.message}`.trim() : null,
        })
      })

    return () => {
      aktif = false
    }
  }, [userId, muatUlang])

  const cocok = userId && profilMentah.userId === userId

  // undefined = belum dimuat, null = tidak ditemukan / error
  const profil = cocok ? profilMentah.data : undefined
  const profilError = cocok ? profilMentah.error : null

  const signOut = () => supabase.auth.signOut()
  const ulangiProfil = () => setMuatUlang((n) => n + 1)

  return (
    <AuthContext.Provider
      value={{ session, profil, profilError, siap, signOut, ulangiProfil }}
    >
      {children}
    </AuthContext.Provider>
  )
}