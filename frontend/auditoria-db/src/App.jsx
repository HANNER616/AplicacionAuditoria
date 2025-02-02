import React, { useEffect, useState } from 'react';
import './App.css'; // Asegúrate de importar tu archivo CSS

const AuditDashboard = () => {
  const [auditData, setAuditData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [databaseName, setDatabaseName] = useState('');

  const handleAudit = async () => {
    if (!databaseName) {
      alert('Por favor, ingresa el nombre de la base de datos');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/auditoria/database-audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ databaseName }),
      });

      if (!response.ok) {
        throw new Error('Error al obtener los datos de auditoría');
      }

      const data = await response.json();
      setAuditData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auditData) {
      console.log("Datos de auditoría:", auditData);
    }
  }, [auditData]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-lg">Cargando datos de auditoría...</p>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-red-500">Error: {error}</p>
    </div>
  );

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Auditoría de Base de Datos</h1>
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Nombre de la base de datos:
        </label>
        <input
          type="text"
          value={databaseName}
          onChange={(e) => setDatabaseName(e.target.value)}
          className="p-2 border border-gray-300 rounded-md text-black"
          placeholder="Ingresa el nombre de la base de datos"
        />
        <button
          onClick={handleAudit}
          className="ml-4 p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Analizar
        </button>
      </div>

      {/* Restricciones Faltantes */}
      <div className="table-wrapper">
        <h2 className="table-title">Relaciones sin Integridad Referencial</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Tabla Origen</th>
                <th>Columna Origen</th>
                <th>Tabla Referenciada</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {auditData?.missingConstraints?.length > 0 ? (
                auditData.missingConstraints.map((item, index) => (
                  <tr key={index}>
                    <td>{item.parent_table}</td>
                    <td>{item.parent_column}</td>
                    <td>{item.referenced_table}</td>
                    <td className="status-red">{item.status}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center">No hay datos disponibles</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Anomalías en Restricciones */}
      <div className="table-wrapper">
        <h2 className="table-title">Anomalías en Definición de Restricciones</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Tabla</th>
                <th>Nombre FK</th>
                <th>Comportamiento DELETE</th>
                <th>Comportamiento UPDATE</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {auditData?.constraintAnomalies?.length > 0 ? (
                auditData.constraintAnomalies.map((item, index) => (
                  <tr key={index}>
                    <td>{item.TableName}</td>
                    <td>{item.FKName}</td>
                    <td>{item.DeleteBehavior}</td>
                    <td>{item.UpdateBehavior}</td>
                    <td className={item.Status === 'Disabled' ? 'status-red' : 'status-green'}>
                      {item.Status}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center">No hay datos disponibles</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Anomalías en Datos */}
      <div className="table-wrapper">
        <h2 className="table-title">Anomalías en Datos</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Tabla Origen</th>
                <th>Tabla Referenciada</th>
                <th>Restricciones Deshabilitadas</th>
                <th>Restricciones No Confiables</th>
              </tr>
            </thead>
            <tbody>
              {auditData?.dataAnomalies?.length > 0 ? (
                auditData.dataAnomalies.map((item, index) => (
                  <tr key={index}>
                    <td>{item.parent_table}</td>
                    <td>{item.referenced_table}</td>
                    <td className="status-red">{item.disabled_constraints}</td>
                    <td className="status-orange">{item.untrusted_constraints}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center">No hay datos disponibles</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tablas Aisladas y Disparadores */}
      <div className="table-wrapper">
        <h2 className="table-title">Tablas Aisladas y Disparadores</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Tabla</th>
                <th>Disparador</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {auditData?.isolatedTables?.length > 0 ? (
                auditData.isolatedTables.map((item, index) => (
                  <tr key={index}>
                    <td>{item.TableName}</td>
                    <td>{item.TriggerName}</td>
                    <td className={item.TriggerDisabled ? 'status-red' : 'status-green'}>
                      {item.TriggerDisabled ? 'Deshabilitado' : 'Habilitado'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="text-center">No hay datos disponibles</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Estado de Normalización */}
      <div className="table-wrapper">
        <h2 className="table-title">Estado de Normalización</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Tabla</th>
                <th>Número de Columnas</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {auditData?.normalizationStatus?.length > 0 ? (
                auditData.normalizationStatus.map((item, index) => (
                  <tr key={index}>
                    <td>{item.TableName}</td>
                    <td>{item.ColumnCount}</td>
                    <td className={item.NormalizationStatus === 'Needs Normalization' ? 'status-red' : 'status-green'}>
                      {item.NormalizationStatus}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="text-center">No hay datos disponibles</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Anomalías con DBCC */}
      <div className="table-wrapper">
        <h2 className="table-title">Anomalías con DBCC</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Mensaje de Error</th>
              </tr>
            </thead>
            <tbody>
              {auditData?.dbccAnomalies?.length > 0 ? (
                auditData.dbccAnomalies.map((item, index) => (
                  <tr key={index}>
                    <td className="status-red">{item.Message}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="1" className="text-center">No hay datos disponibles</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Anomalías en Disparadores */}
      <div className="table-wrapper">
        <h2 className="table-title">Anomalías en Disparadores</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Tabla</th>
                <th>Disparador</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {auditData?.triggerAnomalies?.length > 0 ? (
                auditData.triggerAnomalies.map((item, index) => (
                  <tr key={index}>
                    <td>{item.TableName}</td>
                    <td>{item.TriggerName}</td>
                    <td className={item.TriggerStatus === 'Trigger Disabled' ? 'status-red' : 'status-green'}>
                      {item.TriggerStatus}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="text-center">No hay datos disponibles</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="last-updated">
        Última actualización: {auditData?.timestamp}
      </div>
    </div>
  );
};

export default AuditDashboard;