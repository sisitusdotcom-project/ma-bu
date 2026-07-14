# Usulan Struktur Proyek Baru (Best Practice)

Karena aplikasi MA Bi'rul Ulum ini memiliki beberapa domain fungsional yang berbeda (Landing Page Publik, Portal Kelulusan, Cek Administrasi, dan Sistem Absensi Guru), pendekatan arsitektur terbaik adalah menggunakan **Component-Based Framework** yang mendukung *Routing* modern dan SEO yang baik.

Kami sangat merekomendasikan penggunaan **Next.js (App Router)** atau setidaknya **React dengan Vite**. Di bawah ini adalah usulan struktur folder (berbasis Next.js / React Modern) yang direkomendasikan untuk proyek ini agar modular, *scalable*, dan rapi.

## Arsitektur Direktori Utama (Monorepo Style / App Router)

```text
mabirululum.github.io/
├── public/                 # Semua aset publik (gambar, logo, favicon, font)
│   ├── images/
│   ├── icons/
│   └── audio/              # File audio seperti mars-mabu.mpeg
├── src/
│   ├── app/                # (App Router) - Menangani semua route / halaman
│   │   ├── (main)/         # Group route untuk halaman publik utama
│   │   │   ├── page.tsx    # Beranda
│   │   │   ├── profil/     # Profil & Visi Misi
│   │   │   ├── berita/
│   │   │   ├── ppdb/
│   │   │   └── layout.tsx  # Navbar & Footer Utama
│   │   ├── administrasi/   # Halaman cek tagihan administrasi
│   │   │   └── page.tsx
│   │   ├── kelulusan/      # Halaman cek kelulusan
│   │   │   └── page.tsx
│   │   ├── presensi/       # Halaman sistem absensi QR Guru
│   │   │   └── page.tsx
│   │   └── admin/          # Admin Dashboard (Protected Route)
│   │       ├── dashboard/
│   │       └── layout.tsx
│   ├── components/         # Komponen UI Reusable
│   │   ├── ui/             # Komponen kecil dasar (Button, Input, Card, Modal, Alert)
│   │   ├── layout/         # Komponen layout (Navbar, Footer, Sidebar)
│   │   └── sections/       # Komponen bagian halaman (Hero, ProgramUnggulan, Counter)
│   ├── styles/             # Pengaturan Styling (Global CSS, Design Tokens)
│   │   └── globals.css     # (Untuk TailwindCSS dan custom styles)
│   ├── lib/                # Konfigurasi Library external (Supabase Client, Utilities)
│   │   ├── supabase.ts
│   │   └── utils.ts
│   ├── hooks/              # Custom React Hooks (misal: useAuth, useScanner)
│   └── types/              # Definisi TypeScript (Interfaces, Types)
├── .env.local              # Variabel lingkungan (Supabase URL, Keys)
├── package.json            # Daftar dependensi (React, Tailwind, Supabase, dll)
├── tailwind.config.ts      # Konfigurasi Tema (Warna Sekolah, Font)
└── README.md
```

## Mengapa Struktur Ini (Best Practice)?

1. **Pemisahan Kekhawatiran (Separation of Concerns):** 
   Komponen presentasi (UI) dipisahkan dari logika bisnis (hooks) dan utilitas (lib). Halaman spesifik seperti `presensi` atau `kelulusan` tidak akan mengganggu layout halaman utama (`main`).
2. **Modularitas Komponen (Reusability):**
   Aset tombol (Button), kartu (Card), atau *input field* akan dibangun sekali di `components/ui/` dan bisa dipanggil berulang-ulang, menjamin konsistensi UI/UX di seluruh web.
3. **SEO yang Lebih Baik (Khususnya jika memakai Next.js):**
   Halaman Berita, Beranda, dan Profil dapat di-render dari sisi server (SSR/SSG), sehingga memudahkan Google membaca "Title Tags", "Meta Descriptions", dan *Semantic HTML* (sejalan dengan standar estetika web yang diinstruksikan).
4. **Keamanan Ekosistem Terpadu:**
   Kredensial dan *API Keys* (seperti kunci Anon Supabase yang sebelumnya terekspos langsung di file HTML) dapat diamankan di dalam `.env` dan hanya dimuat di *environment* yang diizinkan (atau *Server Actions*).
5. **Skalabilitas Pemeliharaan:**
   Desain modern dengan pendekatan ini menghindari "Spaghetti Code" di mana satu file HTML memuat ribuan baris kode bersamaan dengan logika Javascript yang kompleks (seperti di `presensi-guru/index.html`).

## Rekomendasi Teknologi
- **Framework:** Next.js (React)
- **Styling:** Vanilla CSS dipadu dengan Utility Modern (misalnya Tailwind, asalkan sesuai kesepakatan) dengan *Color Palette* biru tua akademik, putih bersih, dan aksen emas.
- **Ikon:** Phosphor Icons / FontAwesome / Lucide React.
- **Backend/DB:** Supabase (seperti yang sudah digunakan sebelumnya, namun dienkapsulasi lewat `lib/supabase.ts`).

---
*(Dokumen ini menguraikan landasan arsitektur sebelum dimulainya proses inisialisasi aplikasi. Jika disetujui, kita akan segera menginisialisasi proyek baru dengan struktur ini).*
