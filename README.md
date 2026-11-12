# EV3 Direct Control (Desktop, Portable)

Versi desktop dari aplikasi Android **EV3 Direct Control**. Tampilan, tema gelap/terang, gambar controller
(DualShock 4, Xbox, Joy-Con), controller virtual (tombol/slider/analog), syarat sensor, profil, dan bahasa
Indonesia/English sama dengan versi Android. Hasil build berupa **satu file `.exe` portable**: tanpa instalasi.
Profil dan setelan disimpan di folder `EV3-Direct-Control-Data` di samping file `.exe`, jadi bisa dibawa lewat flashdisk.

## Membuat EXE portable

Pilih salah satu:

1. **Windows**: pasang Node.js 20+ (https://nodejs.org), lalu klik dua kali `build.bat`.
   Hasil: `dist\EV3-Direct-Control-Portable-1.0.0.exe`.
2. **GitHub Actions** (tanpa perlu pasang apa pun): unggah folder ini ke GitHub, jalankan workflow
   **Build Portable EXE**, unduh artifact `EV3-Direct-Control-Portable`.
3. **Manual**: `npm install` lalu `npm run build`.

Perintah lain: `npm start` (jalankan tanpa build, atau `run.bat`), `npm run build:dir` (folder portable tanpa
pembungkus .exe), `npm run test:logic` (tes protokol dan logika kontrol).

## Cara pakai

1. **Pasangkan EV3** lewat Pengaturan Bluetooth Windows (PIN `1234`). Windows otomatis membuat port serial (COMx).
2. Colok/pasangkan controller (PS4, Xbox, dll.) lewat USB atau Bluetooth.
3. Buka aplikasi, klik **Hubungkan EV3**, pilih EV3 dari daftar.
4. Tab **Controller**: klik tombol di gambar untuk mengatur motor dan syarat sensor. **Uji input** mencoba
   lewat klik/seret mouse. Tab **Virtual**: mode **Edit** untuk menambah, memindah, mengubah ukuran; mode
   **Kontrol** untuk memakainya. **Layar penuh** juga bisa dengan `F11`; `Esc` keluar.
5. **Profil** menyimpan, memuat, mengganti nama, dan menghapus setelan (terpisah untuk Controller dan Virtual).

## Perbedaan dengan versi Android (karena platformnya)

| Android | Desktop |
|---|---|
| Bluetooth RFCOMM langsung | Port serial Bluetooth (COMx / `/dev/rfcomm*`), protokol EV3 sama persis |
| Input lewat `InputDevice` | Gamepad API Chromium (pemetaan tombol sama) |
| Baterai controller (Android 12+) | Tidak tersedia di desktop, indikatornya disembunyikan |
| Sentuh multi-jari | Mouse/layar sentuh; tiap elemen tetap punya gestur sendiri |

Perilaku lain dipertahankan, termasuk: Uji input dan konfigurasi tombol hanya aktif saat ada controller terhubung.

## Pemecahan masalah

- **Daftar EV3 kosong**: pastikan EV3 sudah dipasangkan dan Bluetooth EV3 menyala. Di Windows, port keluar
  (outgoing COM) muncul setelah pairing. Jika perlu, hapus lalu pasangkan ulang EV3.
- **Gagal terhubung**: nyalakan EV3 lebih dulu, tutup aplikasi lain yang memakai COM yang sama, coba lagi.
- **Controller tidak terdeteksi**: tekan satu tombol dulu (browser baru melaporkan gamepad setelah ada input).
  Controller PS4 non-Steam kadang perlu dikenali lewat USB.
- Linux: `sudo rfcomm bind 0 <alamat-EV3>` lalu pilih `/dev/rfcomm0`. macOS: port `/dev/cu.EV3-*`.
