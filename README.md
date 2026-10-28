# RIVHÉ Atelier — rivhe.com

Toko online untuk produk crochet handmade. Setiap barang hanya ada **satu per warna per model**: begitu dibayar, langsung *Sold out*. Tidak ada pre-order, tidak ada rating/testimoni.

**Stack:** Next.js 16 (App Router, TypeScript) · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage) · Vercel

---

## Fitur

**Pembeli (mobile-first)**
- Beranda dengan hero slider + tagline, *New arrivals*, katalog dengan filter & pencarian. Filter kategori selalu menampilkan kelimanya: Bags, Table Runners, Scrunchies, Tissue Box Covers, Pouches (daftar tetap di `src/lib/categories.ts`)
- Halaman produk: galeri swipe, **zoom** (hover-zoom di desktop, pinch/double-tap di HP), deskripsi + *The story*, Details/Shipping/Care
- **Harga dalam USD** (harga utama, diisi di admin), dengan tombol **USD | IDR**. Rupiah dihitung dari **kurs realtime** (Coinbase, cadangan open.er-api.com & currency-api, diperbarui tiap 10 menit) dan dibulatkan ke ribuan. Kurs dikunci saat pembeli memilih ongkir, jadi nominal transfer tidak berubah di tengah checkout. Pembayaran selalu transfer IDR.
- Checkout langsung di web tanpa akun: **Alamat → Ongkir (otomatis) → Pembayaran → Review → Place Order**
- **Transfer bank dengan 2 digit terakhir diganti `17`** (contoh: IDR 1,160,000 → **IDR 1,160,017**). Logo bank tampil bila namanya dikenali (saat ini Mandiri). Pesanan ke luar negeri juga menampilkan **SWIFT code** dan catatan agar memilih biaya *OUR*
- Halaman status pesanan dan *Track your order* (nomor order + email), dilindungi captcha **ALTCHA**: proof-of-work di browser, tanpa akun atau key pihak ketiga, dan tiap solusi hanya bisa dipakai sekali
- Halaman About / Shipping & Returns / Care / Terms (bisa diedit dari admin)

**Admin (`/admin`, mobile-first dengan tab bar bawah)**
- Overview: pesanan yang menunggu transfer / perlu dikirim, omzet bulan ini, checklist setup
- Pesanan: konfirmasi pembayaran (→ receipt otomatis ke email pembeli **dan** penjual), input resi (→ email ke pembeli), selesai, cancel, catatan pribadi, salin alamat untuk label, riwayat email
- Produk: upload foto dari HP (otomatis di-resize), urutkan foto, harga dalam USD (pratinjau Rupiah dari kurs live), kategori, *Story*, status Draft / Available / Sold
- Halaman konten, foto beranda, rekening bank + SWIFT code & angka unik, kurs live, ongkir (JNE/SiCepat dalam negeri; DHL Express & Aramex via Pos Indonesia untuk luar negeri), ganti password
- Email: alamat penerima notifikasi order dan email kontak pembeli diatur sendiri oleh admin, dan alamat baru baru aktif setelah kode 6 digit yang dikirim ke alamat itu dimasukkan. Ada juga tombol email test

## Alur pesanan

```
Place order ──► pending_payment ──(admin konfirmasi / Moota)──► paid ──(input resi)──► shipped ──► completed
   barang: reserved                 barang: sold
                     └─(lewat 24 jam tanpa bayar)──► expired, barang kembali available
```

- Saat order dibuat, barang langsung **di-reserve** (tidak bisa dibeli orang lain) — ditampilkan "Reserved" di toko.
- Jika transfer tidak masuk dalam batas waktu (default 24 jam, bisa diubah), order otomatis *expired* dan barang dijual lagi.
- Semua perubahan stok terjadi di dalam fungsi Postgres yang atomik (`supabase/migrations`), jadi barang yang sama tidak mungkin terjual dua kali.

**Email yang dikirim**

| Kapan | Ke pembeli | Ke penjual |
|---|---|---|
| Order dibuat | *Your Order Confirmation* + instruksi transfer | *New Order Received* |
| Pembayaran dikonfirmasi | *Payment Received — Receipt* | *Payment Confirmed — ready to ship* |
| Resi diinput | *Your order is on its way* | — |

---

## Setup

### 1. Install

```bash
npm install
cp .env.example .env.local   # lalu isi nilainya
```

### 2. Database Supabase

Jalankan migrasi dan data awal ke project Supabase. Pilih salah satu:

- **Skrip bawaan** (disarankan): isi `SUPABASE_DB_URL` di `.env.local` (Dashboard → **Connect** → *Session pooler*, dengan password DB), lalu:
  ```bash
  npm run db:seed      # pertama kali: migrasi + 2 produk contoh
  npm run db:migrate   # berikutnya: hanya migrasi baru di supabase/migrations
  ```
- **SQL Editor**: buka Supabase → SQL Editor, tempel isi `supabase/migrations/20261027000000_init.sql`, Run. Lalu tempel `supabase/seed.sql`, Run.
- **Supabase CLI**: `npx supabase db push --db-url "<connection string>" --include-seed`

Skrip dan CLI mencatat migrasi di tabel yang sama, jadi keduanya bisa dipakai bergantian.

Migrasi membuat tabel, fungsi order, keamanan (RLS + revoke dari role publik), dan bucket Storage publik `media` untuk foto.

### 3. Akun admin

1. Supabase → **Authentication → Users → Add user** (email + password, centang *Auto confirm*).
2. Masukkan email tersebut ke `ADMIN_EMAILS` (pisahkan dengan koma untuk lebih dari satu admin).
3. Disarankan: Authentication → Sign In / Providers → matikan **Allow new users to sign up**.

### 4. Jalankan

```bash
npm run dev        # http://localhost:3000  ·  admin: http://localhost:3000/admin
```

---

## Deploy ke Vercel

1. Import repo ini di Vercel.
2. Isi **Environment Variables** sesuai `.env.example` (minimal: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `ADMIN_EMAILS`).
3. Samakan region: `vercel.json` menjalankan server di **Singapore (`sin1`)**, region yang sama dengan project Supabase — ubah jika project Supabase Anda di region lain.
4. Tambahkan domain **rivhe.com** di Project → Settings → Domains.

## Integrasi (opsional, tapi disarankan sebelum live)

| Fitur | Env | Tanpa ini |
|---|---|---|
| Kirim email | `RESEND_API_KEY` (disarankan, lihat *Email toko* di bawah) **atau** `SMTP_URL` | Email tidak terkirim, hanya tersimpan & bisa dilihat di halaman order admin |
| Ongkir live JNE/SiCepat/AnterAja/J&T | `BITESHIP_API_KEY` + kode pos asal di Settings | Ongkir dihitung dari tabel estimasi per wilayah kode pos |
| Pencocokan transfer otomatis | `MOOTA_WEBHOOK_SECRET`, webhook Moota → `https://rivhe.com/api/webhooks/moota` | Admin menekan *Confirm payment received* setelah cek mutasi rekening |

> Webhook Moota mengikuti format umum Moota (array mutasi, header `Signature` HMAC-SHA256). Uji dulu dengan fitur *test webhook* di Moota sebelum diandalkan.

### Email toko (Resend, dari hello@rivhe.com)

Cukup diatur sekali. Setelah itu tidak perlu password atau App Password Gmail siapa pun.

1. Daftar di [resend.com](https://resend.com), buka **Domains → Add domain** dan isi `rivhe.com`. Region Tokyo paling dekat ke Indonesia.
2. Resend menampilkan beberapa record DNS: MX dan TXT di `send`, serta TXT di `resend._domainkey`. Karena DNS rivhe.com dikelola di Vercel, tambahkan record itu di **Vercel → Domains → rivhe.com → DNS Records**, lalu klik **Verify** di Resend.
3. Buka **API Keys → Create API key** (Sending access, domain rivhe.com). Isi `RESEND_API_KEY` di Vercel, lalu Redeploy. `EMAIL_FROM` boleh dikosongkan karena defaultnya `RIVHÉ Atelier <hello@rivhe.com>`. Hapus `SMTP_URL` bila ada.

Setelah itu admin mengatur sendiri di **Settings → Email** ke mana notifikasi order dan balasan pembeli dikirim. Untuk mengganti alamat: klik **Change**, masukkan alamat baru, lalu masukkan kode 6 digit yang dikirim ke alamat itu. Alamat `hello@rivhe.com` hanya untuk mengirim. Balasan pembeli masuk ke email kontak.

Ongkir internasional: tarif per kg untuk 3 zona (Asia Tenggara, Asia Pasifik, lainnya), diatur di Settings → Shipping.

---

## Yang perlu diganti sebelum live

Semua bisa dari `/admin/settings`, kecuali yang bertanda *env*:

- [ ] **Rekening bank asli** (saat ini placeholder `123 456 7890`)
- [ ] Email notifikasi penjual, email kontak, WhatsApp, Instagram
- [ ] Harga, nama, ukuran produk contoh (*Pastel Horizon Bag*, *Seaglass Weave Bag*)
- [ ] Teks About / Terms / Shipping & Returns (`/admin/pages`)
- [ ] Penyedia email (*env*) dan, bila perlu, Biteship (*env*)

## Struktur

```
src/app/(store)/      halaman pembeli (beranda, shop, produk, cart, checkout, order, track, halaman konten)
src/app/admin/        login + panel admin; actions.ts = semua Server Action admin
src/app/api/          upload foto admin, webhook Moota
src/components/       komponen UI (admin/ untuk panel)
src/lib/              data & logika: products, orders, cart, shipping, currency, settings, email, auth
supabase/migrations/  skema + fungsi order atomik
supabase/seed.sql     2 produk contoh (foto di public/seed)
docs/design/          mockup UI/UX referensi
```
