// api-gas.js
// Logika Frontend untuk Integrasi ke Google Apps Script (GAS) Backend

/**
 * ==========================================
 * 1. CEK TAGIHAN
 * ==========================================
 */
async function fetchTagihan(nis) {
  try {
    const response = await fetch(`${CONFIG.GAS_URL}?action=cekTagihan&nis=${nis}`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching data tagihan:", error);
    return null;
  }
}

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

    // Panggil API
    const response = await fetchTagihan(nis);

    loading.style.display = 'none';
    
    if (response && response.status === 'success') {
      document.getElementById('res-nama').textContent = response.data.nama_siswa || '-';
      document.getElementById('res-kelas').textContent = response.data.kelas || '-';
      
      // Format mata uang (contoh: 500000 -> 500.000)
      const tagihanFormatted = parseInt(response.data.sisa_tagihan).toLocaleString('id-ID');
      document.getElementById('res-tagihan').textContent = tagihanFormatted !== 'NaN' ? tagihanFormatted : '0';
      
      hasil.style.display = 'block';
    } else {
      alert(response ? response.message : "Gagal terhubung ke server. Pastikan GAS URL sudah benar dan di-deploy ulang.");
    }
  });
}

/**
 * ==========================================
 * 2. CEK KELULUSAN
 * ==========================================
 */
async function fetchKelulusan(kodeUnik) {
  try {
    const response = await fetch(`${CONFIG.GAS_URL}?action=cekKelulusan&kode=${kodeUnik}`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching data kelulusan:", error);
    return null;
  }
}

const formCekKelulusan = document.getElementById('form-cek-kelulusan');
if (formCekKelulusan) {
  formCekKelulusan.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kodeUnik = document.getElementById('kode-unik').value;
    const loading = document.getElementById('loading');
    const hasil = document.getElementById('hasil');

    // UI State
    loading.style.display = 'block';
    hasil.style.display = 'none';

    // Panggil API
    const response = await fetchKelulusan(kodeUnik);

    loading.style.display = 'none';
    
    if (response && response.status === 'success') {
      document.getElementById('res-nama-lulus').textContent = response.data.nama_siswa || '-';
      
      const resStatus = document.getElementById('res-status');
      resStatus.textContent = response.data.status_lulus || '-';
      
      // Styling LULUS / TIDAK LULUS
      if (response.data.status_lulus && response.data.status_lulus.toUpperCase() === 'LULUS') {
        resStatus.style.color = '#25D366'; // Hijau
      } else {
        resStatus.style.color = '#dc2626'; // Merah
      }
      
      document.getElementById('res-keterangan').textContent = response.data.keterangan || '-';
      hasil.style.display = 'block';
    } else {
      alert(response ? response.message : "Gagal terhubung ke server. Pastikan GAS URL sudah benar dan di-deploy ulang.");
    }
  });
}

/**
 * ==========================================
 * 3. PRESENSI GURU
 * ==========================================
 */
async function postPresensi(qrData) {
  try {
    const payload = {
      action: 'presensi',
      qr_data: qrData
    };
    
    await fetch(CONFIG.GAS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify(payload)
    });
    
    // Karena mode: 'no-cors', browser tidak membaca response asli dari GAS. 
    // Asumsikan sukses jika fetch tidak melempar error jaringan.
    return { status: 'success' };
  } catch (error) {
    console.error("Error posting presensi:", error);
    return { status: 'error', message: error.toString() };
  }
}

// Simulasi Scan QR pada presensi.html
const btnSimulasiQr = document.getElementById('btn-simulasi-qr');
if (btnSimulasiQr) {
  btnSimulasiQr.addEventListener('click', async () => {
    const hasilDiv = document.getElementById('hasil-presensi');
    const pesanSapaan = document.getElementById('pesan-sapaan');
    
    // Matikan tombol saat loading
    btnSimulasiQr.disabled = true;
    btnSimulasiQr.textContent = "Memproses...";
    hasilDiv.style.display = 'none';

    // Dummy data dari QR Code
    const qrData = "NIP: 198001012005011003 - Bpk. Yusmawan";
    
    // Panggil API
    const response = await postPresensi(qrData);
    
    btnSimulasiQr.disabled = false;
    btnSimulasiQr.textContent = "Simulasi Scan QR";
    
    if (response && response.status === 'success') {
      pesanSapaan.textContent = "Data masuk: " + qrData + " pada " + new Date().toLocaleTimeString();
      hasilDiv.style.display = 'block';
    } else {
      alert(response ? response.message : "Gagal terhubung ke server presensi.");
    }
  });
}
