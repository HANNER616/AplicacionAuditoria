const sql = require('mssql');

// 1. Identificación de relaciones que requieren integridad referencial
const identifyMissingConstraints = async () => {
  const query = `
    WITH PotentialFKs AS (
      SELECT 
        c1.TABLE_NAME as parent_table,
        c1.COLUMN_NAME as parent_column,
        c2.TABLE_NAME as referenced_table,
        c2.COLUMN_NAME as referenced_column
      FROM INFORMATION_SCHEMA.COLUMNS c1
      JOIN INFORMATION_SCHEMA.COLUMNS c2 
        ON c1.COLUMN_NAME LIKE '%' + c2.TABLE_NAME + 'Id'
        OR c1.COLUMN_NAME LIKE '%' + c2.TABLE_NAME + '_ID'
      WHERE c2.TABLE_NAME IN (
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'
      )
    ),
    ExistingFKs AS (
      SELECT 
        OBJECT_NAME(parent_object_id) as parent_table,
        COL_NAME(parent_object_id, parent_column_id) as parent_column,
        OBJECT_NAME(referenced_object_id) as referenced_table,
        COL_NAME(referenced_object_id, referenced_column_id) as referenced_column
      FROM sys.foreign_key_columns
    )
    SELECT 
      p.parent_table,
      p.parent_column,
      p.referenced_table,
      p.referenced_column,
      CASE 
        WHEN e.parent_table IS NULL THEN 'Missing FK Constraint'
        ELSE 'FK Exists'
      END as status
    FROM PotentialFKs p
    LEFT JOIN ExistingFKs e
      ON p.parent_table = e.parent_table
      AND p.parent_column = e.parent_column
      AND p.referenced_table = e.referenced_table
    WHERE e.parent_table IS NULL;
  `;
  return await sql.query(query);
};

// 2. Chequeo de anomalías en la definición de integridad referencial
const checkConstraintAnomalies = async () => {
  const query = `
    SELECT 
      OBJECT_NAME(fk.parent_object_id) as TableName,
      OBJECT_NAME(fk.object_id) as FKName,
      CASE 
        WHEN fk.delete_referential_action = 0 THEN 'NO ACTION'
        WHEN fk.delete_referential_action = 1 THEN 'CASCADE'
        WHEN fk.delete_referential_action = 2 THEN 'SET NULL'
        ELSE 'SET DEFAULT'
      END as DeleteBehavior,
      CASE 
        WHEN fk.update_referential_action = 0 THEN 'NO ACTION'
        WHEN fk.update_referential_action = 1 THEN 'CASCADE'
        WHEN fk.update_referential_action = 2 THEN 'SET NULL'
        ELSE 'SET DEFAULT'
      END as UpdateBehavior,
      CASE 
        WHEN fk.is_disabled = 1 THEN 'Disabled'
        ELSE 'Enabled'
      END as Status
    FROM sys.foreign_keys fk;
  `;
  
  return await sql.query(query);
};

// 3. Chequeo de anomalías en los datos
const checkDataAnomalies = async () => {
  const query = `
    WITH FKInfo AS (
      SELECT 
        OBJECT_NAME(fk.parent_object_id) as parent_table,
        OBJECT_NAME(fk.referenced_object_id) as referenced_table,
        COL_NAME(fkc.parent_object_id, fkc.parent_column_id) as parent_column,
        COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) as referenced_column,
        fk.name as fk_name
      FROM sys.foreign_keys fk
      JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
    )
    SELECT 
      parent_table,
      referenced_table,
      parent_column,
      referenced_column,
      fk_name,
      (
        SELECT COUNT(*) 
        FROM sys.foreign_keys fk
        WHERE is_disabled = 1 
        AND fk.name = FKInfo.fk_name
      ) as disabled_constraints,
      (
        SELECT COUNT(*) 
        FROM sys.foreign_keys fk
        WHERE is_not_trusted = 1 
        AND fk.name = FKInfo.fk_name
      ) as untrusted_constraints
    FROM FKInfo;
  `;
  return await sql.query(query);
};

// Controlador principal que agrupa todas las verificaciones
const auditDatabase = async (req, res) => {
  try {
    const results = {
      missingConstraints: [],
      constraintAnomalies: [],
      dataAnomalies: [],
      timestamp: new Date().toISOString()
    };

    // Ejecutar todas las verificaciones
    const [missingConstraints, constraintAnomalies, dataAnomalies] = await Promise.all([
      identifyMissingConstraints(),
      checkConstraintAnomalies(),
      checkDataAnomalies()
    ]);

     // Imprimir los resultados de cada consulta
     console.log('Missing Constraints:', missingConstraints.recordset);
     console.log('Constraint Anomalies:', constraintAnomalies.recordset);
     console.log('Data Anomalies:', dataAnomalies.recordset);

    // Almacenar resultados
    results.missingConstraints = missingConstraints.recordset;
    results.constraintAnomalies = constraintAnomalies.recordset;
    results.dataAnomalies = dataAnomalies.recordset;

    // Generar log personalizado
    const logEntry = {
      timestamp: results.timestamp,
      total_missing_constraints: results.missingConstraints.length,
      total_anomalies: results.constraintAnomalies.length + results.dataAnomalies.length,
      details: results
    };

    // Aquí podrías guardar el log en un archivo o en la base de datos
    console.log('Audit Log:', JSON.stringify(logEntry, null, 2));

    res.json(results);
  } catch (error) {
    console.error("Error during database audit:", error);
    res.status(500).json({ 
      error: 'Error durante la auditoría de la base de datos',
      details: error.message 
    });
  }
};

module.exports = { 
  auditDatabase,
  identifyMissingConstraints,
  checkConstraintAnomalies,
  checkDataAnomalies
};