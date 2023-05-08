const mysql = require('mysql')

const mysqlConntection = mysql.createPool({
    host:'localhost',
    user: 'root',
    password: '',
    database: 'sireno',
    port: '3306'
});
 
// Ping database to check for common exception errors.
mysqlConntection.getConnection((err, connection) => {
    if (err) {
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.error('Database connection was closed.')
        }
        if (err.code === 'ER_CON_COUNT_ERROR') {
            console.error('Database has too many connections.')
        }
        if (err.code === 'ECONNREFUSED') {
            console.error('Database connection was refused.')
        }
    }
 
    if (connection) {
        connection.release()
        console.log('Database connected ');
    }
 
    return
})

module.exports = mysqlConntection