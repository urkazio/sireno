const express = require('express');
const router = express.Router();
const dbQuery = require('../database/dbQuerys'); // Importa el archivo "dbQuery.js"


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


router.post('/getRespondidos', (req, res) => {
  const { situaciones } = req.body;

  // Crear un arreglo de promesas
  const promises = situaciones.map((situacion) => {
    return new Promise((resolve, reject) => {
      dbQuery.getRespondidos(situacion, (err, n_alum_respondido) => {
        if (!err) {
          // Verificar si n_alum_respondido es un número y agregarlo a la suma
          if (typeof n_alum_respondido === 'number') {
            resolve(n_alum_respondido); // Resolvemos la promesa con el n_alum_respondido
          } else {
            resolve(0); // Si no es un número, resolvemos la promesa con 0
          }
        } else {
          reject(err);
        }
      });
    });
  });
  // Ejecutar todas las promesas y realizar la suma de n_alum_respondido
  Promise.all(promises)
    .then((results) => {
      const suma = results.reduce((acc, curr) => acc + curr, 0);
      res.json({ suma });
    })
    .catch((err) => {
      res.status(500).json({ error: 'Error al obtener el numero de respondidos' });
    });
});



router.post('/desactivarCampana', (req, res) => {
  const { situaciones, fecha_hora_cierre } = req.body;

  // Crear un arreglo de promesas
  const promises = situaciones.map((situacion) => {
    return new Promise((resolve, reject) => {
      dbQuery.isActiva(situacion, (err, isActive) => {
        if (!err) {
          if (isActive) {
            dbQuery.desactivarCampana(situacion, fecha_hora_cierre, (err, rdo) => {
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
      res.json(err);

      //res.status(401).json({ error: err });
    });
});



router.post('/getResultadosInformePersonal', (req, res) => {
  const { cod_encuesta, situaciones, idioma } = req.body;

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



router.post('/getHistoricoPregunta', (req, res) => {
  const { usuario, cod_asignatura, cod_pregunta, idioma } = req.body;

  dbQuery.getSituacionesAsignatura(usuario, cod_asignatura, cod_pregunta, idioma, (err, campannas) => {
    if (!err) {
      res.json(campannas);
    } else {
      res.json(err);
    }
  });
});


// ---------- getters de la media de un conjunto de situaciones docnetyes para la comparativa de informes ----------

router.post('/getMediaAsignatura', (req, res) => {
  const { cod_asignatura, cod_encuesta, idioma } = req.body;

  dbQuery.getMediaAsignatura(cod_asignatura, cod_encuesta, idioma,(err, campannas) => {
    if (!err) {
      res.json(campannas);
    } else {
      res.json(err);
    }
  });
});

router.post('/getMediaGrupo', (req, res) => {
  const { cod_grupo, cod_encuesta, idioma } = req.body;

  dbQuery.getMediaGrupo(cod_grupo, cod_encuesta, idioma, (err, campannas) => {
    if (!err) {
      res.json(campannas);
    } else {
      res.json(err);
    }
  });
});

router.post('/getMediaDepartamento', (req, res) => {
  const { cod_departamento, cod_encuesta, idioma } = req.body;

  dbQuery.getMediaDepartamento(cod_departamento, cod_encuesta, idioma, (err, campannas) => {
    if (!err) {
      res.json(campannas);
    } else {
      res.json(err);
    }
  });
});

router.post('/getMediaCurso', (req, res) => {
  const { cod_curso, cod_encuesta, idioma } = req.body;

  dbQuery.getMediaCurso(cod_curso, cod_encuesta, idioma, (err, campannas) => {
    if (!err) {
      res.json(campannas);
    } else {
      res.json(err);
    }
  });
});

router.post('/getMediaTitulacion', (req, res) => {
  const { cod_titulacion, cod_encuesta, idioma } = req.body;

  dbQuery.getMediaTitulacion(cod_titulacion, cod_encuesta, idioma, (err, campannas) => {
    if (!err) {
      res.json(campannas);
    } else {
      res.json(err);
    }
  });
});

router.post('/getMediaCentro', (req, res) => {
  const { cod_centro, cod_encuesta, idioma } = req.body;

  dbQuery.getMediaCentro(cod_centro, cod_encuesta, idioma, (err, campannas) => {
    if (!err) {
      res.json(campannas);
    } else {
      res.json(err);
    }
  });
});



// se exporta el ruter del usuario para poder usarlo desde app.js (todas las rutas)
module.exports = router;