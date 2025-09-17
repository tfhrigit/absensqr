const QRCode = require('qrcode');

async function generateQRCode(data) {
  try {
    const qrDataUrl = await QRCode.toDataURL(data);
    return qrDataUrl;
  } catch (error) {
    throw new Error('Gagal membuat QR Code');
  }
}

module.exports = { generateQRCode };