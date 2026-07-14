// api-gas.js
// Boilerplate untuk memanggil endpoint Web App Google Apps Script

const GAS_URL = "URL_WEB_APP_GAS_ANDA_DISINI";

/**
 * Contoh fungsi untuk mengambil data (Misal: Cek Tagihan)
 * @param {string} nis 
 */
async function fetchTagihan(nis) {
  try {
    const response = await fetch(`${GAS_URL}?action=cekTagihan&nis=${nis}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching data dari GAS:", error);
    return null;
  }
}

/**
 * Handle form submit Cek Tagihan
 */
const formCekTagihan = document.getElementById('form-cek-tagihan');
if (formCekTagihan) {
  formCekTagihan.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nis = document.getElementById('nis').value;
    const loading = document.getElementById('loading');
    const hasil = document.getElementById('hasil');

    // UI State
    loading.style.display = 'block';
    hasil.style.display = 'none';

    // Panggil API (Simulasi delay untuk saat ini)
    setTimeout(() => {
      loading.style.display = 'none';
      hasil.style.display = 'block';
      
      // Update DOM
      document.getElementById('res-nama').innerText = "Nama Siswa (Contoh)";
      document.getElementById('res-kelas').innerText = "XII IPA 1";
      document.getElementById('res-tagihan').innerText = "250.000";
    }, 1500);
  });
}
