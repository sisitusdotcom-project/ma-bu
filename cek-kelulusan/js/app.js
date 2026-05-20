/**
 * 1. DATA JSON (Jika di server, ini biasanya diambil via fetch/API)
 * Ini adalah database sederhana kita.
 */

let dataSiswa = [];

// async function loadData() {
//     try {
//         const res = await fetch('data/lulusan.json');
//         dataSiswa = await res.json();
//     } catch (err) {
//         console.error(err);
//     }
// }

// loadData();

/**
 * 1. KONFIGURASI GOOGLE APPS SCRIPT
 * Ganti teks di bawah ini dengan URL Web App dari Google Apps Script Anda.
 */
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxn_Y5EVukvW0o_muDhfy_PREuMfXsJ-yEB4Jrf95V5K4ApYXeg7I7Qi8IjAAz_ttDLXQ/exec';

/**
 * 2. MENGAMBIL ELEMEN HTML
 * Kita butuh 'menangkap' elemen dari HTML agar bisa diubah via Javascript
 */
// Halaman dan Form
const searchPage = document.getElementById('search-page');
const resultPage = document.getElementById('result-page');
const searchForm = document.getElementById('search-form');
const inputKode = document.getElementById('kode_siswa');
const errorMessage = document.getElementById('error-message');
const btnBack = document.getElementById('btn-back');
const togglePassword = document.getElementById('toggle-password');
const eyeIcon = document.getElementById('eye-icon');
const loadingPage = document.getElementById('loading-page');

// Elemen Modal Error
const errorModal = document.getElementById('error-modal');
const errorModalBox = document.getElementById('error-modal-box');
const closeModal = document.getElementById('close-modal');

// Elemen Hasil/Tampilan
const resultCard = document.getElementById('result-card');
const resultHeader = document.getElementById('result-header');
const statusTitle = document.getElementById('status-title');
const statusSubtitle = document.getElementById('status-subtitle');

// Kontainer Konten (Untuk menyembunyikan biodata)
const biodataContent = document.getElementById('biodata-content');
const adminFailedContent = document.getElementById('admin-failed-content');
const examAdminFailedContent = document.getElementById('exam-admin-failed-content');
const examFailedContent = document.getElementById('exam-failed-content');

// Elemen Data Diri
const resNama = document.getElementById('res-nama');
const resInduk = document.getElementById('res-induk');
const resKelas = document.getElementById('res-kelas');
const resKode = document.getElementById('res-kode');
const resTahun = document.getElementById('res-tahun');
const resFoto = document.getElementById('res-foto');

/**
 * 2.5 LOGIKA TOMBOL HIDE/SHOW KODE (Mata)
 */
togglePassword.addEventListener('click', function() {
    const isPassword = inputKode.getAttribute('type') === 'password';
    
    // Ubah atribut tipe input
    inputKode.setAttribute('type', isPassword ? 'text' : 'password');
    
    // Ubah ikon mata menggunakan SVG Path
    if (isPassword) {
        // Icon Mata Dicoret (hide)
        eyeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />`;
    } else {
        // Icon Mata Normal (show)
        eyeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />`;
    }
});

/**
 * 2.6 LOGIKA MODAL POP-UP
 */
function showError() {
    errorModal.classList.remove('hidden');
    // Sedikit delay agar transisi animasi CSS berjalan
    setTimeout(() => {
        errorModal.classList.remove('opacity-0');
        errorModalBox.classList.remove('scale-95');
    }, 10);
}

function hideError() {
    errorModal.classList.add('opacity-0');
    errorModalBox.classList.add('scale-95');
    // Tunggu animasi selesai baru sembunyikan elemen sepenuhnya
    setTimeout(() => {
        errorModal.classList.add('hidden');
    }, 300);
}

// Tutup modal saat tombol diklik
closeModal.addEventListener('click', hideError);

/**
 * 3. LOGIKA KETIKA FORM DISUBMIT (Tombol Lihat Hasil ditekan)
 */
searchForm.addEventListener('submit', async function(event) {
    // Mencegah halaman reload (bawaan browser saat form submit)
    event.preventDefault(); 
    
    // Ambil nilai yang diketik, hilangkan spasi berlebih, jadikan huruf besar (Kapital)
    const kodeDicari = inputKode.value.trim().toUpperCase();

    // Transisi memunculkan Loading State
    searchPage.classList.add('hidden');
    loadingPage.classList.remove('hidden');

    // Pengecekan apakah URL Script sudah dikonfigurasi dengan benar
    if (SCRIPT_URL === 'URL_WEB_APP_SCRIPT_ANDA_DI_SINI' || !SCRIPT_URL.startsWith('http')) {
        setTimeout(() => {
            loadingPage.classList.add('hidden');
            alert('Sistem belum terhubung. Harap masukkan URL Google Apps Script yang valid pada baris "const SCRIPT_URL" di dalam kode Anda.');
            searchPage.classList.remove('hidden');
        }, 1000);
        return; // Menghentikan eksekusi kode di bawahnya agar tidak terjadi error Invalid URL
    }

    try {
        // Menyiapkan URL API dengan Cache Busting
        // Parameter 't' dengan Date.now() memastikan URL selalu unik tiap kali diklik
        const url = new URL(SCRIPT_URL);
        url.searchParams.append('action', 'getSiswa');
        url.searchParams.append('kode', kodeDicari);
        url.searchParams.append('t', Date.now()); 

        // Mengambil data dari Google Sheet via API Google Apps Script
        const response = await fetch(url.toString(), {
            method: 'GET',
            mode: 'cors'
        });
        
        const result = await response.json();

        // Sembunyikan Loading Page
        loadingPage.classList.add('hidden');

        if (result.success && result.data) {
            // Jika data ditemukan, tampilkan ke layar
            tampilkanHasil(result.data);
        } else {
            // Jika tidak ketemu, munculkan Pop-up Error
            showError();
            // Munculkan form kembali di belakang modal
            searchPage.classList.remove('hidden'); 
        }

    } catch (error) {
        console.error('Error Fetch Data:', error);
        loadingPage.classList.add('hidden');
        
        // Fallback peringatan jika URL salah / Tidak ada koneksi internet
        alert('Terjadi kesalahan jaringan atau SCRIPT_URL belum dikonfigurasi. Silakan periksa koneksi atau hubungi admin.');
        searchPage.classList.remove('hidden');
    }
});

/**
 * 4. LOGIKA KETIKA TOMBOL KEMBALI DITEKAN
 */
btnBack.addEventListener('click', function() {
    // Sembunyikan halaman hasil, tampilkan halaman form
    resultPage.classList.add('hidden');
    searchPage.classList.remove('hidden');
    
    // Kosongkan inputan
    inputKode.value = '';
    inputKode.focus();
});

/**
 * 5. FUNGSI UNTUK MENAMPILKAN HASIL DAN MENGUBAH TEMA (BIRU/MERAH)
 */
function tampilkanHasil(siswa) {
    // Masukkan data ke dalam HTML
    resNama.innerText = `: ${siswa.nama}`;
    resInduk.innerText = `: ${siswa.no_induk}`;
    resKelas.innerText = `: ${siswa.kelas}`;
    resKode.innerText = `: ${siswa.kode}`;
    resTahun.innerText = `: ${siswa.tahun_ajaran}`
    resFoto.src = siswa.foto; // Masukkan foto dari JSON
    
    // Kembalikan visibilitas kontainer ke setelan awal
    biodataContent.classList.remove('hidden');
    adminFailedContent.classList.add('hidden');
    examAdminFailedContent.classList.add('hidden');
    examFailedContent.classList.add('hidden');

    // Reset semua class warna bawaan terlebih dahulu (Reset State)
    resultCard.className = "bg-white rounded-2xl shadow-xl overflow-hidden border-t-8";
    resultHeader.className = "p-6 text-center";

    // LOGIKA WARNA
    if (siswa.status === "LULUS") {
        // Tema Biru (Lulus)
        resultCard.classList.add("border-blue-500");
        resultHeader.classList.add("bg-blue-100");
        
        statusTitle.innerText = "DINYATAKAN LULUS";
        statusTitle.className = "text-3xl font-extrabold text-blue-800 mb-1 tracking-wider uppercase";
        
        statusSubtitle.innerText = "Selamat atas pencapaian ini. Semoga ilmu yang diperoleh menjadi bekal yang bermanfaat untuk jenjang pendidikan selanjutnya.";
        statusSubtitle.className = "text-sm text-blue-600 font-medium";
        
    } else if (siswa.status === "UJIAN-ADMINISTRASI") {
        // Tema Merah (Belum Tuntas Ujian dan Administrasi)
        resultCard.classList.add("border-red-500");
        resultHeader.classList.add("bg-red-100");
        
        statusTitle.innerText = "BELUM TUNTAS UJIAN & ADMINISTRASI";
        statusTitle.className = "text-xl md:text-2xl font-extrabold text-red-800 mb-1 tracking-wider uppercase";
        
        statusSubtitle.innerText = "Silakan hubungi pihak Madrasah";
        statusSubtitle.className = "text-sm text-red-600 font-medium";

        // Sembunyikan biodata, munculkan pesan peringatan
        biodataContent.classList.add('hidden');
        examAdminFailedContent.classList.remove('hidden');

    } else if (siswa.status === "ADMINISTRASI") {
        // Tema Oranye (Belum Tuntas Administrasi)
        resultCard.classList.add("border-orange-500");
        resultHeader.classList.add("bg-orange-100");
        
        statusTitle.innerText = "BELUM TUNTAS ADMINISTRASI";
        statusTitle.className = "text-xl md:text-2xl font-extrabold text-orange-800 mb-1 tracking-wider uppercase";
        
        statusSubtitle.innerText = "Silakan hubungi pihak Madrasah";
        statusSubtitle.className = "text-sm text-orange-600 font-medium";

        // Sembunyikan biodata, munculkan pesan peringatan
        biodataContent.classList.add('hidden');
        adminFailedContent.classList.remove('hidden');

    } else if (siswa.status === "UJIAN") {
        // Tema Purple (Belum Tuntas Ujian)
        resultCard.classList.add("border-purple-500");
        resultHeader.classList.add("bg-purple-100");
        
        statusTitle.innerText = "BELUM TUNTAS UJIAN";
        statusTitle.className = "text-xl md:text-2xl font-extrabold text-purple-800 mb-1 tracking-wider uppercase";
        
        statusSubtitle.innerText = "Silakan hubungi pihak Madrasah";
        statusSubtitle.className = "text-sm text-purple-600 font-medium";

        // Sembunyikan biodata, munculkan pesan peringatan
        biodataContent.classList.add('hidden');
        examFailedContent.classList.remove('hidden');
    }

    // Ganti Halaman dengan Animasi CSS
    searchPage.classList.add('hidden'); // Sembunyikan form
    resultPage.classList.remove('hidden'); // Munculkan hasil
    
    // Memicu ulang animasi (trick untuk memutar animasi berkali-kali)
    resultPage.classList.remove('fade-in');
    void resultPage.offsetWidth; // trigger reflow DOM
    resultPage.classList.add('fade-in');
}

// 👉 SET TAHUN OTOMATIS FOOTER
const startYear = 2026;
const currentYear = new Date().getFullYear();
document.getElementById("tahun").textContent =
startYear === currentYear ? startYear : `${startYear} - ${currentYear}`;