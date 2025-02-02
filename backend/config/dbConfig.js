const sql = require("mssql");
require("dotenv").config();

// Configuración base de la base de datos
const baseConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  connectionTimeout: 30000,
  options: { encrypt: false, trustServerCertificate: true },
};

// Función para obtener la configuración de la base de datos con un nombre dinámico
const getDbConfig = (databaseName) => {
  return {
    ...baseConfig,
    database: databaseName, // Sobrescribe el nombre de la base de datos
  };
};

// Función para validar si la base de datos existe
const validateDatabaseExists = async (databaseName) => {
  let pool;
  try {
    // Conectar sin especificar una base de datos
    pool = await sql.connect(baseConfig);

    // Consultar las bases de datos disponibles
    const result = await pool.request().query(`
      SELECT name FROM sys.databases WHERE name = '${databaseName}'
    `);

    // Si no hay resultados, la base de datos no existe
    if (result.recordset.length === 0) {
      throw new Error(`La base de datos '${databaseName}' no existe.`);
    }

    return true; // La base de datos existe
  } catch (error) {
    console.error("Error al validar la base de datos:", error);
    throw error; // Lanza el error para manejarlo en el controlador
  } finally {
    if (pool) {
      await pool.close(); // Cierra la conexión solo si se estableció correctamente
    }
  }
};

// Función para conectar a la base de datos
const connectToDatabase = async (databaseName) => {
  try {
    // Validar si la base de datos existe
    await validateDatabaseExists(databaseName);

    // Conectar a la base de datos especificada
    const config = getDbConfig(databaseName);
    const pool = await sql.connect(config);
    console.log(`Conectado a la base de datos: ${databaseName}`);
    return pool; // Devuelve el pool de conexiones para usarlo en las consultas
  } catch (error) {
    console.error("Error de conexión a la base de datos:", error);
    throw error; // Lanza el error para manejarlo en el controlador
  }
};

module.exports = { connectToDatabase, validateDatabaseExists };