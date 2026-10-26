#!/usr/bin/env bash
# Build ulang & jalankan container produksi. Dipanggil oleh GitHub Actions setelah kode di-update
# (git reset ke origin/deploy), atau manual di VPS: bash scripts/deploy.sh
set -euo pipefail

cd "$(dirname "$0")/.."

COMPOSE="docker compose -f docker-compose.prod.yml"
BACKUP_DIR="backups"
KEEP_BACKUPS=10

echo "==> [$(date '+%F %T')] Deploy commit $(git rev-parse --short HEAD): $(git log -1 --pretty=%s)"

if [ ! -f .env ]; then
  echo "ERROR: .env tidak ditemukan. Salin dari .env.example lalu isi nilainya." >&2
  exit 1
fi

# Backup database sebelum update (dilewati jika container postgres belum berjalan)
if docker ps --format '{{.Names}}' | grep -q '^trackerkerja_postgres$'; then
  mkdir -p "$BACKUP_DIR"
  backup_file="$BACKUP_DIR/trackerkerja_$(date +%Y%m%d_%H%M%S).dump"
  echo "==> Backup database ke $backup_file"
  docker exec trackerkerja_postgres pg_dump -U tracker_admin -d trackerkerja_db -F c > "$backup_file"
  ls -1t "$BACKUP_DIR"/trackerkerja_*.dump | tail -n +$((KEEP_BACKUPS + 1)) | xargs -r rm -f
fi

echo "==> Build & restart container"
$COMPOSE up -d --build --remove-orphans

echo "==> Bersihkan image lama"
docker image prune -f >/dev/null

# Backend dianggap sehat bila endpoint terproteksi membalas 401
echo "==> Menunggu backend siap"
for _ in $(seq 1 45); do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:5008/api/members || true)
  if [ "$code" = "401" ]; then
    echo "==> Backend OK"
    $COMPOSE ps
    exit 0
  fi
  sleep 2
done

echo "ERROR: backend tidak merespon setelah 90 detik" >&2
$COMPOSE ps
$COMPOSE logs --tail 80 backend
exit 1
