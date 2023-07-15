const express = require('express');
const router = express.Router();
const dbQuery = require('../database/dbQuerys'); // Importa el archivo "dbQuery.js"
const nodemailer = require('nodemailer');


router.post('/getCampannas', (req, res) => {
  
    dbQuery.getCampannasValidasAdmin((err, campannas) => {
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



router.post("/abrirCampannaConMensaje", (req, res) => {
  const { mensaje, situaciones, fechaHoraFinActivacion } = req.body;

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
                    mandarEmails(mensaje, cod_usuarios)
                      .then(() => resolve(rdo))
                      .catch((err) => reject(err));
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
      res.json(results);
    })
    .catch((err) => {
      res.status(401).json({ error: 'Error en el proceso de apertura de la campaña' });
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
        resolve();
      } else {
        reject(err);
      }
    });
  });
}



// se exporta el ruter del usuario para poder usarlo desde app.js (todas las rutas)
module.exports = router;