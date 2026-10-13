# Spesifikasi Desain: FSD 5.15 Modul SQL Beautifier, Minifier & Query Tools

## 1. Ringkasan Eksekutif & Tujuan
Modul SQL Beautifier & Query Tools (FSD 5.15) menyediakan lingkungan pengembangan terintegrasi di dalam TrackerKerja Modern untuk memformat (*beautify*), memadatkan (*minify*), memvalidasi sintaksis (*syntax validation*), dan mengelola riwayat kueri basis data tanpa ketergantungan pada alat pihak ketiga.

Modul ini mendukung **15+ dialek basis data enterprise** dengan mesin parser mandiri berbasis .NET 8 (C#) di sisi backend serta antarmuka UI Studio responsif di Next.js 16 frontend.

---

## 2. Arsitektur & Komponen Sistem

### 2.1 Komponen Backend (Clean Architecture)
1. **Domain Layer**:
   - Entitas relasional `SqlHistory` pada tabel `sql_histories` (sudah terdaftar di EF Core `AppDbContext`).
2. **Application Layer**:
   - Kontrak antarmuka `ISqlFormatterService`.
   - DTOs kueri & format: `SqlFormatRequest`, `SqlFormatResult`, `SqlMinifyRequest`, `SqlMinifyResult`, `SqlValidationRequest`, `SqlValidationResult`, `SqlDialectInfo`, `SqlDiagnosticError`.
   - Enums: `KeywordCase` (`Upper`, `Lower`, `Preserve`), `CommaPosition` (`EndOfLine`, `StartOfLine`).
3. **Infrastructure Layer**:
   - `SqlFormatterService` mengimplementasikan tokenizing berbasis state machine, regex terisolasi, penanganan komentar, pemisahan klausa, indentasi adaptif, dan algoritma syntax checking.
   - Pendaftaran service ke IoC container di `DependencyInjection.cs`.
4. **WebApi Layer**:
   - Controller `SqlToolsController` (`/api/sqltools`) yang mengekspos endpoint format, minify, validate, dialects, samples, dan history.

### 2.2 Komponen Frontend (Next.js 16 + TailGrids)
- Halaman Studio `/dev-tools/sql` (`frontend/src/app/(with-layouts)/dev-tools/sql/page.tsx`):
  - Toolbar pemilih dialek (15+ dialek dengan badge visual keluarga DB).
  - Selector sampel kueri instan (SELECT, Aggregation & Window Function, Complex CTE, DDL).
  - Konfigurasi format (Casing UPPER/lower/Preserve, Comma End/Start, Indentasi 2/4 spasi/Tab).
  - Tombol aksi: **Beautify SQL**, **Minify SQL**, **Validasi Sintaks**, **Salin**, **Unduh .sql**, **Hapus Editor**.
  - Panel editor side-by-side (Input Raw SQL vs Output Formatted/Minified SQL).
  - Status box diagnostik sintaks (indikator kesalahan baris & kolom secara real-time).
  - Laci Riwayat Kueri (Drawer) untuk memuat kueri yang pernah disimpan sebelumnya.

---

## 3. Spesifikasi 15+ Dialek Basis Data

| No | Kode Dialek | Nama Dialek | Keluarga DB | Fitur Khas / Kata Kunci Khusus |
|:---|:---|:---|:---|:---|
| 1 | `postgresql` | PostgreSQL | Relational / Object | `ILIKE`, `RETURNING`, `JSONB` (`->`, `->>`), `WINDOW`, `LIMIT/OFFSET`, `$$` |
| 2 | `mysql` | MySQL | Relational | `` `identifier` ``, `LIMIT offset, count`, `ON DUPLICATE KEY UPDATE` |
| 3 | `tsql` | SQL Server (T-SQL) | Relational | `TOP`, `[identifier]`, `CROSS APPLY`, `OUTER APPLY`, `MERGE` |
| 4 | `oracle` | Oracle PL/SQL | Relational | `ROWNUM`, `DUAL`, `CONNECT BY`, `FETCH FIRST n ROWS ONLY` |
| 5 | `sqlite` | SQLite | Embedded | `AUTOINCREMENT`, `PRAGMA`, `GLOB`, `LIMIT/OFFSET` |
| 6 | `bigquery` | Google BigQuery | Data Warehouse | `STRUCT`, `UNNEST`, `QUALIFY`, Standard SQL syntax |
| 7 | `snowflake` | Snowflake | Cloud DW | `FLATTEN`, `QUALIFY`, `COPY INTO`, `TRANSIENT` |
| 8 | `redshift` | Amazon Redshift | Cloud DW | `DISTKEY`, `SORTKEY`, `VACUUM`, `UNLOAD` |
| 9 | `db2` | IBM DB2 | Mainframe/Enterprise | `FETCH FIRST n ROWS ONLY`, `WITH UR`, `OPTIMIZE FOR` |
| 10 | `mariadb` | MariaDB | Relational | `SYSTEM VERSIONING`, `JSON_ARRAY`, `INTERSECT` |
| 11 | `cockroachdb` | CockroachDB | Distributed SQL | `AS OF SYSTEM TIME`, `STORING`, `UPSERT INTO` |
| 12 | `couchbase` | Couchbase N1QL | NoSQL/Document | `META().id`, `UNNEST`, `ARRAY`, `ANY IN` |
| 13 | `spark` | Apache Spark SQL | Big Data Engine | `CLUSTER BY`, `DISTRIBUTE BY`, `LATERAL VIEW` |
| 14 | `trino` | Trino / Presto | Distributed Query | `TRY`, `ARRAYS`, `UNNEST`, `MAP` |
| 15 | `ansi` | Standard ANSI SQL | Standard | `SELECT`, `FROM`, `WHERE`, `GROUP BY`, `HAVING`, `ORDER BY` |

---

## 4. Spesifikasi Kontrak REST API (`/api/sqltools`)

### 4.1 Format SQL
- **Endpoint**: `POST /api/sqltools/format`
- **Payload Request**:
  ```json
  {
    "sql": "select id, name, email from users where is_active = true order by created_at desc",
    "dialect": "postgresql",
    "casing": "Upper",
    "comma": "EndOfLine",
    "indentSpaces": 2,
    "name": "Query Ambil Pengguna Aktif",
    "taskId": null
  }
  ```
- **Response Success (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "formattedSql": "SELECT\n  id,\n  name,\n  email\nFROM\n  users\nWHERE\n  is_active = true\nORDER BY\n  created_at DESC;",
      "dialect": "postgresql",
      "lineCount": 9,
      "characterCount": 86,
      "elapsedMilliseconds": 3
    }
  }
  ```

### 4.2 Minify SQL
- **Endpoint**: `POST /api/sqltools/minify`
- **Payload Request**:
  ```json
  {
    "sql": "SELECT\n  id,\n  name\nFROM users;\n",
    "preserveComments": false
  }
  ```
- **Response Success (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "minifiedSql": "SELECT id, name FROM users;",
      "originalLength": 32,
      "minifiedLength": 27,
      "compressionRatio": 15.6
    }
  }
  ```

### 4.3 Validasi Sintaks SQL
- **Endpoint**: `POST /api/sqltools/validate`
- **Payload Request**:
  ```json
  {
    "sql": "SELECT id, name FROM (SELECT id FROM users WHERE status = 1",
    "dialect": "postgresql"
  }
  ```
- **Response Success (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "isValid": false,
      "statementType": "SELECT",
      "errors": [
        {
          "line": 1,
          "column": 23,
          "message": "Tanda kurung '(' pada baris 1 kolom 23 tidak memiliki pasangan penutup ')'."
        }
      ],
      "detectedKeywords": ["SELECT", "FROM", "WHERE"]
    }
  }
  ```

### 4.4 Daftar Dialek & Sampel Kueri
- **Endpoint**: `GET /api/sqltools/dialects`
- **Endpoint**: `GET /api/sqltools/samples/{dialect}?type=basic|cte|window|ddl`

### 4.5 Riwayat Kueri
- **Endpoint**: `GET /api/sqltools/history`
- **Endpoint**: `DELETE /api/sqltools/history/{id}`

---

## 5. Strategi Pengujian (Testing Strategy)
1. **Unit Testing Backend (`TrackerKerja.Tests/SqlFormatterServiceTests.cs`)**:
   - Pengujian pemformatan kata kunci (Upper, Lower, Preserve).
   - Pengujian posisi koma (EndOfLine vs StartOfLine).
   - Pengujian minifikasi (menghapus spasi dan komentar).
   - Pengujian validasi sintaksis:
     - Kueri valid lolos validasi.
     - Unbalanced parentheses `( ...` terdeteksi dengan tepat.
     - Unclosed literal quotes `'abc...` terdeteksi.
   - Pengujian parser 15 dialek dan generator sample query.
2. **Integration / Controller Testing (`TrackerKerja.Tests/SqlToolsControllerTests.cs`)**:
   - Memastikan endpoint `/api/sqltools/format`, `minify`, `validate`, `dialects`, `history` mengembalikan status 200 dan response seragam.
3. **Frontend Verification**:
   - Memastikan `npm run build` sukses tanpa error tipe TypeScript.
   - Menguji interaksi tombol Beautify, Minify, Validate, Copy, Download, dan pemilihan dialek di UI.
