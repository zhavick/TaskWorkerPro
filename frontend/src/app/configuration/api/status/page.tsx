"use client";

import Script from "next/script";
import React from "react";

export default function ConfigurationApiStatusPage() {
  const initialApiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "";

  return (
    <div
      id="status-container"
      data-api-base={initialApiBase}
      className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-8 font-sans antialiased overflow-y-auto"
    >
      {/* Load jQuery locally */}
      <Script src="/jquery.min.js" strategy="beforeInteractive" />

      {/* Basic HTML Container */}
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-slate-700 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                TrackerKerja &mdash; Status Sistem &amp; Seeding Admin
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Halaman Administrator Tersembunyi: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-400">/configuration/api/status</code>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="btn-refresh"
              type="button"
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition"
            >
              🔄 Refresh Status
            </button>
            <a
              href="/login"
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition"
            >
              Halaman Login &rarr;
            </a>
          </div>
        </div>

        {/* Global Alert Banner */}
        <div id="banner-status" className="p-4 rounded-xl border border-slate-700 bg-slate-800/80 text-xs">
          <span className="text-slate-400">Sedang memeriksa status koneksi layanan...</span>
        </div>

        {/* 3 Main Connection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Frontend */}
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-700/50">
              <span className="text-xs font-bold text-slate-300">1. FRONTEND</span>
              <span id="badge-frontend" className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                Online
              </span>
            </div>
            <div className="mt-3 space-y-1.5 text-xs text-slate-300">
              <p><span className="text-slate-500">Framework:</span> Next.js 16 (App Router)</p>
              <p><span className="text-slate-500">Origin:</span> <span id="val-frontend-origin" className="font-mono text-[11px]">Memuat...</span></p>
              <p><span className="text-slate-500">Status:</span> Siap merender antarmuka</p>
            </div>
          </div>

          {/* 2. Backend */}
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-700/50">
              <span className="text-xs font-bold text-slate-300">2. BACKEND API</span>
              <span id="badge-backend" className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-950 text-amber-400 border border-amber-800">
                Memeriksa...
              </span>
            </div>
            <div className="mt-3 space-y-1.5 text-xs text-slate-300">
              <p><span className="text-slate-500">Framework:</span> <span id="val-backend-framework">-</span></p>
              <p><span className="text-slate-500">Endpoint:</span> <span id="val-backend-url" className="font-mono text-[11px] text-indigo-400">/api/configuration/status</span></p>
              <p><span className="text-slate-500">Latency:</span> <span id="val-backend-latency">-</span></p>
            </div>
          </div>

          {/* 3. Database */}
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-700/50">
              <span className="text-xs font-bold text-slate-300">3. DATABASE</span>
              <span id="badge-database" className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-950 text-amber-400 border border-amber-800">
                Memeriksa...
              </span>
            </div>
            <div className="mt-3 space-y-1.5 text-xs text-slate-300">
              <p><span className="text-slate-500">Engine:</span> PostgreSQL (trackerkerja_db)</p>
              <p><span className="text-slate-500">Latency DB:</span> <span id="val-db-latency">-</span></p>
              <p><span className="text-slate-500">Entitas:</span> <span id="val-db-metrics">-</span></p>
            </div>
          </div>
        </div>

        {/* Admin Account & Seeding Details */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-700/60 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                👤 Status Akun Administrator &amp; Master Data
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Kredensial target admin default untuk login sistem TrackerKerja.
              </p>
            </div>
            <span id="badge-admin-status" className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-900 text-slate-400 border border-slate-700">
              Memeriksa akun...
            </span>
          </div>

          {/* Table Details */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-700/80 text-slate-400 font-semibold">
                  <th className="py-2 pr-4">Parameter</th>
                  <th className="py-2 px-4">Nilai Konfigurasi</th>
                  <th className="py-2 pl-4">Keterangan / Verifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40 text-slate-300 font-mono text-[12px]">
                <tr>
                  <td className="py-2.5 pr-4 text-slate-400 font-sans">Email Admin</td>
                  <td className="py-2.5 px-4 font-bold text-indigo-400">admin@trackerkerja.com</td>
                  <td id="info-admin-email" className="py-2.5 pl-4 font-sans text-slate-400">Memeriksa...</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-slate-400 font-sans">Kata Sandi Default</td>
                  <td className="py-2.5 px-4 font-bold text-amber-400">AdminSecure@2026!!</td>
                  <td id="info-admin-password" className="py-2.5 pl-4 font-sans text-slate-400">Memeriksa hash...</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-slate-400 font-sans">Role Akses</td>
                  <td className="py-2.5 px-4 text-emerald-400">Administrator</td>
                  <td id="info-admin-role" className="py-2.5 pl-4 font-sans text-slate-400">Memeriksa role...</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-slate-400 font-sans">Status Approval</td>
                  <td id="info-admin-approved-val" className="py-2.5 px-4 font-bold text-slate-300">-</td>
                  <td id="info-admin-approved" className="py-2.5 pl-4 font-sans text-slate-400">-</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-slate-400 font-sans">Seeding Master Data</td>
                  <td id="info-seeding-count" className="py-2.5 px-4 font-bold text-slate-300">-</td>
                  <td id="info-seeding-status" className="py-2.5 pl-4 font-sans text-slate-400">-</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              id="btn-seed"
              type="button"
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition shadow-sm flex items-center gap-2"
            >
              🌱 Jalankan Seeding Data Awal &amp; Buat Akun Admin
            </button>

            <button
              id="btn-test-login"
              type="button"
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition shadow-sm flex items-center gap-2"
            >
              🔑 Test Status Login Admin (admin@trackerkerja.com)
            </button>
          </div>
        </div>

        {/* Output Log / Terminal Box (jQuery Dynamic Output) */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-inner space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
            <span className="font-semibold text-slate-300">Terminal Log &amp; Output Informasi (jQuery AJAX)</span>
            <button
              id="btn-clear-log"
              type="button"
              className="text-[11px] text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              Bersihkan Log
            </button>
          </div>
          <pre
            id="log-output"
            className="text-[11px] font-mono text-emerald-400 whitespace-pre-wrap max-h-64 overflow-y-auto leading-relaxed"
          >
            Memulai inisialisasi diagnostik halaman...
          </pre>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-500 pt-2">
          TrackerKerja Pro &bull; Halaman Utilitas &amp; Diagnostik Administrator &bull; Link: /configuration/api/status
        </div>
      </div>

      {/* jQuery Script Logic */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              function initDiagnostics() {
                if (typeof window.$ === 'undefined') {
                  setTimeout(initDiagnostics, 50);
                  return;
                }

                var $ = window.$;
                var envApi = $('#status-container').attr('data-api-base');
                var API_BASE = envApi && envApi.length > 0
                  ? envApi
                  : (window.location.port === '3000'
                      ? window.location.protocol + '//' + window.location.hostname + ':5008/api'
                      : '/api');

                $('#val-frontend-origin').text(window.location.origin);

                function appendLog(msg, type) {
                  var time = new Date().toLocaleTimeString('id-ID');
                  var prefix = '[' + time + '] ';
                  var color = type === 'error' ? 'text-red-400' : (type === 'warn' ? 'text-amber-400' : 'text-emerald-400');
                  var $line = $('<div>').addClass(color).text(prefix + msg);
                  $('#log-output').append($line);
                  var elem = document.getElementById('log-output');
                  if (elem) elem.scrollTop = elem.scrollHeight;
                }

                function checkStatus(callback) {
                  appendLog('Memeriksa status backend & database ke: ' + API_BASE + '/configuration/status ...');
                  var start = performance.now();

                  $.ajax({
                    url: API_BASE + '/configuration/status',
                    method: 'GET',
                    timeout: 8000,
                    success: function(res) {
                      var elapsed = Math.round(performance.now() - start);
                      $('#val-backend-latency').text(elapsed + ' ms');
                      $('#val-backend-framework').text(res.services.backend.framework + ' (' + res.services.backend.environment + ')');

                      // Badge Backend
                      $('#badge-backend')
                        .removeClass('bg-amber-950 text-amber-400 border-amber-800 bg-red-950 text-red-400 border-red-800')
                        .addClass('bg-emerald-950 text-emerald-400 border-emerald-800')
                        .text('Terkoneksi');

                      // Database
                      var db = res.services.database;
                      if (db.isHealthy) {
                        $('#badge-database')
                          .removeClass('bg-amber-950 text-amber-400 border-amber-800 bg-red-950 text-red-400 border-red-800')
                          .addClass('bg-emerald-950 text-emerald-400 border-emerald-800')
                          .text('Terkoneksi');
                        $('#val-db-latency').text(db.latencyMs + ' ms');
                        $('#val-db-metrics').text(
                          db.metrics.users + ' Users, ' +
                          db.metrics.companies + ' Perusahaan, ' +
                          db.metrics.tasks + ' Tasks, ' +
                          db.metrics.badges + ' Badges'
                        );
                      } else {
                        $('#badge-database')
                          .removeClass('bg-emerald-950 text-emerald-400 border-emerald-800 bg-amber-950 text-amber-400 border-amber-800')
                          .addClass('bg-red-950 text-red-400 border-red-800')
                          .text('Terputus');
                        $('#val-db-latency').text('-');
                        $('#val-db-metrics').text('Error: ' + (db.error || 'Gagal terhubung'));
                      }

                      // Admin status
                      var admin = res.admin;
                      if (admin.exists) {
                        $('#info-admin-email').html('<span class="text-emerald-400">✓ Ditemukan dalam database</span>');
                        $('#info-admin-role').html(admin.hasRole ? '<span class="text-emerald-400">✓ Administrator</span>' : '<span class="text-amber-400">Perlu Role Admin</span>');
                        $('#info-admin-password').html(admin.passwordValid ? '<span class="text-emerald-400">✓ Hash Password Sesuai</span>' : '<span class="text-amber-400">Perlu Diperbarui</span>');
                        $('#info-admin-approved-val').text(admin.isApproved ? 'Disetujui (Approved)' : 'Pending');
                        $('#info-admin-approved').html(admin.isApproved ? '<span class="text-emerald-400">✓ Siap Login</span>' : '<span class="text-amber-400">Perlu Approval</span>');
                        
                        $('#badge-admin-status')
                          .removeClass('bg-slate-900 text-slate-400 bg-amber-950 text-amber-400 border-amber-800 bg-red-950 text-red-400 border-red-800')
                          .addClass('bg-emerald-950 text-emerald-400 border-emerald-800')
                          .text('User Admin Tersedia');
                      } else {
                        $('#info-admin-email').html('<span class="text-red-400">✗ Belum Dibuat</span>');
                        $('#info-admin-role').text('-');
                        $('#info-admin-password').text('-');
                        $('#info-admin-approved-val').text('-');
                        $('#info-admin-approved').text('-');

                        $('#badge-admin-status')
                          .removeClass('bg-slate-900 text-slate-400 bg-emerald-950 text-emerald-400 border-emerald-800')
                          .addClass('bg-amber-950 text-amber-400 border-amber-800')
                          .text('Belum Dibuat');
                      }

                      // Seeding Status
                      var seeding = res.seeding;
                      $('#info-seeding-count').text(res.services.database.metrics.badges + ' Badges, ' + res.services.database.metrics.companies + ' Perusahaan');
                      $('#info-seeding-status').text(seeding.statusText);

                      // Banner Status & Evaluasi Keseluruhan
                      if (res.services.backend.isHealthy && db.isHealthy && admin.canLogin && seeding.isSeeded) {
                        $('#banner-status')
                          .removeClass('border-slate-700 bg-slate-800/80 border-amber-700 bg-amber-950/40 border-red-700 bg-red-950/40')
                          .addClass('border-emerald-600/80 bg-emerald-950/40 text-emerald-200')
                          .html('<strong>✅ Semua Layanan Berjalan Normal</strong> &mdash; Frontend, Backend, dan Database terkoneksi. Akun admin <code>admin@trackerkerja.com</code> telah terverifikasi dan siap digunakan untuk masuk ke sistem.');
                        
                        $('#btn-seed')
                          .removeClass('bg-emerald-600 hover:bg-emerald-500')
                          .addClass('bg-slate-700 hover:bg-slate-600 text-slate-300')
                          .html('✓ Seeding Data Sudah Ada (Jalankan Ulang)');
                      } else {
                        $('#banner-status')
                          .removeClass('border-slate-700 bg-slate-800/80 border-emerald-600/80 bg-emerald-950/40')
                          .addClass('border-amber-600/80 bg-amber-950/40 text-amber-200')
                          .html('<strong>⚠️ Perhatian:</strong> Seeding data awal atau akun admin <code>admin@trackerkerja.com</code> belum lengkap. Klik tombol hijau di bawah untuk menginisialisasi secara otomatis.');
                      }

                      appendLog('Hasil status: Backend ' + res.services.backend.status + ', Database ' + db.status + ', Admin User: ' + (admin.exists ? 'Ada' : 'Belum Ada'));
                      if (typeof callback === 'function') callback(res);
                    },
                    error: function(xhr, status, err) {
                      $('#badge-backend')
                        .removeClass('bg-emerald-950 text-emerald-400 border-emerald-800 bg-amber-950 text-amber-400 border-amber-800')
                        .addClass('bg-red-950 text-red-400 border-red-800')
                        .text('Terputus');
                      $('#badge-database')
                        .removeClass('bg-emerald-950 text-emerald-400 border-emerald-800 bg-amber-950 text-amber-400 border-amber-800')
                        .addClass('bg-red-950 text-red-400 border-red-800')
                        .text('Tidak Terjangkau');
                      $('#banner-status')
                        .removeClass('border-emerald-600/80 bg-emerald-950/40 border-slate-700 bg-slate-800/80')
                        .addClass('border-red-600/80 bg-red-950/40 text-red-200')
                        .html('<strong>❌ Gagal Terhubung ke Backend API:</strong> Pastikan backend aktif pada port 5008 atau periksa konfigurasi jaringan Docker/CORS.');
                      appendLog('Error koneksi backend: ' + (xhr.statusText || err || 'Network Error'), 'error');
                    }
                  });
                }

                // Event Listeners
                $('#btn-refresh').on('click', function() {
                  checkStatus();
                });

                $('#btn-clear-log').on('click', function() {
                  $('#log-output').empty();
                  appendLog('Log telah dibersihkan.');
                });

                // Tombol Seeding
                $('#btn-seed').on('click', function() {
                  var $btn = $(this);
                  $btn.prop('disabled', true).text('⏳ Sedang Menjalankan Seeding Data...');
                  appendLog('Mengirim request seeding data awal ke ' + API_BASE + '/configuration/status/seed ...');

                  $.ajax({
                    url: API_BASE + '/configuration/status/seed',
                    method: 'POST',
                    contentType: 'application/json',
                    timeout: 30000,
                    success: function(res) {
                      appendLog('SUKSES: ' + res.message);
                      if (res.adminAccount) {
                        appendLog('Akun Admin: ' + res.adminAccount.email + ' | Password: ' + res.adminAccount.password + ' | Role: ' + res.adminAccount.role);
                      }
                      $btn.prop('disabled', false);
                      checkStatus();
                    },
                    error: function(xhr) {
                      var msg = xhr.responseJSON ? xhr.responseJSON.message : xhr.statusText;
                      appendLog('GAGAL SEEDING: ' + msg, 'error');
                      $btn.prop('disabled', false).html('🌱 Jalankan Seeding Data Awal & Buat Akun Admin');
                    }
                  });
                });

                // Tombol Test Login
                $('#btn-test-login').on('click', function() {
                  var $btn = $(this);
                  $btn.prop('disabled', true).text('⏳ Menguji Kredensial Admin...');
                  appendLog('Menguji login admin (admin@trackerkerja.com / AdminSecure@2026!!) ...');

                  $.ajax({
                    url: API_BASE + '/configuration/status/test-login',
                    method: 'POST',
                    contentType: 'application/json',
                    timeout: 10000,
                    success: function(res) {
                      appendLog('✓ ' + res.message);
                      appendLog('User ID: ' + res.user.id + ' | Role: ' + res.user.role + ' | Token: ' + res.tokenSample);
                      $btn.prop('disabled', false).html('🔑 Test Status Login Admin (admin@trackerkerja.com)');
                      checkStatus();
                    },
                    error: function(xhr) {
                      var msg = xhr.responseJSON ? xhr.responseJSON.message : xhr.statusText;
                      appendLog('✗ TEST LOGIN GAGAL: ' + msg, 'error');
                      $btn.prop('disabled', false).html('🔑 Test Status Login Admin (admin@trackerkerja.com)');
                    }
                  });
                });

                // Jalankan pengecekan pertama saat halaman selesai dimuat
                checkStatus(function(res) {
                  // Jika admin belum ada, otomatis log pemberitahuan
                  if (!res.admin.exists) {
                    appendLog('Pemberitahuan: Akun admin@trackerkerja.com belum ada. Anda dapat mengklik tombol "Jalankan Seeding Data Awal & Buat Akun Admin".', 'warn');
                  }
                });
              }

              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initDiagnostics);
              } else {
                initDiagnostics();
              }
            })();
          `,
        }}
      />
    </div>
  );
}
