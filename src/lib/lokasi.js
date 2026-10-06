export function ambilLokasi() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('GPS_TIDAK_TERSEDIA'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          akurasi_m: p.coords.accuracy,
        }),
      () => reject(new Error('GPS_DITOLAK')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  })
}
