// Perbaikan standar untuk Leaflet + bundler (Vite/webpack): tanpa ini,
// ikon marker default akan hilang/pecah karena path relatifnya tidak
// ditemukan oleh bundler. Cukup di-import sekali di tempat peta dipakai.
import L from 'leaflet'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl })
