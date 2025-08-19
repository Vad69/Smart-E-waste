import QRCode from 'qrcode';

export async function generateQrSvg(value, size = 256) {
	return QRCode.toString(value, { type: 'svg', margin: 1, width: size });
}

export async function generateQrPngBuffer(value, size = 600) {
	return QRCode.toBuffer(value, { type: 'png', margin: 1, width: size });
}