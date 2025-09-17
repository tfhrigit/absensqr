let html5QrCode = null;
let isScanning = false;
let qrInterval = null;
let countdown = 300;
let selectedStudent = '';

const siswaList = [
  "Aditya Alfa", "Akbar Monazila Falqi", "Ahmad Rio Setiawan", 
  "Alfarikaz Setiawan", "Anisah Sukma Wati", "Azidan Zulfa", 
  "Diva Anggraeni", "Erlangga Wijaya", "Fahmi Ardi", 
  "Fajar Galuh Pratama", "Fikri Lupja", "Ganang Prayoga", 
  "M. Haikal Bayu", "Ilma Nafian", "M. Aji Ferdiyansyah", 
  "Merlina Anggi", "Mohammad Agil Faturrozi", "Mohammad Agung Ramadan", 
  "Mohammad Khairul", "Mohammad Khaerudin Anwar", "Naylatul Nadiah", 
  "Nazwa Eka Destian", "Okta Antoni Rahmadani", "Rafi Fizar", 
  "Reno Pandu Wiranata", "Sultan Agam", "Tedi Fahri", 
  "Tegar Adnan", "Trio Kurniawan", "Vinza Aditya", 
  "Wedo Saputra", "Wira Abdi Mulya"
];

document.addEventListener('DOMContentLoaded', function() {
    loadRekapData();
    populateStudentSelect();
    updateTimeDisplay();
    setInterval(updateTimeDisplay, 1000);
    setInterval(updateCountdown, 1000);
});

function populateStudentSelect() {
    const select = document.getElementById('student-select');
    siswaList.forEach(nama => {
        const option = document.createElement('option');
        option.value = nama;
        option.textContent = nama;
        select.appendChild(option);
    });
    
    select.addEventListener('change', function() {
        selectedStudent = this.value;
        if (selectedStudent) {
            loadStudentQR(selectedStudent);
            startQRCountdown();
        } else {
            document.getElementById('qr-code-img').textContent = 'Pilih nama siswa untuk melihat QR Code';
            document.getElementById('qr-timer').textContent = '';
        }
    });
}

async function loadStudentQR(nama) {
    try {
        const response = await fetch(`/api/student-qr/${encodeURIComponent(nama)}`);
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('qr-code-img').innerHTML = `<img src="${data.qrData}" style="max-width: 200px;">`;
            countdown = 300;
        } else {
            document.getElementById('qr-code-img').textContent = data.error || 'QR Code tidak tersedia';
        }
    } catch (error) {
        document.getElementById('qr-code-img').textContent = 'Gagal memuat QR Code';
    }
}

function startQRCountdown() {
    if (qrInterval) {
        clearInterval(qrInterval);
    }
    
    qrInterval = setInterval(() => {
        updateCountdown();
    }, 1000);
}

function updateCountdown() {
    countdown--;
    const minutes = Math.floor(countdown / 60);
    const seconds = countdown % 60;
    document.getElementById('qr-timer').textContent = 
        `QR Code akan diperbarui dalam: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    if (countdown <= 0) {
        if (selectedStudent) {
            loadStudentQR(selectedStudent);
        }
        countdown = 300;
    }
}

function updateTimeDisplay() {
    const now = new Date();
    document.getElementById('current-time').textContent = 
        `Waktu Sekarang: ${now.toLocaleTimeString('id-ID')}`;
}

async function loadRekapData() {
    try {
        const response = await fetch('/api/rekap');
        const data = await response.json();
        const tbody = document.getElementById('rekapBody');
        tbody.innerHTML = '';
        
        data.forEach(siswa => {
            const row = tbody.insertRow();
            row.insertCell(0).textContent = siswa.nama;
            
            const statusCell = row.insertCell(1);
            statusCell.textContent = siswa.status;
            statusCell.className = siswa.status === 'hadir' ? 'status-hadir' : 'status-absen';
            
            const timeCell = row.insertCell(2);
            timeCell.textContent = siswa.waktu || '-';
            timeCell.className = 'time-info';
        });
    } catch (error) {
        console.error('Gagal memuat data rekap:', error);
    }
}

document.getElementById('startScan').addEventListener('click', function() {
    if (isScanning) {
        stopScan();
    } else {
        startScan();
    }
});

function startScan() {
    if (html5QrCode) {
        stopScan();
    }
    
    html5QrCode = new Html5Qrcode("qr-reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, onScanFailure)
        .then(() => {
            isScanning = true;
            document.getElementById('startScan').innerHTML = '<i class="fas fa-stop"></i> Hentikan Scan';
        })
        .catch(err => {
            showResult('error', 'Gagal mengakses kamera: ' + err);
        });
}

function stopScan() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            html5QrCode.clear();
            html5QrCode = null;
            isScanning = false;
            document.getElementById('startScan').innerHTML = '<i class="fas fa-camera"></i> Scan QR untuk Absen';
        }).catch(err => {
            console.error('Gagal menghentikan scan:', err);
        });
    }
}

async function onScanSuccess(decodedText) {
    stopScan();
    
    try {
        const nama = prompt("Konfirmasi nama Anda:");
        if (nama) {
            const absenResponse = await fetch('/api/absen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nama: nama, code: decodedText })
            });
            
            const result = await absenResponse.json();
            if (absenResponse.ok) {
                showResult('success', 'Absen berhasil!');
                loadRekapData();
            } else {
                showResult('error', result.error || 'Gagal absen');
            }
        }
    } catch (error) {
        showResult('error', 'Gagal memproses absen');
    }
}

function onScanFailure(error) {
}

function showResult(type, message) {
    const resultDiv = document.getElementById('qr-result');
    resultDiv.textContent = message;
    resultDiv.className = type;
    resultDiv.style.display = 'block';
    
    setTimeout(() => {
        resultDiv.style.display = 'none';
    }, 5000);
}