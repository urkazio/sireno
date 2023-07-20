const express = require('express');
const router = express.Router();
const dbQuery = require('../database/dbQuerys'); // Importa el archivo "dbQuery.js"
const nodemailer = require('nodemailer');
const config = require('../../config'); // Importa la configuración desde config.js


router.post('/getCampannas', (req, res) => {

  const { cod_campana, ratio_respuestas } = req.body;
  
    dbQuery.getCampannasValidasAdmin(cod_campana, ratio_respuestas, (err, campannas) => {
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
      res.json(true);
    })
    .catch((err) => {
      res.json(err);
    });
});


router.post("/mandarMensajeApertura", (req, res) => {
  const { asunto, mensaje, situaciones } = req.body;

  dbQuery.getCorreosDeSituacion(situaciones, (err, correos) => {
    if (!err) {
      // Configurar el transporte de correo
      const transporter = nodemailer.createTransport({
        // Configura el servicio de correo y las credenciales necesarias
        service: 'Gmail',
        auth: {
          user: 'urkogarcia12@gmail.com', // Dirección de correo electrónico remitente
          pass: config.pass_email // Utiliza la contraseña desde config.js
        }
      });

      // Iterar sobre cada correo electrónico y enviar el mensaje
      correos.forEach((correo) => {
        const mailOptions = {
          from: 'urkogarcia12@gmail.com', // Dirección de correo electrónico remitente
          to: correo,
          subject: asunto,
          text: mensaje
        };

        // Enviar el correo electrónico
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
          } else {
            console.log('Correo enviado: ' + info.response);
          }
        });
      });

      res.json(correos);
    } else {
      res.json(err);
    }
  });
});


// se exporta el ruter del usuario para poder usarlo desde app.js (todas las rutas)
module.exports = router;