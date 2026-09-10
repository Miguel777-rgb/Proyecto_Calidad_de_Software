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
  errores: {
    soloAdmin: 'Esta sección requiere permisos de administrador.',
    contrasenaCorta: 'La contraseña debe tener al menos 8 caracteres.',
    correoRequerido: 'Indica tu correo electrónico.',
    inesperado: 'Ocurrió un error inesperado. Inténtalo de nuevo.',
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

export const CONTRASENA_MIN_LENGTH = 8
