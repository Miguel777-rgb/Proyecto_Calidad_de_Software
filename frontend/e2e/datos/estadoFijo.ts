/**
 * Respuesta fija de GET /api/status para las capturas de Inicio.
 *
 * El estado real cambia con cada importacion y cada reevaluacion de alertas
 * (que tambien lanzan otras E2E), asi que una captura con datos reales
 * fallaria sin que la interfaz haya cambiado. Estas son las 10 zonas del
 * catalogo con sus coordenadas reales y una mezcla de situaciones que cubre
 * todo lo que Inicio sabe dibujar: calida, neutra, fria, sin datos recientes
 * y alertas calida y fria vigentes.
 */
const laboratorio = (id: number, code: string, name: string, latitude: string, longitude: string) => ({
  id,
  code,
  name,
  latitude,
  longitude,
  is_active: true,
})

const medida = (average_c: string, last_anomaly_c: string) => ({
  average_c,
  last_anomaly_c,
  last_measured_on: '2026-07-31',
  days_since_last: 0,
  is_stale: false,
  open_alert: null,
})

export const ESTADO_FIJO = {
  reference_date: '2026-07-31',
  zones: [
    {
      laboratory: laboratorio(1, 'TUMBES', 'Tumbes', '-3.566900', '-80.451500'),
      state: 'warm',
      ...medida('1.1200', '1.3000'),
    },
    {
      laboratory: laboratorio(2, 'PAITA', 'Paita', '-5.089200', '-81.114400'),
      state: 'warm',
      ...medida('0.8400', '0.9100'),
    },
    {
      laboratory: laboratorio(3, 'SAN JOSE', 'San José', '-6.771400', '-79.963900'),
      state: 'neutral',
      ...medida('0.3200', '0.2800'),
    },
    {
      laboratory: laboratorio(4, 'CHICAMA', 'Chicama', '-7.698900', '-79.438600'),
      state: 'neutral',
      ...medida('-0.1500', '-0.2200'),
    },
    {
      laboratory: laboratorio(5, 'CHIMBOTE', 'Chimbote', '-9.074500', '-78.593600'),
      state: 'cold',
      ...medida('-0.7400', '-0.8100'),
    },
    {
      laboratory: laboratorio(6, 'HUACHO', 'Huacho', '-11.106700', '-77.605300'),
      state: 'warm',
      ...medida('0.9600', '1.0400'),
    },
    {
      laboratory: laboratorio(7, 'CALLAO', 'Callao', '-12.050800', '-77.142800'),
      state: 'warm',
      ...medida('1.5800', '1.6200'),
      open_alert: {
        id: 1,
        state: 'warm',
        started_on: '2026-07-24',
        streak_length: 8,
        peak_anomaly_c: '1.9100',
      },
    },
    {
      laboratory: laboratorio(8, 'PISCO', 'Pisco', '-13.710000', '-76.203600'),
      state: 'cold',
      ...medida('-1.2100', '-1.3400'),
      open_alert: {
        id: 2,
        state: 'cold',
        started_on: '2026-07-26',
        streak_length: 6,
        peak_anomaly_c: '-1.4500',
      },
    },
    {
      laboratory: laboratorio(9, 'MATARANI', 'Matarani', '-17.000000', '-72.106900'),
      state: 'no_data',
      average_c: null,
      last_anomaly_c: '0.1200',
      last_measured_on: '2016-12-31',
      days_since_last: 3499,
      is_stale: true,
      open_alert: null,
    },
    {
      laboratory: laboratorio(10, 'ILO', 'Ilo', '-17.639400', '-71.337500'),
      state: 'neutral',
      ...medida('0.4100', '0.4700'),
    },
  ],
}

export const CONFIGURACION_FIJA = {
  threshold_c: '0.5',
  min_streak_records: 5,
  max_gap_days: 2,
  freshness_days: 7,
  map_window_days: 5,
}
