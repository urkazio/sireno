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

  mysqlConnection.getPreguntasEncuesta(cod_encuesta, idioma, (err, encuesta) => {
    if (!err) {
      res.json(encuesta);
    } else {
      res.json(err);
    }
  });
});


// metodo que verifica credenciales llamando a la bbdd
router.post('/getSDsAlumno', (req, res) => {
  const { usuario } = req.body;

  mysqlConnection.getSDsAlumno(usuario, (err, situaciones_docentes) => {
    if (!err) {
      res.json(situaciones_docentes);
    } else {
      res.json(err);
    }
  });
});

// metodo que verifica si la campaña de una situacion docente es activa
router.post('/isActiva', (req, res) => {
  const { cod_situacion_docente } = req.body;

  mysqlConnection.isActiva(cod_situacion_docente, (err, isActive) => {
    if (!err) {
      res.json(isActive);
    } else {
      res.json(err);
    }
  });
});


// metodo que obtiene las respuestas de una encuesta
router.post('/setRespuestas', (req, res) => {
  const { usuario, respuestas, cod_situacion_docente } = req.body;

  mysqlConnection.getSDsAlumno(usuario, (err, situaciones_docentes) => {
    if (!err) {
      // comprobar que el alumno actual tiene pendiente responder a la encuesta de dicha situacion docente
      if (situaciones_docentes.includes(cod_situacion_docente)) {
        // Comprobar si la situación docente está activa
        mysqlConnection.isActiva(cod_situacion_docente, (err, isActive) => {
          if (!err) {
            if (isActive) {
              // introducir las respuestas del alumno en la BBDD
              mysqlConnection.setRespuestas(cod_situacion_docente, respuestas, (err) => {
                if (!err) {
                  mysqlConnection.updateNumAlumRespond(cod_situacion_docente, (err) => {
                    if (!err) {
                      // borrar al alumno de la situacion docente pendiente
                      mysqlConnection.deleteSDAlumno(usuario, cod_situacion_docente, (err, resultado) => {
                        if (!err) {
                          res.json(resultado);
                        } else {
                          res.json(err);
                        }
                      });
                    } else {
                      res.json(err);
                    }
                  });
                } else {
                  res.json(err);
                }
              });
            } else {
              res.status(401).json("La situación docente no está activa");
            }
          } else {
            res.json(err);
          }
        });
      } else {
        res.status(401).json("Alumno no autorizado");
      }
    } else {
      res.json(err);
    }
  });
});





// se exporta el ruter del usuario para poder usarlo desde app.js (todas las rutas)
module.exports = router;