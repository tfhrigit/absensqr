const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { generateQRCode } = require('../utils/qrGenerator');

const router = express.Router();
const dataFile = path.join(__dirname, '../data/absensi.json');

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

let studentQRs = {};

async function initDataFile() {
  try {
    await fs.access(dataFile);
  } catch {
    const initialData = siswaList.map(nama => ({
      nama,
      waktu: null,
      status: "absen"
    }));
    await fs.writeFile(dataFile, JSON.stringify(initialData, null, 2));
  }
}

initDataFile();

function generateStudentQRs() {
  const now = Date.now();
  siswaList.forEach(nama => {
    if (!studentQRs[nama] || now - studentQRs[nama].timestamp > 299000) {
      const code = `${nama}-${Math.random().toString(36).substring(2, 10)}`;
      studentQRs[nama] = {
        code: code,
        timestamp: now
      };
    }
  });
}

setInterval(generateStudentQRs, 60000);
generateStudentQRs();

router.get('/student-qr/:nama', async (req, res) => {
  const { nama } = req.params;
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  
  if (hour < 6 || (hour === 7 && minute > 15) || hour > 7) {
    return res.status(400).json({ error: "Absensi hanya tersedia antara 06.00-07.15" });
  }

  if (!siswaList.includes(nama)) {
    return res.status(400).json({ error: "Siswa tidak ditemukan" });
  }

  generateStudentQRs();
  
  if (!studentQRs[nama]) {
    return res.status(400).json({ error: "QR Code tidak tersedia" });
  }

  try {
    const qrData = await generateQRCode(studentQRs[nama].code);
    res.json({ qrData: qrData, code: studentQRs[nama].code });
  } catch (error) {
    res.status(500).json({ error: "Gagal membuat QR Code" });
  }
});

router.post('/absen', async (req, res) => {
  const { nama, code } = req.body;
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  
  if (hour < 6 || (hour === 7 && minute > 15) || hour > 7) {
    return res.status(400).json({ error: "Waktu absen telah berakhir" });
  }

  if (!siswaList.includes(nama)) {
    return res.status(400).json({ error: "Nama tidak valid" });
  }

  generateStudentQRs();

  if (!studentQRs[nama] || studentQRs[nama].code !== code) {
    return res.status(400).json({ error: "QR Code tidak valid" });
  }

  try {
    const data = JSON.parse(await fs.readFile(dataFile, 'utf8'));
    const siswaIndex = data.findIndex(s => s.nama === nama);
    
    if (siswaIndex === -1) {
      return res.status(400).json({ error: "Siswa tidak ditemukan" });
    }

    if (data[siswaIndex].status === "hadir") {
      return res.status(400).json({ error: "Sudah absen" });
    }

    data[siswaIndex].waktu = now.toLocaleTimeString('id-ID');
    data[siswaIndex].status = "hadir";
    
    await fs.writeFile(dataFile, JSON.stringify(data, null, 2));
    res.json({ success: true, message: "Absen berhasil" });
  } catch (error) {
    res.status(500).json({ error: "Gagal menyimpan data" });
  }
});

router.get('/rekap', async (req, res) => {
  try {
    const data = JSON.parse(await fs.readFile(dataFile, 'utf8'));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Gagal membaca data" });
  }
});

module.exports = router;