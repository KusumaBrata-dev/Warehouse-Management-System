# Wherehouse Inventory

## Run (Mobile-First)

1. Install semua dependency:
   - `npm run install:all`
2. Bootstrap database + admin:
   - `npm run bootstrap:mobile`
   - gunakan `npm run bootstrap:mobile:reset` hanya jika ingin reset struktur lokasi dari nol (destruktif)
3. Jalankan backend + Expo mobile sekaligus:
   - `npm run dev:mobile`
4. Buka Expo Go / emulator, lalu login:
   - username default: `admin`
   - password default: `admin12345`

Env opsional untuk ubah akun bootstrap:
- `SEED_ADMIN_USERNAME`
- `SEED_ADMIN_PASSWORD`
- `SEED_ADMIN_NAME`

## Testing Core Logic

- Unit test core:
  - `cd backend && npm test`
- Integration test DB (akan skip jika DB tidak aktif):
  - `cd backend && $env:RUN_INTEGRATION_TESTS="1"; npm run test:integration`
