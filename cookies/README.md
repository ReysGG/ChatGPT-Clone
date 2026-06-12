# Google Cookies untuk Image Generation

Fitur **Create Image** membutuhkan cookies dari akun Google yang sudah login ke [Google Flow](https://labs.google/fx/tools/flow).

## Cara Export Cookies

### Metode 1: Extension "Cookie-Editor" (Recommended)

1. Install extension **Cookie-Editor** dari Chrome Web Store
2. Buka browser dan login ke https://labs.google/fx/tools/flow
3. Pastikan Anda bisa menggunakan Flow secara manual
4. Klik icon Cookie-Editor di toolbar
5. Klik **"Export"** → pilih format **"JSON"**
6. Simpan hasilnya ke file `google-cookies.json` di folder ini

### Metode 2: Extension "EditThisCookie"

1. Install **EditThisCookie** dari Chrome Web Store
2. Login ke Google Flow seperti di atas
3. Klik icon EditThisCookie
4. Klik tombol **Export** (icon clipboard)
5. Paste hasilnya ke file `google-cookies.json`

### Metode 3: Chrome DevTools

1. Buka https://labs.google/fx/tools/flow (sudah login)
2. Tekan F12 → Tab **Application** → **Cookies**
3. Salin semua cookies untuk domain `.google.com` dan `labs.google`
4. Format sebagai JSON array (lihat contoh format di bawah)

## Format File

File `google-cookies.json` harus berformat JSON array seperti ini:

```json
[
  {
    "name": "cookie_name",
    "value": "cookie_value",
    "domain": ".google.com",
    "path": "/",
    "httpOnly": true,
    "secure": true,
    "sameSite": "None"
  }
]
```

## ⚠️ Penting

- **JANGAN commit file cookies ke Git** — sudah otomatis di-gitignore
- Cookies bisa **expired** — jika image generation gagal, coba export ulang
- Gunakan hanya untuk **keperluan pribadi**
