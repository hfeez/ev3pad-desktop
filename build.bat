@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js belum terpasang. Unduh di https://nodejs.org lalu jalankan ulang. & pause & exit /b 1)
echo [1/3] Memasang dependensi...
call npm install || (echo Gagal npm install & pause & exit /b 1)
echo [2/3] Menguji logika...
call npm run test:logic || (echo Tes gagal & pause & exit /b 1)
echo [3/3] Membuat EXE portable...
call npm run build || (echo Build gagal & pause & exit /b 1)
echo.
echo Selesai. File portable ada di folder "dist".
explorer dist
pause
