// Penanda tampilan saja. Verifikasi sebenarnya dilakukan server.
const hariWIB = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

const kunci = (userId) => `scan-ok-${userId}`

export const tandaScanHariIni = (userId) =>
  localStorage.setItem(kunci(userId), hariWIB())

export const sudahScanHariIni = (userId) =>
  localStorage.getItem(kunci(userId)) === hariWIB()
