// const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx2BBySi5nyeyQMPQZDBTZJl9ZkTlFfBwzDDbR6Nn9Kt8F1eqSx8eKIf2LNvyAiUemw/exec';
const SCRIPT_URL = '';
const useServer = SCRIPT_URL.startsWith('https://script.google.com');

let currentUserRole = '';
let activeRestoreTab = 'pemasukan';
const adminTableState = {
	datasiswa: {
		activeTab: 'aktif',
		query: '',
		filterKelas: 'All',
		page: 1
	},
	pemasukan: {
		page: 1,
		query: ''
	},
	bantuan: {
		page: 1,
		query: ''
	},
	pengeluaran: {
		page: 1,
		query: ''
	},
	'pengeluaran-non': {
		page: 1,
		query: ''
	},
	infaq: {
		page: 1,
		query: ''
	},
	user: {
		page: 1,
		query: ''
	},
	restore: {
		page: 1,
		query: ''
	},
	tarif: {
		page: 1,
		query: ''
	}
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
dbAdmin = [{
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
	// HIGHLIGHT KASUS 1: Budi. Tahun Masuk 2024. Saat ini tahun ajaran 2025.
	// Karena sudah naik kelas, dia di-tagih SPP Penuh dari Juli meskipun kolom bulannya ditulis selain Juli.
	{ nis: '1011', nama: 'Budi Santoso', lp: 'L', tahunMasuk: '2024/2025', kelas: 'XI IPA', bulanMulai: 'Juli' }, 
	
	// HIGHLIGHT KASUS 2: Joko. Anak Mutasi Baru. Tahun Masuk 2025.
	// Karena tahun masuknya SAMA dengan tahun tagihan saat ini, dia hanya ditagih SPP mulai Januari (sesuai kolom Bulan_Mulai_Tagihan).
	{ nis: '1090', nama: 'Joko Pindahan', lp: 'L', tahunMasuk: '2025/2026', kelas: 'X IPA', bulanMulai: 'Januari' },

	// HIGHLIGHT KASUS 3: Andi (Lulus). Akan terfilter ke Tab Non-Aktif.
	{ nis: '1001', nama: 'Andi Lulusan', lp: 'L', tahunMasuk: '2022/2023', kelas: 'LULUS 2025', bulanMulai: 'Juli' },

	// Tambahan dummy untuk test pagination (agar lebih dari 5 data)
	{ nis: '1012', nama: 'Siti Aminah', lp: 'P', tahunMasuk: '2025/2026', kelas: 'X IPA', bulanMulai: 'Juli' },
	{ nis: '1013', nama: 'Ahmad Fauzi', lp: 'L', tahunMasuk: '2025/2026', kelas: 'X IPA', bulanMulai: 'Juli' },
	{ nis: '1014', nama: 'Rina Wijaya', lp: 'P', tahunMasuk: '2025/2026', kelas: 'X IPA', bulanMulai: 'Juli' },
	{ nis: '1015', nama: 'Deni Setiawan', lp: 'L', tahunMasuk: '2025/2026', kelas: 'X IPA', bulanMulai: 'Juli' },
	{ nis: '1016', nama: 'Lina Marlina', lp: 'P', tahunMasuk: '2025/2026', kelas: 'XI IPS', bulanMulai: 'Juli' },
	{ nis: '1017', nama: 'Eko Prasetyo', lp: 'L', tahunMasuk: '2025/2026', kelas: 'XI IPS', bulanMulai: 'Juli' }
];
dbPembayaran = [{
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
}];
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
	{
		id: 'T-1',
		tahun: '2025/2026',
		target: 'SEMUA KELAS',
		jenis: 'SPP Juli',
		nominal: 150000,
		isDeleted: false
	},
	{
		id: 'T-2',
		tahun: '2025/2026',
		target: 'SEMUA KELAS',
		jenis: 'SPP Agustus',
		nominal: 150000,
		isDeleted: false
	},
	{
		id: 'T-3',
		tahun: '2025/2026',
		target: 'SEMUA KELAS',
		jenis: 'SPP September',
		nominal: 150000,
		isDeleted: false
	},
	{
		id: 'T-4',
		tahun: '2025/2026',
		target: 'SEMUA KELAS',
		jenis: 'SPP Oktober',
		nominal: 150000,
		isDeleted: false
	},
	{
		id: 'T-5',
		tahun: '2025/2026',
		target: 'SEMUA KELAS',
		jenis: 'SPP November',
		nominal: 150000,
		isDeleted: false
	},
	{
		id: 'T-6',
		tahun: '2025/2026',
		target: 'SEMUA KELAS',
		jenis: 'SPP Desember',
		nominal: 150000,
		isDeleted: false
	},
	{
		id: 'T-7',
		tahun: '2025/2026',
		target: 'SEMUA KELAS',
		jenis: 'SPP Januari',
		nominal: 150000,
		isDeleted: false
	},
	{
		id: 'T-8',
		tahun: '2025/2026',
		target: 'SEMUA KELAS',
		jenis: 'SPP Februari',
		nominal: 150000,
		isDeleted: false
	},

	// Tarif Khusus
	{
		id: 'T-9',
		tahun: '2025/2026',
		target: 'X IPA',
		jenis: 'Daftar Ulang',
		nominal: 1500000,
		isDeleted: false
	},
	{
		id: 'T-10',
		tahun: '2025/2026',
		target: 'NIS 1090',
		jenis: 'Biaya Mutasi',
		nominal: 500000,
		isDeleted: false
	},

	// Tarif Ujian (Masuk dalam Kalkulasi Widget)
	{
		id: 'T-11',
		tahun: '2025/2026',
		target: 'SEMUA KELAS',
		jenis: 'PTS 1',
		nominal: 50000,
		isDeleted: false
	},
	{
		id: 'T-12',
		tahun: '2025/2026',
		target: 'SEMUA KELAS',
		jenis: 'PAS 1',
		nominal: 75000,
		isDeleted: false
	}
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
			if (res.success) renderSiswaView(res.data);
			else showToast(res.message, 'error');
		}).catch(err => {
			hideLoading();
			showToast('Error di sistem: ' + err.message, 'error');
		});
	} else {
		setTimeout(() => {
			hideLoading();
			const s = dbSiswa.find(s => String(s.nis).trim() === nis);
			if (s) renderSiswaView(s);
			else showToast('NIS tidak ditemukan!', 'error');
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
		'cetak': 'Cetak Rekapitulasi Keuangan',
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
		'dashboard', 'datasiswa', 'pemasukan', 'laporan', 'bantuan', 'infaq', 'pengeluaran', 'pengeluaran-non', 'tarif', 'restore', 'user'
	];

	const indexTab = daftarTab.indexOf(tab);

	const btnColor = warnaNav[indexTab % warnaNav.length] || 'bg-gray-500';
	// const btnColor = (tab === 'dashboard' ? 'bg-blue-500' : (tab === 'datasiswa' ? 'bg-sky-500' : (tab === 'pemasukan' ? 'bg-cyan-500' : (tab === 'bantuan' ? 'bg-teal-500' : (tab === 'infaq' ? 'bg-emerald-500' : (tab === 'pengeluaran' ? 'bg-orange-500' : (tab === 'pengeluaran-non' ? 'bg-amber-500' : (tab === 'user' ? 'bg-purple-600' : (tab === 'restore' ? 'bg-rose-500' : 'bg-state-500')))))))));
	document.getElementById(`nav-${tab}`).className = `w-full flex items-center px-4 py-3 rounded-lg ${btnColor} text-white transition-colors`;
	document.getElementById('admin-page-title').innerText = titles[tab];

	if (tab === 'restore') loadRestoreTable();

	if (window.innerWidth < 768) {
		document.getElementById('admin-sidebar').classList.add('-translate-x-full');
		document.getElementById('sidebar-overlay').classList.add('hidden');
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
	document.getElementById('admin-name').innerText = admin.nama;

	const badgeEl = document.getElementById('admin-role-badge');
	badgeEl.innerText = currentUserRole;
	let badgeColorClass = 'bg-gray-100 text-gray-700';
	if (currentUserRole === 'Super Admin') badgeColorClass = 'bg-red-100 text-red-700';
	else if (currentUserRole === 'Admin') badgeColorClass = 'bg-blue-100 text-blue-700';
	else if (currentUserRole === 'Kepala Madrasah') badgeColorClass = 'bg-purple-100 text-purple-700';
	badgeEl.className = `hidden sm:inline-block ml-2 px-2 py-0.5 rounded text-xs font-bold ${badgeColorClass}`;

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
	let filtered = [...dataArray].reverse().filter(filterFn);
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

// function loadAdminDataSiswaTable() {
// 	const tbody = document.getElementById('table-admin-datasiswa');
// 	tbody.innerHTML = '';
// 	let filteredData = dbSiswa.filter(s => {
// 		const q = adminTableState.datasiswa.query;
// 		const fKelas = adminTableState.datasiswa.filterKelas;
// 		return (!q || String(s.nis).toLowerCase().includes(q) || String(s.nama).toLowerCase().includes(q)) && (fKelas === 'All' || s.kelas === fKelas);
// 	});
// 	const itemsPerPage = getItemsPerPage();
// 	const tItems = filteredData.length;
// 	const tPages = Math.ceil(tItems / itemsPerPage) || 1;
// 	if (adminTableState.datasiswa.page > tPages) adminTableState.datasiswa.page = tPages;
// 	if (adminTableState.datasiswa.page < 1) adminTableState.datasiswa.page = 1;
// 	const startIdx = (adminTableState.datasiswa.page - 1) * itemsPerPage;
// 	const pData = filteredData.slice(startIdx, startIdx + itemsPerPage);
// 	if (pData.length === 0) {
// 		tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-gray-500">Data siswa tidak ditemukan</td></tr>`;
// 	} else {
// 		pData.forEach(s => {
// 			let lpBadge = s.lp === 'L' ? `<span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">L</span>` : `<span class="bg-pink-100 text-pink-700 px-2 py-0.5 rounded text-xs font-bold">P</span>`;
// 			tbody.innerHTML += `<tr class="hover:bg-gray-50"><td class="p-4 font-medium text-gray-600">${s.nis}</td><td class="p-4 font-bold text-gray-800">${s.nama}</td><td class="p-4 text-center">${lpBadge}</td><td class="p-4 text-gray-600"><span class="bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-md text-xs font-medium">${s.kelas}</span></td></tr>`;
// 		});
// 	}
// 	updatePaginationUI('datasiswa', tItems, pData.length);
// }

// --- RENDER TABLE ADMIN DENGAN PAGINATION ---
function loadAdminDataSiswaTable() { 
	const tbody = document.getElementById('table-admin-datasiswa');
	tbody.innerHTML = ''; 
	let isAktif = adminTableState.datasiswa.activeTab === 'aktif'; 
	
	let { pData, tItems } = getPaginatedData(dbSiswa, 'datasiswa', s => { 
		const q = adminTableState.datasiswa.query; const fKelas = adminTableState.datasiswa.filterKelas; 
		let isMatchQuery = (!q || String(s.nis).toLowerCase().includes(q) || String(s.nama).toLowerCase().includes(q)); 
		let isMatchKelas = (fKelas === 'All' || s.kelas === fKelas); 
		let isNon = String(s.kelas).toUpperCase().includes('LULUS') || String(s.kelas).toUpperCase().includes('KELUAR'); 
		let isMatchTab = isAktif ? !isNon : isNon; 
		return isMatchQuery && isMatchKelas && isMatchTab; 
	}); 
	
	if(pData.length === 0) { 
		tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-gray-500">Data tidak ditemukan</td></tr>`; 
	} else {
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
			'red','orange','amber','yellow','lime','green','emerald','teal','cyan','sky','blue','indigo','purple','pink','rose'
		];
		
		pData.forEach(s => { 
			let lpBadge = s.lp === 'L' ? `<span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">L</span>` : `<span class="bg-pink-100 text-pink-700 px-2 py-0.5 rounded text-xs font-bold">P</span>`;
			// Ambil warna berdasarkan bulan
			let warna = warnaBulan[s.bulanMulai] || 'bg-gray-100 text-gray-700';
			// Badge bulan
			let bulanBadge = `
				<span class="${warna} px-2 py-0.5 rounded text-xs font-bold">
					${s.bulanMulai}
				</span>
			`;
			// BADGE KELAS
			let warnaKelasBadge = '';
			if (['X E1', 'X IPA'].includes(s.kelas)) {warnaKelasBadge = 'bg-green-100 text-green-700 border-green-200';} 
			else if (['X E2', 'X IPS'].includes(s.kelas)) {warnaKelasBadge = 'bg-emerald-100 text-purple-700 border-purple-200';}
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

			const uniqueTahun = [...new Set(pData.map(s => s.tahunMasuk))];
			const warnaTahun = {};
			uniqueTahun.forEach((tahun, index) => {
				const color = colorNames[index % colorNames.length];
				warnaTahun[tahun] =
					`bg-${color}-100 text-${color}-700 border-${color}-200`;
			});
			let tahunClass =
				warnaTahun[s.tahunMasuk] ||
				'bg-gray-100 text-gray-700 border-gray-200';

			let tahunBadge = `
				<span class="${tahunClass} border px-2 py-1 rounded-md text-xs font-bold">
					${s.tahunMasuk}
				</span>
			`;
			tbody.innerHTML += 
			`<tr class="hover:bg-gray-50">
				<td class="p-4 font-medium text-gray-600">${s.nis}</td>
				<td class="p-4 font-bold text-gray-800">${s.nama}</td>
				<td class="p-4 text-center">${lpBadge}</td>
				<td class="p-4 text-center">${tahunBadge}</td>
				<td class="p-4 text-center">${bulanBadge}</td>
				<td class="p-4 text-center">${kelasBadge}</td>
			</tr>`; 
		}); 
	}
	
	updatePaginationUI('datasiswa', tItems, pData.length);
}

function loadAdminTable() {
	const tbody = document.getElementById('table-admin-history');
	const q = adminTableState.pemasukan.query;
	const {
		pData,
		tItems,
		startIdx
	} = getPaginatedData(dbPembayaran, 'pemasukan', t => !q || String(t.nis).toLowerCase().includes(q) || String(t.jenis).toLowerCase().includes(q) || String(t.acuanBayar).toLowerCase().includes(q));
	buildTableRow(tbody, pData, 'pemasukan', t => {
		let statusSync = String(t.id).includes('TEMP-') ? '<i class="ph ph-spinner-gap animate-spin text-orange-500 ml-1" title="Menyinkronkan..."></i>' : '';
		let btnCetak = `<button type="button" onclick="cetakKwitansi('${t.id}')" class="text-purple-600 hover:text-purple-800 mr-3" title="Cetak Kwitansi"><i class="ph ph-printer text-xl"></i></button>`;
		let btnEdit = currentUserRole === 'Super Admin' ? `<button type="button" onclick="editData('pemasukan', '${t.id}')" class="text-blue-500 hover:text-blue-700 mr-2" title="Edit"><i class="ph ph-pencil-simple text-lg"></i></button>` : '';
		let btnDelete = currentUserRole === 'Super Admin' ? `<button type="button" onclick="deleteData('pemasukan', '${t.id}')" class="text-red-500 hover:text-red-700" title="Hapus"><i class="ph ph-trash text-lg"></i></button>` : '';
		tbody.innerHTML += `<tr class="hover:bg-gray-50"><td class="p-4 text-xs"><div class="text-gray-800 font-medium flex items-center">${t.tanggalInput} ${statusSync}</div><div class="text-gray-500">${t.waktuInput}</div></td><td class="p-4"><div class="font-bold text-blue-600">${t.nis}</div><div class="text-xs text-gray-600">${t.nama}</div></td><td class="p-4 text-gray-800"><div class="font-medium">${t.jenis} <span class="text-xs font-normal text-gray-500">(TA: ${t.tahun})</span></div><div class="text-[11px] text-gray-400 mt-0.5 bg-gray-100 px-1 rounded w-max border">${t.acuanBayar}</div></td><td class="p-4 font-bold text-right text-emerald-600">${formatRp(t.nominal)}</td><td class="p-4 text-center ${getActionClass('pemasukan')}">${btnCetak}${btnEdit}${btnDelete}</td></tr>`;
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
	} = getPaginatedData(dbBantuan, 'bantuan', t => !q || String(t.keterangan).toLowerCase().includes(q) || String(t.jenis).toLowerCase().includes(q) || String(t.tglTransaksi).toLowerCase().includes(q));
	buildTableRow(tbody, pData, 'bantuan', t => {
		let statusSync = String(t.id).includes('TEMP-') ? '<i class="ph ph-spinner-gap animate-spin text-orange-500 ml-1"></i>' : '';
		let btnEdit = currentUserRole === 'Super Admin' ? `<button type="button" onclick="editData('bantuan', '${t.id}')" class="text-blue-500 hover:text-blue-700 mr-2"><i class="ph ph-pencil-simple text-lg"></i></button>` : '';
		let btnDelete = currentUserRole === 'Super Admin' ? `<button type="button" onclick="deleteData('bantuan', '${t.id}')" class="text-red-500 hover:text-red-700"><i class="ph ph-trash text-lg"></i></button>` : '';
		tbody.innerHTML += `<tr class="hover:bg-gray-50"><td class="p-4 text-xs"><div class="text-gray-800 font-medium flex items-center">${t.tanggalInput} ${statusSync}</div><div class="text-gray-500">${t.waktuInput}</div></td><td class="p-4"><div class="text-gray-800">${t.tglTransaksi}</div><div class="text-xs text-gray-500 mt-1">${t.keterangan}</div></td><td class="p-4"><div class="font-medium text-blue-600">${t.jenis}</div><div class="text-xs text-gray-500 mt-1">TA: ${t.tahun}</div></td><td class="p-4 font-medium text-right text-emerald-600">+ ${formatRp(t.nominal)}</td><td class="p-4 text-center ${getActionClass('bantuan')}">${btnEdit}${btnDelete}</td></tr>`;
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
	} = getPaginatedData(dbPengeluaran, 'pengeluaran', t => !q || String(t.keterangan).toLowerCase().includes(q) || String(t.jenis).toLowerCase().includes(q) || String(t.tglTransaksi).toLowerCase().includes(q));
	buildTableRow(tbody, pData, 'pengeluaran', t => {
		let statusSync = String(t.id).includes('TEMP-') ? '<i class="ph ph-spinner-gap animate-spin text-orange-500 ml-1"></i>' : '';
		let btnEdit = currentUserRole === 'Super Admin' ? `<button type="button" onclick="editData('pengeluaran', '${t.id}')" class="text-blue-500 hover:text-blue-700 mr-2"><i class="ph ph-pencil-simple text-lg"></i></button>` : '';
		let btnDelete = currentUserRole === 'Super Admin' ? `<button type="button" onclick="deleteData('pengeluaran', '${t.id}')" class="text-red-500 hover:text-red-700"><i class="ph ph-trash text-lg"></i></button>` : '';
		tbody.innerHTML += `<tr class="hover:bg-gray-50"><td class="p-4 text-xs"><div class="text-gray-800 font-medium flex items-center">${t.tanggalInput} ${statusSync}</div><div class="text-gray-500">${t.waktuInput}</div></td><td class="p-4"><div class="text-gray-800">${t.tglTransaksi}</div><div class="text-xs text-gray-500 mt-1">${t.keterangan}</div></td><td class="p-4"><div class="font-medium text-red-600">${t.jenis}</div><div class="text-xs text-gray-500 mt-1">TA: ${t.tahun}</div></td><td class="p-4 font-medium text-right text-red-600">- ${formatRp(t.nominal)}</td><td class="p-4 text-center ${getActionClass('pengeluaran')}">${btnEdit}${btnDelete}</td></tr>`;
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
	} = getPaginatedData(dbPengeluaranNon, 'pengeluaran-non', t => !q || String(t.keterangan).toLowerCase().includes(q) || String(t.jenis).toLowerCase().includes(q) || String(t.tglTransaksi).toLowerCase().includes(q));
	buildTableRow(tbody, pData, 'pengeluaran-non', t => {
		let statusSync = String(t.id).includes('TEMP-') ? '<i class="ph ph-spinner-gap animate-spin text-orange-500 ml-1"></i>' : '';
		let btnEdit = currentUserRole === 'Super Admin' ? `<button type="button" onclick="editData('pengeluaran-non', '${t.id}')" class="text-blue-500 hover:text-blue-700 mr-2"><i class="ph ph-pencil-simple text-lg"></i></button>` : '';
		let btnDelete = currentUserRole === 'Super Admin' ? `<button type="button" onclick="deleteData('pengeluaran-non', '${t.id}')" class="text-red-500 hover:text-red-700"><i class="ph ph-trash text-lg"></i></button>` : '';
		tbody.innerHTML += `<tr class="hover:bg-gray-50"><td class="p-4 text-xs"><div class="text-gray-800 font-medium flex items-center">${t.tanggalInput} ${statusSync}</div><div class="text-gray-500">${t.waktuInput}</div></td><td class="p-4"><div class="text-gray-800">${t.tglTransaksi}</div><div class="text-xs text-gray-500 mt-1">${t.keterangan}</div></td><td class="p-4"><div class="font-medium text-orange-600">${t.jenis}</div><div class="text-xs text-gray-500 mt-1">TA: ${t.tahun}</div></td><td class="p-4 font-medium text-right text-orange-600">- ${formatRp(t.nominal)}</td><td class="p-4 text-center ${getActionClass('pengeluaran-non')}">${btnEdit}${btnDelete}</td></tr>`;
	});
	updatePaginationUI('pengeluaran-non', tItems, pData.length);
}

function loadAdminInfaqTable() {
	const tbody = document.getElementById('table-admin-infaq');
	let saldoTotal = dbInfaq.reduce((sum, trx) => trx.jenis === 'Pemasukan' ? sum + parseInt(trx.nominal || 0) : sum - parseInt(trx.nominal || 0), 0);
	document.getElementById('infaq-total-saldo').innerText = formatRp(saldoTotal);
	const q = adminTableState.infaq.query;
	const {
		pData,
		tItems,
		startIdx
	} = getPaginatedData(dbInfaq, 'infaq', t => !q || String(t.keterangan).toLowerCase().includes(q) || String(t.jenis).toLowerCase().includes(q) || String(t.tglTransaksi).toLowerCase().includes(q));
	buildTableRow(tbody, pData, 'infaq', t => {
		let isM = t.jenis === 'Pemasukan';
		let iconM = isM ? `<span class="px-2 py-1 text-xs rounded-full font-medium bg-emerald-100 text-emerald-700">Masuk</span>` : `<span class="px-2 py-1 text-xs rounded-full font-medium bg-red-100 text-red-700">Keluar</span>`;
		let statusSync = String(t.id).includes('TEMP-') ? '<i class="ph ph-spinner-gap animate-spin text-orange-500 ml-1"></i>' : '';
		let btnEdit = currentUserRole === 'Super Admin' ? `<button type="button" onclick="editData('infaq', '${t.id}')" class="text-blue-500 hover:text-blue-700 mr-2"><i class="ph ph-pencil-simple text-lg"></i></button>` : '';
		let btnDelete = currentUserRole === 'Super Admin' ? `<button type="button" onclick="deleteData('infaq', '${t.id}')" class="text-red-500 hover:text-red-700"><i class="ph ph-trash text-lg"></i></button>` : '';
		tbody.innerHTML += `<tr class="hover:bg-gray-50"><td class="p-4 text-xs"><div class="text-gray-800 font-medium flex items-center">${t.tanggalInput} ${statusSync}</div><div class="text-gray-500">${t.waktuInput}</div></td><td class="p-4"><div class="text-gray-800">${t.tglTransaksi}</div><div class="text-xs text-gray-500 mt-1">${t.keterangan}</div></td><td class="p-4 text-center">${iconM}</td><td class="p-4 font-medium text-right ${isM ? 'text-emerald-600' : 'text-red-600'}">${isM ? '+ ' : '- '}${formatRp(t.nominal)}</td><td class="p-4 text-center ${getActionClass('infaq')}">${btnEdit}${btnDelete}</td></tr>`;
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
	} = getPaginatedData(dbAdmin, 'user', t => !q || String(t.username).toLowerCase().includes(q) || String(t.nama).toLowerCase().includes(q) || String(t.role).toLowerCase().includes(q));
	buildTableRow(tbody, pData, 'user', t => {
		let rBadge = t.role === 'Super Admin' ? `<span class="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">Super Admin</span>` : (t.role === 'Admin' ? `<span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">Admin</span>` : `<span class="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-bold">Kepala Madrasah</span>`);
		let statusSync = t.id && String(t.id).includes('TEMP-') ? '<i class="ph ph-spinner-gap animate-spin text-orange-500 ml-2" title="Menyinkronkan..."></i>' : '';
		let btnEdit = `<button type="button" onclick="editData('user', '${t.id}')" class="text-blue-500 hover:text-blue-700 mr-2"><i class="ph ph-pencil-simple text-lg"></i></button>`;
		let btnDelete = `<button type="button" onclick="deleteData('user', '${t.id}')" class="text-red-500 hover:text-red-700"><i class="ph ph-trash text-lg"></i></button>`;
		tbody.innerHTML += `<tr class="hover:bg-gray-50"><td class="p-4 text-gray-800 font-medium flex items-center">${t.username} ${statusSync}</td><td class="p-4 text-gray-800 font-bold">${t.nama}</td><td class="p-4">${rBadge}</td><td class="p-4 text-center ${getActionClass('user')}">${btnEdit}${btnDelete}</td></tr>`;
	});
	updatePaginationUI('user', tItems, pData.length);
}

function loadAdminTarifTable() { 
	const tbody = document.getElementById('table-admin-tarif');
	tbody.innerHTML = ''; 
	const q = adminTableState.tarif.query; 
	
	let { pData, tItems } = getPaginatedData(dbMasterTarif, 'tarif', t => !t.isDeleted && (!q || String(t.tahun).toLowerCase().includes(q) || String(t.target).toLowerCase().includes(q) || String(t.jenis).toLowerCase().includes(q))); 
	
	if(pData.length === 0) { 
		tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-gray-500">Tarif tidak ditemukan</td></tr>`; 
	} else { 
		pData.forEach(t => { 
			tbody.innerHTML += 
			`<tr class="hover:bg-gray-50">
				<td class="p-4 text-gray-800 font-medium">${t.tahun}</td>
				<td class="p-4"><span class="bg-purple-100 text-purple-800 px-2.5 py-1 rounded-md text-xs font-bold border border-purple-200">${t.target}</span></td>
				<td class="p-4 text-gray-800 font-medium">${t.jenis}</td>
				<td class="p-4 font-bold text-right text-gray-800">${formatRp(t.nominal)}</td>
				<td class="p-4 text-center"><button onclick="deleteTarif('${t.id}')" class="text-red-500 hover:text-red-700"><i class="ph ph-trash text-lg"></i></button></td>
			</tr>`; 
		}); 
	}
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
	}

	const idx = targetDb.findIndex(t => String(t.id) === String(id));
	if (idx === -1) return;

	// OPTIMISTIC DELETE (Soft delete di UI Lokal)
	if (tipe === 'user') {
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
			if (tipe === 'user') targetDb.splice(backupDeletedIndex, 0, backupDeletedData);
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

	let listSiswa = dbSiswa.filter(s => s.kelas === kls).sort((a, b) => a.nama.localeCompare(b.nama));
	let applicableTarifs = dbMasterTarif.filter(t => !t.isDeleted && t.tahun === ta && (t.target === kls || t.target === 'SEMUA KELAS' || String(t.target).includes('NIS')));

	let setTagihanUnik = new Set();
	applicableTarifs.forEach(t => setTagihanUnik.add(t.jenis));
	let headerTagihan = Array.from(setTagihanUnik);
	if (listSiswa.length === 0) {
		document.getElementById('cap-table-container').innerHTML = `<p class="text-center text-red-500 py-10">Tidak ada data siswa aktif di kelas ${kls}.</p>`;
		return;
	}

	let htmlTable = `<table class="table-rekap"><thead><tr><th>No</th><th>NIS</th><th>Nama Siswa</th>`;
	headerTagihan.forEach(th => htmlTable += `<th>${th}</th>`);
	htmlTable += `<th>TOTAL KEKURANGAN</th></tr></thead><tbody>`;
	let riwayatThnIni = dbPembayaran.filter(p => !p.isDeleted && p.tahun === ta);

	listSiswa.forEach((siswa, idx) => {
		htmlTable += `<tr><td class="text-center">${idx + 1}</td><td class="text-center">${siswa.nis}</td><td>${siswa.nama}</td>`;
		let riwayatSiswa = riwayatThnIni.filter(p => String(p.nis).trim() === String(siswa.nis).trim());
		let totalTunggakSiswa = 0;

		headerTagihan.forEach(tagihan => {
			let tarifItem = applicableTarifs.find(t => t.jenis === tagihan && (t.target === `NIS ${siswa.nis}` || t.target === kls || t.target === 'SEMUA KELAS'));
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
		if (totalTunggakSiswa === 0) htmlTable += `<td class="bg-lunas">LUNAS</td></tr>`;
		else htmlTable += `<td class="text-tunggak">${formatRp(totalTunggakSiswa)}</td></tr>`;
	});
	htmlTable += `</tbody></table>`;
	document.getElementById('cap-table-container').innerHTML = htmlTable;
}

function downloadLaporanImage() {
	showToast('Memproses Gambar...', 'info');
	const targetDiv = document.getElementById("capture-area");
	if (typeof html2canvas === 'undefined') {
		showToast('Koneksi internet bermasalah.', 'error');
		return;
	}
	html2canvas(targetDiv, {
		scale: 2
	}).then(canvas => {
		const link = document.createElement("a");
		document.body.appendChild(link);
		link.download = `Rekap_${document.getElementById('cetak-kelas').value}.png`;
		link.href = canvas.toDataURL("image/png");
		link.target = '_blank';
		link.click();
		link.remove();
		showToast('Gambar WA siap!');
	}).catch(err => {
		showToast('Gagal memproses.', 'error');
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

function renderCharts(filterTahun = 'All') {
	const statsPerKelas = {};
	let lCount = 0;
	let pCount = 0;
	dbSiswa.forEach(s => {
		if (s.kelas) {
			if (!statsPerKelas[s.kelas]) statsPerKelas[s.kelas] = {
				L: 0,
				P: 0,
				Total: 0
			};
			if (s.lp === 'L') statsPerKelas[s.kelas].L++;
			if (s.lp === 'P') statsPerKelas[s.kelas].P++;
			statsPerKelas[s.kelas].Total++;
		}
		if (s.lp === 'L') lCount++;
		if (s.lp === 'P') pCount++;
	});
	const labelsKelas = Object.keys(statsPerKelas).sort();
	const ctxKelas = document.getElementById('chart-kelas');
	if (chartKelasInstance) chartKelasInstance.destroy();

	// Warna Soft Pastel untuk Bar Chart
	chartKelasInstance = new Chart(ctxKelas, {
		type: 'bar',
		data: {
			labels: labelsKelas,
			datasets: [{
				label: 'Laki-Laki',
				data: labelsKelas.map(k => statsPerKelas[k].L),
				backgroundColor: '#93c5fd',
				borderRadius: 4
			}, {
				label: 'Perempuan',
				data: labelsKelas.map(k => statsPerKelas[k].P),
				backgroundColor: '#fbcfe8',
				borderRadius: 4
			}, {
				label: 'Total',
				data: labelsKelas.map(k => statsPerKelas[k].Total),
				backgroundColor: '#fde047',
				borderRadius: 4
			}]
		},
		plugins: [ChartDataLabels],
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: {
					position: 'top',
					labels: {
						usePointStyle: true,
						boxWidth: 8
					}
				},
				datalabels: {
					color: '#000',
					anchor: 'center',   // posisi tengah batang
					align: 'center',
					font: {
						weight: 'bold',
						size: 12
					},
					formatter: function(value) {
						return value; // tampilkan angka
					}
				}
			},
			scales: {
				y: {
					beginAtZero: true,
					ticks: {
						stepSize: 1
					},
					title: {
						display: true,
						text: 'Jumlah'
					}
				}
			}
		}
	});

	// Warna Soft Pastel untuk Doughnut Chart
	const ctxGender = document.getElementById('chart-gender');
	if (chartGenderInstance) chartGenderInstance.destroy();
	chartGenderInstance = new Chart(ctxGender, {
		type: 'doughnut',
		data: {
			labels: ['Laki-laki (L)', 'Perempuan (P)'],
			datasets: [{
				data: [lCount, pCount],
				backgroundColor: ['#93c5fd', '#fbcfe8'],
				hoverOffset: 4,
				borderWidth: 0
			}]
		},
		plugins: [ChartDataLabels],
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: {
					position: 'bottom'
				}
			},
			datalabels: {
				color: '#000',
				font: {
					weight: 'bold',
					size: 14
				},
				formatter: function(value, context) {
					return value; // tampilkan angka
				}
			},
			cutout: '65%'
		}
	});

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
function renderSiswaView(siswa) {
	document.getElementById('view-login').classList.add('hidden');
	document.getElementById('view-siswa').classList.remove('hidden');
	document.getElementById('siswa-nama').innerText = siswa.nama;
	document.getElementById('siswa-nis-kelas').innerText = `NIS: ${siswa.nis} | Kelas: ${siswa.kelas} | L/P: ${siswa.lp}`;
	const boxKekurangan = document.getElementById('box-kekurangan');
	const titleKekurangan = document.getElementById('title-kekurangan');
	const valKekurangan = document.getElementById('siswa-total-kekurangan');
	if (siswa.totalKekurangan === 'LUNAS' || siswa.totalKekurangan === 0 || !siswa.totalKekurangan) {
		boxKekurangan.className = "bg-emerald-50 border border-emerald-100 rounded-lg p-4 text-center min-w-[200px] w-full";
		titleKekurangan.className = "text-sm text-emerald-600 font-medium mb-1";
		titleKekurangan.innerText = "Status Pembayaran";
		valKekurangan.className = "text-2xl font-bold text-emerald-700";
		valKekurangan.innerText = "LUNAS";
	} else {
		boxKekurangan.className = "bg-red-50 border border-red-100 rounded-lg p-4 text-center min-w-[200px] w-full";
		titleKekurangan.className = "text-sm text-red-600 font-medium mb-1";
		titleKekurangan.innerText = "Total Kekurangan";
		valKekurangan.className = "text-2xl font-bold text-red-700";
		let nom = typeof siswa.totalKekurangan === 'string' ? parseInt(siswa.totalKekurangan.replace(/\D/g, '')) : siswa.totalKekurangan;
		valKekurangan.innerText = formatRp(nom);
	}
	const arrBulan = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
	const tbodyBulan = document.getElementById('table-rekap-bulanan');
	tbodyBulan.innerHTML = '';
	const formatCell = (val) => {
		if (val === 'LUNAS' || val === 'Lunas' || val === 0 || val === '0' || val === '-' || !val || String(val).trim() === "") {
			return `<span class="px-3 py-1 text-xs rounded-full font-bold bg-emerald-100 text-emerald-700 tracking-wide"><i class="ph ph-check mr-1"></i> LUNAS</span>`;
		} else {
			let nominal = typeof val === 'string' ? parseInt(val.replace(/\D/g, '')) : val;
			return `<span class="px-3 py-1 text-xs rounded-full font-bold bg-red-100 text-red-700">${formatRp(nominal)}</span>`;
		}
	};
	arrBulan.forEach((bulan, index) => {
		let cellData = siswa.rekapJuliJuni[index];
		tbodyBulan.innerHTML += `<tr class="hover:bg-gray-50"><td class="p-4 font-medium text-gray-700">${bulan}</td><td class="p-4 text-center">${formatCell(cellData)}</td></tr>`;
	});
	const tagihan = [{
		judul: 'Daftar Ulang',
		nominal: siswa.daftarUlang
	}, {
		judul: 'Tagihan PTS 1',
		nominal: siswa.tagihanPTS1
	}, {
		judul: 'Tagihan PAS 1',
		nominal: siswa.tagihanPAS1
	}, {
		judul: 'Tagihan PTS 2',
		nominal: siswa.tagihanPTS2
	}, {
		judul: 'Tagihan PAS 2',
		nominal: siswa.tagihanPAS2
	}];
	const tbodyTagihan = document.getElementById('table-rekap-tagihan');
	tbodyTagihan.innerHTML = '';
	tagihan.forEach(t => {
		tbodyTagihan.innerHTML += `<tr class="hover:bg-gray-50"><td class="p-4 font-bold text-gray-700">${t.judul}</td><td class="p-4 font-medium text-right">${formatCell(t.nominal)}</td></tr>`;
	});
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

function refreshDataSiswa() {
	const rawText = document.getElementById('siswa-nis-kelas').innerText;
	const nis = rawText.split('|')[0].replace('NIS:', '').trim();
	if (!nis || nis === '-') return;
	showLoading("Memperbarui data Anda...");
	document.getElementById('btn-refresh-siswa').querySelector('i').classList.add('animate-spin');
	if (useServer) {
		fetchAPI('loginSiswa', {
			nis: nis
		}).then(res => {
			hideLoading();
			if (res.success) {
				renderSiswaView(res.data);
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
				renderSiswaView(siswa);
				showToast('Data diperbarui (Preview)!', 'success');
				startStudentRefreshCooldown();
			} else {
				showToast('NIS tidak ditemukan!', 'error');
				document.getElementById('btn-refresh-siswa').querySelector('i').classList.remove('animate-spin');
			}
		}, 500);
	}
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