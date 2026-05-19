const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxGhVJGqxmspHPvM6WOyGHP4tz2NG_c1kf5xiQ7ndOvNtCPjXzZpnfNwPxhHQRmQgle/exec';
// const SCRIPT_URL = '';
const useServer = SCRIPT_URL.startsWith('https://script.google.com');

let currentUserRole = '';
let activeRestoreTab = 'pemasukan';
const adminTableState = {
	datasiswa: { activeTab: 'aktif', query: '', filterKelas: 'All', page: 1 },
	pemasukan: { page: 1, query: '' },
	bantuan: { page: 1, query: '' },
	infaq: { page: 1, query: '' },
	pengeluaran: { page: 1, query: '' },
	'pengeluaran-non': { page: 1, query: '' },
	tarif: { page: 1, query: '' },
	restore: { page: 1, query: '' },
	user: { page: 1, query: '' },
};

function getItemsPerPage() {
	const availableHeight = window.innerHeight - 360;
	const rowHeight = 65;
	let items = Math.floor(availableHeight / rowHeight);
	return items < 5 ? 5 : (items > 20 ? 20 : items);
}

let resizeTimer;
window.addEventListener('resize', () => {
	clearTimeout(resizeTimer);
	resizeTimer = setTimeout(() => {
		if (document.getElementById('view-admin').classList.contains('hidden')) return;
		loadAdminDataSiswaTable();
		loadAdminTable();
		loadAdminBantuanTable();
		loadAdminPengeluaranTable();
		loadAdminPengeluaranNonTable();
		loadAdminInfaqTable();
		if (currentUserRole === 'Super Admin') {
			loadAdminTarifTable
			loadRestoreTable();
			loadAdminUserTable();
		}
		if (window.innerWidth >= 768) {
			// Daftar ID form yang Anda buat (tambahkan jika ada form baru)
			const forms = [
				'form-pembayaran-content', 'form-bantuan-content', 'form-infaq-content', 'form-pengeluaran-content', 'form-pengeluaran-non-content', 'form-tarif-content', 'form-user-content', 'form-rekap-content'
			];
			const icons = [
				'icon-pembayaran', 'icon-bantuan', 'icon-infaq', 'icon-pengeluaran', 'icon-pengeluaran-non',
				'icon-tarif', 'icon-user', 'icon-rekap'
			];

			forms.forEach((id, index) => {
				const content = document.getElementById(id);
				const icon = document.getElementById(icons[index]);
				
				// Jika form ditemukan dan sedang tersembunyi (hidden), paksa buka!
				if (content && content.classList.contains('hidden')) {
					content.classList.remove('hidden'); // Munculkan form
					if (icon) {
						icon.classList.remove('ph-caret-down'); // Reset arah panah
						icon.classList.add('ph-caret-up');
					}
				}
			});
		}
	}, 200);
});

function updatePaginationUI(type, tItems, pDataLength) {
	const itemsPerPage = getItemsPerPage();
	const startIdx = (adminTableState[type].page - 1) * itemsPerPage;
	const infoEl = document.getElementById(`page-info-${type}`);
	if (infoEl) infoEl.innerText = tItems > 0 ? `Menampilkan ${startIdx + 1}-${startIdx + pDataLength} dari ${tItems} data` : `Tidak ada data`;
	const btnPrev = document.getElementById(`btn-prev-${type}`);
	const btnNext = document.getElementById(`btn-next-${type}`);
	const setBtnStyle = (btn, isDisabled) => {
		if (!btn) return;
		btn.disabled = isDisabled;
		if (isDisabled) {
			btn.className = "px-3 py-1 border rounded bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed transition-colors";
		} else {
			btn.className = "px-3 py-1 border rounded bg-white text-blue-600 border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors";
		}
	};

	setBtnStyle(btnPrev, adminTableState[type].page <= 1);
	setBtnStyle(btnNext, adminTableState[type].page >= Math.ceil(tItems / itemsPerPage));
}

let dbMaster = {
	jenisPembayaran: [],
	jenisBantuan: [],
	jenisPengeluaran: [],
	jenisPengeluaranNon: [],
	tahunAjaran: []
};
let dbSiswa = [],
	dbAdmin = [],
	dbPembayaran = [],
	dbBantuan = [],
	dbPengeluaran = [],
	dbPengeluaranNon = [],
	dbInfaq = [];
	dbMasterTarif = [];

function penyebut(nilai) {
    let val = Math.floor(Math.abs(nilai));
    let huruf = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
    let temp = "";

    if (val < 12) {
        temp = huruf[val];
    } else if (val < 20) {
        temp = penyebut(val - 10) + " Belas";
    } else if (val < 100) {
        temp = penyebut(Math.floor(val / 10)) + " Puluh " + penyebut(val % 10);
    } else if (val < 200) {
        temp = "Seratus " + penyebut(val - 100);
    } else if (val < 1000) {
        temp = penyebut(Math.floor(val / 100)) + " Ratus " + penyebut(val % 100);
    } else if (val < 2000) {
        temp = "Seribu " + penyebut(val - 1000);
    } else if (val < 1000000) {
        temp = penyebut(Math.floor(val / 1000)) + " Ribu " + penyebut(val % 1000);
    } else if (val < 1000000000) {
        temp = penyebut(Math.floor(val / 1000000)) + " Juta " + penyebut(val % 1000000);
    } else if (val < 1000000000000) {
        temp = penyebut(Math.floor(val / 1000000000)) + " Miliar " + penyebut(val % 1000000000);
    } else if (val < 1000000000000000) {
        temp = penyebut(Math.floor(val / 1000000000000)) + " Triliun " + penyebut(val % 1000000000000);
    }

    return temp;
}

function terbilang(nilai) {
    if (nilai === 0) return "Nol Rupiah";

    let hasil = penyebut(nilai)
        .replace(/\s+/g, ' ') // rapikan spasi
        .trim();

    return hasil + " Rupiah";
}
const formatRp = (angka) => new Intl.NumberFormat('id-ID', {
	style: 'currency',
	currency: 'IDR',
	minimumFractionDigits: 0
}).format(angka);

const getNowDateIndo = () => {
	const now = new Date();
	const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
	return `${now.getDate()} ${bulan[now.getMonth()]} ${now.getFullYear()}`;
}
const getNowTime = () => {
	const now = new Date();
	const pad = (n) => String(n).padStart(2, '0');
	return `${pad(now.getHours())}.${pad(now.getMinutes())}.${pad(now.getSeconds())}`;
};

function cetakKwitansi(idTransaksi) {
	const trx = dbPembayaran.find(t => String(t.id) === String(idTransaksi));
	if (!trx) return;
	const s = dbSiswa.find(siswa => String(siswa.nis).trim() === String(trx.nis).trim());
	document.getElementById('p-kwitansi').innerText = trx.id.includes('TEMP') ? 'Menunggu Server...' : trx.id;
	document.getElementById('p-nis').innerText = trx.nis;
	document.getElementById('p-nama').innerText = trx.nama || "-";
	document.getElementById('p-kelas').innerText = s ? s.kelas : "-";
	document.getElementById('p-waktu').innerText = trx.waktuInput;
	document.getElementById('p-tanggal').innerText = trx.tanggalInput;
	document.getElementById('p-jenis').innerText = trx.jenis;
	document.getElementById('p-kode').innerText = trx.acuanBayar;
	document.getElementById('p-keterangan').innerText = `Biaya Administrasi ${trx.jenis} Tahun Ajaran ${trx.tahun}`;
	document.getElementById('p-nominal').innerText = formatRp(trx.nominal);
	document.getElementById('p-grandtotal').innerText = formatRp(trx.nominal);
	document.getElementById('p-terbilang').innerText = terbilang(trx.nominal);
	document.getElementById('p-tgl-cetak').innerText = getNowDateIndo();
	window.print();
}

function showLoading(msg = "Memuat data...") {
	document.getElementById('loading-text').innerText = msg;
	document.getElementById('loading-overlay').classList.remove('hidden');
	document.getElementById('loading-overlay').classList.add('flex');
}

function hideLoading() {
	document.getElementById('loading-overlay').classList.add('hidden');
	document.getElementById('loading-overlay').classList.remove('flex');
}

function showToast(msg, type = 'success') {
	const toast = document.getElementById('toast');
	document.getElementById('toast-msg').innerText = msg;
	toast.className = `fixed bottom-4 right-4 text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 flex items-center z-50 ${type === 'success' ? 'bg-emerald-600' : (type === 'info' ? 'bg-blue-600' : 'bg-red-600')}`;
	toast.classList.remove('translate-y-20', 'opacity-0');
	setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0'), 3000);
}

// ==========================================
// FUNGSI UNTUK TOGGLE FORMULIR LIPAT (HANYA AKTIF DI MOBILE)
// ==========================================
function toggleMobileForm(contentId, iconId) {
	// Pengaman: Cegah form terlipat jika layar terdeteksi sebagai laptop/desktop (>= 768px)
	if (window.innerWidth >= 768) return;

	const content = document.getElementById(contentId);
	const icon = document.getElementById(iconId);
	
	content.classList.toggle('hidden');
	
	// Ubah arah panah
	if (content.classList.contains('hidden')) {
		if(icon) { icon.classList.remove('ph-caret-up'); icon.classList.add('ph-caret-down'); }
	} else {
		if(icon) { icon.classList.remove('ph-caret-down'); icon.classList.add('ph-caret-up'); }
	}
}

function setTabSiswa(tabName) {
	adminTableState.datasiswa.activeTab = tabName;
	const btnAktif = document.getElementById('tab-siswa-aktif');
	const btnNon = document.getElementById('tab-siswa-nonaktif');
	if (tabName === 'aktif') {
		btnAktif.className = "text-sm font-bold border-b-2 border-blue-600 text-blue-600 pb-2 transition-colors";
		btnNon.className = "text-sm font-bold border-b-2 border-transparent text-gray-500 hover:text-gray-700 pb-2 transition-colors";
	} else {
		btnNon.className = "text-sm font-bold border-b-2 border-blue-600 text-blue-600 pb-2 transition-colors";
		btnAktif.className = "text-sm font-bold border-b-2 border-transparent text-gray-500 hover:text-gray-700 pb-2 transition-colors";
	}
	adminTableState.datasiswa.filterKelas = 'All';
	initDropdowns();
	loadAdminDataSiswaTable();
}

async function fetchAPI(action, payload = {}) {
	const response = await fetch(SCRIPT_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'text/plain;charset=utf-8'
		},
		body: JSON.stringify({
			action: action,
			payload: payload
		})
	});
	return await response.json();
}

dbMaster = {
	jenisPembayaran: ['SPP Juli', 'Daftar Ulang'],
	jenisBantuan: ['Dana BOS Pusat'],
	jenisPengeluaran: ['Operasional Kelas'],
	jenisPengeluaranNon: ['Pembangunan Gedung'],
	tahunAjaran: ['2025/2026', '2026/2027'],
	jenisKelas: ['X E1', 'X IPA', 'X E2', 'X IPS', 'XI F1', 'XI IPA', 'XI F2', 'XI IPS', 'XII IPA', 'XII IPS']
};
dbAdmin = [
	{
		id: 1,
		username: 'admin',
		password: '123',
		nama: 'Super Admin',
		role: 'Super Admin'
	},
	{
		id: 2,
		username: 'kasir',
		password: '123',
		nama: 'Bendahara Madrasah',
		role: 'Admin'
	},
	{
		id: 3,
		username: 'kepsek',
		password: '123',
		nama: 'Kepala Madrasah',
		role: 'Kepala Madrasah'
	}
];
dbSiswa = [
	{ nis: '1011', nama: 'Nama Test 1', lp: 'L', tahunMasuk: '2023/2024', kelas: 'XII IPA', bulanMulai: 'Juli', kelas1: 'X IPA', kelas2: 'XI IPA', kelas3: 'XII IPA' },
	{ nis: '1012', nama: 'Nama Test 2', lp: 'P', tahunMasuk: '2024/2025', kelas: 'XI IPA', bulanMulai: 'Juli', kelas1: 'X IPA', kelas2: 'XI IPA', kelas3: ' ' },
	{ nis: '1013', nama: 'Nama Test 3', lp: 'L', tahunMasuk: '2025/2026', kelas: 'X IPA', bulanMulai: 'Juli', kelas1: 'X IPA', kelas2: ' ', kelas3: ' ' },
	{ nis: '1014', nama: 'Nama Test 4', lp: 'L', tahunMasuk: '2025/2026', kelas: 'XI IPA', bulanMulai: 'Juli', kelas1: 'XI IPA', kelas2: ' ', kelas3: ' ' },
	{ nis: '1014', nama: 'Nama Test 5', lp: 'L', tahunMasuk: '2021/2022', kelas: 'LULUS 2025', bulanMulai: 'Juli', kelas1: 'X IPA', kelas2: 'XI IPA', kelas3: 'XII IPA' }
];
dbPembayaran = [
	{
		id: 'MABU-0867',
		acuanBayar: '1011-SPP Juli-2025/2026-1',
		tanggalInput: '29 Juli 2025',
		waktuInput: '09.53.53',
		nis: '1011',
		nama: 'Budi Santoso',
		lp: 'L',
		jenis: 'SPP Juli',
		tahun: '2025/2026',
		nominal: 150000
	}
	// DUMMY 2023/2024
	// DUMMY 2024/2025
	// DUMMY 2025/2026
	// Dummy: Budi bayar SPP Juli kelas 10 (tahun 2024). Berarti dia nunggak Agustus kelas 10.
	// { id: 'M-1', nis: '1011', jenis: 'SPP Juli', tahun: '2024/2025', nominal: 100000, isDeleted: false },
	// { id: 'M-2', nis: '1011', jenis: 'SPP Agustus', tahun: '2024/2025', nominal: 100000, isDeleted: false },
	// { id: 'M-3', nis: '1011', jenis: 'SPP Juli', tahun: '2025/2026', nominal: 150000, isDeleted: false },
	// { id: 'M-4', nis: '1011', jenis: 'SPP Agustus', tahun: '2025/2026', nominal: 200000, isDeleted: false },
	// { id: 'M-5', nis: '1011', jenis: 'PTS 1', tahun: '2025/2026', nominal: 50000, isDeleted: false },
	// { id: 'M-6', nis: '1011', jenis: 'PAS 2', tahun: '2025/2026', nominal: 75000, isDeleted: false }
];
dbBantuan = [{
	id: 'BAN-0001',
	tanggalInput: '10 Juli 2026',
	waktuInput: '10.00.00',
	tglTransaksi: '2026-07-10',
	keterangan: 'Pencairan BOS Tahap 1',
	jenis: 'Dana BOS Pusat',
	tahun: '2025/2026',
	nominal: 25000000
}];
dbPengeluaran = [{
	id: 'OPS-0001',
	tanggalInput: '20 Juli 2026',
	waktuInput: '14.00.00',
	tglTransaksi: '2026-07-19',
	keterangan: 'Beli Spidol & Penghapus',
	jenis: 'Operasional Kelas',
	tahun: '2025/2026',
	nominal: 55000
}];
dbPengeluaranNon = [{
	id: 'NON-0001',
	tanggalInput: '15 Agustus 2026',
	waktuInput: '10.30.00',
	tglTransaksi: '2026-08-10',
	keterangan: 'Renovasi Atap Kelas',
	jenis: 'Pembangunan Gedung',
	tahun: '2025/2026',
	nominal: 15000000
}];
dbInfaq = [{
	id: 'INF-0001',
	tanggalInput: '20 Agustus 2026',
	waktuInput: '09.00.00',
	tglTransaksi: '2026-08-20',
	jenis: 'Pemasukan',
	keterangan: 'Sedekah Jumat',
	nominal: 350000
}];
dbMasterTarif = [
	// Tarif SPP Bulanan
	// {
	// 	id: 'TRF-1',
	// 	tahun: '2025/2026',
	// 	target: 'SEMUA KELAS',
	// 	jenis: 'SPP Juli',
	// 	nominal: 150000,
	// 	isDeleted: false
	// }
	// TARIF 2023/2024
	{ id: 'T-1', tahun: '2023/2024', target: 'X', jenis: 'SPP Juli', nominal: 100000, isDeleted: false },
	{ id: 'T-1', tahun: '2023/2024', target: 'XI', jenis: 'SPP Juli', nominal: 150000, isDeleted: false },
	{ id: 'T-1', tahun: '2023/2024', target: 'XII', jenis: 'SPP Juli', nominal: 200000, isDeleted: false },
	// TARIF 2024/2025
	{ id: 'T-1', tahun: '2024/2025', target: 'X', jenis: 'SPP Agustus', nominal: 100000, isDeleted: false },
	{ id: 'T-1', tahun: '2024/2025', target: 'XI', jenis: 'SPP Agustus', nominal: 150000, isDeleted: false },
	{ id: 'T-1', tahun: '2024/2025', target: 'XII', jenis: 'SPP Agustus', nominal: 200000, isDeleted: false },
	// TARIF 2025/2026
	{ id: 'T-1', tahun: '2025/2026', target: 'X', jenis: 'SPP Juli', nominal: 100000, isDeleted: false },
	{ id: 'T-1', tahun: '2025/2026', target: 'XI', jenis: 'SPP Agustus', nominal: 150000, isDeleted: false },
	{ id: 'T-1', tahun: '2025/2026', target: 'XII', jenis: 'SPP Agustus', nominal: 200000, isDeleted: false },
	{ id: 'T-1', tahun: '2025/2026', target: 'X', jenis: 'SPP Agustus', nominal: 100000, isDeleted: false },
	{ id: 'T-1', tahun: '2025/2026', target: 'XI', jenis: 'SPP September', nominal: 150000, isDeleted: false },
	{ id: 'T-1', tahun: '2025/2026', target: 'XII', jenis: 'SPP September', nominal: 200000, isDeleted: false }
];

function initDropdowns() {
	if (!dbMaster) return;
	const mapOpt = (arr) => arr ? arr.map(i => `<option value="${i}">${i}</option>`).join('') : '';
	const e1 = document.getElementById('input-jenis');
	if (e1) e1.innerHTML = mapOpt(dbMaster.jenisPembayaran);
	const e2 = document.getElementById('input-tahun');
	if (e2) e2.innerHTML = mapOpt(dbMaster.tahunAjaran);
	const e3 = document.getElementById('out-jenis');
	if (e3) e3.innerHTML = mapOpt(dbMaster.jenisPengeluaran);
	const e4 = document.getElementById('out-tahun');
	if (e4) e4.innerHTML = mapOpt(dbMaster.tahunAjaran);
	const e5 = document.getElementById('out-non-jenis');
	if (e5) e5.innerHTML = mapOpt(dbMaster.jenisPengeluaranNon);
	const e6 = document.getElementById('out-non-tahun');
	if (e6) e6.innerHTML = mapOpt(dbMaster.tahunAjaran);
	const e7 = document.getElementById('bantuan-jenis');
	if (e7) e7.innerHTML = mapOpt(dbMaster.jenisBantuan);
	const e8 = document.getElementById('bantuan-tahun');
	if (e8) e8.innerHTML = mapOpt(dbMaster.tahunAjaran);
	const e9 = document.getElementById('tarif-tahun');
	if (e9) e9.innerHTML = mapOpt(dbMaster.tahunAjaran);
	const e10 = document.getElementById('cetak-tahun');
	if (e10) e10.innerHTML = mapOpt(dbMaster.tahunAjaran);

	// Dropdown Dashboard Tahun Ajaran
	const eDashTahun = document.getElementById('filter-dash-tahun');
	if(eDashTahun) eDashTahun.innerHTML = '<option value="All">Semua Tahun Ajaran</option>' + mapOpt(dbMaster.tahunAjaran);
	const elFilterKelas = document.getElementById('filter-kelas');
	const elCetakKelas = document.getElementById('cetak-kelas');
	const elCetakSuratKelas = document.getElementById('surat-kelas-massal');
	let isAktif = adminTableState.datasiswa.activeTab === 'aktif';

	let filteredList = dbSiswa.filter(s => {
		let isNon = String(s.kelas).toUpperCase().includes('LULUS') || String(s.kelas).toUpperCase().includes('KELUAR');
		return isAktif ? !isNon : isNon;
	});

	if (elFilterKelas && dbSiswa) {
		let unikKelas = [...new Set(dbSiswa.map(s => s.kelas).filter(Boolean))].sort();
		elFilterKelas.innerHTML = '<option value="All">Semua Kelas</option>' + unikKelas.map(k => `<option value="${k}">${k}</option>`).join('');
	}

	let unikKelas = [...new Set(filteredList.map(s => s.kelas).filter(Boolean))].sort();
	if (elFilterKelas) elFilterKelas.innerHTML = `<option value="All">${isAktif ? 'Semua Kelas' : 'Semua Status'}</option>` + unikKelas.map(k => `<option value="${k}">${k}</option>`).join('');

	if (elCetakKelas) {
		let aktifOnly = [...new Set(dbSiswa.filter(s => !(String(s.kelas).toUpperCase().includes('LULUS') || String(s.kelas).toUpperCase().includes('KELUAR'))).map(s => s.kelas))].sort();
		elCetakKelas.innerHTML = aktifOnly.map(k => `<option value="${k}">${k}</option>`).join('');
	}
	if (elCetakSuratKelas) {
		let aktifOnly = [...new Set(dbSiswa.filter(s => !(String(s.kelas).toUpperCase().includes('LULUS') || String(s.kelas).toUpperCase().includes('KELUAR'))).map(s => s.kelas))].sort();
		elCetakSuratKelas.innerHTML = aktifOnly.map(k => `<option value="${k}">${k}</option>`).join('');
	}
}
initDropdowns();

function setLoginTab(role) {
	const btnSiswa = document.getElementById('tab-siswa');
	const btnAdmin = document.getElementById('tab-admin');
	const formSiswa = document.getElementById('form-login-siswa');
	const formAdmin = document.getElementById('form-login-admin');
	if (role === 'siswa') {
		btnSiswa.className = "flex-1 py-3 text-center font-semibold text-blue-600 border-b-2 border-blue-600 transition-colors";
		btnAdmin.className = "flex-1 py-3 text-center font-semibold text-gray-400 border-b-2 border-transparent transition-colors";
		formSiswa.classList.remove('hidden');
		formAdmin.classList.add('hidden');
	} else {
		btnAdmin.className = "flex-1 py-3 text-center font-semibold text-slate-800 border-b-2 border-slate-800 transition-colors";
		btnSiswa.className = "flex-1 py-3 text-center font-semibold text-gray-400 border-b-2 border-transparent transition-colors";
		formAdmin.classList.remove('hidden');
		formSiswa.classList.add('hidden');
	}
}

function handleLoginSiswa(e) {
	e.preventDefault();
	const nis = String(document.getElementById('login-nis').value).trim();
	showLoading("Memeriksa NIS...");
	if (useServer) {
		fetchAPI('loginSiswa', {
			nis: nis
		}).then(res => {
			hideLoading();
			if (res.success) {
				let billing = calculateSiswaBilling(res.data.profil, res.data.tarif, res.data.riwayat);
				renderSiswaView(res.data.profil, billing);
			} else showToast(res.message, 'error');
		}).catch(err => {
			hideLoading();
			showToast('Error di sistem: ' + err.message, 'error');
		});
	} else {
		setTimeout(() => {
			hideLoading();
			const s = dbSiswa.find(s => String(s.nis).trim() === nis);
			// if (s) renderSiswaView(s, billing);
			if(s) { 
				let riwayat = dbPembayaran.filter(p => !p.isDeleted && String(p.nis).trim() === nis);
				let billing = calculateSiswaBilling(s, dbMasterTarif, riwayat);
				renderSiswaView(s, billing); 
			}else showToast('NIS tidak ditemukan!', 'error');
		}, 500);
	}
}

function handleLoginAdmin(e) {
	e.preventDefault();
	const user = String(document.getElementById('login-username').value).trim();
	const pass = String(document.getElementById('login-password').value).trim();
	showLoading("Otentikasi...");

	if (useServer) {
		fetchAPI('loginAdmin', {
				username: user,
				password: pass
			})
			.then(res => {
				if (!res.success) {
					hideLoading();
					showToast(res.message, 'error');
					return;
				}
				return fetchAPI('getInitialData').then(dataRes => {
					hideLoading();
					if (!dataRes.success) {
						showToast('Gagal Muat Database: ' + dataRes.message, 'error');
						return;
					}
					try {
						populateLocalData(dataRes.data);
						renderAdminView(res.data);
						setupIdleTimer();
					} catch (errUI) {
						showToast('UI Error: ' + errUI.message, 'error');
						console.error(errUI);
					}
				});
			})
			.catch(err => {
				hideLoading();
				showToast('Kesalahan server: ' + err.message, 'error');
				console.error(err);
			});
	} else {
		setTimeout(() => {
			hideLoading();
			const admin = dbAdmin.find(a => String(a.username).trim() === user && String(a.password).trim() === pass);
			if (admin) {
				renderAdminView(admin);
				setupIdleTimer();
			} else {
				showToast('Gagal Login', 'error');
			}
		}, 500);
	}
}

function logout() {
	document.getElementById('view-siswa').classList.add('hidden');
	document.getElementById('view-admin').classList.add('hidden');
	document.getElementById('view-login').classList.remove('hidden');
	currentUserRole = '';
	['pemasukan', 'bantuan', 'pengeluaran', 'pengeluaran-non', 'infaq', 'user'].forEach(cancelEdit);
	document.getElementById('form-login-siswa').reset();
	document.getElementById('form-login-admin').reset();
	document.getElementById('info-nama-siswa').classList.add('hidden');
	document.getElementById('input-nis').classList.replace('border-red-500', 'border-gray-300');
	if (refreshCountdownInterval) clearInterval(refreshCountdownInterval);
	stopIdleTimer();
	const btnRefreshSiswa = document.getElementById('btn-refresh-siswa');
	if (btnRefreshSiswa) {
		btnRefreshSiswa.disabled = false;
		btnRefreshSiswa.classList.remove('opacity-50', 'cursor-not-allowed');
		document.getElementById('text-refresh-siswa').innerText = "Perbarui Data";
		btnRefreshSiswa.querySelector('i').classList.remove('animate-spin');
	}
}

function populateLocalData(data) {
	dbMaster = data.master;
	dbSiswa = data.siswa;
	dbAdmin = data.users;
	dbPembayaran = data.pemasukan;
	dbBantuan = data.bantuan;
	dbPengeluaran = data.pengeluaran;
	dbPengeluaranNon = data.pengeluaranNon;
	dbInfaq = data.infaq;
	dbMasterTarif = data.masterTarif || [];
	initDropdowns();
}

function toggleSidebar() {
	const sidebar = document.getElementById('admin-sidebar');
	const overlay = document.getElementById('sidebar-overlay');
	if (sidebar.classList.contains('-translate-x-full')) {
		sidebar.classList.remove('-translate-x-full');
		overlay.classList.remove('hidden');
	} else {
		sidebar.classList.add('-translate-x-full');
		overlay.classList.add('hidden');
	}
}

function switchAdminTab(tab) {
	const views = ['dashboard', 'datasiswa', 'pemasukan', 'cetak', 'bantuan', 'infaq', 'pengeluaran', 'pengeluaran-non', 'tarif', 'restore', 'user'];
	const titles = {
		'dashboard': 'Dashboard Utama',
		'datasiswa': 'Direktori Data Siswa',
		'pemasukan': 'Manajemen Pemasukan',
		'cetak': 'Rekap dan Surat Tagihan',
		'bantuan': 'Manajemen Dana Bantuan',
		'pengeluaran': 'Pengeluaran Operasional',
		'pengeluaran-non': 'Pengeluaran Non Operasional',
		'infaq': 'Manajemen Kas Infaq',
		'tarif': 'Manajemen Tarif Siswa',
		'restore': 'Pemulihan Data (Recycle Bin)',
		'user': 'Manajemen User & Akses',
	};
	views.forEach(v => {
		const viewEl = document.getElementById(`admin-view-${v}`);
		const navEl = document.getElementById(`nav-${v}`);
		if (viewEl) {
			viewEl.classList.add('hidden');
			viewEl.classList.remove('flex', 'block');
		}
		if (navEl) navEl.className = "w-full flex items-center px-4 py-3 rounded-lg hover:bg-slate-800 text-gray-400 hover:text-white transition-colors";
	});
	const currentView = document.getElementById(`admin-view-${tab}`);
	currentView.classList.remove('hidden');
	currentView.classList.add(tab === 'dashboard' ? 'block' : 'flex');

	const warnaNav = [
		'bg-blue-500',		//dashboard
		'bg-sky-500', 		//data-siswa
		'bg-cyan-500',		//pemasukan
		'bg-green-500',		//laporan
		'bg-teal-500',		//dana-bantuan
		'bg-emerald-500',	//infaq
		'bg-orange-500',	//operasional
		'bg-amber-500',		//non-operasional
		'bg-indigo-500',	//master-tarif
		'bg-rose-500',		//restore
		'bg-purple-600'		//user
	];

	const daftarTab = [
		'dashboard', 'datasiswa', 'pemasukan', 'cetak', 'bantuan', 'infaq', 'pengeluaran', 'pengeluaran-non', 'tarif', 'restore', 'user'
	];

	const indexTab = daftarTab.indexOf(tab);

	const btnColor = warnaNav[indexTab % warnaNav.length] || 'bg-gray-500';
	document.getElementById(`nav-${tab}`).className = `w-full flex items-center px-4 py-3 rounded-lg ${btnColor} text-white transition-colors`;
	document.getElementById('admin-page-title').innerText = titles[tab];

	if (tab === 'restore') loadRestoreTable();

	if (window.innerWidth < 768) {
		document.getElementById('admin-sidebar').classList.add('-translate-x-full');
		document.getElementById('sidebar-overlay').classList.add('hidden');
	}

	if (tab === 'dashboard') {
		const aktifSiswa = dbSiswa.filter(s => !String(s.kelas).toUpperCase().includes('LULUS') && !String(s.kelas).toUpperCase().includes('KELUAR'));
		const lulusSiswa = dbSiswa.filter(s => String(s.kelas).toUpperCase().includes('LULUS'));
		
		document.getElementById('dash-siswa-aktif').innerText = aktifSiswa.length + " Siswa-Siswi";
		document.getElementById('dash-siswa-laki').innerText = aktifSiswa.filter(s => s.lp === 'L').length + " Siswa";
		document.getElementById('dash-siswi-perempuan').innerText = aktifSiswa.filter(s => s.lp === 'P').length + " Siswi";
		document.getElementById('dash-siswa-lulus').innerText = lulusSiswa.length + " Lulusan";
	}
}

// FUNGSI UPDATE NOTIFIKASI BADGE RESTORE
function updateRestoreBadges() {
	const countPemasukan = dbPembayaran.filter(t => t.isDeleted).length;
	const countBantuan = dbBantuan.filter(t => t.isDeleted).length;
	const countPengeluaran = dbPengeluaran.filter(t => t.isDeleted).length;
	const countPengeluaranNon = dbPengeluaranNon.filter(t => t.isDeleted).length;
	const countInfaq = dbInfaq.filter(t => t.isDeleted).length;

	const totalDeleted = countPemasukan + countBantuan + countPengeluaran + countPengeluaranNon + countInfaq;

	document.getElementById('badge-res-pemasukan').innerText = countPemasukan;
	document.getElementById('badge-res-pemasukan').classList.toggle('hidden', countPemasukan === 0);

	document.getElementById('badge-res-bantuan').innerText = countBantuan;
	document.getElementById('badge-res-bantuan').classList.toggle('hidden', countBantuan === 0);

	document.getElementById('badge-res-pengeluaran').innerText = countPengeluaran;
	document.getElementById('badge-res-pengeluaran').classList.toggle('hidden', countPengeluaran === 0);

	document.getElementById('badge-res-pengeluaran-non').innerText = countPengeluaranNon;
	document.getElementById('badge-res-pengeluaran-non').classList.toggle('hidden', countPengeluaranNon === 0);

	document.getElementById('badge-res-infaq').innerText = countInfaq;
	document.getElementById('badge-res-infaq').classList.toggle('hidden', countInfaq === 0);

	const navBadge = document.getElementById('nav-badge-restore');
	if (navBadge) {
		navBadge.innerText = totalDeleted;
		navBadge.classList.toggle('hidden', totalDeleted === 0);
	}
}

function renderAdminView(admin) {
	currentUserRole = String(admin.role || '').trim();

	document.getElementById('view-login').classList.add('hidden');
	document.getElementById('view-admin').classList.remove('hidden');
	document.getElementById('sidebar-nama-admin').innerText = admin.nama;
	document.getElementById('sidebar-role-admin').innerText = admin.role;

	let iconColorClass = ""; 

	if (currentUserRole === "Super Admin") iconColorClass = "text-amber-300";
	else if (currentUserRole === "Admin") iconColorClass = "text-emerald-300";
	else if (currentUserRole === "Kepala Madrasah") iconColorClass = "text-sky-300";

	document.getElementById('sidebar-role-admin').className = `text-xs font-medium ${iconColorClass}`;
	document.getElementById('sidebar-role-icon').className = `ph-fill ph-shield text-2xl ${iconColorClass}`;

	const isKepsek = currentUserRole === 'Kepala Madrasah';
	const isSuperAdmin = currentUserRole === 'Super Admin';
	const isAdmin = currentUserRole === 'Admin';

	if (isSuperAdmin) {
		document.getElementById('nav-user-container').classList.remove('hidden');
		document.getElementById('nav-restore-container').classList.remove('hidden');
		document.getElementById('nav-tarif-container').classList.remove('hidden');
	} else {
		document.getElementById('nav-user-container').classList.add('hidden');
		document.getElementById('nav-restore-container').classList.add('hidden');
		document.getElementById('nav-tarif-container').classList.add('hidden');
	}

	document.querySelectorAll('.admin-input-form').forEach(el => el.classList.toggle('hidden', isKepsek));
	document.querySelectorAll('.admin-table-container').forEach(el => {
		el.classList.toggle('lg:w-2/3', !isKepsek);
		el.classList.toggle('w-full', isKepsek);
	});

	document.querySelectorAll('.admin-action-th').forEach(el => {
		if (isKepsek) {
			el.classList.add('hidden');
		} else if (isAdmin) {
			const isViewPemasukan = el.closest('#admin-view-pemasukan') !== null;
			isViewPemasukan ? el.classList.remove('hidden') : el.classList.add('hidden');
		} else {
			el.classList.remove('hidden');
		}
	});

	switchAdminTab('dashboard');
	loadDashboardStats();
	loadAdminDataSiswaTable();
	loadAdminTable();
	loadAdminBantuanTable();
	loadAdminPengeluaranTable();
	loadAdminPengeluaranNonTable();
	loadAdminInfaqTable();

	if (isSuperAdmin) {
		loadAdminUserTable();
		loadAdminTarifTable();
		updateRestoreBadges();
	}
}

function refreshAdminData() {
	showLoading("Memperbarui Data...");
	if (useServer) {
		fetchAPI('getInitialData').then(dataRes => {
			hideLoading();
			if (dataRes.success) {
				populateLocalData(dataRes.data);
				loadDashboardStats();
				loadAdminDataSiswaTable();
				loadAdminTable();
				loadAdminBantuanTable();
				loadAdminPengeluaranTable();
				loadAdminPengeluaranNonTable();
				loadAdminInfaqTable();
				if (currentUserRole === 'Super Admin') {
					loadAdminUserTable();
					loadAdminTarifTable();
					updateRestoreBadges();
					if (!document.getElementById('admin-view-restore').classList.contains('hidden')) loadRestoreTable();
				}
				showToast('Data disinkronisasi!');
			} else {
				showToast('Gagal sinkronisasi: ' + dataRes.message, 'error');
			}
		}).catch(err => {
			hideLoading();
			showToast('Error di sistem: ' + err.message, 'error');
		});
	} else {
		setTimeout(() => {
			hideLoading();
			showToast('Data diperbarui (Preview)');
		}, 500);
	}
}

function cekNamaSiswa(nis) {
	const infoEl = document.getElementById('info-nama-siswa');
	let strNis = String(nis).trim();
	if (!strNis || strNis === '') {
		infoEl.classList.add('hidden');
		return;
	}
	const siswa = dbSiswa.find(s => String(s.nis).trim() === strNis);
	infoEl.classList.remove('hidden');
	if (siswa) {
		infoEl.className = "text-sm mt-1.5 font-medium text-blue-600 flex items-center";
		infoEl.innerHTML = `<i class="ph ph-check-circle text-lg mr-1.5"></i> ${siswa.nama} (${siswa.kelas})`;
		document.getElementById('input-nis').classList.replace('border-red-500', 'border-gray-300');
	} else {
		infoEl.className = "text-sm mt-1.5 font-medium text-red-500 flex items-center";
		infoEl.innerHTML = `<i class="ph ph-x-circle text-lg mr-1.5"></i> NIS tidak terdaftar`;
		document.getElementById('input-nis').classList.replace('border-gray-300', 'border-red-500');
	}
}

function getActionClass(tabName) {
	if (currentUserRole === 'Kepala Sekolah') return 'hidden';
	if (currentUserRole === 'Admin' && tabName !== 'pemasukan') return 'hidden';
	return '';
}

function handleSearch(type) {
	adminTableState[type].query = document.getElementById(`search-${type}`).value.toLowerCase();
	adminTableState[type].page = 1;
	changeAdminPage(type, 0);
}

function handleFilterKelas() {
	adminTableState.datasiswa.filterKelas = document.getElementById('filter-kelas').value;
	adminTableState.datasiswa.page = 1;
	loadAdminDataSiswaTable();
}

function changeAdminPage(type, delta) {
	adminTableState[type].page += delta;
	if (type === 'datasiswa') loadAdminDataSiswaTable();
	else if (type === 'pemasukan') loadAdminTable();
	else if (type === 'bantuan') loadAdminBantuanTable();
	else if (type === 'pengeluaran') loadAdminPengeluaranTable();
	else if (type === 'pengeluaran-non') loadAdminPengeluaranNonTable();
	else if (type === 'tarif') loadAdminTarifTable();
	else if (type === 'infaq') loadAdminInfaqTable();
	else if (type === 'user') loadAdminUserTable();
	else if (type === 'restore') loadRestoreTable();
}

function buildTableRow(tbody, pData, type, htmlBuilderFn) {
	tbody.innerHTML = '';
	if (pData.length === 0) tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-gray-500">Data tidak ditemukan</td></tr>`;
	else pData.forEach(htmlBuilderFn);
}

function getPaginatedData(dataArray, type, filterFn) {
	const itemsPerPage = getItemsPerPage();

	// HIGHLIGHT: PENGAMAN (Safeguard)
	// Pastikan dataArray adalah Array. Jika undefined/null, jadikan array kosong []
	let safeArray = Array.isArray(dataArray) ? dataArray : [];

	let filtered = [...safeArray].filter(filterFn);

	// 2. HIGHLIGHT: Logika pemisahan urutan (Reverse vs Urut Abjad)
	if (type !== 'datasiswa') {
		// Untuk transaksi (pemasukan, pengeluaran, dll), urutkan dari yang terbaru (reverse)
		filtered = filtered.reverse();
	} else {
		// Untuk Data Siswa, urutkan berdasarkan abjad Nama (A-Z)
		filtered = filtered;
	}

	const tItems = filtered.length;
	const tPages = Math.ceil(tItems / itemsPerPage) || 1;
	if (adminTableState[type].page > tPages) adminTableState[type].page = tPages;
	if (adminTableState[type].page < 1) adminTableState[type].page = 1;
	const startIdx = (adminTableState[type].page - 1) * itemsPerPage;
	return {
		pData: filtered.slice(startIdx, startIdx + itemsPerPage),
		tItems,
		startIdx
	};
}

function loadAdminDataSiswaTable() {
	const tbody = document.getElementById('table-admin-datasiswa');
	let isAktif = adminTableState.datasiswa.activeTab === 'aktif'; 

	const { pData, tItems, startIdx } = getPaginatedData(dbSiswa, 'datasiswa', s => { 
		const q = adminTableState.datasiswa.query; const fKelas = adminTableState.datasiswa.filterKelas; 
		let isMatchQuery = (!q || String(s.nis).toLowerCase().includes(q) || String(s.nama).toLowerCase().includes(q)); 
		let isMatchKelas = (fKelas === 'All' || s.kelas === fKelas); 
		let sKls = String(s.kelas).toUpperCase();
		let isNon = sKls.includes('LULUS') || sKls.includes('KELUAR'); 
		let isMatchTab = isAktif ? !isNon : isNon; 
		return isMatchQuery && isMatchKelas && isMatchTab; 
	});

	// Mapping warna bulan
	const warnaBulan = {
		Juli: 'bg-red-100 text-red-700',
		Agustus: 'bg-orange-100 text-orange-700',
		September: 'bg-amber-100 text-amber-700',
		Oktober: 'bg-yellow-100 text-yellow-700',
		November: 'bg-lime-100 text-lime-700',
		Desember: 'bg-green-100 text-green-700',
		Januari: 'bg-emerald-100 text-emerald-700',
		Februari: 'bg-teal-100 text-teal-700',
		Maret: 'bg-cyan-100 text-cyan-700',
		April: 'bg-sky-100 text-sky-700',
		Mei: 'bg-blue-100 text-blue-700',
		Juni: 'bg-indigo-100 text-indigo-700'
	};

	const colorNames = [
		'red','orange','amber','yellow','lime','green','emerald','teal','cyan','sky','blue','indigo','purple'
	];

	// Optimasi: Mapping warna tahun dilakukan di luar loop agar tidak membebani browser per-baris
	const uniqueTahun = [...new Set(pData.map(s => s.tahunMasuk))];
	const warnaTahun = {};
	uniqueTahun.forEach(tahun => {
		// Mengambil angka tahun awal (contoh: "2014/2015" -> 2014)
		const startYear = parseInt(String(tahun).split('/')[0]);
		let colorIndex = 0;

		if (!isNaN(startYear)) {
			// Cari selisih dari tahun dasar (2014)
			let selisih = startYear - 2014;
			
			// Mencegah error jika ada tahun di bawah 2014 (opsional)
			if (selisih < 0) selisih = 0; 
			
			// Sisa bagi (modulo) dengan panjang array (11)
			// Jika tahun 2025, selisih = 11. Maka 11 % 11 = 0 (kembali ke warna 'red')
			colorIndex = selisih % colorNames.length; 
		}

		const color = colorNames[colorIndex];
		warnaTahun[tahun] = `bg-${color}-100 text-${color}-700 border-${color}-200`;
	});

	buildTableRow(tbody, pData, 'datasiswa', s => {
		let lpBadge = s.lp === 'L' ? `<span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">L</span>` : `<span class="bg-pink-100 text-pink-700 px-2 py-0.5 rounded text-xs font-bold">P</span>`;
		
		// Ambil warna berdasarkan bulan
		let warna = warnaBulan[s.bulanMulai] || 'bg-gray-100 text-gray-700';
		let bulanBadge = `
			<span class="${warna} px-2 py-0.5 rounded text-xs font-bold">
				${s.bulanMulai}
			</span>
		`;
		
		// BADGE KELAS
		let warnaKelasBadge = '';
		if (['X E1', 'X IPA'].includes(s.kelas)) {warnaKelasBadge = 'bg-green-100 text-green-700 border-green-200';} 
		else if (['X E2', 'X IPS'].includes(s.kelas)) {warnaKelasBadge = 'bg-emerald-100 text-emerald-700 border-emerald-200';}
		else if (['XI F1', 'XI IPA'].includes(s.kelas)) {warnaKelasBadge = 'bg-amber-100 text-amber-700 border-amber-200';}
		else if (['XI F2', 'XI IPS'].includes(s.kelas)) {warnaKelasBadge = 'bg-yellow-100 text-yellow-700 border-yellow-200';}
		else if (['XII IPA'].includes(s.kelas)) {warnaKelasBadge = 'bg-red-100 text-red-700 border-red-200';}
		else if (['XII IPS'].includes(s.kelas)) {warnaKelasBadge = 'bg-rose-100 text-rose-700 border-rose-200';}
		else {warnaKelasBadge = 'bg-gray-100 text-gray-700 border-gray-200';}

		let kelasBadge = `
			<span class="${warnaKelasBadge} border px-2.5 py-1 rounded-md text-xs font-bold">
				${s.kelas}
			</span>
		`;

		// Badge Tahun
		let tahunClass = warnaTahun[s.tahunMasuk] || 'bg-gray-100 text-gray-700 border-gray-200';
		let tahunBadge = `
			<span class="${tahunClass} border px-2 py-1 rounded-md text-xs font-bold">
				${s.tahunMasuk}
			</span>
		`;
		
		tbody.innerHTML += `
		<tr class="hover:bg-gray-50">
			<td class="p-4 font-medium text-gray-600 whitespace-nowrap">${s.nis}</td>
			<td class="p-4 font-bold text-gray-800 whitespace-nowrap">${s.nama}</td>
			<td class="p-4 text-center whitespace-nowrap">${lpBadge}</td>
			<td class="p-4 text-center whitespace-nowrap">${tahunBadge}</td>
			<td class="p-4 text-center whitespace-nowrap">${bulanBadge}</td>
			<td class="p-4 text-center whitespace-nowrap">${kelasBadge}</td>
		</tr>`; 
	});

	updatePaginationUI('datasiswa', tItems, pData.length);
}

function loadAdminTable() {
	const tbody = document.getElementById('table-admin-history');
	const q = adminTableState.pemasukan.query;
	const {
		pData,
		tItems,
		startIdx
	} = getPaginatedData(dbPembayaran, 'pemasukan', t => !t.isDeleted && (!q || String(t.nis).toLowerCase().includes(q) || String(t.jenis).toLowerCase().includes(q) || String(t.acuanBayar).toLowerCase().includes(q)));
	buildTableRow(tbody, pData, 'pemasukan', t => {
		let statusSync = String(t.id).includes('TEMP-') ? '<i class="ph ph-spinner-gap animate-spin text-orange-500 ml-1" title="Menyinkronkan..."></i>' : '';
		let btnCetak = `<button type="button" onclick="cetakKwitansi('${t.id}')" class="text-purple-600 hover:text-purple-800 mr-3" title="Cetak Kwitansi"><i class="ph ph-printer text-xl"></i></button>`;
		let btnEdit = currentUserRole === 'Super Admin' ? `<button type="button" onclick="editData('pemasukan', '${t.id}')" class="text-blue-500 hover:text-blue-700 mr-2" title="Edit"><i class="ph ph-pencil-simple text-lg"></i></button>` : '';
		let btnDelete = currentUserRole === 'Super Admin' ? `<button type="button" onclick="deleteData('pemasukan', '${t.id}')" class="text-red-500 hover:text-red-700" title="Hapus"><i class="ph ph-trash text-lg"></i></button>` : '';
		tbody.innerHTML += `
		<tr class="hover:bg-gray-50">
			<td class="p-4 text-xs">
				<div class="text-gray-800 font-medium flex items-center whitespace-nowrap">${t.tanggalInput} ${statusSync}</div>
				<div class="text-gray-500 whitespace-nowrap">${t.waktuInput}</div>
			</td>
			<td class="p-4">
				<div class="font-bold text-blue-600 whitespace-nowrap">${t.nis}</div>
				<div class="text-xs text-gray-600 whitespace-nowrap">${t.nama}</div>
			</td>
			<td class="p-4 text-gray-800">
				<div class="font-medium whitespace-nowrap">${t.jenis} <span class="text-xs font-normal text-gray-500">(TA: ${t.tahun})</span></div>
				<div class="text-[11px] text-gray-400 mt-0.5 bg-gray-100 px-1 rounded w-max border whitespace-nowrap">${t.acuanBayar}</div></td><td class="p-4 font-bold text-right text-emerald-600 whitespace-nowrap">${formatRp(t.nominal)}</td><td class="p-4 text-center whitespace-nowrap ${getActionClass('pemasukan')}">${btnCetak}${btnEdit}${btnDelete}
			</td>
		</tr>`;
	});
	updatePaginationUI('pemasukan', tItems, pData.length);
}

function loadAdminBantuanTable() {
	const tbody = document.getElementById('table-admin-bantuan');
	const q = adminTableState.bantuan.query;
	const {
		pData,
		tItems,
		startIdx
	} = getPaginatedData(dbBantuan, 'bantuan', t => !t.isDeleted && (!q || String(t.keterangan).toLowerCase().includes(q) || String(t.jenis).toLowerCase().includes(q) || String(t.tglTransaksi).toLowerCase().includes(q)));
	buildTableRow(tbody, pData, 'bantuan', t => {
		let statusSync = String(t.id).includes('TEMP-') ? '<i class="ph ph-spinner-gap animate-spin text-orange-500 ml-1"></i>' : '';
		let btnEdit = currentUserRole === 'Super Admin' ? `<button type="button" onclick="editData('bantuan', '${t.id}')" class="text-blue-500 hover:text-blue-700 mr-2"><i class="ph ph-pencil-simple text-lg"></i></button>` : '';
		let btnDelete = currentUserRole === 'Super Admin' ? `<button type="button" onclick="deleteData('bantuan', '${t.id}')" class="text-red-500 hover:text-red-700"><i class="ph ph-trash text-lg"></i></button>` : '';
		tbody.innerHTML += `
		<tr class="hover:bg-gray-50">
			<td class="p-4 text-xs">
				<div class="text-gray-800 font-medium flex items-center whitespace-nowrap">${t.tanggalInput} ${statusSync}</div>
				<div class="text-gray-500 whitespace-nowrap">${t.waktuInput}</div>
			</td>
			<td class="p-4">
				<div class="text-gray-800 whitespace-nowrap">${t.tglTransaksi}</div>
				<div class="text-xs text-gray-500 mt-1 whitespace-nowrap">${t.keterangan}</div>
			</td>
			<td class="p-4">
				<div class="font-medium text-blue-600 whitespace-nowrap">${t.jenis}</div>
				<div class="text-xs text-gray-500 mt-1 whitespace-nowrap">TA: ${t.tahun}</div>
			</td>
			<td class="p-4 font-medium text-right text-emerald-600 whitespace-nowrap">+ ${formatRp(t.nominal)}</td><td class="p-4 text-center whitespace-nowrap ${getActionClass('bantuan')}">${btnEdit}${btnDelete}</td>
		</tr>`;
	});
	updatePaginationUI('bantuan', tItems, pData.length);
}

function loadAdminPengeluaranTable() {
	const tbody = document.getElementById('table-admin-pengeluaran');
	const q = adminTableState.pengeluaran.query;
	const {
		pData,
		tItems,
		startIdx
	} = getPaginatedData(dbPengeluaran, 'pengeluaran', t => !t.isDeleted && (!q || String(t.keterangan).toLowerCase().includes(q) || String(t.jenis).toLowerCase().includes(q) || String(t.tglTransaksi).toLowerCase().includes(q)));
	buildTableRow(tbody, pData, 'pengeluaran', t => {
		let statusSync = String(t.id).includes('TEMP-') ? '<i class="ph ph-spinner-gap animate-spin text-orange-500 ml-1"></i>' : '';
		let btnEdit = currentUserRole === 'Super Admin' ? `<button type="button" onclick="editData('pengeluaran', '${t.id}')" class="text-blue-500 hover:text-blue-700 mr-2"><i class="ph ph-pencil-simple text-lg"></i></button>` : '';
		let btnDelete = currentUserRole === 'Super Admin' ? `<button type="button" onclick="deleteData('pengeluaran', '${t.id}')" class="text-red-500 hover:text-red-700"><i class="ph ph-trash text-lg"></i></button>` : '';
		tbody.innerHTML += `
		<tr class="hover:bg-gray-50">
			<td class="p-4 text-xs">
				<div class="text-gray-800 font-medium flex items-center whitespace-nowrap">${t.tanggalInput} ${statusSync}</div>
				<div class="text-gray-500 whitespace-nowrap">${t.waktuInput}</div>
			</td>
			<td class="p-4">
				<div class="text-gray-800 whitespace-nowrap">${t.tglTransaksi}</div>
				<div class="text-xs text-gray-500 mt-1 whitespace-nowrap">${t.keterangan}</div>
			</td>
			<td class="p-4">
				<div class="font-medium text-red-600 whitespace-nowrap">${t.jenis}</div>
				<div class="text-xs text-gray-500 mt-1 whitespace-nowrap">TA: ${t.tahun}</div>
			</td>
			<td class="p-4 font-medium text-right text-red-600 whitespace-nowrap">- ${formatRp(t.nominal)}</td><td class="p-4 text-center whitespace-nowrap ${getActionClass('pengeluaran')}">${btnEdit}${btnDelete}</td>
		</tr>`;
	});
	updatePaginationUI('pengeluaran', tItems, pData.length);
}

function loadAdminPengeluaranNonTable() {
	const tbody = document.getElementById('table-admin-pengeluaran-non');
	const q = adminTableState['pengeluaran-non'].query;
	const {
		pData,
		tItems,
		startIdx
	} = getPaginatedData(dbPengeluaranNon, 'pengeluaran-non', t => !t.isDeleted && (!q || String(t.keterangan).toLowerCase().includes(q) || String(t.jenis).toLowerCase().includes(q) || String(t.tglTransaksi).toLowerCase().includes(q)));
	buildTableRow(tbody, pData, 'pengeluaran-non', t => {
		let statusSync = String(t.id).includes('TEMP-') ? '<i class="ph ph-spinner-gap animate-spin text-orange-500 ml-1"></i>' : '';
		let btnEdit = currentUserRole === 'Super Admin' ? `<button type="button" onclick="editData('pengeluaran-non', '${t.id}')" class="text-blue-500 hover:text-blue-700 mr-2"><i class="ph ph-pencil-simple text-lg"></i></button>` : '';
		let btnDelete = currentUserRole === 'Super Admin' ? `<button type="button" onclick="deleteData('pengeluaran-non', '${t.id}')" class="text-red-500 hover:text-red-700"><i class="ph ph-trash text-lg"></i></button>` : '';
		tbody.innerHTML += `
		<tr class="hover:bg-gray-50">
			<td class="p-4 text-xs">
				<div class="text-gray-800 font-medium flex items-center whitespace-nowrap">${t.tanggalInput} ${statusSync}</div>
				<div class="text-gray-500 whitespace-nowrap">${t.waktuInput}</div>
			</td>
			<td class="p-4">
				<div class="text-gray-800 whitespace-nowrap">${t.tglTransaksi}</div>
				<div class="text-xs text-gray-500 mt-1 whitespace-nowrap">${t.keterangan}</div>
			</td>
			<td class="p-4">
				<div class="font-medium text-orange-600 whitespace-nowrap">${t.jenis}</div>
				<div class="text-xs text-gray-500 mt-1 whitespace-nowrap">TA: ${t.tahun}</div>
			</td>
			<td class="p-4 font-medium text-right text-orange-600 whitespace-nowrap">- ${formatRp(t.nominal)}</td>
			<td class="p-4 text-center whitespace-nowrap ${getActionClass('pengeluaran-non')}">${btnEdit}${btnDelete}</td>
		</tr>`;
	});
	updatePaginationUI('pengeluaran-non', tItems, pData.length);
}

function loadAdminInfaqTable() {
	const tbody = document.getElementById('table-admin-infaq');
	let saldoTotal = dbInfaq.reduce((sum, trx) => !trx.isDeleted ? (trx.jenis === 'Pemasukan' ? sum + parseInt(trx.nominal || 0) : sum - parseInt(trx.nominal || 0)) : sum, 0);
	document.getElementById('infaq-total-saldo').innerText = formatRp(saldoTotal);
	const q = adminTableState.infaq.query;
	const {
		pData,
		tItems,
		startIdx
	} = getPaginatedData(dbInfaq, 'infaq', t => !t.isDeleted && (!q || String(t.keterangan).toLowerCase().includes(q) || String(t.jenis).toLowerCase().includes(q) || String(t.tglTransaksi).toLowerCase().includes(q)));
	buildTableRow(tbody, pData, 'infaq', t => {
		let isM = t.jenis === 'Pemasukan';
		let iconM = isM ? `<span class="px-2 py-1 text-xs rounded-full font-medium bg-emerald-100 text-emerald-700">Masuk</span>` : `<span class="px-2 py-1 text-xs rounded-full font-medium bg-red-100 text-red-700">Keluar</span>`;
		let statusSync = String(t.id).includes('TEMP-') ? '<i class="ph ph-spinner-gap animate-spin text-orange-500 ml-1"></i>' : '';
		let btnEdit = currentUserRole === 'Super Admin' ? `<button type="button" onclick="editData('infaq', '${t.id}')" class="text-blue-500 hover:text-blue-700 mr-2"><i class="ph ph-pencil-simple text-lg"></i></button>` : '';
		let btnDelete = currentUserRole === 'Super Admin' ? `<button type="button" onclick="deleteData('infaq', '${t.id}')" class="text-red-500 hover:text-red-700"><i class="ph ph-trash text-lg"></i></button>` : '';
		tbody.innerHTML += `
		<tr class="hover:bg-gray-50">
			<td class="p-4 text-xs">
				<div class="text-gray-800 font-medium flex items-center whitespace-nowrap">${t.tanggalInput} ${statusSync}</div>
				<div class="text-gray-500 whitespace-nowrap">${t.waktuInput}</div>
			</td>
			<td class="p-4">
				<div class="text-gray-800 whitespace-nowrap">${t.tglTransaksi}</div>
				<div class="text-xs text-gray-500 mt-1 whitespace-nowrap">${t.keterangan}</div>
			</td>
			<td class="p-4 text-center whitespace-nowrap">${iconM}</td>
			<td class="p-4 font-medium text-right whitespace-nowrap ${isM ? 'text-emerald-600' : 'text-red-600'}">${isM ? '+ ' : '- '}${formatRp(t.nominal)}</td>
			<td class="p-4 text-center whitespace-nowrap ${getActionClass('infaq')}">${btnEdit}${btnDelete}</td>
		</tr>`;
	});
	updatePaginationUI('infaq', tItems, pData.length);
}

function loadAdminUserTable() {
	const tbody = document.getElementById('table-admin-user');
	const q = adminTableState.user.query;
	const {
		pData,
		tItems,
		startIdx
	} = getPaginatedData(dbAdmin, 'user', t => !t.isDeleted && (!q || String(t.username).toLowerCase().includes(q) || String(t.nama).toLowerCase().includes(q) || String(t.role).toLowerCase().includes(q)));
	buildTableRow(tbody, pData, 'user', t => {
		let rBadge = t.role === 'Super Admin' ? `<span class="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">Super Admin</span>` : (t.role === 'Admin' ? `<span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">Admin</span>` : `<span class="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-bold">Kepala Madrasah</span>`);
		let statusSync = t.id && String(t.id).includes('TEMP-') ? '<i class="ph ph-spinner-gap animate-spin text-orange-500 ml-2" title="Menyinkronkan..."></i>' : '';
		let btnEdit = `<button type="button" onclick="editData('user', '${t.id}')" class="text-blue-500 hover:text-blue-700 mr-2"><i class="ph ph-pencil-simple text-lg"></i></button>`;
		let btnDelete = `<button type="button" onclick="deleteData('user', '${t.id}')" class="text-red-500 hover:text-red-700"><i class="ph ph-trash text-lg"></i></button>`;
		tbody.innerHTML += `
		<tr class="hover:bg-gray-50">
			<td class="p-4 text-gray-800 font-medium flex items-center whitespace-nowrap">${t.username} ${statusSync}</td>
			<td class="p-4 text-gray-800 font-bold whitespace-nowrap">${t.nama}</td>
			<td class="p-4 whitespace-nowrap">${rBadge}</td>
			<td class="p-4 text-center whitespace-nowrap ${getActionClass('user')}">${btnEdit}${btnDelete}</td>
		</tr>`;
	});
	updatePaginationUI('user', tItems, pData.length);
}

function loadAdminTarifTable() { 
	const tbody = document.getElementById('table-admin-tarif');
	const q = adminTableState.tarif.query; 
	
	const { pData, tItems, startIdx } = getPaginatedData(
		dbMasterTarif, 
		'tarif', 
		t => !t.isDeleted && (!q || String(t.tahun).toLowerCase().includes(q) || String(t.target).toLowerCase().includes(q) || String(t.jenis).toLowerCase().includes(q))
	); 
	
	buildTableRow(tbody, pData, 'tarif', t => {
		let statusSync = t.id && String(t.id).includes('TEMP-') ? '<i class="ph ph-spinner-gap animate-spin text-orange-500 ml-2" title="Menyinkronkan..."></i>' : '';
		let btnEdit = `<button type="button" onclick="editData('tarif', '${t.id}')" class="text-blue-500 hover:text-blue-700 mr-2"><i class="ph ph-pencil-simple text-lg"></i></button>`;
		let btnDelete = `<button type="button" onclick="deleteData('tarif', '${t.id}')" class="text-red-500 hover:text-red-700"><i class="ph ph-trash text-lg"></i></button>`;
		
		tbody.innerHTML += `
		<tr class="hover:bg-gray-50">
			<td class="p-4 text-gray-800 font-medium flex items-center whitespace-nowrap">${t.tahun} ${statusSync}</td>
			<td class="p-4 whitespace-nowrap"><span class="bg-purple-100 text-purple-800 px-2.5 py-1 rounded-md text-xs font-bold border border-purple-200 whitespace-nowrap">${t.target}</span></td>
			<td class="p-4 text-gray-800 font-medium whitespace-nowrap">${t.jenis}</td>
			<td class="p-4 font-bold text-right text-gray-800 whitespace-nowrap">${formatRp(t.nominal)}</td>
			<td class="p-4 text-center whitespace-nowrap">${btnEdit}${btnDelete}</td>
		</tr>`;
	});
	
	updatePaginationUI('tarif', tItems, pData.length); 
}

// ==========================================
// MENU RESTORE LOGIC (KHUSUS SUPER ADMIN)
// ==========================================
function switchRestoreTab(tab) {
	activeRestoreTab = tab;
	const tabs = ['pemasukan', 'bantuan', 'infaq', 'pengeluaran', 'pengeluaran-non'];
	tabs.forEach(t => {
		const el = document.getElementById(`rtab-${t}`);
		if (t === tab) {
			el.className = "flex-none px-6 py-3 text-sm font-semibold border-b-2 border-red-500 text-red-600 transition-colors flex items-center";
		} else {
			el.className = "flex-none px-6 py-3 text-sm font-semibold border-b-2 border-transparent text-gray-500 hover:text-gray-700 transition-colors flex items-center";
		}
	});
	adminTableState.restore.page = 1;
	loadRestoreTable();
}

function loadRestoreTable() {
	const tbody = document.getElementById('table-admin-restore');
	let dbArray = [];

	if (activeRestoreTab === 'pemasukan') dbArray = dbPembayaran;
	else if (activeRestoreTab === 'bantuan') dbArray = dbBantuan;
	else if (activeRestoreTab === 'infaq') dbArray = dbInfaq;
	else if (activeRestoreTab === 'pengeluaran') dbArray = dbPengeluaran;
	else if (activeRestoreTab === 'pengeluaran-non') dbArray = dbPengeluaranNon;

	const {
		pData,
		tItems,
		startIdx
	} = getPaginatedData(dbArray, 'restore', t => t.isDeleted);

	buildTableRow(tbody, pData, 'restore', t => {
		let rincian = "";
		if (activeRestoreTab === 'pemasukan') rincian = `<div class="font-bold text-gray-800">${t.nis} - ${t.nama}</div><div class="text-xs text-gray-500 mt-1">${t.jenis} (${t.tahun})</div>`;
		else rincian = `<div class="font-medium text-gray-800">${t.keterangan || t.jenis}</div><div class="text-xs text-gray-500 mt-1">${t.tglTransaksi}</div>`;

		let statusSync = String(t.id).includes('TEMP-') ? '<i class="ph ph-spinner-gap animate-spin text-orange-500 ml-1"></i>' : '';
		let btnRestore = `<button type="button" onclick="restoreData('${activeRestoreTab}', '${t.id}')" class="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-3 py-1.5 rounded text-sm font-bold transition-colors">Pulihkan</button>`;

		tbody.innerHTML += `<tr class="hover:bg-red-50 transition-colors"><td class="p-4 text-xs text-gray-500">${t.id} ${statusSync}<br/>${t.tanggalInput}</td><td class="p-4">${rincian}</td><td class="p-4 font-bold text-right text-gray-600">${formatRp(t.nominal)}</td><td class="p-4 text-center">${btnRestore}</td></tr>`;
	});
	updatePaginationUI('restore', tItems, pData.length);
}

function restoreData(tipe, id) {
	let targetDb, renderFn;
	if (tipe === 'pemasukan') {
		targetDb = dbPembayaran;
		renderFn = loadAdminTable;
	} else if (tipe === 'bantuan') {
		targetDb = dbBantuan;
		renderFn = loadAdminBantuanTable;
	} else if (tipe === 'pengeluaran') {
		targetDb = dbPengeluaran;
		renderFn = loadAdminPengeluaranTable;
	} else if (tipe === 'pengeluaran-non') {
		targetDb = dbPengeluaranNon;
		renderFn = loadAdminPengeluaranNonTable;
	} else if (tipe === 'infaq') {
		targetDb = dbInfaq;
		renderFn = loadAdminInfaqTable;
	}

	const idx = targetDb.findIndex(t => String(t.id) === String(id));
	if (idx === -1) return;

	// OPTIMISTIC RESTORE
	targetDb[idx].isDeleted = false;
	loadDashboardStats();
	updateRestoreBadges();
	loadRestoreTable();
	renderFn();
	showToast('Memulihkan data...', 'info');

	if (useServer) {
		fetchAPI('restoreTransaksi', {
			tipe: tipe,
			id: id
		}).then(res => {
			if (res.success) {
				showToast('Data berhasil dipulihkan!');
			} else throw new Error(res.message);
		}).catch(err => {
			// ROLLBACK
			targetDb[idx].isDeleted = true;
			loadDashboardStats();
			updateRestoreBadges();
			loadRestoreTable();
			renderFn();
			showToast('Gagal memulihkan di server.', 'error');
		});
	} else {
		setTimeout(() => showToast('Data dipulihkan (Preview lokal)'), 500);
	}
}


function setEditMode(tipe, mode) {
	const btnSubmit = document.getElementById(`btn-submit-${tipe}`);
	const btnCancel = document.getElementById(`btn-cancel-${tipe}`);
	if (mode) {
		btnSubmit.innerText = 'Update Data';
		btnSubmit.classList.replace('w-full', 'w-2/3');
		btnCancel.classList.remove('hidden');
	} else {
		btnSubmit.innerText = 'Simpan Data';
		btnSubmit.classList.replace('w-2/3', 'w-full');
		btnCancel.classList.add('hidden');
	}
}

function cancelEdit(tipe) {
	const formId = tipe === 'pemasukan' ? 'form-pembayaran' : tipe === 'bantuan' ? 'form-bantuan' : tipe === 'pengeluaran-non' ? 'form-pengeluaran-non' : `form-${tipe}`;
	const form = document.getElementById(formId);
	if (form) form.reset();
	const idField = document.getElementById(`edit-id-${tipe}`);
	if (idField) idField.value = '';
	setEditMode(tipe, false);
	if (tipe === 'pemasukan') {
		document.getElementById('info-nama-siswa').classList.add('hidden');
		document.getElementById('input-nis').classList.replace('border-red-500', 'border-gray-300');
	}
}

function editData(tipe, id) {
	const strId = String(id);
	if (tipe === 'pemasukan') {
		const trx = dbPembayaran.find(t => String(t.id) === strId);
		if (!trx) return;
		document.getElementById('edit-id-pemasukan').value = trx.id;
		document.getElementById('edit-acuan-pemasukan').value = trx.acuanBayar;
		document.getElementById('edit-tgl-pemasukan').value = trx.tanggalInput;
		document.getElementById('edit-waktu-pemasukan').value = trx.waktuInput;
		document.getElementById('edit-nama-pemasukan').value = trx.nama;
		document.getElementById('edit-lp-pemasukan').value = trx.lp;
		document.getElementById('input-nis').value = trx.nis;
		cekNamaSiswa(trx.nis);
		document.getElementById('input-jenis').value = trx.jenis;
		document.getElementById('input-tahun').value = trx.tahun;
		document.getElementById('input-nominal').value = trx.nominal;
	} else if (tipe === 'bantuan') {
		const trx = dbBantuan.find(t => String(t.id) === strId);
		if (!trx) return;
		document.getElementById('edit-id-bantuan').value = trx.id;
		document.getElementById('bantuan-tgl-transaksi').value = trx.tglTransaksi;
		document.getElementById('edit-tgl-bantuan').value = trx.tanggalInput;
		document.getElementById('edit-waktu-bantuan').value = trx.waktuInput;
		document.getElementById('bantuan-keterangan').value = trx.keterangan;
		document.getElementById('bantuan-jenis').value = trx.jenis;
		document.getElementById('bantuan-tahun').value = trx.tahun;
		document.getElementById('bantuan-nominal').value = trx.nominal;
	} else if (tipe === 'pengeluaran') {
		const trx = dbPengeluaran.find(t => String(t.id) === strId);
		if (!trx) return;
		document.getElementById('edit-id-pengeluaran').value = trx.id;
		document.getElementById('out-tgl-transaksi').value = trx.tglTransaksi;
		document.getElementById('edit-tgl-pengeluaran').value = trx.tanggalInput;
		document.getElementById('edit-waktu-pengeluaran').value = trx.waktuInput;
		document.getElementById('out-keterangan').value = trx.keterangan;
		document.getElementById('out-jenis').value = trx.jenis;
		document.getElementById('out-tahun').value = trx.tahun;
		document.getElementById('out-nominal').value = trx.nominal;
	} else if (tipe === 'pengeluaran-non') {
		const trx = dbPengeluaranNon.find(t => String(t.id) === strId);
		if (!trx) return;
		document.getElementById('edit-id-pengeluaran-non').value = trx.id;
		document.getElementById('out-non-tgl-transaksi').value = trx.tglTransaksi;
		document.getElementById('edit-tgl-pengeluaran-non').value = trx.tanggalInput;
		document.getElementById('edit-waktu-pengeluaran-non').value = trx.waktuInput;
		document.getElementById('out-non-keterangan').value = trx.keterangan;
		document.getElementById('out-non-jenis').value = trx.jenis;
		document.getElementById('out-non-tahun').value = trx.tahun;
		document.getElementById('out-non-nominal').value = trx.nominal;
	} else if (tipe === 'infaq') {
		const trx = dbInfaq.find(t => String(t.id) === strId);
		if (!trx) return;
		document.getElementById('edit-id-infaq').value = trx.id;
		document.getElementById('infaq-tgl-transaksi').value = trx.tglTransaksi;
		document.getElementById('edit-tgl-infaq').value = trx.tanggalInput;
		document.getElementById('edit-waktu-infaq').value = trx.waktuInput;
		document.getElementById('infaq-jenis').value = trx.jenis;
		document.getElementById('infaq-keterangan').value = trx.keterangan;
		document.getElementById('infaq-nominal').value = trx.nominal;
	} else if (tipe === 'tarif') {
		const trx = dbMasterTarif.find(t => String(t.id) === strId);
		if(!trx) return;
		document.getElementById('edit-id-tarif').value = trx.id;
		document.getElementById('tarif-tahun').value = trx.tahun;
		document.getElementById('tarif-target').value = trx.target;
		document.getElementById('tarif-jenis').value = trx.jenis;
		document.getElementById('tarif-nominal').value = trx.nominal;
	} else if (tipe === 'user') {
		const trx = dbAdmin.find(t => String(t.id) === strId);
		if (!trx) return;
		document.getElementById('edit-id-user').value = trx.id;
		document.getElementById('edit-old-username').value = trx.username;
		document.getElementById('user-username').value = trx.username;
		document.getElementById('user-nama').value = trx.nama;
		document.getElementById('user-password').value = trx.password;
		document.getElementById('user-role').value = trx.role;
	}
	setEditMode(tipe, true);
}

// ==========================================
// OPTIMISTIC UI SUBMIT
// ==========================================
function processOptimisticSave(tipe, localDbArray, dataObject, renderFunction) {
	dataObject.isDeleted = false; // Memastikan data baru statusnya aktif

	if (dataObject.isEdit) {
		let matchId = dataObject.id || dataObject.oldUsername;
		let idx = localDbArray.findIndex(t => String(t.id || t.username) === String(matchId));
		if (idx !== -1) localDbArray[idx] = {
			...localDbArray[idx],
			...dataObject
		};
		showToast('Tersimpan, menyinkronkan...', 'info');
	} else {
		localDbArray.push(dataObject);
		showToast('Tersimpan, menyinkronkan...', 'info');
	}

	cancelEdit(tipe);
	adminTableState[tipe].page = 1;
	renderFunction();
	loadDashboardStats();

	if (useServer) {
		fetchAPI('saveTransaksi', {
			tipe: tipe,
			data: dataObject
		}).then(res => {
			if (res.success) {
				if (!dataObject.isEdit) {
					let idx = localDbArray.findIndex(t => String(t.id || t.username) === String(dataObject.id || dataObject.username));
					if (idx !== -1) {
						if (tipe !== 'user') localDbArray[idx].id = res.newId;
						if (tipe === 'pemasukan' && res.acuanBayar) localDbArray[idx].acuanBayar = res.acuanBayar;
						renderFunction();
					}
				}
			} else showToast('Gagal sinkron: ' + res.message, 'error');
		}).catch(err => {
			showToast('Gagal terhubung ke Server', 'error');
		});
	}
}

function submitPembayaran(e) {
	e.preventDefault();
	const editId = document.getElementById('edit-id-pemasukan').value;
	const nis = String(document.getElementById('input-nis').value).trim();
	const jenis = document.getElementById('input-jenis').value;
	const tahun = document.getElementById('input-tahun').value;
	const nominal = parseInt(document.getElementById('input-nominal').value);
	if (!dbSiswa.find(s => String(s.nis).trim() === nis)) {
		showToast('NIS tidak terdaftar!', 'error');
		return;
	}
	let data = {
		id: editId || `TEMP-${Date.now()}`,
		isEdit: !!editId,
		nis,
		jenis,
		tahun,
		nominal
	};
	if (data.isEdit) {
		data.acuanBayar = document.getElementById('edit-acuan-pemasukan').value;
		data.tanggalInput = document.getElementById('edit-tgl-pemasukan').value;
		data.waktuInput = document.getElementById('edit-waktu-pemasukan').value;
		data.nama = document.getElementById('edit-nama-pemasukan').value;
		data.lp = document.getElementById('edit-lp-pemasukan').value;
	} else {
		data.tanggalInput = getNowDateIndo();
		data.waktuInput = getNowTime();
		let count = dbPembayaran.filter(t => String(t.nis).trim() === nis && t.jenis === jenis && t.tahun === tahun).length;
		data.acuanBayar = `${nis}-${jenis}-${tahun}-${count + 1}`;
		const s = dbSiswa.find(s => String(s.nis).trim() === nis);
		data.nama = s ? s.nama : '-';
		data.lp = s ? s.lp : '-';
	}
	processOptimisticSave('pemasukan', dbPembayaran, data, loadAdminTable);
}

function submitBantuan(e) {
	e.preventDefault();
	const editId = document.getElementById('edit-id-bantuan').value;
	let data = {
		id: editId || `TEMP-${Date.now()}`,
		isEdit: !!editId,
		tglTransaksi: document.getElementById('bantuan-tgl-transaksi').value,
		keterangan: document.getElementById('bantuan-keterangan').value,
		jenis: document.getElementById('bantuan-jenis').value,
		tahun: document.getElementById('bantuan-tahun').value,
		nominal: parseInt(document.getElementById('bantuan-nominal').value)
	};
	if (data.isEdit) {
		data.tanggalInput = document.getElementById('edit-tgl-bantuan').value;
		data.waktuInput = document.getElementById('edit-waktu-bantuan').value;
	} else {
		data.tanggalInput = getNowDateIndo();
		data.waktuInput = getNowTime();
	}
	processOptimisticSave('bantuan', dbBantuan, data, loadAdminBantuanTable);
	document.getElementById('bantuan-tgl-transaksi').valueAsDate = new Date();
}

function submitPengeluaran(e) {
	e.preventDefault();
	const editId = document.getElementById('edit-id-pengeluaran').value;
	let data = {
		id: editId || `TEMP-${Date.now()}`,
		isEdit: !!editId,
		tglTransaksi: document.getElementById('out-tgl-transaksi').value,
		keterangan: document.getElementById('out-keterangan').value,
		jenis: document.getElementById('out-jenis').value,
		tahun: document.getElementById('out-tahun').value,
		nominal: parseInt(document.getElementById('out-nominal').value)
	};
	if (data.isEdit) {
		data.tanggalInput = document.getElementById('edit-tgl-pengeluaran').value;
		data.waktuInput = document.getElementById('edit-waktu-pengeluaran').value;
	} else {
		data.tanggalInput = getNowDateIndo();
		data.waktuInput = getNowTime();
	}
	processOptimisticSave('pengeluaran', dbPengeluaran, data, loadAdminPengeluaranTable);
	document.getElementById('out-tgl-transaksi').valueAsDate = new Date();
}

function submitPengeluaranNon(e) {
	e.preventDefault();
	const editId = document.getElementById('edit-id-pengeluaran-non').value;
	let data = {
		id: editId || `TEMP-${Date.now()}`,
		isEdit: !!editId,
		tglTransaksi: document.getElementById('out-non-tgl-transaksi').value,
		keterangan: document.getElementById('out-non-keterangan').value,
		jenis: document.getElementById('out-non-jenis').value,
		tahun: document.getElementById('out-non-tahun').value,
		nominal: parseInt(document.getElementById('out-non-nominal').value)
	};
	if (data.isEdit) {
		data.tanggalInput = document.getElementById('edit-tgl-pengeluaran-non').value;
		data.waktuInput = document.getElementById('edit-waktu-pengeluaran-non').value;
	} else {
		data.tanggalInput = getNowDateIndo();
		data.waktuInput = getNowTime();
	}
	processOptimisticSave('pengeluaran-non', dbPengeluaranNon, data, loadAdminPengeluaranNonTable);
	document.getElementById('out-non-tgl-transaksi').valueAsDate = new Date();
}

function submitInfaq(e) {
	e.preventDefault();
	const editId = document.getElementById('edit-id-infaq').value;
	let data = {
		id: editId || `TEMP-${Date.now()}`,
		isEdit: !!editId,
		tglTransaksi: document.getElementById('infaq-tgl-transaksi').value,
		jenis: document.getElementById('infaq-jenis').value,
		keterangan: document.getElementById('infaq-keterangan').value,
		nominal: parseInt(document.getElementById('infaq-nominal').value)
	};
	if (data.isEdit) {
		data.tanggalInput = document.getElementById('edit-tgl-infaq').value;
		data.waktuInput = document.getElementById('edit-waktu-infaq').value;
	} else {
		data.tanggalInput = getNowDateIndo();
		data.waktuInput = getNowTime();
	}
	processOptimisticSave('infaq', dbInfaq, data, loadAdminInfaqTable);
	document.getElementById('infaq-tgl-transaksi').valueAsDate = new Date();
}

function submitTarif(e) { 
	e.preventDefault(); 
	const editId = document.getElementById('edit-id-tarif').value;
	let data = { 
		id: editId || `TRF-${Date.now()}`, 
		isEdit: !!editId,
		tahun: document.getElementById('tarif-tahun').value, 
		target: document.getElementById('tarif-target').value.toUpperCase(), 
		jenis: document.getElementById('tarif-jenis').value, 
		nominal: parseInt(document.getElementById('tarif-nominal').value) 
	}; 
	processOptimisticSave('tarif', dbMasterTarif, data, loadAdminTarifTable);
}

function submitUser(e) {
	e.preventDefault();
	const editId = document.getElementById('edit-id-user').value;
	const username = document.getElementById('user-username').value.trim();
	let data = {
		id: editId || `TEMP-${Date.now()}`,
		isEdit: !!editId,
		oldUsername: document.getElementById('edit-old-username').value,
		username: username,
		nama: document.getElementById('user-nama').value.trim(),
		password: document.getElementById('user-password').value,
		role: document.getElementById('user-role').value
	};
	if (!data.isEdit && dbAdmin.find(u => String(u.username).trim().toLowerCase() === String(username).trim().toLowerCase())) {
		showToast('Username terpakai!', 'error');
		return;
	}
	processOptimisticSave('user', dbAdmin, data, loadAdminUserTable);
}

// ==========================================
// OPTIMISTIC UI DELETE & ROLLBACK
// ==========================================
let deleteTarget = {
	tipe: null,
	id: null
};
let backupDeletedData = null; // Menyimpan data sementara untuk rollback (User saja)
let backupDeletedIndex = -1; // Menyimpan posisi baris aslinya

function deleteData(tipe, id) {
	if (String(id).includes('TEMP')) {
		showToast('Sedang disinkronkan, harap tunggu...', 'error');
		return;
	}
	deleteTarget = {
		tipe,
		id: String(id)
	};
	document.getElementById('delete-modal').classList.remove('hidden');
}

function closeDeleteModal() {
	document.getElementById('delete-modal').classList.add('hidden');
	deleteTarget = {
		tipe: null,
		id: null
	};
}

function confirmDelete() {
	const {
		tipe,
		id
	} = deleteTarget;
	document.getElementById('delete-modal').classList.add('hidden');

	let targetDb, renderFn;
	if (tipe === 'pemasukan') {
		targetDb = dbPembayaran;
		renderFn = loadAdminTable;
	} else if (tipe === 'bantuan') {
		targetDb = dbBantuan;
		renderFn = loadAdminBantuanTable;
	} else if (tipe === 'pengeluaran') {
		targetDb = dbPengeluaran;
		renderFn = loadAdminPengeluaranTable;
	} else if (tipe === 'pengeluaran-non') {
		targetDb = dbPengeluaranNon;
		renderFn = loadAdminPengeluaranNonTable;
	} else if (tipe === 'infaq') {
		targetDb = dbInfaq;
		renderFn = loadAdminInfaqTable;
	} else if (tipe === 'user') {
		targetDb = dbAdmin;
		renderFn = loadAdminUserTable;
	} else if (tipe === 'tarif') { 
		targetDb = dbMasterTarif; 
		renderFn = loadAdminTarifTable; 
	}

	const idx = targetDb.findIndex(t => String(t.id) === String(id));
	if (idx === -1) return;

	// OPTIMISTIC DELETE (Soft delete di UI Lokal)
	if (tipe === 'user' || tipe === 'tarif') {
		backupDeletedData = targetDb[idx];
		backupDeletedIndex = idx;
		targetDb.splice(idx, 1); // User dihapus permanen
	} else {
		targetDb[idx].isDeleted = true; // Soft delete
	}

	loadDashboardStats();
	renderFn();
	updateRestoreBadges();
	if (currentUserRole === 'Super Admin' && !document.getElementById('admin-view-restore').classList.contains('hidden')) loadRestoreTable();
	showToast('Menghapus dari server...', 'info');

	// 4. KIRIM KE SERVER
	if (useServer) {
		fetchAPI('deleteTransaksi', {
			tipe: tipe,
			id: id
		}).then(res => {
			if (res.success) {
				showToast('Berhasil dihapus!');
			} else throw new Error(res.message);
		}).catch(err => {
			// ROLLBACK
			if (tipe === 'user' || tipe === 'tarif') targetDb.splice(backupDeletedIndex, 0, backupDeletedData);
			else targetDb[idx].isDeleted = false;
			loadDashboardStats();
			renderFn();
			updateRestoreBadges();
			if (currentUserRole === 'Super Admin') loadRestoreTable();
			showToast('Gagal menghapus di server. Data dikembalikan.', 'error');
		});
	} else {
		setTimeout(() => showToast('Data dihapus (Preview lokal)'), 500);
	}

	deleteTarget = {
		tipe: null,
		id: null
	};
}

// ==========================================
// HIGHLIGHT: FITUR CETAK LAPORAN REKAP KELAS
// ==========================================
function generateLaporanCetak() {
	const ta = document.getElementById('cetak-tahun').value;
	const kls = document.getElementById('cetak-kelas').value;
	if (!ta || !kls) {
		showToast('Pilih Tahun Ajaran dan Kelas dulu!', 'error');
		return;
	}
	document.getElementById('cetak-result-container').classList.remove('hidden');
	document.getElementById('cetak-result-container').classList.add('flex');
	document.getElementById('cap-subtitle').innerText = `KELAS: ${kls} | TAHUN AJARAN: ${ta}`;
	document.getElementById('cap-date').innerText = `Dicetak pada: ${getNowDateIndo()}`;

	// let listSiswa = dbSiswa.filter(s => s.kelas === kls).sort((a, b) => a.nama.localeCompare(b.nama));
	// LOGIKA MESIN WAKTU: Cari siapa saja penghuni kelas ini pada tahun tersebut
	let listSiswa = dbSiswa.filter(s => {
		let histClass = getHistoricalClass(s, ta).toUpperCase();
		return histClass === String(kls).toUpperCase();
	}).sort((a,b) => a.nama.localeCompare(b.nama));

	// HIGHLIGHT 1: Ubah filter awal laporan menggunakan isTarifTargetMatch (Dummy Tester)
	let applicableTarifsToClass = dbMasterTarif.filter(t => {
		if (t.isDeleted || t.tahun !== ta) return false;
		// Tes apakah tarif ini berlaku untuk Laki-laki ATAU Perempuan di kelas ini
		let dummyL = { nis: 'DUMMY', lp: 'L', tahunMasuk: ta, kelas1: kls };
		let dummyP = { nis: 'DUMMY', lp: 'P', tahunMasuk: ta, kelas1: kls };
		return isTarifTargetMatch(t.target, ta, dummyL) || isTarifTargetMatch(t.target, ta, dummyP) || String(t.target).includes('NIS');
	});

	let setTagihanUnik = new Set(); 
	applicableTarifsToClass.forEach(t => setTagihanUnik.add(t.jenis)); 
	let headerTagihan = Array.from(setTagihanUnik);
	if (listSiswa.length === 0) {
		document.getElementById('cap-table-container').innerHTML = `<p class="text-center text-red-500 py-10">Tidak ada data siswa aktif di kelas ${kls} pada tahun ajaran ${ta}.</p>`;
		return;
	}

	let htmlTable = `<table class="table-rekap"><thead style="vertical-align: middle;"><tr><th>No</th><th>NIS</th><th>Nama Siswa</th>`;
	headerTagihan.forEach(th => htmlTable += `<th>${th}</th>`);
	htmlTable += `<th class="text-red-600 bg-red-50">Tunggakan Th. Lalu</th><th>TOTAL KEKURANGAN</th></tr></thead><tbody>`;
	let riwayatThnIni = dbPembayaran.filter(p => !p.isDeleted && p.tahun === ta);

	listSiswa.forEach((siswa, idx) => {
		htmlTable += `<tr><td class="text-center">${idx + 1}</td><td class="text-center">${siswa.nis}</td><td>${siswa.nama}</td>`;
		let riwayatSiswa = riwayatThnIni.filter(p => String(p.nis).trim() === String(siswa.nis).trim());
		let totalTunggakSiswa = 0;

		headerTagihan.forEach(tagihan => {
			// HIGHLIGHT 2: Pastikan pencocokan per-sel tabel siswa menggunakan isTarifTargetMatch dengan prioritas NIS
			let matchedTarifs = applicableTarifsToClass.filter(t => t.jenis === tagihan && isTarifTargetMatch(t.target, ta, siswa));
			
			let tarifItem = null;
			if (matchedTarifs.length > 0) {
				// Jika ada lebih dari satu, prioritaskan yang di kolom targetnya tertulis "NIS"
				tarifItem = matchedTarifs.find(t => String(t.target).toUpperCase().includes('NIS')) || matchedTarifs[0];
			}
			if (!tarifItem) {
				htmlTable += `<td class="text-center text-gray-400">-</td>`;
			} else {
				let isSPP = String(tagihan).toUpperCase().includes('SPP');
				let skipSPP = false;
				if (isSPP) {
					const blnArr = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
					let thnMasukInt = parseInt(String(siswa.tahunMasuk).split('/')[0]) || 0;
					let thnTarifInt = parseInt(ta.split('/')[0]) || 0;
					let activeBulanMulai = 'Juli';
					if (thnTarifInt === thnMasukInt && siswa.bulanMulai) activeBulanMulai = siswa.bulanMulai;

					let startIndex = blnArr.findIndex(b => b.toLowerCase() === activeBulanMulai.toLowerCase());
					if (startIndex === -1) startIndex = 0;
					let monthOfSPP = blnArr.find(b => String(tagihan).toUpperCase().includes(b.toUpperCase()));
					if (monthOfSPP) {
						let sppIndex = blnArr.findIndex(b => b === monthOfSPP);
						if (sppIndex < startIndex) skipSPP = true;
					}
				}

				if (skipSPP) {
					htmlTable += `<td class="text-center text-gray-400">-</td>`;
				} else {
					let totalBayarItem = riwayatSiswa.filter(r => r.jenis === tagihan).reduce((sum, r) => sum + parseInt(r.nominal), 0);
					let sisa = parseInt(tarifItem.nominal) - totalBayarItem;
					if (sisa <= 0) {
						htmlTable += `<td class="bg-lunas">LUNAS</td>`;
					} else {
						totalTunggakSiswa += sisa;
						htmlTable += `<td class="text-center font-semibold text-red-600">${formatRp(sisa).replace('Rp', '')}</td>`;
					}
				}
			}
		});

		// Cek Tunggakan Masa Lalu
		let thnTargetInt = parseInt(ta.split('/')[0]);
		let tunggakanLama = 0;
		let pastTarifs = dbMasterTarif.filter(t => !t.isDeleted && parseInt(t.tahun.split('/')[0]) < thnTargetInt && isTarifTargetMatch(t.target, t.tahun, siswa));
		let pastPayments = dbPembayaran.filter(p => !p.isDeleted && String(p.nis).trim() === String(siswa.nis).trim() && parseInt(p.tahun.split('/')[0]) < thnTargetInt);
		
		let uniquePastMap = {};
		pastTarifs.forEach(t => { let key = `${t.tahun}-${t.jenis}`; let isNisT = String(t.target).toUpperCase().includes('NIS'); if (!uniquePastMap[key] || isNisT) uniquePastMap[key] = t; });
		
		Object.values(uniquePastMap).forEach(t => {
			let isSkip = false;
			if(String(t.jenis).toUpperCase().includes('SPP')) {
				let tMasuk = parseInt(String(siswa.tahunMasuk).split('/')[0]); let tTarif = parseInt(String(t.tahun).split('/')[0]);
				if(tTarif === tMasuk && siswa.bulanMulai) {
					const ba = ['Juli','Agustus','September','Oktober','November','Desember','Januari','Februari','Maret','April','Mei','Juni'];
					let si = ba.findIndex(b => b.toLowerCase() === siswa.bulanMulai.toLowerCase()); if(si===-1) si=0;
					let ms = ba.find(b => String(t.jenis).toUpperCase().includes(b.toUpperCase()));
					if(ms && ba.findIndex(b => b === ms) < si) isSkip = true;
				}
			}
			if(!isSkip) {
				let byr = pastPayments.filter(p => p.jenis === t.jenis && p.tahun === t.tahun).reduce((sum, p) => sum + parseInt(p.nominal), 0);
				let sisa = parseInt(t.nominal) - byr;
				if(sisa > 0) tunggakanLama += sisa;
			}
		});

		if(tunggakanLama > 0) htmlTable += `<td class="text-center font-bold text-red-600 bg-red-50">${formatRp(tunggakanLama).replace('Rp', '')}</td>`;
		else htmlTable += `<td class="text-center text-gray-400">-</td>`;

		let grandTotal = totalTunggakSiswa + tunggakanLama;
		if(grandTotal === 0) htmlTable += `<td class="bg-lunas">LUNAS</td></tr>`; else htmlTable += `<td class="text-tunggak">${formatRp(grandTotal)}</td></tr>`;
	});
	htmlTable += `</tbody></table>`;
	document.getElementById('cap-table-container').innerHTML = htmlTable;
}

function downloadLaporanImage() {
    showToast('Memproses Gambar...', 'info');
    const targetDiv = document.getElementById("capture-area");

    if (typeof domtoimage === 'undefined') {
        showToast('Library gagal dimuat.', 'error');
        return;
    }

    // Menggunakan scrollWidth & scrollHeight agar tabel utuh meski melebihi layar
    const scale = 2; // Skala resolusi tinggi
    const width = targetDiv.scrollWidth;
    const height = targetDiv.scrollHeight;

    // Menggunakan dom-to-image
    domtoimage.toPng(targetDiv, { 
        bgcolor: '#ffffff',
        width: width * scale,
        height: height * scale,
        style: {
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: width + 'px',
            height: height + 'px'
        }
    })
    .then(function (dataUrl) {
        const link = document.createElement("a");
        link.download = `Rekap_${document.getElementById('cetak-kelas').value}.png`;
        link.href = dataUrl;
        link.click();
        showToast('Gambar WA siap!', 'success');
    })
    .catch(function (error) {
        console.error('Error dom-to-image!', error);
        showToast('Gagal memproses gambar.', 'error');
    });
}

// --- DASHBOARD & GRAFIK LOGIC ---
let chartKelasInstance = null;
let chartGenderInstance = null;
let chartKeuanganInstance = null;

function handleDashFilter() {
	loadDashboardStats();
}

function loadDashboardStats() {
	const filterTahun = document.getElementById('filter-dash-tahun') ? document.getElementById('filter-dash-tahun').value : 'All';

	// 1. PERHITUNGAN GLOBAL (TIDAK TERFILTER)
	let globalPemasukanSiswa = dbPembayaran.reduce((sum, trx) => !trx.isDeleted ? sum + parseInt(trx.nominal || 0) : sum, 0);
	let globalBantuan = dbBantuan.reduce((sum, trx) => !trx.isDeleted ? sum + parseInt(trx.nominal || 0) : sum, 0);
	let globalOps = dbPengeluaran.reduce((sum, trx) => !trx.isDeleted ? sum + parseInt(trx.nominal || 0) : sum, 0);
	let globalNonOps = dbPengeluaranNon.reduce((sum, trx) => !trx.isDeleted ? sum + parseInt(trx.nominal || 0) : sum, 0);
	let globalInfaq = dbInfaq.reduce((sum, trx) => !trx.isDeleted ? (trx.jenis === 'Pemasukan' ? sum + parseInt(trx.nominal || 0) : sum - parseInt(trx.nominal || 0)) : sum, 0);

	let globalMasuk = globalPemasukanSiswa + globalBantuan;
	let globalKeluar = globalOps + globalNonOps;
	let globalSaldoFisik = globalMasuk - globalKeluar + globalInfaq;

	// 2. PERHITUNGAN TAHUN BERJALAN (TERFILTER)
	let yearPemasukanSiswa = dbPembayaran.filter(t => filterTahun === 'All' || t.tahun === filterTahun).reduce((sum, t) => !t.isDeleted ? sum + parseInt(t.nominal || 0) : sum, 0);
	let yearBantuan = dbBantuan.filter(t => filterTahun === 'All' || t.tahun === filterTahun).reduce((sum, t) => !t.isDeleted ? sum + parseInt(t.nominal || 0) : sum, 0);
	let yearOps = dbPengeluaran.filter(t => filterTahun === 'All' || t.tahun === filterTahun).reduce((sum, t) => !t.isDeleted ? sum + parseInt(t.nominal || 0) : sum, 0);
	let yearNonOps = dbPengeluaranNon.filter(t => filterTahun === 'All' || t.tahun === filterTahun).reduce((sum, t) => !t.isDeleted ? sum + parseInt(t.nominal || 0) : sum, 0);

	let yearMasuk = yearPemasukanSiswa + yearBantuan;
	let yearKeluar = yearOps + yearNonOps;
	let yearSurplus = yearMasuk - yearKeluar;

	// 3. RENDER ANGKA KE KARTU UI
	document.getElementById('dash-pemasukan-tahun').innerText = formatRp(yearMasuk);
	document.getElementById('dash-pengeluaran-tahun').innerText = formatRp(yearKeluar);

	let surplusEl = document.getElementById('dash-surplus-tahun');
	surplusEl.innerText = (yearSurplus >= 0 ? '+' : '') + formatRp(yearSurplus);
	surplusEl.className = yearSurplus < 0 ? "text-xl md:text-2xl font-bold text-red-700 truncate" : "text-xl md:text-2xl font-bold text-purple-800 truncate";

	document.getElementById('dash-infaq-global').innerText = formatRp(globalInfaq);
	document.getElementById('dash-saldo-global').innerText = formatRp(globalSaldoFisik);

	renderCharts(filterTahun);
}

// Variabel global untuk tab
let currentChartKelasTab = 'aktif';
// Daftarkan Plugin Label Angka
Chart.register(ChartDataLabels);

// Fungsi untuk menangani klik tab
function setChartSiswaTab(tab) {
    currentChartKelasTab = tab;
    
    // Update warna tombol tab
    const tabs = ['aktif', 'lulus', 'keluar'];
    tabs.forEach(t => {
        const btn = document.getElementById(`tab-chart-${t}`);
        if(btn) {
            btn.className = (t === tab) 
                ? "px-4 py-1.5 text-sm font-semibold rounded-md bg-blue-600 text-white shadow-sm transition-all"
                : "px-4 py-1.5 text-sm font-semibold rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-all";
        }
    });
    
    // Render ulang KHUSUS grafik kelas
    renderChartKelas();
}

// Fungsi khusus render grafik kelas
function renderChartKelas() {
    const ctxKelas = document.getElementById('chart-kelas');
    if (!ctxKelas) return;

    // 1. Filter Siswa berdasarkan Tab
    let filteredSiswa = dbSiswa.filter(s => {
        let kls = String(s.kelas).toUpperCase();
        if (currentChartKelasTab === 'aktif') return !kls.includes('LULUS') && !kls.includes('KELUAR');
        if (currentChartKelasTab === 'lulus') return kls.includes('LULUS');
        if (currentChartKelasTab === 'keluar') return kls.includes('KELUAR');
        return true;
    });

    // 2. Hitung statistik
    const statsPerKelas = {};
    filteredSiswa.forEach(s => {
        if (s.kelas) {
            if (!statsPerKelas[s.kelas]) statsPerKelas[s.kelas] = { L: 0, P: 0, Total: 0 };
            if (s.lp === 'L') statsPerKelas[s.kelas].L++;
            if (s.lp === 'P') statsPerKelas[s.kelas].P++;
            statsPerKelas[s.kelas].Total++;
        }
    });

    let labelsKelas = Object.keys(statsPerKelas).sort();
	if (labelsKelas.length > 6) { labelsKelas = labelsKelas.slice(-6); }
    
    if (chartKelasInstance) chartKelasInstance.destroy();

    // 3. Buat Chart
    chartKelasInstance = new Chart(ctxKelas, {
        type: 'bar',
        data: {
            labels: labelsKelas,
            datasets: [
                {
                    label: 'Laki-Laki',
                    data: labelsKelas.map(k => statsPerKelas[k].L),
                    backgroundColor: '#93c5fd', // Biru
                    borderRadius: 4
                }, 
                {
                    label: 'Perempuan',
                    data: labelsKelas.map(k => statsPerKelas[k].P),
                    backgroundColor: '#fbcfe8', // Pink
                    borderRadius: 4
                }, 
                {
                    label: 'Total',
                    data: labelsKelas.map(k => statsPerKelas[k].Total),
                    backgroundColor: '#fde047', // Kuning
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
			maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { borderDash: [4, 4] }, grace: '15%' },
                x: { grid: { display: false } },
            },
            plugins: { 
				legend: { 
					position: 'top' 
				},
				datalabels: {
                    anchor: 'end',    // Posisi jangkar di ujung bar
                    align: 'top',     // Teks rata atas
                    color: '#475569', // Warna teks abu-abu gelap
                    font: {
                        weight: 'bold',
                        size: 10
                    },
                    formatter: function(value) {
                        return value > 0 ? value : ''; // Sembunyikan angka 0 agar grafik bersih
                    }
                }
			}
        }
    });
}

function renderCharts(filterTahun = 'All') {
	if (typeof renderChartKelas === 'function') {
        renderChartKelas();
    }

	const kasPerBulan = {};
	const getYearMonth = (dateString) => {
		if (!dateString) return null;
		const str = String(dateString);
		if (/^\d{4}-\d{2}/.test(str)) return str.substring(0, 7);
		const bulanArr = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
		const parts = str.split(' ');
		if (parts.length >= 3) {
			let mIdx = bulanArr.findIndex(b => b.toLowerCase() === parts[1].toLowerCase() || b.substring(0, 3).toLowerCase() === parts[1].toLowerCase());
			if (mIdx !== -1) return `${parts[2]}-${String(mIdx + 1).padStart(2, '0')}`;
		}
		return null;
	};

	// Filter Arus Kas Berdasarkan Tahun Ajaran
	dbPembayaran.filter(t => !t.isDeleted && (filterTahun === 'All' || t.tahun === filterTahun)).forEach(trx => {
		const ym = getYearMonth(trx.tanggalInput || trx.timestamp);
		if (ym) {
			if (!kasPerBulan[ym]) kasPerBulan[ym] = {
				masuk: 0,
				keluar: 0
			};
			kasPerBulan[ym].masuk += parseInt(trx.nominal || 0);
		}
	});
	dbBantuan.filter(t => !t.isDeleted && (filterTahun === 'All' || t.tahun === filterTahun)).forEach(trx => {
		const ym = getYearMonth(trx.tglTransaksi || trx.tanggalInput);
		if (ym) {
			if (!kasPerBulan[ym]) kasPerBulan[ym] = {
				masuk: 0,
				keluar: 0
			};
			kasPerBulan[ym].masuk += parseInt(trx.nominal || 0);
		}
	});
	[...dbPengeluaran.filter(t => !t.isDeleted && (filterTahun === 'All' || t.tahun === filterTahun)), ...dbPengeluaranNon.filter(t => !t.isDeleted && (filterTahun === 'All' || t.tahun === filterTahun))].forEach(trx => {
		const ym = getYearMonth(trx.tglTransaksi || trx.tanggalInput);
		if (ym) {
			if (!kasPerBulan[ym]) kasPerBulan[ym] = {
				masuk: 0,
				keluar: 0
			};
			kasPerBulan[ym].keluar += parseInt(trx.nominal || 0);
		}
	});

	const urutanBulan = Object.keys(kasPerBulan).sort();
	const namaBulanIndo = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
	const labelsKeuangan = urutanBulan.map(ym => {
		const [y, m] = ym.split('-');
		return `${namaBulanIndo[parseInt(m) - 1]} ${y}`;
	});
	const dataKasMasuk = urutanBulan.map(ym => kasPerBulan[ym].masuk);
	const dataKasKeluar = urutanBulan.map(ym => kasPerBulan[ym].keluar);
	const ctxKeuangan = document.getElementById('chart-keuangan');
	if (chartKeuanganInstance) chartKeuanganInstance.destroy();
	chartKeuanganInstance = new Chart(ctxKeuangan, {
		type: 'line',
		data: {
			labels: labelsKeuangan,
			datasets: [{
				label: 'Pemasukan (Rp)',
				data: dataKasMasuk,
				borderColor: '#10b981',
				backgroundColor: 'rgba(16, 185, 129, 0.1)',
				borderWidth: 2,
				fill: true,
				tension: 0.3
			}, {
				label: 'Pengeluaran Total (Rp)',
				data: dataKasKeluar,
				borderColor: '#f97316',
				backgroundColor: 'rgba(249, 115, 22, 0.1)',
				borderWidth: 2,
				fill: true,
				tension: 0.3
			}]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			interaction: {
				mode: 'index',
				intersect: false
			},
			plugins: {
				legend: {
					position: 'top',
					labels: {
						usePointStyle: true,
						boxWidth: 8
					}
				},
				tooltip: {
					callbacks: {
						label: function(c) {
							return (c.dataset.label || '') + ': ' + formatRp(c.parsed.y);
						}
					}
				},
				datalabels: {
					display: false 
				}
			},
			scales: {
				y: {
					beginAtZero: true,
					ticks: {
						callback: function(value) {
							if (value >= 1000000) return 'Rp' + (value / 1000000) + ' Jt';
							if (value >= 1000) return 'Rp' + (value / 1000) + ' Rb';
							return 'Rp' + value;
						}
					}
				}
			}
		}
	});
}

// ==========================================
// VIEW SISWA
// ==========================================
let currentSiswaData = null; let currentBillingData = null; //tambahan
function renderSiswaView(siswaProfile, billingData) {
	currentSiswaData = siswaProfile; currentBillingData = billingData;
	document.getElementById('view-login').classList.add('hidden');
	document.getElementById('view-siswa').classList.remove('hidden');
	document.getElementById('siswa-nama').innerText = siswaProfile.nama;
	document.getElementById('siswa-nis-text').innerText = siswaProfile.nis;
	// Render Badge Kelas Berwarna
	const badgeContainer = document.getElementById('siswa-kelas-badge');
	let kls = String(siswaProfile.kelas).toUpperCase();
	let badgeClass = 'bg-gray-100 text-gray-700 border-gray-200'; // Default
	
	if (kls.includes('X ') || kls === 'X') {
		badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
	} else if (kls.includes('XI ') || kls === 'XI') {
		badgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
	} else if (kls.includes('XII ') || kls === 'XII') {
		badgeClass = 'bg-rose-100 text-rose-800 border-rose-200';
	} else if (kls.includes('LULUS') || kls.includes('KELUAR')) {
		badgeClass = 'bg-slate-200 text-slate-700 border-slate-300';
	}
	
	badgeContainer.innerHTML = `<span class="${badgeClass} border px-2 py-0.5 rounded text-xs font-bold">Kelas: ${siswaProfile.kelas}</span>`;
	
	const boxKekurangan = document.getElementById('box-kekurangan');
	const titleKekurangan = document.getElementById('title-kekurangan');
	const valKekurangan = document.getElementById('siswa-total-kekurangan');
	const bannerLama = document.getElementById('siswa-banner-tunggakan');
	if(billingData.hutangLamaMurni > 0) {
		bannerLama.classList.remove('hidden');
		document.getElementById('banner-amount').innerText = formatRp(billingData.hutangLamaMurni);
	} else bannerLama.classList.add('hidden');
	if (billingData.totalTunggakan === 0) {
		boxKekurangan.className = "bg-emerald-50 border border-emerald-100 rounded-lg p-4 text-center min-w-[200px] w-full";
		titleKekurangan.className = "text-sm text-emerald-600 font-medium mb-1";
		titleKekurangan.innerText = "Status Pembayaran";
		valKekurangan.className = "text-2xl font-bold text-emerald-700";
		valKekurangan.innerText = "LUNAS";
	} else {
		boxKekurangan.className = "bg-red-50 border border-red-100 rounded-lg p-4 text-center min-w-[200px] w-full";
		titleKekurangan.className = "text-sm text-red-600 font-medium mb-1";
		titleKekurangan.innerText = "Total Hutang Berjalan";
		valKekurangan.className = "text-2xl font-bold text-red-700";
		valKekurangan.innerText = formatRp(billingData.totalTunggakan);
	}

	const widgetUjian = document.getElementById('widget-ujian');
	const widgetTitle = document.getElementById('widget-exam-title');
	const widgetAmount = document.getElementById('widget-exam-amount');
	widgetUjian.classList.remove('hidden');
	widgetTitle.innerText = `Syarat ${billingData.examWidget.name}`;

	if (billingData.examWidget.isLunas) {
		widgetUjian.style.background = "linear-gradient(to right, #10b981, #14b8a6)"; // Hex warna Emerald to Teal
		widgetUjian.className = "rounded-xl shadow-md p-6 mb-6 text-white flex flex-col md:flex-row items-center justify-between transform transition-all duration-500 hover:scale-[1.01]"; 
		widgetAmount.innerText = "MEMENUHI SYARAT"; 
	} else {
		widgetUjian.style.background = "linear-gradient(to right, #f59e0b, #f97316)"; // Hex warna Amber to Orange
		widgetUjian.className = "rounded-xl shadow-md p-6 mb-6 text-white flex flex-col md:flex-row items-center justify-between transform transition-all duration-500 hover:scale-[1.01]"; 
		widgetAmount.innerText = formatRp(billingData.examWidget.amount);
	}

	const selTahun = document.getElementById('siswa-tahun-filter');
	selTahun.innerHTML = '';
	if(billingData.riwayatTahun.length > 0) {
		billingData.riwayatTahun.forEach(t => selTahun.innerHTML += `<option value="${t}">${t}</option>`);
	} else { selTahun.innerHTML = `<option value="All">Belum Ada Tagihan</option>`; }

	renderSiswaTables(billingData.riwayatTahun[0] || 'All');
}

function renderSiswaTables(targetTahun) {
	const formatCell = (val) => {
		if (val === 'LUNAS' || val === 0) {
			return `<span class="px-3 py-1 text-xs rounded-full font-bold bg-emerald-100 text-emerald-700 tracking-wide"><i class="ph ph-check mr-1"></i> LUNAS</span>`;
		} else {
			return `<span class="px-3 py-1 text-xs rounded-full font-bold bg-red-100 text-red-700">${formatRp(val)}</span>`;
		}
	};
	document.getElementById('lbl-thn-spp').innerText = `(${targetTahun})`;

	const tbodyBulan = document.getElementById('table-rekap-bulanan');
	tbodyBulan.innerHTML = '';
	let filteredBulanan = currentBillingData.bulanan.filter(b => b.tahun === targetTahun);
	if (filteredBulanan.length === 0) tbodyBulan.innerHTML = '<tr><td colspan="2" class="p-4 text-center text-gray-500">Bebas Tagihan SPP pada tahun ini</td></tr>';
	filteredBulanan.forEach(item => {
		tbodyBulan.innerHTML += `<tr class="hover:bg-gray-50"><td class="p-4 font-medium text-gray-700">${item.jenis}</td><td class="p-4 text-center">${formatCell(item.sisa)}</td></tr>`;
	});

	const tbodyTagihan = document.getElementById('table-rekap-tagihan');
	tbodyTagihan.innerHTML = '';
	let filteredLainnya = currentBillingData.lainnya.filter(l => l.tahun === targetTahun);
	if (filteredLainnya.length === 0) tbodyTagihan.innerHTML = '<tr><td colspan="2" class="p-4 text-center text-gray-500">Belum ada tagihan lainnya</td></tr>';
	filteredLainnya.forEach(item => {
		tbodyTagihan.innerHTML += `<tr class="hover:bg-gray-50"><td class="p-4 font-bold text-gray-700">${item.jenis}</td><td class="p-4 font-medium text-right">${formatCell(item.sisa)}</td></tr>`;
	});
}

function refreshDataSiswa(isFilter = false) {
	if (isFilter) {
		const selTahun = document.getElementById('siswa-tahun-filter').value;
		renderSiswaTables(selTahun);
		return;
	}
	const rawText = document.getElementById('siswa-nis-kelas').innerText;
	const nis = rawText.split('|')[0].replace('NIS:', '').trim();
	if (!nis || nis === '-') return;
	showLoading("Sinkronisasi...");
	setTimeout(() => {
		hideLoading();
		const s = dbSiswa.find(s => String(s.nis).trim() === nis);
		if (s) {
			let riwayat = dbPembayaran.filter(p => !p.isDeleted && String(p.nis).trim() === nis);
			let billing = calculateSiswaBilling(s, dbMasterTarif, riwayat);
			renderSiswaView(s, billing);
			showToast('Data disinkronisasi (Preview)!');
		}
	}, 600);
}

let refreshCountdownInterval = null;

function startStudentRefreshCooldown() {
	const btn = document.getElementById('btn-refresh-siswa');
	const textSpan = document.getElementById('text-refresh-siswa');
	const icon = btn.querySelector('i');
	btn.disabled = true;
	btn.classList.add('opacity-50', 'cursor-not-allowed');
	icon.classList.remove('animate-spin');
	let timeLeft = 300;
	refreshCountdownInterval = setInterval(() => {
		timeLeft--;
		if (timeLeft <= 0) {
			clearInterval(refreshCountdownInterval);
			btn.disabled = false;
			btn.classList.remove('opacity-50', 'cursor-not-allowed');
			textSpan.innerText = "Perbarui Data";
		} else {
			const m = Math.floor(timeLeft / 60);
			const s = timeLeft % 60;
			textSpan.innerText = `Tunggu (${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')})`;
		}
	}, 1000);
}

function refreshButtonDataSiswa() {
	const rawText = document.getElementById('siswa-nis-text').innerText;
	const nis = rawText.includes('|') ? rawText.split('|')[0].replace('NIS:', '').trim() : rawText.trim();
	if (!nis || nis === '-') return;
	showLoading("Memperbarui data Anda...");
	document.getElementById('btn-refresh-siswa').querySelector('i').classList.add('animate-spin');
	if (useServer) {
		fetchAPI('loginSiswa', {
			nis: nis
		}).then(res => {
			hideLoading();
			if (res.success) {
				// Harus hitung ulang tagihan dengan data mentah terbaru dari server
				let billing = calculateSiswaBilling(res.data.profil, res.data.tarif, res.data.riwayat);
				renderSiswaView(res.data.profil, billing);
				showToast('Data berhasil diperbarui dari server!', 'success');
				startStudentRefreshCooldown();
			} else {
				showToast(res.message, 'error');
				document.getElementById('btn-refresh-siswa').querySelector('i').classList.remove('animate-spin');
			}
		}).catch(err => {
			hideLoading();
			showToast('Koneksi sistem gagal: ' + err.message, 'error');
			document.getElementById('btn-refresh-siswa').querySelector('i').classList.remove('animate-spin');
		});
	} else {
		setTimeout(() => {
			hideLoading();
			const siswa = dbSiswa.find(s => String(s.nis).trim() === nis);
			if (siswa) {
				// Harus hitung ulang dengan data mentah dummy terbaru
				let riwayat = dbPembayaran.filter(p => !p.isDeleted && String(p.nis).trim() === nis);
				let billing = calculateSiswaBilling(siswa, dbMasterTarif, riwayat);
				renderSiswaView(siswa, billing);
				showToast('Data diperbarui (Preview)!', 'success');
				startStudentRefreshCooldown();
			} else {
				showToast('NIS tidak ditemukan!', 'error');
				document.getElementById('btn-refresh-siswa').querySelector('i').classList.remove('animate-spin');
			}
		}, 500);
	}
}

// ==========================================
// SMART TARGET MATCHER (FILTER TARIF)
// ==========================================
function isTarifTargetMatch(targetString, taTarif, siswaProfile) {
	let target = String(targetString).toUpperCase().trim();
	let sNis = String(siswaProfile.nis).trim();
	let sLp = String(siswaProfile.lp).toUpperCase().trim(); // "L" atau "P"

	// 1. Kondisi Global & Spesifik NIS
	if (target === 'SEMUA KELAS') return true;
	if (target === `NIS ${sNis}`) return true;

	// 2. Dapatkan kelas anak ini PADA MASA LALU (Tahun Tarif itu dibebankan)
	let sKelasHistoris = getHistoricalClass(siswaProfile, taTarif).toUpperCase();
	if(sKelasHistoris === "") return false; // Berarti tahun itu anak ini belum ada/sudah lulus

	let sGrade = sKelasHistoris.split(' ')[0]; // Ambil "X" dari "X IPA"

	let targetGender = null;
	let cleanTarget = target;
	
	// 3. Deteksi Penanda Gender di teks Master Tarif
	if (target.includes('(L)')) { targetGender = 'L'; cleanTarget = target.replace('(L)', '').trim(); }
	else if (target.includes('(P)')) { targetGender = 'P'; cleanTarget = target.replace('(P)', '').trim(); }
	else if (target.endsWith(' L')) { targetGender = 'L'; cleanTarget = target.replace(/ L$/, '').trim(); }
	else if (target.endsWith(' P')) { targetGender = 'P'; cleanTarget = target.replace(/ P$/, '').trim(); }

	// Jika tarif dikhususkan gender tertentu, tapi gender siswa tidak cocok -> BATALKAN
	if (targetGender && targetGender !== sLp) return false;

	// 4. Cek Kecocokan Kelas atau Tingkatan
	if (cleanTarget === sKelasHistoris) return true; // Cocok kelas spesifik, misal: "X IPA"
	if (cleanTarget === sGrade) return true; // Cocok tingkatan kelas, misal: "X", "XI", "XII"

	return false;
}

// HIGHLIGHT: Fungsi Engine Mesin Waktu (Mencari Kelas Masa Lalu)
function getHistoricalClass(siswaProfile, taTarget) {
	let tMasuk = parseInt(String(siswaProfile.tahunMasuk).split('/')[0]) || 0;
	let tTarif = parseInt(String(taTarget).split('/')[0]) || 0;
	if (tTarif < tMasuk) return "";
	let diff = tTarif - tMasuk + 1; // Menghitung tahun ke-berapa dia sekolah
	
	if(diff === 1) return String(siswaProfile.kelas1).trim();
	if(diff === 2) return String(siswaProfile.kelas2).trim();
	if(diff === 3) return String(siswaProfile.kelas3).trim();
	
	// Fallback: Jika di luar jangkauan, gunakan kelas saat ini (aman untuk sistem berjalan)
	return String(siswaProfile.kelas).trim(); 
}

// ==========================================
// HIGHLIGHT: ENGINE KALKULASI TAGIHAN V5
// ==========================================
function calculateSiswaBilling(siswaProfile, tarifList, bayarList) {
	let thnMasukInt = parseInt(String(siswaProfile.tahunMasuk).split('/')[0]) || 0;
	let rawApplicableTarifs = tarifList.filter(t => !t.isDeleted && isTarifTargetMatch(t.target, t.tahun, siswaProfile));

	let uniqueTarifsMap = {};
	rawApplicableTarifs.forEach(t => {
		let key = `${t.tahun}-${t.jenis}`;
		let isNisTarget = String(t.target).toUpperCase().includes('NIS');
		if (!uniqueTarifsMap[key] || isNisTarget) uniqueTarifsMap[key] = t;
	});
	let applicableTarifs = Object.values(uniqueTarifsMap);

	const blnArr = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];

	let finalTarifs = [];
	applicableTarifs.forEach(t => {
		let thnTarifInt = parseInt(String(t.tahun).split('/')[0]) || 0;
		let isSPP = String(t.jenis).toUpperCase().includes('SPP');

		let activeBulanMulai = 'Juli';
		if (thnTarifInt === thnMasukInt && siswaProfile.bulanMulai) {
			activeBulanMulai = siswaProfile.bulanMulai;
		}

		if (isSPP) {
			let monthOfSPP = blnArr.find(b => String(t.jenis).toUpperCase().includes(b.toUpperCase()));
			if (monthOfSPP) {
				let startIndex = blnArr.findIndex(b => b.toLowerCase() === activeBulanMulai.toLowerCase());
				if (startIndex === -1) startIndex = 0;
				let sppIndex = blnArr.findIndex(b => b === monthOfSPP);
				if (sppIndex >= startIndex) finalTarifs.push(t);
			} else finalTarifs.push(t);
		} else finalTarifs.push(t);
	});

	let bulanan = [];
	let lainnya = [];
	let trueGlobalDebt = 0;
	let rawSisaList = [];

	finalTarifs.forEach(t => {
		let bayarItem = bayarList.filter(b => !b.isDeleted && b.jenis === t.jenis && b.tahun === t.tahun).reduce((sum, b) => sum + parseInt(b.nominal || 0), 0);
		let sisa = parseInt(t.nominal || 0) - bayarItem;
		let status = sisa <= 0 ? 'LUNAS' : sisa;

		if (sisa > 0) {
			trueGlobalDebt += sisa;
			rawSisaList.push({
				jenis: t.jenis,
				sisa: sisa,
				tahun: t.tahun
			});
		}

		if (String(t.jenis).toUpperCase().includes('SPP')) bulanan.push({
			jenis: t.jenis,
			tahun: t.tahun,
			sisa: status,
			nominalAwal: t.nominal
		});
		else lainnya.push({
			jenis: t.jenis,
			tahun: t.tahun,
			sisa: status,
			nominalAwal: t.nominal
		});
	});

	bulanan.sort((a, b) => {
		let mA = blnArr.findIndex(m => String(a.jenis).toUpperCase().includes(m.toUpperCase()));
		let mB = blnArr.findIndex(m => String(b.jenis).toUpperCase().includes(m.toUpperCase()));
		return mA - mB;
	});

	let currentMonth = new Date().getMonth();
	let examName = "";
	let maxSppIndex = 0;
	let excludeKeywords = [];

	if (currentMonth >= 6 && currentMonth <= 9) {
		examName = "PTS 1 (Semester Ganjil)";
		maxSppIndex = 3;
		excludeKeywords = ['PAS 1', 'PTS 2', 'PAS 2'];
	} else if (currentMonth >= 10 && currentMonth <= 11) {
		examName = "PAS 1 (Semester Ganjil)";
		maxSppIndex = 5;
		excludeKeywords = ['PTS 2', 'PAS 2'];
	} else if (currentMonth >= 0 && currentMonth <= 2) {
		examName = "PTS 2 (Semester Genap)";
		maxSppIndex = 8;
		excludeKeywords = ['PAS 2'];
	} else {
		examName = "PAS 2 / Kenaikan Kelas";
		maxSppIndex = 11;
		excludeKeywords = [];
	}

	let examReqAmount = 0;
	let thnAjaranArr = [...new Set(finalTarifs.map(r => r.tahun))].sort().reverse();
	let activeThnAjaran = thnAjaranArr.length > 0 ? thnAjaranArr[0] : "2025/2026";

	rawSisaList.filter(r => r.tahun === activeThnAjaran).forEach(r => {
		let isSPP = String(r.jenis).toUpperCase().includes('SPP');
		if (isSPP) {
			let m = blnArr.find(b => String(r.jenis).toUpperCase().includes(b.toUpperCase()));
			let sppIndex = blnArr.findIndex(b => b === m);
			if (sppIndex <= maxSppIndex) examReqAmount += r.sisa;
		} else {
			let shouldInclude = true;
			excludeKeywords.forEach(kw => {
				if (String(r.jenis).toUpperCase().includes(kw)) shouldInclude = false;
			});
			if (shouldInclude) examReqAmount += r.sisa;
		}
	});

	// HIGHLIGHT FIX: Pastikan examWidget di-return dengan struktur yang benar di sini!
	return {
		bulanan: bulanan,
		lainnya: lainnya,
		totalTunggakan: trueGlobalDebt,
		examWidget: {
			name: examName,
			amount: examReqAmount,
			isLunas: examReqAmount === 0
		},
		riwayatTahun: thnAjaranArr,
		hutangLamaMurni: rawSisaList.filter(r => r.tahun !== activeThnAjaran).reduce((sum, r) => sum + r.sisa, 0)
	};
}

// FUNGSI SUB-TAB LAPORAN & SURAT
function setLaporanTab(tabName) {
	const btnRekap = document.getElementById('tab-laporan-rekap');
	const btnSurat = document.getElementById('tab-laporan-surat');
	const contentRekap = document.getElementById('laporan-content-rekap');
	const contentSurat = document.getElementById('laporan-content-surat');

	if(tabName === 'rekap') {
		btnRekap.className = "pb-3 text-sm font-bold border-b-2 border-emerald-600 text-emerald-600 transition-colors";
		btnSurat.className = "pb-3 text-sm font-bold border-b-2 border-transparent text-gray-500 hover:text-gray-700 transition-colors";
		contentRekap.classList.remove('hidden'); contentRekap.classList.add('flex');
		contentSurat.classList.add('hidden'); contentSurat.classList.remove('flex');
	} else {
		btnSurat.className = "pb-3 text-sm font-bold border-b-2 border-emerald-600 text-emerald-600 transition-colors";
		btnRekap.className = "pb-3 text-sm font-bold border-b-2 border-transparent text-gray-500 hover:text-gray-700 transition-colors";
		contentSurat.classList.remove('hidden'); contentSurat.classList.add('flex');
		contentRekap.classList.add('hidden'); contentRekap.classList.remove('flex');
	}
}

// ==========================================
// FITUR SURAT TAGIHAN CERDAS
// ==========================================
function setSuratMode(mode) {
	const btnIndv = document.getElementById('btn-mode-individu'); const btnMassal = document.getElementById('btn-mode-massal');
	const formIndv = document.getElementById('form-surat-individu'); const formMassal = document.getElementById('form-surat-massal');
	document.getElementById('surat-preview-container').classList.add('hidden');
	if(mode === 'individu') {
		btnIndv.className = "px-4 py-2 text-sm font-medium rounded-md bg-white text-blue-600 shadow-sm transition-all";
		btnMassal.className = "px-4 py-2 text-sm font-medium rounded-md text-gray-500 hover:text-gray-700 transition-all";
		formIndv.classList.remove('hidden'); formIndv.classList.add('flex'); formMassal.classList.add('hidden'); formMassal.classList.remove('flex');
	} else {
		btnMassal.className = "px-4 py-2 text-sm font-medium rounded-md bg-white text-blue-600 shadow-sm transition-all";
		btnIndv.className = "px-4 py-2 text-sm font-medium rounded-md text-gray-500 hover:text-gray-700 transition-all";
		formMassal.classList.remove('hidden'); formMassal.classList.add('flex'); formIndv.classList.add('hidden'); formIndv.classList.remove('flex');
	}
}

function getRomanMonth(monthIndex) { const roman = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII']; return roman[monthIndex]; }

// FUNGSI LOGIKA FILTER TAGIHAN BERDASARKAN KEPERLUAN
function getFilteredTunggakan(billingData, keperluan) {
	let maxSppIndex = 11; // Default: Semua Bulan
	let excludedLainnya = []; // Default: Tidak ada yang dibuang
	
	if (keperluan === 'Syarat Ujian PTS 1') { 
		maxSppIndex = 3; // s/d Oktober
		excludedLainnya = ['PAS 1', 'PTS 2', 'PAS 2', 'KENAIKAN']; 
	} else if (keperluan === 'Syarat Ujian PAS 1') { 
		maxSppIndex = 5; // s/d Desember
		excludedLainnya = ['PTS 2', 'PAS 2', 'KENAIKAN']; 
	} else if (keperluan === 'Syarat Ujian PTS 2') { 
		maxSppIndex = 8; // s/d Maret
		excludedLainnya = ['PAS 2', 'KENAIKAN']; 
	}

	const blnArr = ['Juli','Agustus','September','Oktober','November','Desember','Januari','Februari','Maret','April','Mei','Juni'];
	let activeThnAjaran = billingData.riwayatTahun[0] || ""; // Tahun Berjalan
	
	let filteredList = [];
	let totalHitung = 0;

	billingData.bulanan.forEach(b => {
		if(b.sisa !== 'LUNAS' && b.sisa > 0) {
			if (b.tahun === activeThnAjaran && keperluan !== 'Umum' && keperluan !== 'Syarat Ujian PAS 2 / Kenaikan Kelas') {
				// Jika tahun ini dan difilter
				let m = blnArr.find(bln => String(b.jenis).toUpperCase().includes(bln.toUpperCase()));
				let sppIndex = blnArr.findIndex(bln => bln === m);
				if (sppIndex <= maxSppIndex) { 
					filteredList.push(b); 
					totalHitung += b.sisa; 
				}
			} else {
				// Tunggakan Masa Lalu (Tahun Sebelum) SELALU dimasukkan
				filteredList.push(b); 
				totalHitung += b.sisa;
			}
		}
	});

	billingData.lainnya.forEach(l => {
		if(l.sisa !== 'LUNAS' && l.sisa > 0) {
			if (l.tahun === activeThnAjaran && keperluan !== 'Umum' && keperluan !== 'Syarat Ujian PAS 2 / Kenaikan Kelas') {
				let isExcluded = excludedLainnya.some(kw => String(l.jenis).toUpperCase().includes(kw));
				if (!isExcluded) { 
					filteredList.push(l); 
					totalHitung += l.sisa; 
				}
			} else {
				filteredList.push(l); 
				totalHitung += l.sisa;
			}
		}
	});

	return { items: filteredList, total: totalHitung };
}

function buildSuratHTML(siswa, filteredSurat, keperluan, index, isLast = true) {
	let now = new Date();
	let romanMonth = getRomanMonth(now.getMonth());
	let year = now.getFullYear();
	let numSequence = String(index).padStart(3, '0');
	// PERBAIKAN FORMAT NOMOR SURAT
	let noSurat = `TA / ${numSequence} / MA-BU / ${romanMonth} / ${year}`;

	let kalimatKeperluan = keperluan !== 'Umum' ? `sebagai salah satu syarat untuk mengikuti kegiatan <b>${keperluan}</b>` : `untuk kelancaran administrasi sekolah`;

	// --- AWAL: EFISIENSI TABEL (AUTO-GROUPING SPP) ---
	let groupedItems = [];
	let sppGroups = {};

	filteredSurat.items.forEach(item => {
		let jenisUpper = String(item.jenis).toUpperCase();
		if (jenisUpper.includes('SPP')) {
			// Ambil nama bulan dengan membuang kata SPP
			let month = item.jenis.replace(/SPP/i, '').trim();
			let key = `${item.tahun}_${item.nominalAwal}`; // Kelompokkan berdasarkan tahun
			if (!sppGroups[key]) {
				sppGroups[key] = { jenis: 'SPP', months: [], tahun: item.tahun, sisa: 0 };
			}
			sppGroups[key].months.push(month);
			sppGroups[key].sisa += item.sisa;
		} else {
			groupedItems.push({ jenis: item.jenis, tahun: item.tahun, sisa: item.sisa });
		}
	});

	// Susun kembali hasil grouping ke dalam tabel final (SPP ditaruh di urutan atas)
	let finalItems = [];
	Object.values(sppGroups).forEach(g => {
		let monthStr = g.months.join(', ');
		finalItems.push({
			jenis: `SPP (${monthStr})`,
			tahun: g.tahun,
			sisa: g.sisa
		});
	});
	finalItems = finalItems.concat(groupedItems);
	// --- AKHIR: EFISIENSI TABEL ---

	let tableRows = '';
	finalItems.forEach((item, i) => {
		tableRows += `
			<tr>
				<td style="text-align: center;">${i + 1}</td>
				<td>${item.jenis} ${item.tahun ? `(${item.tahun})` : ''}</td>
				<td style="text-align: right;">${formatRp(item.sisa)}</td>
			</tr>
		`;
	});

	// PERBAIKAN: Jika bukan surat terakhir, tambahkan class pemisah halaman dari CSS
	let pageBreakCSS = !isLast ? 'page-break-after: always;' : '';
	// PERBAIKAN: Margin pada <p> dan <table> dirapatkan agar hemat ruang
	return `
	<div class="surat-font" style="position: relative; padding-top: ${index > 1 ? '15px' : '0'};">
		<!-- KOP SURAT -->
		<img src="/administrasi/assets/img/kop-madrasah.jpg" style="width: 100%; height: auto; padding-bottom: 5px; margin-bottom: 10px;" alt="Kop Surat">
		
		<table style="width: 100%; margin-bottom: 15px;">
			<tr><td style="width: 70px;">Nomor</td><td style="width: 10px;">:</td><td>${noSurat}</td><td style="text-align: right;">Sidoarjo, ${getNowDateIndo()}</td></tr>
			<tr><td>Lampiran</td><td>:</td><td>-</td><td></td></tr>
			<tr><td>Perihal</td><td>:</td><td><b>Tagihan Administrasi</b></td><td></td></tr>
		</table>

		<p>Kepada Yth.<br><b>Bapak/Ibu Wali Murid dari:</b></p>
		<table style="margin-left: 20px; margin-bottom: 10px;">
			<tr><td style="width: 120px;">Nama</td><td style="width: 10px;">:</td><td><b>${siswa.nama}</b></td></tr>
			<tr><td>NIS</td><td>:</td><td>${siswa.nis}</td></tr>
			<tr><td>Kelas</td><td>:</td><td>${siswa.kelas}</td></tr>
		</table>

		<p><i>Assalamu'alaikum Wr. Wb.</i></p>
		<p style="text-align: justify; text-indent: 50px;">
			Alhamdulillah Wassholaatu Wassalaamu Alaa Rasulillah amma Ba’du. Salam silaturrahim kami sampaikan teriring doa semoga bapak ibu selalu dalam perlindungan Allah SWT dalam melaksanakan aktivitas kita sehari-hari. Amin Amin Ya Mujibassailin.
		</p>
		<p style="text-align: justify; text-indent: 50px;">
			Bersama surat ini, kami memberitahukan rincian tanggungan administrasi keuangan putra/putri Bapak/Ibu ${kalimatKeperluan}. Berikut adalah rincian tagihan yang belum terselesaikan:
		</p>

		<table class="surat-table">
			<thead>
				<tr><th style="width: 50px;">No</th><th>Jenis Pembayaran</th><th style="width: 150px;">Kekurangan (Rp)</th></tr>
			</thead>
			<tbody>
				${tableRows}
				<tr>
					<td colspan="2" style="text-align: right; font-weight: bold;">TOTAL KEKURANGAN:</td>
					<td style="text-align: right; font-weight: bold;">${formatRp(filteredSurat.total)}</td>
				</tr>
			</tbody>
		</table>

		<p style="text-align: justify; text-indent: 50px;">
			Kami mohon agar Bapak/Ibu dapat segera menyelesaikan administrasi tersebut. Bagi Bapak/Ibu yang berkenan melakukan pembayaran secara transfer, dapat melalui rekening <b>Bank Jatim Syariah No. 6202199559 a.n. MA Bi'rul Ulum</b>. Mohon konfirmasi dan kirimkan bukti transfer melalui WhatsApp ke nomor <b>0838-3313-3913 (Admin Madrasah)</b>.
		</p>
		<p style="text-align: justify; text-indent: 50px;">
			<i>Apabila Bapak/Ibu telah melakukan pembayaran sebelum surat ini diterima, mohon surat tagihan ini diabaikan.</i> Demikian surat pemberitahuan ini kami sampaikan. Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.
		</p>
		<p><i>Wassalamu'alaikum Wr. Wb.</i></p>

		<!-- TANDA TANGAN (page-break-inside: avoid mencegah kotak terbelah di halaman berbeda) -->
		<table style="width: 100%; margin-top: 15px; text-align: center; page-break-inside: avoid;">
			<tr>
				<td style="width: 50%;">
					<br>Bendahara Madrasah,<br><br>
					<br>
					<br>
					<b><u>Ririn Jauharin, S.Ak.</u></b>
				</td>
				<td style="width: 50%;">
					Mengetahui,<br>
					Kepala Madrasah,<br><br>
					<br>
					<br>
					<b><u>Yusuf Muzaidi, S.Pd.</u></b>
				</td>
			</tr>
		</table>
	</div>
	`;
}

function generateSuratIndividu() {
	const nis = document.getElementById('surat-nis').value.trim();
	const keperluan = document.getElementById('surat-keperluan-indv').value;
	const startNum = parseInt(document.getElementById('surat-mulai-indv').value) || 1;
	if(!nis) { showToast('Masukkan NIS terlebih dahulu!', 'error'); return; }

	const siswa = dbSiswa.find(s => String(s.nis).trim() === nis);
	if(!siswa) { showToast('NIS tidak ditemukan!', 'error'); return; }

	let riwayat = dbPembayaran.filter(p => !p.isDeleted && String(p.nis).trim() === nis);
	let billing = calculateSiswaBilling(siswa, dbMasterTarif, riwayat);
	
	// PERBAIKAN LOGIKA: Filter tagihan sesuai keperluan
	let filteredSurat = getFilteredTunggakan(billing, keperluan);

	if(filteredSurat.total <= 0) {
		showToast('Siswa ini LUNAS untuk keperluan tersebut.', 'info'); return;
	}

	document.getElementById('surat-preview-container').classList.remove('hidden');
	document.getElementById('surat-result-info').innerText = `Preview Surat: ${siswa.nama} (Total: ${formatRp(filteredSurat.total)})`;
	
	let htmlSurat = buildSuratHTML(siswa, filteredSurat, keperluan, startNum, true);
	document.getElementById('surat-print-area').innerHTML = htmlSurat;
	showToast('Surat berhasil dibuat!');
}

function generateSuratMassal() {
	const kelas = document.getElementById('surat-kelas-massal').value;
	const limit = parseInt(document.getElementById('surat-limit').value) || 0;
	const keperluan = document.getElementById('surat-keperluan-massal').value;
	const startNum = parseInt(document.getElementById('surat-mulai-massal').value) || 1;
	
	if(!kelas) { showToast('Pilih kelas terlebih dahulu!', 'error'); return; }

	let listSiswa = dbSiswa.filter(s => s.kelas === kelas).sort((a,b) => a.nama.localeCompare(b.nama));
	if(listSiswa.length === 0) { showToast('Tidak ada siswa di kelas ini.', 'error'); return; }

	let validSiswa = [];

	// 1. Kumpulkan daftar siswa yang tagihannya memenuhi Batas Limit
	listSiswa.forEach((siswa) => {
		let riwayat = dbPembayaran.filter(p => !p.isDeleted && String(p.nis).trim() === String(siswa.nis).trim());
		let billing = calculateSiswaBilling(siswa, dbMasterTarif, riwayat);
		
		let filteredSurat = getFilteredTunggakan(billing, keperluan);
		if(filteredSurat.total >= limit && filteredSurat.total > 0) {
			validSiswa.push({ siswa, filteredSurat });
		}
	});

	let countSurat = validSiswa.length;

	if(countSurat === 0) {
		document.getElementById('surat-preview-container').classList.add('hidden');
		showToast(`Tidak ada tagihan mencapai limit Rp${limit.toLocaleString('id-ID')} untuk keperluan ini.`, 'info');
		return;
	}

	// 2. Merakit Surat dan memastikan pemisah halaman (page-break) aktif
	let htmlKumpulanSurat = '';
	validSiswa.forEach((data, i) => {
		// Beri tahu sistem jika ini adalah anak terakhir agar kertas tidak memiliki halaman kosong di akhir
		let isLast = (i === countSurat - 1);
		htmlKumpulanSurat += buildSuratHTML(data.siswa, data.filteredSurat, keperluan, startNum + i, isLast);
	});

	document.getElementById('surat-preview-container').classList.remove('hidden');
	document.getElementById('surat-result-info').innerText = `Berhasil generate ${countSurat} surat untuk Kelas ${kelas}`;
	document.getElementById('surat-print-area').innerHTML = htmlKumpulanSurat;
	showToast(`Selesai! ${countSurat} surat siap dicetak.`);
}

function printSurat() {
	showToast('Menyiapkan print A4/Folio...', 'info');
	
	// PERBAIKAN OVERRIDE CSS: Paksa Chrome melupakan flexbox agar print berhalaman-halaman sukses
	const printStyle = `
		@page { size: 210mm 330mm; margin: 5mm 10mm; }
		@media print {
			/* 1. Kembalikan visibilitas (menimpa/membatalkan CSS Kwitansi) */
			body * { visibility: visible !important; }
			
			/* 2. Sembunyikan Kwitansi & semua UI Admin (Menu, Header, Form) */
			#print-area, aside, header, #view-login, #view-siswa, #loading-overlay, #toast, #delete-modal, 
			#admin-view-datasiswa, #admin-view-tarif, #laporan-content-rekap,
			#admin-view-cetak > div:nth-child(1),
			#laporan-content-surat > div:nth-child(1),
			#surat-preview-container > div:first-child {
				display: none !important;
			}

			/* BONGKAR KUNCIAN FLEXBOX & HILANGKAH SHADOW/BORDER CHROME */
			html, body, #view-admin, main, #admin-view-laporan, #laporan-content-surat, #surat-preview-container, #surat-print-wrapper, #surat-print-area {
				display: block !important;
				height: auto !important;
				min-height: 0 !important;
				overflow: visible !important;
				position: static !important;
				margin: 0 !important;
				padding: 0 !important;
				background: white !important;
				background-color: white !important;
				border: none !important;
				box-shadow: none !important;
				border-radius: 0 !important;
				outline: none !important;
			}

			/* Bebaskan ukuran lebar surat & hilangkan sisa box shadow Tailwind */
			#surat-print-area {
				width: 100% !important;
				max-width: none !important;
				box-shadow: none !important;
				border: none !important;
			}
		}
	`;
	
	document.getElementById('dynamic-print-style').innerHTML = printStyle;
	
	setTimeout(() => {
		window.print();
		
		// Kembalikan ke normal setelah pop-up print muncul
		setTimeout(() => {
			document.getElementById('dynamic-print-style').innerHTML = '';
		}, 1000);
	}, 500);
}

// ==========================================
// FITUR KEAMANAN: AUTO-LOGOUT (IDLE TIMER)
// ==========================================
let idleTimer;
// WAKTU TUNGGU: Saat ini di set 10 detik untuk kemudahan uji coba Anda.
// UBAH KE 3600000 (1 Jam) UNTUK VERSI ASLI/PRODUKSI NANTI.
const IDLE_TIMEOUT = 3600000; 

function logoutMatiAktivitas() {
	// Cek apakah sedang berada di layar admin (agar tidak terus me-logout siswa atau layar login)
	if (!document.getElementById('view-admin').classList.contains('hidden')) {
		logout();
		showToast('Sesi berakhir otomatis. Anda tidak beraktivitas.', 'error');
	}
}

function resetIdleTimer() {
	if (idleTimer) clearTimeout(idleTimer);
	idleTimer = setTimeout(logoutMatiAktivitas, IDLE_TIMEOUT);
}

function setupIdleTimer() {
	// Pasang sensor pendeteksi gerakan di layar
	window.onmousemove = resetIdleTimer;
	window.onmousedown = resetIdleTimer; 
	window.ontouchstart = resetIdleTimer; 
	window.onclick = resetIdleTimer;     
	window.onkeydown = resetIdleTimer;   
	window.addEventListener('scroll', resetIdleTimer, true);
	resetIdleTimer(); // Mulai timer saat login pertama
}

function stopIdleTimer() {
	if (idleTimer) clearTimeout(idleTimer);
	window.onmousemove = null;
	window.onmousedown = null;
	window.ontouchstart = null;
	window.onclick = null;
	window.onkeydown = null;
	window.removeEventListener('scroll', resetIdleTimer, true);
}

const startYear = 2026;
const currentYear = new Date().getFullYear();
// document.getElementById("tahun").textContent = startYear === currentYear ? startYear : `${startYear} - ${currentYear}`;

let formYear;
const month = new Date().getMonth();
// Januari - Juni → tetap tahun sekarang
if (month < 6) {
	formYear = currentYear;
} else {
	// Juli - Desember → naik ke tahun depan
	formYear = currentYear + 1;
}
const endYear = currentYear + 1

document.getElementById("tahun-ppdb").textContent = `${startYear}/${endYear}`;
