const express = require('express');
const router = express.Router();
const dbQuery = require('../database/dbQuerys'); // Importa el archivo "dbQuery.js"




// metodo que verifica credenciales llamando a la bbdd
router.post('/getCampannas', (req, res) => {
  const { usuario } = req.body;

  dbQuery.getCampannasValidasDocente(usuario, (err, campannas) => {
    if (!err) {
      res.json(campannas);
    } else {
      res.json(err);
    }
  });
});

// metodo que verifica credenciales llamando a la bbdd
router.post('/isValida', (req, res) => {
  const { situacion } = req.body;

  dbQuery.isValida(situacion, (err, isValida) => {
    if (!err) {
      res.json(isValida);
    } else {
      res.json(err);
    }
  });
});



// Metodo que verifica credenciales llamando a la bbdd
router.post('/abrirCampanna', (req, res) => {
  const { situaciones, fechaHoraFinActivacion } = req.body;

  var dateObject = new Date(fechaHoraFinActivacion);
  var options = { timeZone: 'Europe/Madrid' };
  var formattedDate = dateObject.toLocaleString('es-ES', options);

  console.log("formated fecha front " + formattedDate);

  const fechaHoraFinActivacionLocal = fechaHoraFinActivacion.toLocaleString("es-ES", { timeZone: "Europe/Madrid" });

  // Crear un arreglo de promesas
  const promises = situaciones.map((situacion) => {
    return new Promise((resolve, reject) => {
      dbQuery.isValida(situacion, (err, isValida) => {
        if (!err) {
          if (isValida) {
            // setear la fecha de inicio y fin de la activacion
            dbQuery.activarCampanna(situacion, fechaHoraFinActivacionLocal, (err) => {
              if (!err) {
                // sumar 1 a veces_abierta de la tabla situaciones
                dbQuery.updateVecesAbierta(situacion, (err, rdo) => {
                  if (!err) {
                    console.log(rdo);
                    resolve(rdo);
                  } else {
                    reject(err);
                  }
                });
              } else {
                reject(err);
              }
            });
          } else {
            // Si no es válida, resolvemos la promesa con null
            resolve(null);
          }
        } else {
          reject(err);
        }
      });
    });
  });

  // Ejecutar todas las promesas y enviar la respuesta una vez que todas se resuelvan
  Promise.all(promises)
    .then((results) => {
      res.json(results);
    })
    .catch((err) => {
      res.json(err);
    });
});






// se exporta el ruter del usuario para poder usarlo desde app.js (todas las rutas)
module.exports = router;