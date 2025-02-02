import React, { useEffect, useState } from 'react';
import useExportData from './ExportData';
import './App.css'; // Asegúrate de importar tu archivo CSS

const AuditDashboard = () => {
  const [dbccAnomalies, setDbccAnomalies] = useState([]);
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'Error':
        return 'bg-red-500 text-white';
      case 'Warning':
        return 'bg-yellow-500 text-black';
      case 'Success':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };
  
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'High':
        return 'text-red-500';
      case 'Medium':
        return 'text-yellow-500';
      case 'Low':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };
  
  const getAlertBadge = (alertType) => {
    switch (alertType) {
      case 'Critical':
        return 'bg-red-500 text-white';
      case 'Warning':
        return 'bg-yellow-500 text-black';
      case 'Info':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };
  const [auditData, setAuditData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [databaseName, setDatabaseName] = useState('');
  const {handleExport, exporting } = useExportData(auditData, databaseName);

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
        <button
          onClick={handleExport}
          disabled={exporting || !auditData}
          className="ml-4 p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
        >
          {exporting ? 'Exportando...' : 'Exportar'}
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
                  <td className="status-red">{item?.disabled_constraints || "N/A"}</td>
                  <td className="status-orange">{item?.untrusted_constraints || "N/A"}</td>
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
<<<<<<< HEAD
        <h2 className="table-title">Estado de 1era Normalización</h2>
=======
        <h2 className="table-title">Estado de Primera Normalización</h2>
>>>>>>> 214eeb387769f1be7a373bfad44f99305a9865da
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
<div className="table-wrapper p-4 bg-white shadow-md rounded-lg">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Anomalías con DBCC</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300 rounded-lg">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="p-2 text-left">Tabla</th>
              <th className="p-2 text-left">Constraint</th>
              <th className="p-2 text-left">Tipo de Error</th>
              <th className="p-2 text-left">Descripción</th>
              <th className="p-2 text-left">Estado</th>
              <th className="p-2 text-left">Severidad</th>
              <th className="p-2 text-left">Alerta</th>
            </tr>
          </thead>
          <tbody>
            {auditData?.dbccAnomalies && auditData.dbccAnomalies.length > 0 ? (
              auditData.dbccAnomalies.map((item, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="p-2">{item.TableName}</td>
                  <td className="p-2">{item.ConstraintName}</td>
                  <td className="p-2">{item.ErrorType}</td>
                  <td className="p-2">{item.ErrorDescription}</td>
                  <td className="p-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(item.Status)}`}>
                      {item.Status}
                    </span>
                  </td>
                  <td className={`p-2 ${getSeverityColor(item.Severity)}`}>{item.Severity}</td>
                  <td className="p-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getAlertBadge(item.AlertType)}`}>
                      {item.AlertType}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="text-center p-4 text-gray-500">
                  No se encontraron anomalías DBCC
                </td>
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