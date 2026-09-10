// Todos los literales visibles viven aqui: la interfaz es en espanol,
// el codigo en ingles. Centralizarlos facilita revisarlos con la docente.
export const textos = {
  app: {
    nombre: 'OLA',
    titulo: 'Observatorio Litoral de Anomalías térmicas',
    descripcion:
      'Estado térmico del litoral peruano a partir del dataset abierto de IMARPE.',
  },
  estado: {
    calido: 'Cálido',
    neutro: 'Neutro',
    frio: 'Frío',
    sinDatos: 'Sin datos recientes',
  },
  atribucion:
    'Fuente: Anomalía de la Temperatura Superficial del Mar (ATSM) de los laboratorios costeros del IMARPE — IMARPE / PRODUCE.',
  conexion: {
    verificando: 'Verificando conexión con el servidor…',
    ok: 'Servidor conectado',
    error: 'No se pudo conectar con el servidor',
  },
} as const
