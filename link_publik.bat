@echo off
title Link Publik HTTPS - Roster Generator
echo ================================================================
echo   MEMBUAT LINK PUBLIK HTTPS (ROSTER GENERATOR)
echo ================================================================
echo.
echo Sedang menghubungkan terowongan HTTPS yang aman...
echo Link HTTPS dan QR Code akan muncul di bawah ini dalam beberapa detik.
echo.
echo [PENTING]
echo 1. Pastikan aplikasi run.bat sudah aktif berjalan.
echo 2. Jika HP terhubung ke Wi-Fi kantor dan link tidak terbuka,
echo    gunakan Paket Data (Kuota 4G/5G) di HP Anda karena firewall kantor
echo    memblokir domain publik sementara.
echo ================================================================
echo.

ssh -o StrictHostKeyChecking=no -R 80:localhost:8000 nokey@localhost.run

pause
