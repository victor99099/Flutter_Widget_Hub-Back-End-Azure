const sql = require('mssql');

// Configure the database connection details
const config = {
  user: 'wahab',
  password: 'Lionking.786',
  server: 'fwh-dbserver.database.windows.net', // e.g., localhost or IP address
  database: 'fwh-db',
  options: {
    encrypt: true, // Use encryption for SQL Server
    trustServerCertificate: true // If using self-signed certificates
  }
};

// Create a connection pool
const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('Connected to the database');
    return pool;
  })
  .catch(err => {
    console.error('Database connection failed:', err.message);
    process.exit(1); // Exit process if connection fails
  });

module.exports = {
  sql,
  poolPromise
};
