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
router.post("/abrirCampanna", (req, res) => {
  const { situaciones, fechaHoraFinActivacion } = req.body;

  // Crear un arreglo de promesas
  const promises = situaciones.map((situacion) => {
    return new Promise((resolve, reject) => {
      dbQuery.isValida(situacion, (err, isValida) => {
        if (!err) {
          if (isValida) {
            dbQuery.isActiva(situacion, (err, isActive) => {
              if (!err) {
                if (!isActive) {
                  // setear la fecha de inicio y fin de la activacion
                  dbQuery.activarCampanna(situacion, fechaHoraFinActivacion, (err) => {
                      if (!err) {
                        // sumar 1 a veces_abierta de la tabla situaciones
                        dbQuery.updateVecesAbierta(situacion, (err, rdo) => {
                          if (!err) {
                            resolve(rdo);
                          } else {
                            reject(err);
                          }
                        });
                      } else {
                        reject(err);
                      }
                    }
                  );
                }
              } else {
                // Si es activa, resolvemos la promesa con null
                resolve(null);
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
      res.status(401).json({ error: 'Error en el proceso de apertura de la campaña' });
    });
});



router.post('/desactivarCampana', (req, res) => {
  const { situaciones } = req.body;

  // Crear un arreglo de promesas
  const promises = situaciones.map((situacion) => {
    return new Promise((resolve, reject) => {
      dbQuery.isActiva(situacion, (err, isActive) => {
        if (!err) {
          if (isActive) {
            dbQuery.desactivarCampana(situacion, (err, rdo) => {
              if (!err) {
                resolve(rdo); // Resolvemos la promesa con el resultado
              } else {
                reject(err);
              }
            });
          }
        } else {
          // Si es activa, resolvemos la promesa con null
          resolve(null);
        }
      });
    });
  });

  // Ejecutar todas las promesas y enviar la respuesta una vez que todas se resuelvan
  Promise.all(promises)
    .then((results) => {
      res.json(results);
      // Enviamos la respuesta con los resultados
    })
    .catch((err) => {
      res.status(401).json({ error: 'Error en el proceso de desactivación de la campaña' });
    });
});



router.post('/getResultadosInformePersonal', (req, res) => {
  const { cod_encuesta, situaciones, idioma } = req.body;

  console.log(situaciones);

  // Crear un arreglo de promesas
  const promises = situaciones.map((situacion) => {
    return new Promise((resolve, reject) => {
      dbQuery.getResultadosInformePersonal(cod_encuesta, situacion, idioma, (err, encuesta) => {
        if (!err) {
          resolve(encuesta); // Resolvemos la promesa con los datos de la encuesta
        } else {
          reject(err);
        }
      });
    });
  });

  // Ejecutar todas las promesas y obtener los resultados de las encuestas
  Promise.all(promises)
    .then((results) => {
      const jsonResult = {};

      // Combinar los resultados de las encuestas
      results.forEach((encuesta) => {
        encuesta.forEach((respuesta) => {
          const cod_pregunta = respuesta.cod_pregunta;

          if (!jsonResult[cod_pregunta]) {
            // Si la pregunta no existe en el JSON combinado, se agrega
            jsonResult[cod_pregunta] = {
              cod_pregunta: respuesta.cod_pregunta,
              texto_pregunta: respuesta.texto_pregunta,
              numerica: respuesta.numerica,
              respuestas: [],
              media: [],
              cuantos: 0,
              total_respuestas: 0,
            };
          }

          // Agregar las respuestas y actualizar el cuantos
          respuesta.respuestas.forEach((r) => {
            const cod_respuesta = r.cod_respuesta;
            const respuestaIndex = jsonResult[cod_pregunta].respuestas.findIndex(
              (resp) => resp.cod_respuesta === cod_respuesta
            );
            if (respuestaIndex === -1) {
              jsonResult[cod_pregunta].respuestas.push({ cod_respuesta, cuantos: r.cuantos });
            } else {
              jsonResult[cod_pregunta].respuestas[respuestaIndex].cuantos += r.cuantos;
            }
          });
          jsonResult[cod_pregunta].cuantos += respuesta.respuestas.reduce((sum, r) => sum + r.cuantos, 0);
          jsonResult[cod_pregunta].total_respuestas += respuesta.respuestas.reduce((sum, r) => sum + r.cuantos, 0);


          if (respuesta.media !== '-') {
            // Agregar las medias válidas para calcular la media final
            jsonResult[cod_pregunta].media.push(parseFloat(respuesta.media));
          }
        });
      });

      // Calcular la media final
      Object.values(jsonResult).forEach((pregunta) => {
        if (pregunta.media.length > 0) {
          // Calcular la media solo si hay valores válidos
          const mediaSum = pregunta.media.reduce((sum, value) => sum + value, 0);
          pregunta.media = (mediaSum / pregunta.media.length).toFixed(2);
        } else {
          pregunta.media = '-';
        }
      });

      console.log(jsonResult);
      res.json(jsonResult);
    })
    .catch((err) => {
      res.status(500).json({ error: 'Error al obtener los resultados del informe personal' });
    });
});



router.post('/getAsignaturasPublicadas', (req, res) => {
  const { usuario } = req.body;

  dbQuery.getAsignaturasPublicadas(usuario, (err, asignaturas) => {
    if (!err) {
      res.json(asignaturas);
    } else {
      res.json(err);
    }
  });
});


router.post('/getDatosSD', (req, res) => {
  const { situaciones } = req.body;

  // Crear un arreglo de promesas
  const promises = situaciones.map((situacion) => {
    return new Promise((resolve, reject) => {
      dbQuery.getDatosSD(situacion, (err, datos) => {
        if (!err) {
          resolve(datos);
        } else {
          reject(err);
        }
      });
    });
  });

  // Ejecutar todas las promesas y obtener los resultados
  Promise.all(promises)
    .then((results) => {
      // Combinar los resultados y realizar la suma de plazasMatriculadas y numCuestionarios
      const combinedData = results.reduce((acc, curr) => {
        acc.plazasMatriculadas += curr.plazasMatriculadas;
        acc.numCuestionarios += curr.numCuestionarios;
        return acc;
      }, {
        centro: results[0].centro,
        titulacion: results[0].titulacion,
        departamento: results[0].departamento,
        profesor: results[0].profesor,
        asignatura: results[0].asignatura,
        curso: results[0].curso,
        grupo: results[0].grupo,
        encuesta: results[0].encuesta,
        situacion: results[0].situacion,
        situaciones: situaciones,
        plazasMatriculadas: 0,
        numCuestionarios: 0
      });

      res.json(combinedData);
    })
    .catch((err) => {
      res.status(500).json({ error: 'Error al obtener los datos de las situaciones' });
    });
});


// metodo que verifica credenciales llamando a la bbdd
router.post('/getResultadosInformePersonal', (req, res) => {
  const { cod_encuesta, situaciones, idioma } = req.body;

  dbQuery.getResultadosInformePersonal(cod_encuesta, situaciones, idioma, (err, encuesta) => {
    if (!err) {
      res.json(encuesta);
    } else {
      res.json(err);
    }
  });
});





// se exporta el ruter del usuario para poder usarlo desde app.js (todas las rutas)
module.exports = router;