// Todos los literales visibles viven aqui: la interfaz es en espanol,
// el codigo en ingles. Centralizarlos facilita revisarlos con la docente.
export const textos = {
  app: {
    nombre: 'OLA',
    titulo: 'Observatorio Litoral de Anomalías térmicas',
    descripcion:
      'Estado térmico del litoral peruano a partir del dataset abierto de IMARPE.',
  },
  comun: {
    cargando: 'Cargando…',
    correo: 'Correo electrónico',
    contrasena: 'Contraseña',
    nombre: 'Nombre completo',
    opcional: 'opcional',
  },
  navegacion: {
    inicio: 'Inicio',
    entrar: 'Iniciar sesión',
    registrarse: 'Crear cuenta',
    salir: 'Cerrar sesión',
    administracion: 'Administración',
    historico: 'Histórico',
    comparacion: 'Comparar',
    proyeccion: 'Proyección',
    misZonas: 'Mis zonas',
    avisos: 'Avisos',
  },
  entrar: {
    titulo: 'Iniciar sesión',
    boton: 'Entrar',
    enviando: 'Entrando…',
    sinCuenta: '¿No tienes cuenta?',
    crearla: 'Crear una cuenta',
  },
  registro: {
    titulo: 'Crear cuenta',
    boton: 'Registrarme',
    enviando: 'Creando cuenta…',
    ayudaContrasena: 'Mínimo 8 caracteres. Puedes usar una frase fácil de recordar.',
    yaTengoCuenta: '¿Ya tienes cuenta?',
    entrar: 'Iniciar sesión',
  },
  inicio: {
    bienvenida: 'Bienvenido a OLA',
    sesionComo: 'Sesión iniciada como',
    administrador: 'Administrador',
    usuario: 'Usuario',
    proximamente:
      'El mapa de zonas, los históricos y las alertas se habilitarán en las siguientes etapas.',
  },
  admin: {
    titulo: 'Administración',
    importar: 'Importar dataset de IMARPE',
    ayudaArchivo:
      'Selecciona el CSV de anomalía térmica publicado por IMARPE. Debe tener las columnas FECHA_MEDICION, LABORATORIO_COSTERO y ANOMALIA_TEMPERATURA.',
    seleccionar: 'Archivo CSV',
    boton: 'Importar',
    importando: 'Importando… esto puede tardar unos segundos',
    historial: 'Importaciones anteriores',
    sinImportaciones: 'Todavía no se ha importado ningún archivo.',
    resultado: 'Resultado de la importación',
    columnas: {
      archivo: 'Archivo',
      fecha: 'Fecha',
      estado: 'Estado',
      total: 'Filas leídas',
      insertadas: 'Nuevas',
      actualizadas: 'Corregidas',
      sinCambios: 'Sin cambios',
      rechazadas: 'Rechazadas',
      duracion: 'Duración',
      autor: 'Importado por',
    },
    estados: {
      completed: 'Completada',
      failed: 'Fallida',
      running: 'En curso',
    },
    erroresDetectados: 'Filas rechazadas',
    linea: 'Línea',
    motivo: 'Motivo',
    verDetalle: 'Ver filas rechazadas',
  },
  errores: {
    soloAdmin: 'Esta sección requiere permisos de administrador.',
    contrasenaCorta: 'La contraseña debe tener al menos 8 caracteres.',
    correoRequerido: 'Indica tu correo electrónico.',
    inesperado: 'Ocurrió un error inesperado. Inténtalo de nuevo.',
    archivoRequerido: 'Selecciona un archivo CSV antes de importar.',
  },
  estado: {
    titulo: 'Estado térmico del litoral',
    warm: 'Cálido',
    neutral: 'Neutro',
    cold: 'Frío',
    no_data: 'Sin datos recientes',
    leyenda: 'Leyenda',
    zona: 'Zona',
    situacion: 'Situación',
    promedio: 'Promedio',
    ultimaMedicion: 'Última medición',
    alerta: 'Alerta sostenida',
    sinAlerta: 'Sin alerta',
    desde: 'desde',
    registros: 'registros',
    diasSinDato: (dias: number) => `hace ${dias} ${dias === 1 ? 'día' : 'días'}`,
    actualizado: (fecha: string) => `Datos actualizados al ${fecha}`,
    sinDatosCargados:
      'Todavía no hay mediciones cargadas. Un administrador debe importar el dataset de IMARPE.',
    explicacionPromedio: (dias: number) =>
      `La situación de cada zona se calcula con el promedio de los últimos ${dias} días, para que un solo día atípico no cambie el color.`,
  },
  graficos: {
    historico: 'Histórico por zona',
    comparacion: 'Comparar zonas',
    zona: 'Zona costera',
    desde: 'Desde',
    hasta: 'Hasta',
    aplicar: 'Aplicar',
    periodo: 'Periodo',
    sinDato: 'Sin dato',
    verTabla: 'Ver los datos en una tabla',
    resolucion: {
      daily: 'Un punto por día',
      weekly: 'Promedio semanal',
      monthly: 'Promedio mensual',
    },
    explicacionResolucion:
      'Al ampliar el rango, los valores se agrupan automáticamente para que el gráfico siga siendo legible.',
    explicacionHuecos:
      'La línea se corta donde no hay mediciones: unir esos puntos mostraría una tendencia que nadie midió.',
    explicacionUmbral: 'Las líneas punteadas marcan el umbral de ±0.5 °C.',
    sinDatosEnRango: 'No hay mediciones de esta zona en el periodo elegido.',
    elegirZonas: (max: number) => `Elige hasta ${max} zonas para superponer sus series.`,
    limiteZonas: (max: number) => `Solo se pueden comparar ${max} zonas a la vez.`,
    ningunaZona: 'Elige al menos una zona para comparar.',
    rangoInvertido: 'La fecha inicial no puede ser posterior a la final.',
  },
  suscripciones: {
    titulo: 'Mis zonas de interés',
    ayuda:
      'Elige las zonas de las que quieres recibir avisos. Te escribiremos al correo cuando una entre en alerta y cuando vuelva a la normalidad.',
    seguir: 'Seguir',
    dejarDeSeguir: 'Dejar de seguir',
    siguiendo: 'Siguiendo',
    ninguna: 'Todavía no sigues ninguna zona.',
    entrarPara: 'Inicia sesión para elegir tus zonas de interés y recibir avisos.',
  },
  avisos: {
    titulo: 'Mis avisos',
    // «Alerta» es femenino: no sirve reutilizar los nombres de estado, que
    // concuerdan con «estado» y son masculinos.
    situacionFemenina: {
      warm: 'cálida',
      cold: 'fría',
    },
    ninguno: 'No tienes avisos por ahora.',
    sinLeer: (n: number) => `${n} sin leer`,
    marcarTodos: 'Marcar todos como leídos',
    nuevo: 'Nuevo',
    tipos: {
      opened: (zona: string, situacion: string) => `${zona} entró en alerta ${situacion}`,
      closed: (zona: string, situacion: string) => `Terminó la alerta ${situacion} en ${zona}`,
    },
    desde: (fecha: string) => `Episodio iniciado el ${fecha}`,
    envio: {
      titulo: 'Envío de avisos',
      ayuda:
        'La evaluación de alertas registra los avisos pendientes; el envío se dispara aquí. Así un servidor de correo caído no bloquea la evaluación.',
      boton: 'Enviar avisos pendientes',
      enviando: 'Enviando…',
      resultado: (r: { attempted: number; sent: number; failed: number }) =>
        r.attempted === 0
          ? 'No había avisos pendientes.'
          : `Se intentaron ${r.attempted} envíos: ${r.sent} correctos y ${r.failed} fallidos.`,
      reintento: 'Los envíos fallidos se reintentan la próxima vez.',
    },
  },
  proyeccion: {
    titulo: 'Proyección de tendencia',
    horizonte: 'Días a proyectar',
    dias: (n: number) => `${n} días`,
    // La SRS exige marcar la proyección explícitamente como estimación.
    advertencia:
      'Esto es una estimación calculada a partir de las mediciones recientes, no un pronóstico. No predice eventos El Niño o La Niña, que dependen de más variables y son competencia del ENFEN.',
    tramoProyectado: 'Tramo estimado',
    medido: 'Medido',
    metodos: {
      linear_regression: 'Según la tendencia',
      weighted_moving_average: 'Según el nivel reciente',
    },
    explicacionMetodos:
      'Se calculan dos estimaciones con métodos distintos. La primera sigue la dirección en que vienen moviéndose las mediciones; la segunda promedia el nivel de los últimos días dando más peso a lo reciente.',
    coinciden: 'Ambos métodos coinciden, lo que refuerza la estimación.',
    difieren: (diferencia: string) =>
      `Los métodos difieren en ${diferencia} °C. Cuando eso ocurre, conviene tomar la estimación con más cautela.`,
    confianza: 'Confianza',
    confianzas: {
      high: 'Alta',
      medium: 'Media',
      low: 'Baja',
    },
    explicacionConfianza: {
      high: 'La zona tiene mediciones frecuentes y al día.',
      medium: 'La zona tiene huecos en sus mediciones recientes.',
      low: 'La zona tiene pocas mediciones o su último dato es antiguo. Tómala como referencia muy aproximada.',
    },
    datoAtrasado: (dias: number) =>
      `El último dato de esta zona es de hace ${dias.toLocaleString('es-PE')} días, así que la estimación parte de esa fecha.`,
    sinProyeccion: 'No hay mediciones suficientes para estimar una tendencia en esta zona.',
  },
  mapa: {
    titulo: 'Mapa de zonas costeras',
    sinSeleccion: 'Pulsa una zona del mapa para ver su detalle.',
    cerrarPanel: 'Cerrar el detalle de la zona',
    ultimoValor: 'Último valor',
    avisoObsoleta:
      'Esta zona no registra mediciones recientes, así que no se muestra su situación térmica.',
    enAlerta: (situacion: string) => `Alerta ${situacion.toLowerCase()} en curso`,
    detalleAlerta: (desde: string, registros: number, pico: string) =>
      `Sostenida desde el ${desde}, con ${registros} mediciones seguidas fuera del rango normal. Valor más extremo: ${pico} °C.`,
    sinAlertaExplicacion: 'Esta zona no presenta una tendencia sostenida.',
    verTabla: 'Detalle de todas las zonas',
    atribucionMapa: 'Mapa base de OpenStreetMap.',
  },
  configuracion: {
    titulo: 'Parámetros de detección',
    ayuda:
      'Estos valores definen cuándo una zona se considera en alerta. Cambiarlos no recalcula las alertas ya detectadas: para eso usa el botón de reevaluar.',
    threshold_c: 'Umbral de anomalía (°C)',
    min_streak_records: 'Registros seguidos para alertar',
    max_gap_days: 'Días faltantes tolerados',
    freshness_days: 'Días para considerar el dato vencido',
    map_window_days: 'Días que promedia el mapa',
    guardar: 'Guardar parámetros',
    guardando: 'Guardando…',
    guardado: 'Parámetros guardados.',
    reevaluar: 'Reevaluar alertas',
    reevaluando: 'Reevaluando…',
    resultadoEvaluacion: (r: { events_total: number; events_open: number }) =>
      `Se registraron ${r.events_total.toLocaleString('es-PE')} episodios, de los cuales ${r.events_open} siguen vigentes.`,
  },
  atribucion:
    'Fuente: Anomalía de la Temperatura Superficial del Mar (ATSM) de los laboratorios costeros del IMARPE — IMARPE / PRODUCE.',
  conexion: {
    verificando: 'Verificando conexión con el servidor…',
    ok: 'Servidor conectado',
    error: 'No se pudo conectar con el servidor',
  },
} as const

export const CONTRASENA_MIN_LENGTH = 8
