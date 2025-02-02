const { connectToDatabase } = require('../config/dbConfig');

// Función para ejecutar consultas de manera segura
const safeQuery = async (query, databaseName) => {
  let pool;
  try {
    pool = await connectToDatabase(databaseName);
    const result = await pool.request().query(query);
    return result.recordset || [];
  } catch (error) {
    console.error("Error executing query:", error);
    return [];
  } finally {
    if (pool) {
      await pool.close();
    }
  }
};


// 1. Identificación de relaciones que requieren integridad referencial
const identifyMissingConstraints = async (databaseName) => {
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
  return await safeQuery(query, databaseName);
};

// 2. Chequeo de anomalías en la definición de integridad referencial
const checkConstraintAnomalies = async (databaseName) => {
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
      END as Status,
      CASE
        WHEN fk.is_not_trusted = 1 THEN 'Not Trusted'
        ELSE 'Trusted'
      END as TrustStatus
    FROM sys.foreign_keys fk;
  `;
  return await safeQuery(query, databaseName);
};

// 3. Chequeo de anomalías en los datos
const checkDataAnomalies = async (databaseName) => {
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
  return await safeQuery(query, databaseName);
};

// 4. Capturar tablas aisladas y sus disparadores
const checkIsolatedTablesAndTriggers = async (databaseName) => {
  const query = `
    SELECT 
      t.name AS TableName,
      tr.name AS TriggerName,
      tr.is_disabled AS TriggerDisabled
    FROM sys.tables t
    LEFT JOIN sys.triggers tr ON t.object_id = tr.parent_id
    WHERE NOT EXISTS (
      SELECT 1 
      FROM sys.foreign_keys fk 
      WHERE fk.parent_object_id = t.object_id
    );
  `;
  return await safeQuery(query, databaseName);
};

// 5. Aplicaciones de normalización
const checkNormalization = async (databaseName) => {
  const query = `
    SELECT 
      t.name AS TableName,
      COUNT(c.column_id) AS ColumnCount,
      CASE 
        WHEN COUNT(c.column_id) > 10 THEN 'Needs Normalization'
        ELSE 'Normalized'
      END AS NormalizationStatus
    FROM sys.tables t
    JOIN sys.columns c ON t.object_id = c.object_id
    GROUP BY t.name;
  `;
  return await safeQuery(query, databaseName);
};

// 6. Anomalías con DBCC y Constraints
const checkDBCCAnomalies = async (databaseName) => {
  const query = `
    -- Tabla temporal para almacenar resultados
CREATE TABLE #DBCCResults
(
    ID INT IDENTITY(1,1),
    TableName NVARCHAR(128),
    ConstraintName NVARCHAR(128),
    ErrorType NVARCHAR(50),
    ErrorDescription NVARCHAR(MAX),
    Status NVARCHAR(20),
    Severity INT
);

-- 1. Verificar constraints no confiables (not trusted)
INSERT INTO #DBCCResults (TableName, ConstraintName, ErrorType, ErrorDescription, Status, Severity)
SELECT 
    OBJECT_NAME(parent_object_id) AS TableName,
    name AS ConstraintName,
    'Not Trusted Constraint' AS ErrorType,
    'Constraint no confiable - Puede contener violaciones no detectadas' AS ErrorDescription,
    'Not Trusted' AS Status,
    2 AS Severity
FROM sys.foreign_keys
WHERE is_not_trusted = 1;

-- 2. Verificar constraints deshabilitados
INSERT INTO #DBCCResults (TableName, ConstraintName, ErrorType, ErrorDescription, Status, Severity)
SELECT 
    OBJECT_NAME(parent_object_id) AS TableName,
    name AS ConstraintName,
    'Disabled Constraint' AS ErrorType,
    'Constraint deshabilitado - No se está aplicando' AS ErrorDescription,
    'Disabled' AS Status,
    3 AS Severity
FROM sys.foreign_keys
WHERE is_disabled = 1;

-- 3. Verificar violaciones de FK existentes
INSERT INTO #DBCCResults (TableName, ConstraintName, ErrorType, ErrorDescription, Status, Severity)
SELECT 
    OBJECT_NAME(fkc.parent_object_id) AS TableName,
    fk.name AS ConstraintName,
    'FK Violation' AS ErrorType,
    'Se encontraron violaciones de FK' AS ErrorDescription,
    'Violation' AS Status,
    1 AS Severity
FROM sys.foreign_key_columns fkc
JOIN sys.foreign_keys fk ON fkc.constraint_object_id = fk.object_id
LEFT JOIN sys.tables parent ON fkc.referenced_object_id = parent.object_id
LEFT JOIN sys.tables child ON fkc.parent_object_id = child.object_id
WHERE NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys fk2
    WHERE fk2.object_id = fk.object_id
    AND fk2.is_not_trusted = 0
    AND fk2.is_disabled = 0
);

-- 4. Verificar integridad general de la base de datos
DECLARE @DBName NVARCHAR(128) = DB_NAME();
DECLARE @SQL NVARCHAR(MAX);

SET @SQL = 'DBCC CHECKDB ([' + @DBName + ']) WITH TABLERESULTS, NO_INFOMSGS;';

DECLARE @DBCCResults TABLE (
    ErrorNumber INT,
    ErrorMessage NVARCHAR(MAX)
);

INSERT INTO @DBCCResults
EXEC sp_executesql @SQL;

INSERT INTO #DBCCResults (TableName, ConstraintName, ErrorType, ErrorDescription, Status, Severity)
SELECT 
    'Database Level' AS TableName,
    'DBCC CHECKDB' AS ConstraintName,
    'Database Integrity' AS ErrorType,
    ErrorMessage AS ErrorDescription,
    'Error' AS Status,
    ErrorNumber AS Severity
FROM @DBCCResults
WHERE ErrorNumber > 0;

-- Retornar todos los resultados ordenados por severidad
SELECT 
    TableName,
    ConstraintName,
    ErrorType,
    ErrorDescription,
    Status,
    Severity,
    CASE 
        WHEN Status = 'Not Trusted' THEN 'warning'
        WHEN Status = 'Disabled' THEN 'error'
        WHEN Status = 'Violation' THEN 'error'
        ELSE 'info'
    END as AlertType
FROM #DBCCResults
ORDER BY Severity DESC;

-- Limpiar tabla temporal
DROP TABLE #DBCCResults;

  `;

  return await safeQuery(query, databaseName);
};

// 7. Verificar disparadores y anomalías en relaciones
const checkTriggerAnomalies = async (databaseName) => {
  const query = `
    SELECT 
      t.name AS TableName,
      tr.name AS TriggerName,
      tr.is_disabled AS TriggerDisabled,
      CASE 
        WHEN tr.is_disabled = 1 THEN 'Trigger Disabled'
        ELSE 'Trigger Enabled'
      END AS TriggerStatus
    FROM sys.triggers tr
    JOIN sys.tables t ON tr.parent_id = t.object_id;
  `;
  return await safeQuery(query, databaseName);
};


// 8. NULL values in FKs
const nullFKs = async (databaseName) => {
  const query = `
    SELECT 
    fk.name AS FK_Name,
    OBJECT_NAME(fk.parent_object_id) AS TableName,
    c.name AS ColumnName
FROM sys.foreign_keys fk
INNER JOIN sys.foreign_key_columns fkc 
    ON fk.object_id = fkc.constraint_object_id
INNER JOIN sys.columns c 
    ON fkc.parent_object_id = c.object_id 
    AND fkc.parent_column_id = c.column_id
WHERE c.is_nullable = 1;
  `;
  return await safeQuery(query, databaseName);
};

// Controlador principal que agrupa todas las verificaciones
const auditDatabase = async (req, res) => {
  const { databaseName } = req.body;

  if (!databaseName) {
    return res.status(400).json({ error: 'El nombre de la base de datos es requerido' });
  }

  try {
    const results = {
      missingConstraints: [],
      constraintAnomalies: [],
      dataAnomalies: [],
      isolatedTables: [],
      normalizationStatus: [],
      dbccAnomalies: [],
      triggerAnomalies: [],
      nullableFKs:[],
      timestamp: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    };

    // Ejecutar todas las verificaciones
    const [
      missingConstraints,
      constraintAnomalies,
      dataAnomalies,
      isolatedTables,
      normalizationStatus,
      dbccAnomalies,
      triggerAnomalies,
      nullableFKs,
    ] = await Promise.all([
      identifyMissingConstraints(databaseName),
      checkConstraintAnomalies(databaseName),
      checkDataAnomalies(databaseName),
      checkIsolatedTablesAndTriggers(databaseName),
      checkNormalization(databaseName),
      checkDBCCAnomalies(databaseName),
      checkTriggerAnomalies(databaseName),
      nullFKs(databaseName),
    ]);

    // Almacenar resultados
    results.missingConstraints = missingConstraints || [];
    results.constraintAnomalies = constraintAnomalies || [];
    results.dataAnomalies = dataAnomalies || [];
    results.isolatedTables = isolatedTables || [];
    results.normalizationStatus = normalizationStatus || [];
    results.dbccAnomalies = dbccAnomalies || [];
    results.triggerAnomalies = triggerAnomalies || [];
    results.nullableFKs = nullableFKs || [];

    // Generar log detallado
    const logEntry = {
      timestamp: results.timestamp,
      summary: {
        total_missing_constraints: results.missingConstraints.length,
        total_anomalies: results.constraintAnomalies.length + results.dataAnomalies.length,
        total_isolated_tables: results.isolatedTables.length,
        total_normalization_issues: results.normalizationStatus.filter(
          item => item.NormalizationStatus === 'Needs Normalization'
        ).length,
        total_dbcc_anomalies: results.dbccAnomalies.length,
        total_trigger_anomalies: results.triggerAnomalies.length,
        total_null_fks: results.nullableFKs.length
      },
      details: results
    };

    console.log('Audit Log:', JSON.stringify(logEntry, null, 2));
    res.json(results);
  } catch (error) {
    console.error('Error during database audit:', error);
    res.status(500).json({
      error: 'Error durante la auditoría de la base de datos',
      details: error.message
    });
  }
};

module.exports = {
  auditDatabase,
};
