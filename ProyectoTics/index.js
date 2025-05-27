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
//Metodo ESP-32

app.post("/ESP32.1", (req, res) => {
  const { valor } = req.body;

  if (valor === undefined) {
    return res.status(400).json({ error: "Falta el valor" });
  }

  global.datosTemporales = valor;  // definir como variable global temporal

  res.status(200).json({ mensaje: "Valor guardado correctamente" });
});

// Segundo POST: usa la variable global y la elimina
app.post("/ESP32.2", (req, res) => {

  const writeApi = influxDB.getWriteApi(ORG, BUCKET, 'ns'); // ns: precisión en nanosegundos

  const { valor } = req.body;

  if (valor === undefined) {
    return res.status(400).json({ error: "Falta el valor" });
  }

  if (global.datosTemporales === undefined) {
    return res.status(400).json({ error: "No hay valor previo" });
  }

  const diferencia = global.datosTemporales - valor;

  // Eliminar la variable global y liberar memoria
  delete global.datosTemporales;

  // Ahora se escriben los valores en la base de datos.
  
  const point = new Point('ValoresValidos')   
  .tag('dispositivo', 'ESP32')          
  .tag('CUENTA', 'Valido')
  .floatField('valor', valor);           

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

 const point2 = new Point('ValoresDescartados')   
  .tag('dispositivo', 'ESP32')           
  .tag('CUENTA', 'Descartado')
  .floatField('valor', diferencia);            

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

  res.status(200).json("Valores Recibidos de manera exitosa.");

});

// Ruta para recibir comandos desde la interfaz

app.post('/comando', (req, res) => {
  const { comando } = req.body;
  console.log('Comando recibido del usuario:', comando);

  // Aquí podrías comunicarte con el ESP32, o guardar el comando
  // o enviarlo a través de MQTT, WebSocket, etc.

  res.json({ mensaje: `Comando "${comando}" recibido.` });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

