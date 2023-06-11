const express = require('express');
const router = express.Router();
const mysqlConnection = require('../database/dbQuerys');


// metodo que verifica credenciales llamando a la bbdd
router.post('/getCampannas', (req, res) => {
  const { usuario } = req.body;

  mysqlConnection.getCampanasValidasPorUsuario(usuario, (err, campanasValidas) => {
    if (!err) {
      // ordenar: primero las abiertas y ordenadas a su vez por fecha próxima 
      campanasValidas.sort(compararCampanas);
      res.json(campanasValidas);
    } else {
      res.json(err);
    }
  });
});


function compararCampanas(a, b) {

  // Ordenar por "abierta_antes" (1 antes que 0)
  if (a.abierta_antes < b.abierta_antes) {
      return 1;
  }
  if (a.abierta_antes > b.abierta_antes) {
      return -1;
  }
  
  // Ordenar por "fecha_fin" (más cercana al día de hoy primero)
  const fechaFinA = new Date(a.fecha_fin_activacion);
  const fechaFinB = new Date(b.fecha_fin_activacion);
  
  const diferenciaA = Math.abs(fechaFinA - new Date());  // Diferencia en milisegundos
  const diferenciaB = Math.abs(fechaFinB - new Date());  // Diferencia en milisegundos
  
  return diferenciaA - diferenciaB;
}


// metodo que verifica credenciales llamando a la bbdd
router.post('/getEncuesta', (req, res) => {
  const { cod_encuesta, idioma } = req.body;
  console.log(cod_encuesta + " " +idioma);

  mysqlConnection.getPreguntasEncuesta(cod_encuesta, idioma, (err, encuesta) => {
    if (!err) {
      console.log(encuesta)
      res.json(encuesta);
    } else {
      res.json(err);
    }
  });
});


// se exporta el ruter del usuario para poder usarlo desde app.js (todas las rutas)
module.exports = router;