// core.js
// Logika utama untuk UI Vanilla HTML

document.addEventListener('DOMContentLoaded', () => {
  // Sticky Navbar Effect
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        navbar.style.background = 'rgba(255, 255, 255, 0.95)';
        navbar.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
      } else {
        navbar.style.background = 'rgba(255, 255, 255, 0.7)';
        navbar.style.boxShadow = 'none';
      }
    });
  }

  // Animasi saat elemen masuk viewport (Intersection Observer)
  const animatedElements = document.querySelectorAll('.animate-fade-up');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animationPlayState = 'running';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  animatedElements.forEach(el => {
    el.style.animationPlayState = 'paused'; // pause until visible
    observer.observe(el);
  });

  // Mobile Menu Toggle
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const navMenu = document.querySelector('.nav-menu');

  if (mobileMenuBtn && navMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      navMenu.classList.toggle('active');
      const icon = mobileMenuBtn.querySelector('i');
      if (navMenu.classList.contains('active')) {
        icon.classList.remove('ph-list');
        icon.classList.add('ph-x');
      } else {
        icon.classList.remove('ph-x');
        icon.classList.add('ph-list');
      }
    });
  }
  
  // Load Dynamic Data from GAS if available
  if (typeof CONFIG !== 'undefined' && CONFIG.GAS_URL) {
    loadPublicData();
  }
});

async function loadPublicData() {
  try {
    const response = await fetch(CONFIG.GAS_URL);
    const result = await response.json();
    
    if (result.status === 'success') {
      const data = result.data;
      
      // Render Statistik
      const statContainer = document.getElementById('statistik-container');
      if (statContainer && data.statistik && data.statistik.length > 0) {
        statContainer.innerHTML = '';
        data.statistik.forEach(item => {
          const div = document.createElement('div');
          div.innerHTML = `
            <i class="ph ${item.ikon} text-accent" style="font-size: 2.5rem; color: var(--accent);"></i>
            <h3 style="font-size: 3rem; margin-bottom: 0; color: white;">${item.nilai}</h3>
            <p style="font-weight: 500; color: var(--gray-300);">${item.kategori}</p>
          `;
          statContainer.appendChild(div);
        });
      }
      
      // Render Alumni
      const alumniContainer = document.getElementById('alumni-container');
      if (alumniContainer && data.alumni && data.alumni.length > 0) {
        alumniContainer.innerHTML = '';
        data.alumni.forEach(item => {
          const div = document.createElement('div');
          div.className = 'card text-center';
          div.innerHTML = `
            <img src="${item.foto_url || 'https://via.placeholder.com/80/e2e8f0/94a3b8?text=User'}" alt="${item.nama_alumni}" style="width: 80px; height: 80px; border-radius: 50%; margin: 0 auto var(--space-4); object-fit: cover;">
            <p style="font-style: italic; color: var(--gray-600);">"${item.kutipan_testimoni}"</p>
            <h4 style="margin: var(--space-4) 0 0; color: var(--primary);">${item.nama_alumni}</h4>
            <span style="font-size: 0.85rem; color: var(--gray-500);">${item.angkatan_jurusan}</span>
          `;
          alumniContainer.appendChild(div);
        });
      }
    }
  } catch (error) {
    console.error("Gagal memuat data dinamis:", error);
  }
}

// ==========================================
// LOGIKA FORM PPDB
// ==========================================
const ppdbForm = document.getElementById('ppdb-form');
if (ppdbForm) {
  ppdbForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const loadingDiv = document.getElementById('ppdb-loading');
    const successDiv = document.getElementById('ppdb-success');
    const submitBtn = document.getElementById('btn-submit-ppdb');
    
    // UI State
    ppdbForm.style.display = 'none';
    loadingDiv.style.display = 'block';
    
    try {
      // 1. Kumpulkan data teks
      const payload = {
        action: 'ppdb',
        nama: document.getElementById('nama').value,
        tempat_lahir: document.getElementById('tempat_lahir').value,
        tanggal_lahir: document.getElementById('tanggal_lahir').value,
        jenis_kelamin: document.getElementById('jenis_kelamin').value,
        nik: document.getElementById('nik').value,
        nama_ibu: document.getElementById('nama_ibu').value,
        sekolah_asal: document.getElementById('asal').value,
        wa: document.getElementById('wa').value
      };

      // 2. Helper function untuk konversi file ke Base64
      const getBase64 = (file) => {
        return new Promise((resolve, reject) => {
          if (!file) return resolve(null);
          const reader = new FileReader();
          reader.onload = () => resolve({
            filename: file.name,
            mimeType: file.type,
            base64: reader.result.split(',')[1] // Ambil data base64 saja (tanpa header 'data:image/jpeg;base64,')
          });
          reader.onerror = error => reject(error);
          reader.readAsDataURL(file);
        });
      };

      // 3. Baca semua file
      const fotoFile = document.getElementById('foto').files[0];
      const kkFile = document.getElementById('kk').files[0];
      const akteFile = document.getElementById('akte').files[0];
      const ijazahFile = document.getElementById('ijazah').files[0];

      // Konversi secara paralel
      const [fotoData, kkData, akteData, ijazahData] = await Promise.all([
        getBase64(fotoFile),
        getBase64(kkFile),
        getBase64(akteFile),
        getBase64(ijazahFile)
      ]);

      // Masukkan data file ke payload jika ada
      if (fotoData) payload.foto_file = fotoData;
      if (kkData) payload.kk_file = kkData;
      if (akteData) payload.akte_file = akteData;
      if (ijazahData) payload.ijazah_file = ijazahData;

      // 4. Kirim ke GAS dengan mode 'no-cors' untuk menghindari blokir CORS di browser (terutama saat dibuka dari file://)
      await fetch(CONFIG.GAS_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: JSON.stringify(payload)
      });
      
      // Karena menggunakan 'no-cors', browser tidak bisa membaca response asli dari server.
      // Namun request tetap berhasil dikirim. Kita asumsikan sukses jika fetch tidak melempar error jaringan.
      loadingDiv.style.display = 'none';
      successDiv.style.display = 'block';
      
    } catch (error) {
      console.error("Error submitting PPDB:", error);
      alert("Terjadi kesalahan jaringan atau server. Silakan coba lagi.");
      loadingDiv.style.display = 'none';
      ppdbForm.style.display = 'block';
    }
  });
}

