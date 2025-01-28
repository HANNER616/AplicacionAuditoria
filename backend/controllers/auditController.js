const sql = require('mssql');

const getForeignKeyConstraints = async (req, res) => {
    try {
      const result = await sql.query(`
        SELECT TOP 10 * FROM sys.foreign_keys;

      `);
  
      console.log("Datos de claves foráneas:", result.recordset); // Verifica si hay datos
      res.json(result.recordset); // Enviar como JSON
    } catch (error) {
      console.error("Error al obtener las restricciones de clave foránea:", error);
      res.status(500).json({ error: 'Hubo un error al obtener los datos' });
    }
  };
  

module.exports = { getForeignKeyConstraints };
