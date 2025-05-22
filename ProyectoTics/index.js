const express = require('express');
const cors = require('cors');
const app = express();
const path = require('path');
const { InfluxDB, Point } = require('@influxdata/influxdb-client');

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Sirve los archivos HTML/JS/CSS

// Configuración de InfluxDB
const INFLUX_URL = 'http://localhost:8086'; // Cambia si usas la nube de Influx
const INFLUX_TOKEN = 'd39KA2PCAXNgm17EV-GrToEN32lHDEgzkyuSAghkC-LaIA7Xp7bFlUuKY3cp2Id5vQHOWWtrlDJ4FFylcnUN0w==';
const ORG = 'Cuentitron';
const BUCKET = 'TESTAPI';

// Instancia del cliente InfluxDB
const influxDB = new InfluxDB({ url: INFLUX_URL, token: INFLUX_TOKEN });
const writeApi = influxDB.getWriteApi(ORG, BUCKET, 'ns'); // ns: precisión en nanosegundos

//Metodo ESP-32

app.post("/ESP32.1", (req, res) => {
  const { valor } = req.body;

  if (valor === undefined) {
    return res.status(400).json({ error: "Falta el valor" });
  }

  global.datosTemporales = valor;  // definir como variable global temporal
  console.log("Valor guardado globalmente:", global.datosTemporales);

  res.status(200).json({ mensaje: "Valor guardado correctamente" });
});

// Segundo POST: usa la variable global y la elimina
app.post("/ESP32.2", (req, res) => {
  const { valor } = req.body;

  if (valor === undefined) {
    return res.status(400).json({ error: "Falta el valor" });
  }

  if (global.datosTemporales === undefined) {
    return res.status(400).json({ error: "No hay valor previo" });
  }

  const diferencia = global.datosTemporales - valor;
  console.log("Diferencia:", diferencia);

  // Eliminar la variable global y liberar memoria
  delete global.datosTemporales;
  console.log("Variable global eliminada");

  res.status(200).json({ diferencia });

  // AHORA EMPEZAMOS A ESCRIBIR LOS DATOS EN INFLUX.
  // tenemos que alamacenar los datos primero de la variable valor y de diferencia en 2 lineas de codigo.
  const point = new Point('ValoresValidos')   // Nombre de la medición
  .tag('dispositivo', 'ESP32')           // Etiquetas opcionales (tags)
  .tag('CUENTA', 'Valido')
  .floatField('valor', valor);            // Campo de tipo float (puede ser int, string, boolean también)

// Escribir en la base de datos
writeApi.writePoint(point);

// Confirmar escritura (muy importante)
writeApi
  .close()
  .then(() => {
    console.log('✅ Punto escrito exitosamente en InfluxDB');
  })
  .catch((err) => {
    console.error('❌ Error al escribir en InfluxDB:', err);
  });

 const point2 = new Point('ValoresDescartados')   // Nombre de la medición
  .tag('dispositivo', 'ESP32')           // Etiquetas opcionales (tags)
  .tag('CUENTA', 'Descartado')
  .floatField('valor', diferencia);            // Campo de tipo float (puede ser int, string, boolean también)

// Escribir en la base de datos
writeApi.writePoint(point2);

// Confirmar escritura (muy importante)
writeApi
  .close()
  .then(() => {
    console.log('✅ Punto escrito exitosamente en InfluxDB');
  })
  .catch((err) => {
    console.error('❌ Error al escribir en InfluxDB:', err);
  });

});



// Ruta para recibir comandos desde la interfaz
app.post('/comando', (req, res) => {
  const { comando } = req.body;
  console.log('Comando recibido del usuario:', comando);

  // Aquí podrías comunicarte con el ESP32, o guardar el comando
  // o enviarlo a través de MQTT, WebSocket, etc.

  res.json({ mensaje: `Comando "${comando}" recibido.` });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
