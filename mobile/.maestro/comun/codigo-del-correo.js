// Lee de Mailpit el codigo que el backend acaba de enviar a output.correo y lo
// deja en output.codigo. Corre en el equipo, no en el celular.
/* global http, json, output -- los pone Maestro al correr el script */
const buzon = 'http://localhost:8025/api/v1'
const busqueda = json(http.get(buzon + '/search?query=' + encodeURIComponent('to:' + output.correo)).body)
if (busqueda.messages.length === 0) throw new Error('Mailpit no tiene correos para ' + output.correo)
const texto = json(http.get(buzon + '/message/' + busqueda.messages[0].ID).body).Text
const encontrado = texto.match(/\b(\d{6})\b/)
if (encontrado === null) throw new Error('El correo no trae un codigo de 6 digitos')
output.codigo = encontrado[1]
