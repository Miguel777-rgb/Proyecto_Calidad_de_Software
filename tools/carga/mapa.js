// Prueba de carga del requisito de concurrencia de la SRS: 50 usuarios a la vez.
//
// Cada usuario virtual repite lo que hace la pantalla de inicio al abrirse
// (estado de las 10 zonas y parametros vigentes) y espera un segundo, como
// alguien que mira el mapa. Falla si mas del 1 % de las peticiones dan error
// o si el percentil 95 supera 1 s: el mapa debe mostrarse en 3 s con 4G, y la
// API no puede llevarse la mayor parte de ese tiempo.
//
// En local, contra el sistema de desarrollo:
//   docker compose --profile carga run --rm carga
import http from 'k6/http'
import { check, sleep } from 'k6'

const BASE = __ENV.OLA_URL || 'http://api:8000'

export const options = {
  scenarios: {
    mapa: {
      executor: 'constant-vus',
      vus: Number(__ENV.USUARIOS || 50),
      duration: __ENV.DURACION || '1m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
    checks: ['rate>0.99'],
  },
}

export default function () {
  const respuestas = http.batch([
    ['GET', `${BASE}/api/status`],
    ['GET', `${BASE}/api/settings`],
  ])
  for (const respuesta of respuestas) {
    check(respuesta, { 'responde 200': (r) => r.status === 200 })
  }
  sleep(1)
}
