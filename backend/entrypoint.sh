#!/bin/sh
# Punto de entrada de produccion: primero deja la base al dia y despues
# arranca el servidor. Si las migraciones fallan, el contenedor no llega a
# atender peticiones, que es lo correcto.
set -e

echo "Aplicando migraciones..."
python -m ola.startup

echo "Arrancando la API..."
exec "$@"
