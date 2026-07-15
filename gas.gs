// GAS (Google Apps Script) Backend untuk Website MA Bi'rul Ulum
// 1. Buka script.google.com
// 2. Buat project baru, copy paste kode ini ke Code.gs
// 3. Masukkan ID Spreadsheet Anda ke variabel SPREADSHEET_ID di bawah ini
// 4. Klik Deploy -> New Deployment -> Web App -> Access: Anyone

const SPREADSHEET_ID = '1BF7rA8WfTvgn8gBRgIXRwu6zdBiw84Uz2JpAtiJPlL8';

// ==========================================
// PENTING: JALANKAN FUNGSI INI SEKALI DARI EDITOR
// UNTUK MEMBERIKAN IZIN (AUTHORIZATION) GOOGLE DRIVE
// ==========================================
function testDrivePermission() {
  const folder = DriveApp.getFolderById('18qsid-kWI1hWDGwVEfIFUBLIL_X2IqP7');
  console.log("Nama Folder: " + folder.getName());
}

function doGet(e) {
  // Setup header CORS
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  
  try {
    const action = e.parameter.action;
    
    // LOGIKA UNTUK CEK TAGIHAN
    if (action === 'cekTagihan') {
      const nis = e.parameter.nis;
      const data = findRowByColumn('Tagihan', 'nis', nis);
      if (data) {
        output.setContent(JSON.stringify({ status: 'success', data: data }));
      } else {
        output.setContent(JSON.stringify({ status: 'not_found', message: 'Data tagihan tidak ditemukan untuk NIS tersebut.' }));
      }
      return output;
    }
    
    // LOGIKA UNTUK CEK KELULUSAN
    if (action === 'cekKelulusan') {
      const kode = e.parameter.kode;
      const data = findRowByColumn('Kelulusan', 'kode_unik', kode);
      if (data) {
        output.setContent(JSON.stringify({ status: 'success', data: data }));
      } else {
        output.setContent(JSON.stringify({ status: 'not_found', message: 'Kode unik tidak ditemukan.' }));
      }
      return output;
    }

    // Default: Mengambil data untuk frontend (Statistik dan Alumni saja yang dinamis)
    const responseData = {
      statistik: getSheetData('Statistik'),
      alumni: getSheetData('Alumni')
    };
    
    output.setContent(JSON.stringify({
      status: 'success',
      data: responseData
    }));
  } catch (error) {
    output.setContent(JSON.stringify({
      status: 'error',
      message: error.toString()
    }));
  }
  
  return output;
}

function doPost(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  
  try {
    // Parsing data yang dikirim dari form frontend (PPDB atau Presensi)
    const data = JSON.parse(e.postData.contents);
    
    // LOGIKA UNTUK PRESENSI
    if (data.action === 'presensi') {
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Presensi');
      if (!sheet) throw new Error("Sheet 'Presensi' tidak ditemukan.");
      
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID');
      
      const rowData = [
        now,             // Timestamp
        data.qr_data,    // QR Data
        "Hadir - " + timeStr // Keterangan Waktu
      ];
      
      sheet.appendRow(rowData);
      output.setContent(JSON.stringify({
        status: 'success',
        message: 'Presensi berhasil dicatat pada ' + timeStr
      }));
      return output;
    }
    
    // LOGIKA UNTUK PPDB PENDAFTAR BARU
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Pendaftar');
    
    if (!sheet) {
      throw new Error("Sheet 'Pendaftar' tidak ditemukan.");
    }
    
    // Fungsi untuk menyimpan file ke Google Drive
    function saveFileToDrive(fileData, prefix) {
      if (!fileData || !fileData.base64) return '';
      
      const folderId = '18qsid-kWI1hWDGwVEfIFUBLIL_X2IqP7'; // Folder ID yang diminta
      const folder = DriveApp.getFolderById(folderId);
      
      // Decode base64
      const decodedData = Utilities.base64Decode(fileData.base64);
      const blob = Utilities.newBlob(decodedData, fileData.mimeType, prefix + '_' + data.nama.replace(/\s+/g, '_') + '_' + fileData.filename);
      
      const file = folder.createFile(blob);
      // Set agar siapa saja yang memiliki link bisa melihat file (dibungkus try-catch agar tidak crash jika diblokir admin Workspace)
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (e) {
        console.warn("Gagal mengubah permission file: " + e.toString());
      }
      return file.getUrl();
    }
    
    // Proses semua file (bisa memakan waktu beberapa detik)
    const fotoUrl = saveFileToDrive(data.foto_file, 'FOTO');
    const kkUrl = saveFileToDrive(data.kk_file, 'KK');
    const akteUrl = saveFileToDrive(data.akte_file, 'AKTE');
    const ijazahUrl = saveFileToDrive(data.ijazah_file, 'IJAZAH');
    
    // Susunan kolom harus sesuai dengan struktur di spreadsheet
    const rowData = [
      new Date(),           // Timestamp
      data.nama,            // Nama Lengkap
      data.tempat_lahir,    // Tempat Lahir
      data.tanggal_lahir,   // Tanggal Lahir
      data.jenis_kelamin,   // Jenis Kelamin
      data.nik,             // NIK
      data.nama_ibu,        // Nama Ibu
      fotoUrl,              // Link Foto
      kkUrl,                // Link KK
      akteUrl,              // Link Akte
      ijazahUrl,            // Link Ijazah
      data.sekolah_asal,    // Sekolah Asal
      data.wa               // No WA
    ];
    
    sheet.appendRow(rowData);
    
    output.setContent(JSON.stringify({
      status: 'success',
      message: 'Data pendaftaran beserta dokumen berhasil disimpan ke Spreadsheet dan Drive.'
    }));
  } catch (error) {
    output.setContent(JSON.stringify({
      status: 'error',
      message: error.toString()
    }));
  }
  
  return output;
}

// Fungsi bantuan untuk mencari satu baris berdasarkan kolom (untuk login/cek tagihan/kelulusan)
function findRowByColumn(sheetName, columnName, searchValue) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  if (!sheet) return null;
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return null;
  
  const headers = data[0].map(h => h.toString().toLowerCase().replace(/\s+/g, '_'));
  const colIndex = headers.indexOf(columnName.toLowerCase());
  
  if (colIndex === -1) return null;
  
  for (let i = 1; i < data.length; i++) {
    // Convert both to string for comparison to avoid type issues (e.g. integer vs string)
    if (data[i][colIndex].toString().toLowerCase() === searchValue.toString().toLowerCase()) {
      let obj = {};
      headers.forEach((header, index) => {
        obj[header] = data[i][index] !== "" ? data[i][index] : null;
      });
      return obj;
    }
  }
  return null;
}

// Fungsi bantuan untuk mengambil data dari sheet tertentu dan mengubahnya menjadi JSON
function getSheetData(sheetName) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return []; // Kosong atau hanya ada header
  
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      // Mengubah nama header menjadi format properti objek (huruf kecil, spasi jadi underscore)
      const propName = header.toString().toLowerCase().replace(/\s+/g, '_');
      obj[propName] = row[index] !== "" ? row[index] : null;
    });
    return obj;
  });
}
