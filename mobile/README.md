# Warehouse Mobile (Expo)

## Jalankan

1. Dari root project, jalankan mode mobile:
   - `npm run bootstrap:mobile` (sekali untuk setup DB + admin)
   - `npm run bootstrap:mobile:reset` jika butuh reset struktur lokasi (destruktif)
   - `npm run dev:mobile`
2. Atau jalankan terpisah:
   - backend: `cd ../backend && npm run dev`
   - mobile: `npm run start`
3. Atur URL backend (opsional jika auto-detect gagal):
   - Windows PowerShell: `$env:EXPO_PUBLIC_API_URL="http://<ip-lokal-anda>:3002/api"`

Resolusi URL default:
- prioritas `EXPO_PUBLIC_API_URL`
- host Expo LAN + port `3002`
- fallback Android emulator: `http://10.0.2.2:3002/api`
- fallback platform lain: `http://localhost:3002/api`

## Flow yang tersedia

- Dashboard ringkas (`/stock`)
- Daftar inventory + search/filter (`/stock`)
- Detail item + riwayat transaksi (`/products/:id`, `/transactions`)
- Form transaksi Stock In/Out/Adjust/Move (`/transactions`)
- Session login persisten (token disimpan di perangkat)

## Login default bootstrap

- username: `admin`
- password: `admin12345`
