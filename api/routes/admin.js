const express = require('express');
const router = express.Router();
const dbQuery = require('../database/dbQuerys'); // Importa el archivo "dbQuery.js"


router.post('/getCampannas', (req, res) => {

  const { ratio_respuestas, año_curso } = req.body;
  
    dbQuery.getCampannasValidasAdmin(año_curso, ratio_respuestas, (err, campannas) => {
      if (!err) {
        res.json(campannas);
      } else {
        res.json(err);
      }
    });
});

router.post('/getAnnosCursos', (req, res) => {
  
  dbQuery.getAnnosCursos((err, años) => {
    if (!err) {
      res.json(años);
    } else {
      res.json(err);
    }
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
            dbQuery.desactivarCampanaAdmin(situacion, fecha_hora_cierre, (err, rdo) => {
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

router.post("/abrirCampannaAdmin", (req, res) => {
  const { situaciones, fechaHoraFinActivacion } = req.body;

  // Crear un arreglo de promesas
  const promises = situaciones.map((situacion) => {
    return new Promise((resolve, reject) => {
      dbQuery.isActiva(situacion, (err, isActive) => {
        if (!err) {
          if (!isActive) {
            // setear la fecha de inicio y fin de la activacion
            dbQuery.activarCampannaAdminConMensaje(situacion, fechaHoraFinActivacion, (err, cod_usuarios) => {
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
            });
          } else {
            // Si es activa, resolvemos la promesa con null
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
      console.log("results " +results)
      res.json(true);
    })
    .catch((err) => {
      console.log("err "+err)
      res.json(err);
    });
});


router.post("/mandarMensajeApertura", (req, res) => {
  const { mensaje, situaciones } = req.body;

  // Crear un arreglo de promesas
  const promises = situaciones.map((situacion) => {
    return new Promise((resolve, reject) => {
      console.log(situacion)
      dbQuery.getCorreosDeSituacion(situacion, (err, correos) => {
        if (!err) {
          /*
          mandarEmails(mensaje, correos)
            .then(() => resolve(rdo))
            .catch((err) => reject(err));
          */
        } else {
          reject(err);
        }
      });
    });
  });

  // Ejecutar todas las promesas y enviar la respuesta una vez que todas se resuelvan
  Promise.all(promises)
    .then((results) => {
      console.log("results " +results)
      res.json(true);
    })
    .catch((err) => {
      console.log("err "+err)
      res.json(err);
    });
});


function mandarEmails(mensaje, cod_usuarios) {
  return new Promise((resolve, reject) => {
    const transporter = nodemailer.createTransport({
      // Configuración del transporte de correo electrónico (puedes ajustar esto según tus necesidades)
      service: 'Gmail',
      auth: {
        user: 'tu_email@gmail.com',
        pass: 'tu_contraseña',
      },
    });

    const mailOptions = {
      from: 'tu_email@gmail.com',
      to: cod_usuarios.join(','),
      subject: 'Asunto del correo',
      text: mensaje,
    };

    transporter.sendMail(mailOptions, (err) => {
      if (!err) {
        resolve(true);
      } else {
        reject(err);
      }
    });
  });
}



// se exporta el ruter del usuario para poder usarlo desde app.js (todas las rutas)
module.exports = router;