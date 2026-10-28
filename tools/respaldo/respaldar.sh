#!/bin/sh
# Respaldo de la base de OLA con pg_dump, en formato custom, con retencion.
#
# Junto a cada respaldo guarda cuantas filas tenia cada tabla justo antes de
# respaldar; probar-restauracion.sh compara contra esos conteos. La conexion
# sale de las variables estandar de PostgreSQL: PGHOST, PGUSER, PGPASSWORD y
# PGDATABASE.
set -eu

DESTINO="${RESPALDO_DIR:-/respaldos}"
RETENCION="${RESPALDO_RETENCION_DIAS:-14}"
TABLAS="users subscriptions notifications alert_events anomaly_readings import_runs laboratories app_settings"

mkdir -p "$DESTINO"
nombre="$DESTINO/ola-$(date -u +%Y%m%dT%H%M%SZ)"

for tabla in $TABLAS; do
  printf '%s %s\n' "$tabla" "$(psql -tAc "SELECT count(*) FROM $tabla")"
done > "$nombre.conteos"

# Se escribe con otro nombre y se renombra al terminar: un respaldo cortado a
# la mitad nunca parece completo.
pg_dump --format=custom --no-owner --file="$nombre.parcial"
mv "$nombre.parcial" "$nombre.dump"
echo "Respaldo creado: $nombre.dump ($(du -h "$nombre.dump" | cut -f1))"

# Borra los respaldos, y sus conteos, con mas de RETENCION dias.
find "$DESTINO" -type f \( -name 'ola-*.dump' -o -name 'ola-*.conteos' \) -mtime +"$RETENCION" -print -delete
