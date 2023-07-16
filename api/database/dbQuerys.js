const mysqlConnection = require('./connection'); // Importa tu archivo de conexión a MySQL
const CryptoJS = require("crypto-js");
const config = require('../../config'); // importar el fichero que contiene la clave secreta para el token


function getUser(user, pass, rol, callback) {
  const iterations = 1000;
  const hash = CryptoJS.PBKDF2(pass, config.saltHash, { keySize: 256/32, iterations });

  mysqlConnection.query(
    'SELECT cod_usuario FROM usuario WHERE cod_usuario  = ? AND contrasena = ?',
    [user, hash.toString()],
    (err, rows, fields) => {
      if (!err) {
        if (rows.length > 0) {
          const userData = {
            usuario: rows[0].cod_usuario,
            rol: rol
          };
          callback(null, userData);
        } else {
          callback('Usuario o clave incorrectos');
        }
      } else {
        callback(err);
      }
    }
  );
}

function getRole(user, callback) {

  mysqlConnection.query(
    'SELECT rol FROM usuario WHERE cod_usuario  = ?',
    [user],
    (err, rows, fields) => {
      if (!err) {
        if (rows.length > 0) {
          const role = rows[0].rol;
          callback(null, role);
        } else {
          callback('Usuario o clave incorrectos');
        }
      } else {
        callback(err);
      }
    }
  );
}

//---------------------------------- alumnos ----------------------------------------------


function getCampanasValidasPorUsuario(usuario, callback) {
  const query = `
    SELECT c.cod_campana, c.nombre, c.fecha_fin, sd.activada, c.cod_encuesta,
           sd.cod_situacion_docente, sd.cod_asignatura, a.nombre_asignatura, sd.cod_docente, d.nombre_docente,
           sd.num_curso, c.año_curso, ac.fecha_hora_cierre
    FROM campana AS c
    JOIN situacion_docente AS sd ON c.cod_campana = sd.cod_campana
    JOIN alumno_situacion_doc AS asd ON sd.cod_situacion_docente = asd.cod_situacion_docente
    JOIN asignatura AS a ON sd.cod_asignatura = a.cod_asignatura
    JOIN docente AS d ON sd.cod_docente = d.cod_docente
    LEFT JOIN activacion_campana AS ac ON sd.cod_situacion_docente = ac.cod_situacion_docente
    WHERE asd.cod_alumno = ?
    AND c.fecha_ini <= NOW()
    AND (sd.activada = 0 AND c.fecha_fin >= NOW() OR sd.activada >= 1 AND ac.fecha_hora_cierre >= NOW())
  `;

  mysqlConnection.query(query, [usuario], (err, rows, fields) => {
    if (!err) {
      const campanasValidas = rows.map((row) => {
        return {
          cod_campana: row.cod_campana,
          nombre_campana: row.nombre,
          fecha_fin: row.fecha_fin,
          veces_activada: row.activada,
          cod_encuesta: row.cod_encuesta,
          cod_situacion_docente: row.cod_situacion_docente,
          cod_asignatura: row.cod_asignatura,
          nombre_asignatura: row.nombre_asignatura,
          cod_docente: row.cod_docente,
          nombre_docente: row.nombre_docente,
          num_curso: row.num_curso,
          año_curso: row.año_curso,
          fecha_fin_activacion: row.fecha_hora_cierre
        };
      });
      
      callback(null, campanasValidas);
    } else {
      callback(err);
    }
  });
}


function getPreguntasEncuesta(cod_encuesta, idioma, callback) {
  mysqlConnection.query(
    `SELECT pe.cod_pregunta, tp.texto, p.numerica
    FROM pregunta_en_encuesta pe
    JOIN texto_pregunta tp ON pe.cod_pregunta = tp.cod_pregunta
    JOIN pregunta p ON pe.cod_pregunta = p.cod_pregunta
    WHERE pe.cod_encuesta = ? AND tp.cod_idioma = ?`,
    [cod_encuesta, idioma],
    (err, rows, fields) => {
      if (err) {
        callback(err);
        return;
      }

      // Para cada pregunta, obtener las posibles respuestas según el tipo de pregunta
      const result = rows.map((row) => {
        const pregunta = {
          cod_pregunta: row.cod_pregunta,
          texto_pregunta: row.texto,
          numerica: row.numerica
        };

        if (row.numerica) {
          // Pregunta numérica, obtener las respuestas de respuesta_numerica_de_pregunta
          return new Promise((resolve, reject) => {
            mysqlConnection.query(
              `SELECT rnp.cod_respuesta_numerica
              FROM respuesta_numerica_de_pregunta rnp
              WHERE rnp.cod_pregunta = ?`,
              [row.cod_pregunta],
              (err, rows, fields) => {
                if (err) {
                  reject(err);
                } else {
                  const respuestas = rows.map((respuesta) => ({
                    cod_respuesta: respuesta.cod_respuesta_numerica,
                    texto: respuesta.cod_respuesta_numerica,
                  }));resolve({ ...pregunta, respuestas });
                }
              }
            );
          });
        } else {
          // Pregunta verbal, obtener las respuestas de respuesta_verbal y texto_respuesta en el idioma especificado
          return new Promise((resolve, reject) => {
            mysqlConnection.query(
              `SELECT tr.cod_respuesta_verbal, tr.texto
              FROM respuesta_verbal rv
              JOIN texto_respuesta tr ON rv.cod_respuesta_verbal = tr.cod_respuesta_verbal
              WHERE rv.cod_pregunta = ? AND tr.cod_idioma = ?`,
              [row.cod_pregunta, idioma],
              (err, rows, fields) => {
                if (err) {
                  reject(err);
                } else {
                  const respuestas = rows.map((respuesta) => ({
                    cod_respuesta: respuesta.cod_respuesta_verbal,
                    texto: respuesta.texto,
                  }));
                  resolve({ ...pregunta, respuestas });
                }
              }
            );
          });
        }
      });

      // Ejecutar todas las promesas y retornar el resultado final al callback
      Promise.all(result)
        .then((encuesta) => {
          callback(null, encuesta);
        })
        .catch((err) => {
          callback(err);
        });
    }
  );
}

function getSDsAlumno(user, callback) {
  mysqlConnection.query(
    'SELECT cod_situacion_docente FROM alumno_situacion_doc WHERE cod_alumno  = ?',
    [user],
    (err, rows, fields) => {
      if (!err) {
        if (rows.length > 0) {
          const situaciones_docentes = rows.map(row => row.cod_situacion_docente);
          callback(null, situaciones_docentes);
        } else {
          callback('Usuario o clave incorrectos');
        }
      } else {
        callback(err);
      }
    }
  );
}


function isActiva(cod_situacion_docente, callback) {
  const currentDate = new Date().toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).replace(/(\d+)\/(\d+)\/(\d+),/, '$3-$2-$1')

  mysqlConnection.query(
    'SELECT * FROM activacion_campana WHERE cod_situacion_docente = ? AND fecha_hora_ini < ? AND fecha_hora_cierre > ?',
    [cod_situacion_docente, currentDate, currentDate],
    (err, rows, fields) => {
      if (!err) {
        const isActive = rows.length > 0;
        callback(null, isActive);
      } else {
        callback(err);
      }
    }
  );
}


function isValida(cod_situacion_docente, callback) {

  const currentDate = new Date().toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).replace(/(\d+)\/(\d+)\/(\d+),/, '$3-$2-$1')

  mysqlConnection.query(
    'SELECT * FROM campana WHERE cod_campana = (SELECT cod_campana FROM situacion_docente WHERE cod_situacion_docente = ?) AND ? >= fecha_ini AND ? <= fecha_fin',
    [cod_situacion_docente, currentDate, currentDate],
    (err, rows, fields) => {
      if (!err) {
        const isValida = rows.length > 0;
        callback(null, isValida);
      } else {
        callback(err);
      }
    }
  );
}




function setRespuestas(cod_situacion_docente, respuestas, callback) {
  const queries = [];
  
  for (let i = 0; i < respuestas.length; i++) {
    const respuesta = respuestas[i];
    
    if (respuesta.numerica === 1) {
      const query = `INSERT INTO respuesta_numerica_alumnos (cod_situacion_docente, cod_respuesta_numerica, cod_pregunta, cuantos)
                     VALUES (?, ?, ?, 1)
                     ON DUPLICATE KEY UPDATE cuantos = cuantos + 1`;
      queries.push({query, params: [cod_situacion_docente, respuesta.cod_respuesta, respuesta.cod_pregunta]});

    } else {
      const query = `INSERT INTO respuesta_verbal_alumnos (cod_situacion_docente, cod_respuesta_verbal, cuantos)
                     VALUES (?, ?, 1)
                     ON DUPLICATE KEY UPDATE cuantos = cuantos + 1`;
      queries.push({query,params: [cod_situacion_docente, respuesta.cod_respuesta]});
    }
  }
  
  // Las consultas se ejecutan en serie utilizando una función recursiva llamada executeQueries
  // ejecuta cada consulta secuencialmente hasta que se hayan ejecutado todas las consultas o se produzca un error
  const executeQueries = (index) => {
    if (index >= queries.length) {
      callback(null);
      return;
    }
    
    const { query, params } = queries[index];
    
    mysqlConnection.query(query, params, (err, result) => {
      if (err) {
        callback(err);
      } else {
        executeQueries(index + 1);
      }
    });
  };
  
  executeQueries(0);
}

function updateNumAlumRespond(cod_situacion_docente, callback) {
  mysqlConnection.query(
    'UPDATE situacion_docente SET n_alum_respondido = n_alum_respondido + 1 WHERE cod_situacion_docente = ?',
    [cod_situacion_docente],
    (err, rows, fields) => {
      if (!err) {
        callback(null);
      } else {
        callback(err);
      }
    }
  );
}



function deleteSDAlumno(user, situacion_docente, callback) {
  mysqlConnection.query(
    'DELETE FROM alumno_situacion_doc WHERE cod_alumno = ? AND cod_situacion_docente = ?',
    [user, situacion_docente],
    (err, result) => {
      if (!err) {
        if (result.affectedRows > 0) {
          callback(true); // Se eliminaron filas
        } else {
          callback(false); // No se encontraron filas para eliminar
        }
      } else {
        callback(err); // Error durante la eliminación
      }
    }
  );
}

//---------------------------------- docentes ----------------------------------------------

function getCampannasValidasDocente(user, callback) {

  const currentDate = new Date().toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).replace(/(\d+)\/(\d+)\/(\d+),/, '$3-$2-$1');
    

  const query = `
    SELECT sd.cod_situacion_docente, sd.n_alum_total, sd.n_alum_respondido, a.nombre_Asignatura, c.fecha_fin, sd.num_curso, c.año_curso, sd.activada, sd.agrupado_con, ac.fecha_hora_cierre
    FROM situacion_docente sd
    INNER JOIN campana c ON sd.cod_campana = c.cod_campana
    JOIN asignatura AS a ON sd.cod_asignatura = a.cod_asignatura
    LEFT JOIN (
      SELECT cod_situacion_docente, MAX(fecha_hora_ini) AS max_fecha_hora_ini
      FROM activacion_campana
      WHERE '${currentDate}' <= fecha_hora_cierre
      GROUP BY cod_situacion_docente
    ) ac_latest ON sd.cod_situacion_docente = ac_latest.cod_situacion_docente
    LEFT JOIN activacion_campana ac ON ac_latest.cod_situacion_docente = ac.cod_situacion_docente AND ac_latest.max_fecha_hora_ini = ac.fecha_hora_ini
    WHERE sd.cod_docente = ? AND
    '${currentDate}' BETWEEN c.fecha_ini AND c.fecha_fin
    ORDER BY
      CASE WHEN ac.fecha_hora_cierre IS NOT NULL THEN 0 ELSE 1 END, 
      CASE WHEN ac.fecha_hora_cierre IS NULL THEN 1 ELSE 0 END, 
      ac.fecha_hora_cierre ASC,
      sd.activada ASC, 
      CASE WHEN ac.fecha_hora_cierre IS NULL THEN sd.activada END ASC,
      c.fecha_fin ASC
  `;

  /**************************** CRITERIOS DE ORDENACION DE LAS CAMPAÑAS DEVUELTAS ***************************** 

  --> CRITERIO PRINCIPAL
    -- Mostrar primero las campañas activas: aquellas situaciones docentes con fecha_hora_cierre no nula

  --> CAMPAÑAS ACTIVAS (ENCUESTA ABIERTA)
    -- Ordenar por fecha_hora_cierre ascendente
    -- En caso de empate, ordenar por veces_abierta ascendente: primero las que menos veces han sido abiertas

  --> CAMPAÑAS INACTIVA (ENCUESTA CERRADA)
    -- Primero las que menos veces han sido abiertas: Ordenar por veces_activada ascendente para las situaciones docentes con fecha_hora_cierre NULL
    -- En caso de empate, se muestran primero las que tienen fecha de expiracion proxima: Ordenar por fecha_fin ascendente

  **************************************************************************************************************/

  mysqlConnection.query(query, [user], (err, rows, fields) => {
    if (!err) {
      const situacionesDocentes = []; // Array para almacenar las situaciones docentes individuales
      const agrupados = {}; // Objeto para almacenar las situaciones docentes agrupadas

      // Recorre las filas de resultados y separa las situaciones docentes agrupadas de las no agrupadas
      rows.forEach(row => {
        const { cod_situacion_docente, agrupado_con } = row;
        if (agrupado_con) {
          if (agrupados[agrupado_con]) {
            agrupados[agrupado_con].push(cod_situacion_docente);
          } else {
            agrupados[agrupado_con] = [cod_situacion_docente];
          }
        } else {
          situacionesDocentes.push(row);
        }
      });

      // Recorre las situaciones docentes individuales y agrega los valores de n_alum_total y n_alum_respondido a las situaciones docentes agrupadas correspondientes
      situacionesDocentes.forEach(row => {
        const { cod_situacion_docente } = row;
        if (agrupados[cod_situacion_docente]) {
          row.agrupado_con = agrupados[cod_situacion_docente].map(cod => {
            const agrupado = rows.find(r => r.cod_situacion_docente === cod);
            return {
              cod_situacion_docente: cod,
              n_alum_total: agrupado.n_alum_total,
              n_alum_respondido: agrupado.n_alum_respondido
            };
          });
        }
      });

      callback(null, situacionesDocentes);
    } else {
      callback(err);
    }
  });
}


function activarCampanna(situacion, fechaHoraFinActivacion, callback) {
  const fechaHoraIni = new Date(); // Obtener la fecha y hora actual

  mysqlConnection.query(
    'SELECT c.fecha_ini, c.fecha_fin FROM campana c INNER JOIN situacion_docente sd ON c.cod_campana = sd.cod_campana WHERE sd.cod_situacion_docente = ?',
    [situacion],
    (err, rows, fields) => {
      if (err) {
        callback(err);
        return;
      }

      const fechaIniCampana = rows[0].fecha_ini;
      const fechaFinCampana = rows[0].fecha_fin;

      if (fechaHoraFinActivacion < fechaIniCampana) {
        const error = new Error('La fechaHoraFinActivacion es anterior a la fecha de inicio de la campaña');
        callback(error);
        return;
      }

      if (fechaHoraFinActivacion > fechaFinCampana) {
        const error = new Error('La fechaHoraFinActivacion es posterior a la fecha_fin de la campaña');
        callback(error);
        return;
      }

      mysqlConnection.query(
        'INSERT INTO activacion_campana (cod_situacion_docente, fecha_hora_ini, fecha_hora_cierre, abierta_por_docente) VALUES (?, ?, ?, ?)',
        [situacion, fechaHoraIni, fechaHoraFinActivacion, true], // true representa que está abierta por el docente
        (err, rows, fields) => {
          if (!err) {
            callback(null);
          } else {
            callback(err);
          }
        }
      );
    }
  );
}


function updateVecesAbierta(situacion, callback) {
  mysqlConnection.query(
    'UPDATE situacion_docente SET activada = activada + 1 WHERE cod_situacion_docente = ?',
    [situacion],
    (err, rows, fields) => {
      if (!err) {
        callback(null, true);
      } else {
        callback(err);
      }
    }
  );
}


function desactivarCampana(situacion, callback) {
  const fechaHoraCierre = new Date(); // Obtener la fecha y hora actual

  mysqlConnection.query(
    'UPDATE activacion_campana SET fecha_hora_cierre = ? WHERE cod_situacion_docente = ?',
    [fechaHoraCierre, situacion], // true representa que está abierta por el docente
    (err, rows, fields) => {
      if (!err && rows.affectedRows > 0) {
        callback(null, true); // La actualización se realizó correctamente
      } else {
        callback(err || "No se encontraron filas para actualizar.");
      }
    }
  );
}


function getRespondidos(situacion, callback) {

  mysqlConnection.query(
    'SELECT n_alum_respondido FROM situacion_docente WHERE cod_situacion_docente = ?',
    [situacion], // true representa que está abierta por el docente
    (err, rows, fields) => {
      if (!err && rows.length > 0) {
        const n_alum_respondido = rows[0].n_alum_respondido;
        callback(null, n_alum_respondido); // La actualización se realizó correctamente
      } else {
        callback(err);
      }
    }
  );
}

function getAsignaturasPublicadas(usuario, callback) {
  mysqlConnection.query(
    `SELECT asignatura.nombre_asignatura, campana.año_curso, GROUP_CONCAT(situacion_docente.cod_situacion_docente) AS agrupado_con
    FROM asignatura 
    JOIN situacion_docente ON asignatura.cod_asignatura = situacion_docente.cod_asignatura 
    JOIN campana ON situacion_docente.cod_campana = campana.cod_campana 
    WHERE situacion_docente.cod_docente = ? AND campana.informe_publicado = 1
    GROUP BY asignatura.cod_asignatura, asignatura.nombre_asignatura, campana.año_curso`,
    [usuario],
    (err, rows, fields) => {
      if (!err) {
        if (rows && rows.length > 0) {
          const asignaturasPublicadas = [];
          const asignaturasAgrupadas = {};

          rows.forEach(row => {
            const { nombre_asignatura, año_curso, agrupado_con } = row;

            if (!asignaturasAgrupadas[nombre_asignatura]) {
              asignaturasAgrupadas[nombre_asignatura] = {};
            }

            if (!asignaturasAgrupadas[nombre_asignatura][año_curso]) {
              asignaturasAgrupadas[nombre_asignatura][año_curso] = {
                situaciones_docentes: []
              };
            }

            if (agrupado_con) {
              asignaturasAgrupadas[nombre_asignatura][año_curso].situaciones_docentes.push(...agrupado_con.split(","));
            }
          });

          for (const nombre_asignatura in asignaturasAgrupadas) {
            const año_cursoObj = asignaturasAgrupadas[nombre_asignatura];
            const asignatura = {
              nombre_asignatura: nombre_asignatura
            };

            for (const año_curso in año_cursoObj) {
              asignatura[año_curso] = año_cursoObj[año_curso];
            }

            asignaturasPublicadas.push(asignatura);
          }

          callback(null, asignaturasPublicadas);
        } else {
          callback(null, []);
        }
      } else {
        callback(err);
      }
    }
  );
}

function getDatosSD(codSituacionDocente, callback) {
  const query = `
    SELECT 
      cpa.cod_encuesta,
      c.cod_centro, c.nombre_centro,
      t.cod_grado, t.nombre_grado,
      d.cod_depto, d.nombre_depto,
      p.cod_docente, p.nombre_docente,
      a.cod_asignatura, a.nombre_asignatura,
      g.cod_grupo, g.nombre_grupo,
      s.num_curso, cpa.año_curso,
      s.cod_campana, s.cod_situacion_docente,
      s.n_alum_total, s.n_alum_respondido
    FROM situacion_docente s
    INNER JOIN centro c ON s.cod_centro = c.cod_centro
    INNER JOIN grado t ON s.cod_grado = t.cod_grado
    INNER JOIN docente p ON s.cod_docente = p.cod_docente
    INNER JOIN asignatura a ON s.cod_asignatura = a.cod_asignatura
    INNER JOIN grupo g ON s.cod_grupo = g.cod_grupo
    INNER JOIN departamento d ON d.cod_centro = c.cod_centro
    INNER JOIN campana cpa ON s.cod_campana = cpa.cod_campana
    WHERE s.cod_situacion_docente = ?
  `;

  mysqlConnection.query(query, [codSituacionDocente], (err, rows) => {
    if (err) {
      callback(err);
    } else if (rows.length === 0) {
      callback("No se encontraron datos.");
    } else {
      const result = rows[0];
      rdo = {
        centro: {
          codigo: result.cod_centro,
          nombre: result.nombre_centro
        },
        titulacion: {
          codigo: result.cod_grado,
          nombre: result.nombre_grado
        },
        departamento: {
          codigo: result.cod_depto,
          nombre: result.nombre_depto
        },
        profesor: {
          codigo: result.cod_docente,
          nombre: result.nombre_docente
        },
        asignatura: {
          codigo: result.cod_asignatura,
          nombre: result.nombre_asignatura
        },
        grupo: {
          codigo: result.cod_grupo,
          nombre: result.nombre_grupo
        },
        curso: {
          codigo: result.num_curso,
          año_curso: result.año_curso
        },
        encuesta: result.cod_encuesta,
        situacion: result.cod_situacion_docente,
        plazasMatriculadas: result.n_alum_total,
        numCuestionarios: result.n_alum_respondido || 0
      }
      callback(null, rdo);
    }
  });
}



function getResultadosInformePersonal(cod_encuesta, cod_situacion_docente, idioma, callback) {
  mysqlConnection.query(
    `SELECT pe.cod_pregunta, tp.texto, p.numerica
    FROM pregunta_en_encuesta pe
    JOIN texto_pregunta tp ON pe.cod_pregunta = tp.cod_pregunta
    JOIN pregunta p ON pe.cod_pregunta = p.cod_pregunta
    WHERE pe.cod_encuesta = ? AND tp.cod_idioma = ?`,
    [cod_encuesta, idioma],
    (err, rows, fields) => {
      if (err) {
        callback(err);
        return;
      }

      // Para cada pregunta, obtener las posibles respuestas según el tipo de pregunta
      const result = rows.map((row) => {
        const pregunta = {
          cod_pregunta: row.cod_pregunta,
          texto_pregunta: row.texto,
          numerica: row.numerica
        };

        if (row.numerica) {
          // Pregunta numérica, obtener las respuestas sin calcular la media
          return new Promise((resolve, reject) => {
            mysqlConnection.query(
              `SELECT rnp.cod_respuesta_numerica, IFNULL(rna.cuantos, 0) AS cuantos
              FROM respuesta_numerica_de_pregunta rnp
              LEFT JOIN respuesta_numerica_alumnos rna ON rna.cod_respuesta_numerica = rnp.cod_respuesta_numerica AND rna.cod_pregunta = rnp.cod_pregunta AND rna.cod_situacion_docente = ?
              WHERE rnp.cod_pregunta = ? AND rna.cod_respuesta_numerica IN ('1', '2', '3', '4', '5') AND rna.cod_situacion_docente = ?
              GROUP BY rnp.cod_respuesta_numerica`,
              [cod_situacion_docente, row.cod_pregunta, cod_situacion_docente],
              (err, rows, fields) => {
                if (err) {
                  reject(err);
                } else {
                  const respuestas = [
                    { cod_respuesta: '1', cuantos: 0 },
                    { cod_respuesta: '2', cuantos: 0 },
                    { cod_respuesta: '3', cuantos: 0 },
                    { cod_respuesta: '4', cuantos: 0 },
                    { cod_respuesta: '5', cuantos: 0 }
                  ];

                  rows.forEach((respuesta) => {
                    const index = parseInt(respuesta.cod_respuesta_numerica) - 1;
                    respuestas[index].cuantos = respuesta.cuantos;
                  });

                  resolve({ ...pregunta, respuestas });
                }
              }
            );
          });
        } else {
          // Pregunta verbal, obtener las respuestas de respuesta_verbal y texto_respuesta en el idioma especificado
          return new Promise((resolve, reject) => {
            mysqlConnection.query(
              `SELECT tr.cod_respuesta_verbal, tr.texto, IFNULL(rva.cuantos, 0) AS cuantos
              FROM respuesta_verbal rv
              JOIN texto_respuesta tr ON rv.cod_respuesta_verbal = tr.cod_respuesta_verbal
              LEFT JOIN respuesta_verbal_alumnos rva ON rva.cod_respuesta_verbal = tr.cod_respuesta_verbal AND rva.cod_situacion_docente = ?
              WHERE rv.cod_pregunta = ? AND tr.cod_idioma = ? AND rva.cod_situacion_docente = ?
              GROUP BY tr.cod_respuesta_verbal`,
              [cod_situacion_docente, row.cod_pregunta, idioma, cod_situacion_docente],
              (err, rows, fields) => {
                if (err) {
                  reject(err);
                } else {
                  const respuestas = rows.map((respuesta) => ({
                    cod_respuesta: respuesta.cod_respuesta_verbal,
                    texto: respuesta.texto,
                    cuantos: respuesta.cuantos || 0,
                  }));

                  resolve({ ...pregunta, respuestas });
                }
              }
            );
          });
        }
      });

      // Ejecutar todas las promesas y retornar el resultado final al callback
      Promise.all(result)
        .then((encuesta) => {
          callback(null, encuesta);
        })
        .catch((err) => {
          callback(err);
        });
    }
  );
}




function getSituacionesAsignatura(profesor, asignatura, cod_pregunta, idioma, callback) {
  mysqlConnection.query(
    'SELECT sd.cod_situacion_docente, c.año_curso ' +
    'FROM situacion_docente sd ' +
    'INNER JOIN campana c ON sd.cod_campana = c.cod_campana ' +
    'WHERE sd.cod_docente = ? AND sd.cod_asignatura = ?',
    [profesor, asignatura],
    (err, rows, fields) => {
      if (!err) {
        const results = [];

        // Agrupar situaciones docentes por año_curso
        const groupedResults = {};
        rows.forEach((row) => {
          const year = row.año_curso;
          if (groupedResults[year]) {
            groupedResults[year].cod_situacion_docente.push(row.cod_situacion_docente);
          } else {
            groupedResults[year] = {
              cod_situacion_docente: [row.cod_situacion_docente],
              año_curso: year,
            };
          }
        });

        // Convertir objeto agrupado en un array de resultados
        for (const year in groupedResults) {
          results.push(groupedResults[year]);
        }

        // Llamar a getResultadosPregunta por cada situación docente
        const totalResults = results.length;
        let processedResults = 0;

        results.forEach((result) => {
          getResultadosPregunta(cod_pregunta, result.cod_situacion_docente, idioma, (err, preguntaResult) => {
            if (!err) {
              result.respuestas = preguntaResult.respuestas;
            } else {
              callback(err);
              return;
            }

            processedResults++;
            if (processedResults === totalResults) {
              callback(null, results);
            }
          });
        });
      } else {
        callback(err);
      }
    }
  );
}



function getResultadosPregunta(cod_pregunta, cod_situacion_docente, idioma, callback) {

  // Obtén el último elemento del array cod_situacion_docente
  const lastCodSituacionDocente = cod_situacion_docente[cod_situacion_docente.length - 1];

  // Construye el placeholder para el último elemento
  const placeholders = cod_situacion_docente.map(() => '?').join(', ') + ', ?';

  // Agrega el último elemento al array de parámetros
  const params = [...cod_situacion_docente, lastCodSituacionDocente, cod_pregunta, idioma, ...cod_situacion_docente];


  // Pregunta numérica, obtener las respuestas sin calcular la media
  mysqlConnection.query(
    `SELECT rnp.cod_respuesta_numerica, IFNULL(SUM(rna.cuantos), 0) AS cuantos
    FROM respuesta_numerica_de_pregunta rnp
    LEFT JOIN respuesta_numerica_alumnos rna ON rna.cod_respuesta_numerica = rnp.cod_respuesta_numerica AND rna.cod_pregunta = rnp.cod_pregunta AND rna.cod_situacion_docente IN (${placeholders})
    WHERE rnp.cod_pregunta = ? AND rna.cod_respuesta_numerica IN ('1', '2', '3', '4', '5') AND rna.cod_situacion_docente IN (${placeholders})
    GROUP BY rnp.cod_respuesta_numerica`,
    params,
    (err, rows, fields) => {
      if (err) {
        callback(err);
        return;
      }

      const respuestas = [
        { cod_respuesta: '1', cuantos: 0 },
        { cod_respuesta: '2', cuantos: 0 },
        { cod_respuesta: '3', cuantos: 0 },
        { cod_respuesta: '4', cuantos: 0 },
        { cod_respuesta: '5', cuantos: 0 }
      ];

      rows.forEach((respuesta) => {
        const index = parseInt(respuesta.cod_respuesta_numerica) - 1;
        respuestas[index].cuantos += respuesta.cuantos;
      });

      const result = { respuestas };
      callback(null, result);
    }
  );
}


// ---------- getters de la media de un conjunto de situaciones docnetyes para la comparativa de informes ----------

function getMediaAsignatura(cod_asignatura, cod_encuesta, idioma, callback) {
  mysqlConnection.query(
    `SELECT cod_situacion_docente
    FROM situacion_docente
    WHERE cod_asignatura = ?`,
    [cod_asignatura],
    (err, rows, fields) => {
      if (!err) {
        const situacionesDocentes = rows.map((row) => row.cod_situacion_docente);
        getMediasGeneral(cod_encuesta, situacionesDocentes, idioma, callback);
      } else {
        callback(err);
      }
    }
  );
}

function getMediaGrupo(cod_grupo, cod_encuesta, idioma, callback) {

  mysqlConnection.query(
    `SELECT cod_situacion_docente
    FROM situacion_docente
    WHERE cod_grupo = ?`,
    [cod_grupo],
    (err, rows, fields) => {
      if (!err) {
        const situacionesDocentes = rows.map((row) => row.cod_situacion_docente);
        getMediasGeneral(cod_encuesta, situacionesDocentes, idioma, callback);
      } else {
        callback(err);
      }
    }
  );
}

function getMediaDepartamento(cod_departamento, cod_encuesta, idioma, callback) {

  mysqlConnection.query(
    `SELECT cod_situacion_docente
    FROM situacion_docente
    WHERE cod_departamento = ?`,
    [cod_departamento],
    (err, rows, fields) => {
      if (!err) {
        const situacionesDocentes = rows.map((row) => row.cod_situacion_docente);
        getMediasGeneral(cod_encuesta, situacionesDocentes, idioma, callback);
      } else {
        callback(err);
      }
    }
  );
}

function getMediaCurso(cod_curso, cod_encuesta, idioma, callback) {
  mysqlConnection.query(
    `SELECT cod_situacion_docente
    FROM situacion_docente
    WHERE num_curso = ?`,
    [cod_curso],
    (err, rows, fields) => {
      if (!err) {
        const situacionesDocentes = rows.map((row) => row.cod_situacion_docente);
        getMediasGeneral(cod_encuesta, situacionesDocentes, idioma, callback);
      } else {
        callback(err);
      }
    }
  );
}

function getMediaTitulacion(cod_titulacion, cod_encuesta, idioma, callback) {
  mysqlConnection.query(
    `SELECT cod_situacion_docente
    FROM situacion_docente
    WHERE cod_grado = ?`,
    [cod_titulacion],
    (err, rows, fields) => {
      if (!err) {
        const situacionesDocentes = rows.map((row) => row.cod_situacion_docente);
        getMediasGeneral(cod_encuesta, situacionesDocentes, idioma, callback);
      } else {
        callback(err);
      }
    }
  );
}

function getMediaCentro(cod_centro, cod_encuesta, idioma, callback) {
  mysqlConnection.query(
    `SELECT cod_situacion_docente
    FROM situacion_docente
    WHERE cod_centro = ?`,
    [cod_centro],
    (err, rows, fields) => {
      if (!err) {
        const situacionesDocentes = rows.map((row) => row.cod_situacion_docente);
        getMediasGeneral(cod_encuesta, situacionesDocentes, idioma, callback);
      } else {
        callback(err);
      }
    }
  );
}


function getMediasGeneral(cod_encuesta, situacionesDocentes, idioma, callback) {

  const promises = situacionesDocentes.map((situacion) => {
    return new Promise((resolve, reject) => {
      getResultadosInformePersonal(cod_encuesta, situacion, idioma, (err, encuesta) => {
        if (!err) {
          resolve(encuesta);
        } else {
          reject(err);
        }
      });
    });
  });

  Promise.all(promises)
    .then((results) => {
      const jsonResult = {};

      // Combinar los resultados de las encuestas
      results.forEach((encuesta) => {
        encuesta.forEach((respuesta) => {
          const cod_pregunta = respuesta.cod_pregunta;

          if (!jsonResult[cod_pregunta]) {
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
            jsonResult[cod_pregunta].media.push(parseFloat(respuesta.media));
          }
        });
      });

      // Calcular la media final
      Object.values(jsonResult).forEach((pregunta) => {
        if (pregunta.media.length > 0) {
          const mediaSum = pregunta.media.reduce((sum, value) => sum + value, 0);
          pregunta.media = (mediaSum / pregunta.media.length).toFixed(2);
        } else {
          pregunta.media = '-';
        }
      });

      callback(null, jsonResult);
    })
    .catch((err) => {
      callback(err);
    });
}


//---------------------------------- admins ----------------------------------------------

function getCampannasValidasAdmin(año_curso, ratio_respuestas, callback) {
  const currentDate = new Date().toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).replace(/(\d+)\/(\d+)\/(\d+),/, '$3-$2-$1');

  let query = `
    SELECT sd.cod_situacion_docente, sd.n_alum_total, sd.n_alum_respondido, a.nombre_Asignatura, c.fecha_fin, sd.num_curso, c.año_curso, sd.activada, sd.agrupado_con, ac.fecha_hora_cierre
    FROM situacion_docente sd
    INNER JOIN campana c ON sd.cod_campana = c.cod_campana
    JOIN asignatura AS a ON sd.cod_asignatura = a.cod_asignatura
    LEFT JOIN (
      SELECT cod_situacion_docente, MAX(fecha_hora_ini) AS max_fecha_hora_ini
      FROM activacion_campana
      WHERE '${currentDate}' <= fecha_hora_cierre
      GROUP BY cod_situacion_docente
    ) ac_latest ON sd.cod_situacion_docente = ac_latest.cod_situacion_docente
    LEFT JOIN activacion_campana ac ON ac_latest.cod_situacion_docente = ac.cod_situacion_docente AND ac_latest.max_fecha_hora_ini = ac.fecha_hora_ini`;

  if (año_curso !== '*') {
    query += ` WHERE c.año_curso = ?`;
  }

  query += `
    ORDER BY
      CASE WHEN ac.fecha_hora_cierre IS NOT NULL THEN 0 ELSE 1 END, 
      CASE WHEN ac.fecha_hora_cierre IS NULL THEN 1 ELSE 0 END, 
      ac.fecha_hora_cierre ASC,
      sd.activada ASC, 
      CASE WHEN ac.fecha_hora_cierre IS NULL THEN sd.activada END ASC,
      c.fecha_fin ASC
  `;

  const queryParams = (año_curso !== '*') ? [año_curso] : [];

  mysqlConnection.query(query, queryParams, (err, rows, fields) => {
    if (!err) {
      const situacionesDocentes = []; // Array para almacenar las situaciones docentes individuales
      const agrupados = {}; // Objeto para almacenar las situaciones docentes agrupadas

      // Recorre las filas de resultados y separa las situaciones docentes agrupadas de las no agrupadas
      rows.forEach(row => {
        const { cod_situacion_docente, agrupado_con } = row;
        if (agrupado_con) {
          if (agrupados[agrupado_con]) {
            agrupados[agrupado_con].push(cod_situacion_docente);
          } else {
            agrupados[agrupado_con] = [cod_situacion_docente];
          }
        } else {
          situacionesDocentes.push(row);
        }
      });

      // Recorre las situaciones docentes individuales y agrega los valores de n_alum_total y n_alum_respondido a las situaciones docentes agrupadas correspondientes
      situacionesDocentes.forEach(row => {
        const { cod_situacion_docente } = row;
        if (agrupados[cod_situacion_docente]) {
          row.agrupado_con = agrupados[cod_situacion_docente].map(cod => {
            const agrupado = rows.find(r => r.cod_situacion_docente === cod);
            return {
              cod_situacion_docente: cod,
              n_alum_total: agrupado.n_alum_total,
              n_alum_respondido: agrupado.n_alum_respondido
            };
          });
        }
      });

      // Filtrar las campañas según el ratio de respuestas
      const campañasFiltradas = situacionesDocentes.filter(row => {
        const { n_alum_respondido, n_alum_total } = row;
          const ratio = n_alum_respondido/n_alum_total;
          return ratio <= ratio_respuestas;
      });

      callback(null, campañasFiltradas);
    } else {
      callback(err);
    }
  });
}



function getAnnosCursos(callback) {
  mysqlConnection.query(
    'SELECT DISTINCT año_curso FROM campana',
    (err, rows, fields) => {
      if (!err && rows.length > 0) {
        const años = rows.map(row => row.año_curso);
        callback(null, años);
      } else {
        callback(err);
      }
    }
  );
}


function activarCampannaAdminConMensaje(situacion, fechaHoraFinActivacion, callback) {
  const fechaHoraIni = new Date(); // Obtener la fecha y hora actual

  mysqlConnection.query(
    'INSERT INTO activacion_campana (cod_situacion_docente, fecha_hora_ini, fecha_hora_cierre, abierta_por_docente) VALUES (?, ?, ?, ?)',
    [situacion, fechaHoraIni, fechaHoraFinActivacion, false], // true representa que está abierta por el docente
    (err, rows, fields) => {
      if (!err) {
        getCorreosDeSituacion(situacion, callback); // Llamar a la segunda función dentro del callback
      } else {
        callback(err);
      }
    }
  );
}

function getCorreosDeSituacion(situacion, callback) {
  mysqlConnection.query(
    'SELECT cod_alumno FROM alumno_situacion_doc WHERE cod_situacion_docente = ?',
    [situacion],
    (err, rows, fields) => {
      if (!err) {
        if (rows.length > 0) {
          const cod_alumnos = rows.map(row => row.cod_alumno);

          mysqlConnection.query(
            'SELECT email FROM usuario WHERE cod_usuario IN (?)',
            [cod_alumnos],
            (err, rows, fields) => {
              if (!err) {
                const correos = rows.map(row => row.email);
                callback(null, correos);
              } else {
                callback(err);
              }
            }
          );
        } else {
          callback('No se encontraron alumnos para la situación especificada');
        }
      } else {
        callback(err);
      }
    }
  );
}





// exportar las funciones definidas en este fichero
module.exports = {
  getUser,
  getRole,
  getCampanasValidasPorUsuario,
  getPreguntasEncuesta,
  getSDsAlumno,
  deleteSDAlumno,
  isActiva,
  isValida,
  setRespuestas,
  updateNumAlumRespond,
  getCampannasValidasDocente,
  activarCampanna,
  updateVecesAbierta,
  desactivarCampana,
  getRespondidos,
  getAsignaturasPublicadas,
  getDatosSD,
  getResultadosInformePersonal,
  getSituacionesAsignatura,
  getResultadosPregunta,
  getMediaAsignatura,
  getMediaGrupo,
  getMediaDepartamento,
  getMediaCurso,
  getMediaTitulacion,
  getMediaCentro,
  getCampannasValidasAdmin,
  getAnnosCursos,
  activarCampannaAdminConMensaje,
  getCorreosDeSituacion
};
