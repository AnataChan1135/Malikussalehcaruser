import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { AuthContext } from './AuthContext.js'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [siap, setSiap] = useState(false)
  const [profilMentah, setProfilMentah] = useState({ userId: null, data: null })

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

  // Ambil profil hanya saat user berubah
  useEffect(() => {
    if (!userId) return
    let aktif = true

    supabase
      .from('profiles')
      .select('id, nama, role, is_active')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (aktif) setProfilMentah({ userId, data: data ?? null })
      })

    return () => {
      aktif = false
    }
  }, [userId])

  // undefined = belum dimuat, null = tidak ditemukan
  const profil =
    userId && profilMentah.userId === userId ? profilMentah.data : undefined

  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ session, profil, siap, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
