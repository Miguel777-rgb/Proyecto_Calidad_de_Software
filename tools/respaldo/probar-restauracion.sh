#!/bin/sh
# Restaura el respaldo mas reciente en una base temporal y comprueba que no
# falten filas: un respaldo que nunca se restauro no esta verificado.
#
# Compara cada tabla restaurada con los conteos que respaldar.sh tomo justo
# antes de respaldar. La restaurada puede tener mas filas (lo que entro entre
# el conteo y el respaldo), nunca menos. Termina con error si algo falla.
set -eu

DESTINO="${RESPALDO_DIR:-/respaldos}"
PRUEBA="${PGDATABASE}_restauracion"

ultimo=$(ls -1t "$DESTINO"/ola-*.dump 2>/dev/null | head -n 1 || true)
if [ -z "$ultimo" ]; then
  echo "No hay respaldos en $DESTINO." >&2
  exit 1
fi
conteos="${ultimo%.dump}.conteos"

dropdb --if-exists "$PRUEBA"
createdb "$PRUEBA"
trap 'dropdb --if-exists "$PRUEBA"' EXIT

pg_restore --no-owner --exit-on-error --dbname="$PRUEBA" "$ultimo"

faltan=0
while read -r tabla esperadas; do
  restauradas=$(psql -d "$PRUEBA" -tAc "SELECT count(*) FROM $tabla")
  if [ "$restauradas" -lt "$esperadas" ]; then
    echo "FALTAN FILAS en $tabla: $restauradas restauradas de $esperadas." >&2
    faltan=1
  else
    echo "$tabla: $restauradas filas."
  fi
done < "$conteos"

if [ "$faltan" -ne 0 ]; then
  echo "La restauracion de $(basename "$ultimo") NO es completa." >&2
  exit 1
fi
echo "Restauracion verificada: $(basename "$ultimo")."
