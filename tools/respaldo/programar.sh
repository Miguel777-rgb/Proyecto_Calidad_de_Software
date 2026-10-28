#!/bin/sh
# Respalda la base cada RESPALDO_CADA_HORAS y prueba restaurar cada respaldo.
# Un fallo queda en el log y se reintenta en la siguiente vuelta.
set -u

cada=$(( ${RESPALDO_CADA_HORAS:-24} * 3600 ))

# Docker detiene el contenedor con SIGTERM; sin esta trampa, sh lo ignora como
# proceso 1 y Docker espera diez segundos antes de matarlo.
trap 'exit 0' TERM INT

while true; do
  if sh /respaldo/respaldar.sh && sh /respaldo/probar-restauracion.sh; then
    echo "Respaldo verificado. El siguiente, en ${RESPALDO_CADA_HORAS:-24} h."
  else
    echo "ERROR: el respaldo o su prueba de restauracion fallo." >&2
  fi
  sleep "$cada" &
  wait $!
done
