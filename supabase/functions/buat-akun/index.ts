// Edge Function: buat-akun
// Membuat akun login (Supabase Auth) + profil + barcode (jika supir) sekaligus.
// Hanya bisa dipanggil oleh akun Super Admin yang sudah terverifikasi (aal2).
//
// Deploy: npx supabase functions deploy buat-akun
// Tidak perlu mengatur secret manual: SUPABASE_URL, SUPABASE_ANON_KEY, dan
// SUPABASE_SERVICE_ROLE_KEY sudah disuntikkan otomatis oleh Supabase.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

const ROLE_VALID = ['supir', 'admin_operasional', 'super_admin']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'BELUM_LOGIN' }, 401)
    }

    // Klien yang mewakili SI PEMANGGIL (memakai token mereka sendiri).
    // Dipakai untuk memastikan identitas dan status verifikasi dua langkah.
    const sebagaiPemanggil = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: userData, error: userErr } = await sebagaiPemanggil.auth.getUser()
    if (userErr || !userData?.user) {
      return jsonResponse({ error: 'BELUM_LOGIN' }, 401)
    }

    const { data: aal } = await sebagaiPemanggil.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aal?.currentLevel !== 'aal2') {
      return jsonResponse({ error: 'PERLU_MFA' }, 403)
    }

    // Klien dengan hak penuh (service role). Dipakai setelah identitas
    // pemanggil dipastikan sah di atas, bukan sebelum itu.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: pemanggil, error: pemanggilErr } = await admin
      .from('profiles')
      .select('role, is_active')
      .eq('id', userData.user.id)
      .maybeSingle()

    if (pemanggilErr || !pemanggil || pemanggil.role !== 'super_admin' || !pemanggil.is_active) {
      return jsonResponse({ error: 'HANYA_SUPER_ADMIN' }, 403)
    }

    const body = await req.json().catch(() => null)
    if (!body) return jsonResponse({ error: 'DATA_TIDAK_VALID' }, 400)

    const nama = String(body.nama ?? '').trim()
    const email = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')
    const role = String(body.role ?? '')
    const vehicleId = body.vehicleId ? String(body.vehicleId) : null

    if (!nama || !email || !password || !role) {
      return jsonResponse({ error: 'DATA_TIDAK_LENGKAP' }, 400)
    }
    if (!ROLE_VALID.includes(role)) {
      return jsonResponse({ error: 'ROLE_TIDAK_VALID' }, 400)
    }
    if (password.length < 8) {
      return jsonResponse({ error: 'PASSWORD_TERLALU_PENDEK' }, 400)
    }

    const { data: userBaru, error: buatErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (buatErr || !userBaru?.user) {
      const kode = buatErr?.message?.toLowerCase().includes('already registered')
        ? 'EMAIL_SUDAH_TERDAFTAR'
        : 'GAGAL_MEMBUAT_AKUN'
      return jsonResponse({ error: kode }, 400)
    }

    const userId = userBaru.user.id

    const { error: profilErr } = await admin.from('profiles').insert({
      id: userId,
      nama,
      role,
      is_active: true,
      created_by: userData.user.id,
    })

    if (profilErr) {
      // Profil gagal dibuat: batalkan akun login yang sudah terlanjur dibuat,
      // supaya tidak ada akun "setengah jadi" yang menggantung.
      await admin.auth.admin.deleteUser(userId)
      return jsonResponse({ error: 'GAGAL_MEMBUAT_PROFIL' }, 500)
    }

    if (role === 'supir') {
      const { error: barcodeErr } = await admin
        .from('driver_barcodes')
        .insert({ profile_id: userId })
      if (barcodeErr) {
        // Akun tetap sah walau ini gagal; barcode bisa diterbitkan ulang
        // kapan saja dari halaman Pengguna.
        console.error('Gagal membuat barcode awal:', barcodeErr)
      }

      if (vehicleId) {
        const { error: tautErr } = await admin
          .from('vehicle_accounts')
          .insert({ vehicle_id: vehicleId, profile_id: userId, assigned_by: userData.user.id })
        if (tautErr) {
          console.error('Gagal menautkan mobil saat pembuatan akun:', tautErr)
        }
      }
    }

    await admin.from('audit_logs').insert({
      actor_id: userData.user.id,
      aksi: 'buat_akun',
      tabel: 'profiles',
      record_id: userId,
      detail: { email, nama, role, vehicle_id: vehicleId },
    })

    return jsonResponse({ id: userId }, 200)
  } catch (e) {
    console.error(e)
    return jsonResponse({ error: 'KESALAHAN_SERVER' }, 500)
  }
})
