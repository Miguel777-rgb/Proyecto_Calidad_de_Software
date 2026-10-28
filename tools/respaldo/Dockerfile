# Respaldo automatico de la base: la misma version de PostgreSQL que el
# servicio db, para que pg_dump y pg_restore coincidan con el servidor.
FROM postgres:17-alpine
COPY respaldar.sh probar-restauracion.sh programar.sh /respaldo/
ENTRYPOINT ["/bin/sh", "/respaldo/programar.sh"]
