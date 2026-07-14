# Struktur Proyek Web Statis (Murni / Vanilla)

Merespon kebutuhan untuk memastikan performa yang cepat pada layanan *hosting statis* (seperti GitHub Pages, Netlify, atau Cloudflare Pages), proyek ini sepenuhnya menghilangkan penggunaan framework front-end (seperti Next.js/React/Vue) dan tidak menggunakan library CSS eksternal seperti Tailwind CSS. 

Struktur berikut dirancang untuk *Multi-Page Application* murni yang bergantung pada **Vanilla HTML, CSS, dan Javascript**, dengan persiapan integrasi basis data menggunakan **Google Apps Script (GAS)** via *Spreadsheet*.

## Arsitektur Direktori Utama

```text
mabirululum.github.io/
├── index.html              # Halaman Beranda & Profil
├── ppdb.html               # Halaman Pendaftaran Siswa Baru
├── berita.html             # Halaman Kumpulan Berita
├── administrasi/           # Sub-domain untuk Modul Sistem
│   ├── index.html          # Halaman Cek Tagihan
│   ├── kelulusan.html      # Halaman Cek Kelulusan
│   └── presensi.html       # Halaman Presensi QR Guru
├── assets/                 # Pusat semua aset statis
│   ├── css/                # Styling (Vanilla CSS)
│   │   ├── variables.css   # Color palette, font sizing (CSS Variables)
│   │   ├── reset.css       # CSS Reset untuk cross-browser consistency
│   │   ├── layout.css      # Struktur grid, header, footer, container
│   │   ├── components.css  # Styling kartu, tombol, modal (Desain Premium)
│   │   ├── animations.css  # Animasi interaktif (Micro-animations, Glassmorphism)
│   │   └── pages/          # CSS spesifik untuk tiap halaman (jika ada)
│   ├── js/                 # Logika Javascript
│   │   ├── core.js         # Fungsi global (Navbar toggler, modal handler)
│   │   ├── ui-effects.js   # Efek dinamis pada DOM
│   │   └── api-gas.js      # File khusus untuk memanggil API Google Apps Script
│   ├── images/             # Gambar pendukung dan favicon
│   ├── icons/              # File SVG ikon
│   └── audio/              # File audio pendukung
└── README.md
```

## Pendekatan Desain dan Pengembangan

1. **Tanpa Framework & Tanpa Tailwind CSS:**
   - Seluruh *styling* ditulis secara manual di dalam folder `assets/css/`. 
   - Karena instruksi mengharuskan desain terasa "sangat premium" dan *wow*, kita akan membuat palet warna (*Color Tokens*) sendiri, mengimplementasikan *Glassmorphism* menggunakan `backdrop-filter`, menggunakan transisi dinamis (seperti efek *hover*), serta memanfaatkan tipografi modern dari Google Fonts secara efisien di `variables.css`.
   
2. **Keterbacaan dan Maintenance (Modular CSS):**
   - Walaupun murni statis, penulisan CSS akan dibagi ke dalam beberapa file terpisah (seperti `variables.css`, `components.css`) agar tidak terjadi penumpukan *spaghetti code* dalam satu file `style.css` besar. Ini menyerupai fungsionalitas modular walaupun dipanggil melalui tag `<link>` konvensional di HTML.
   - Mengadopsi konvensi penamaan seperti BEM (Block, Element, Modifier) untuk memastikan tidak ada konflik gaya antarkelas HTML.

3. **Interaktivitas JS Murni (Vanilla JS):**
   - Interaktivitas seperti perhitungan hari (countdown), *slider*, pemindai QR, dan tampilan modal akan digerakkan sepenuhnya oleh Vanilla Javascript (tanpa jQuery atau library tebal lainnya). Ini memastikan *bundle* akhir sangat ringan.

4. **Persiapan Integrasi Database (Google Apps Script / GAS):**
   - Tidak akan ada konfigurasi basis data relasional atau BaaS seperti Firebase/Supabase di tahap awal.
   - Seluruh skrip yang butuh manipulasi data dinamis (seperti Cek Tagihan, Input Pendaftaran, dan Presensi QR) akan memanggil endpoint *Web App URL* dari Google Apps Script yang terhubung langsung ke Google Sheets. Logika pemanggilan ini akan dipusatkan pada file `assets/js/api-gas.js`.

5. **SEO Otomatis per Halaman:**
   - Karena ini adalah website *multi-page* klasik, optimalisasi *SEO* akan sangat mudah dikelola di masing-masing tag `<head>` setiap file `.html` secara terpisah. Kami akan memastikan penggunaan semantic HTML5 (`<header>`, `<main>`, `<article>`, `<footer>`) diterapkan dengan tepat.
