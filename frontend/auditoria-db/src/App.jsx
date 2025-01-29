import React, { useEffect, useState } from 'react';

const AuditDashboard = () => {
  const [auditData, setAuditData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAuditData = async () => {
      try {
        const response = await fetch('http://localhost:5000/auditoria/database-audit');
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

    fetchAuditData();
  }, []);

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
      
      {/* Restricciones Faltantes */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Relaciones sin Integridad Referencial</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">Tabla Origen</th>
                <th className="p-2 border">Columna Origen</th>
                <th className="p-2 border">Tabla Referenciada</th>
                <th className="p-2 border">Estado</th>
              </tr>
            </thead>
            <tbody>
              {auditData?.missingConstraints.map((item, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="p-2 border">{item.parent_table}</td>
                  <td className="p-2 border">{item.parent_column}</td>
                  <td className="p-2 border">{item.referenced_table}</td>
                  <td className="p-2 border text-red-500">{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Anomalías en Restricciones */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Anomalías en Definición de Restricciones</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">Tabla</th>
                <th className="p-2 border">Nombre FK</th>
                <th className="p-2 border">Comportamiento DELETE</th>
                <th className="p-2 border">Comportamiento UPDATE</th>
                <th className="p-2 border">Estado</th>
              </tr>
            </thead>
            <tbody>
              {auditData?.constraintAnomalies.map((item, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="p-2 border">{item.TableName}</td>
                  <td className="p-2 border">{item.FKName}</td>
                  <td className="p-2 border">{item.DeleteBehavior}</td>
                  <td className="p-2 border">{item.UpdateBehavior}</td>
                  <td className={`p-2 border ${item.Status === 'Disabled' ? 'text-red-500' : 'text-green-500'}`}>
                    {item.Status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Anomalías en Datos */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Anomalías en Datos</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">Tabla Origen</th>
                <th className="p-2 border">Tabla Referenciada</th>
                <th className="p-2 border">Restricciones Deshabilitadas</th>
                <th className="p-2 border">Restricciones No Confiables</th>
              </tr>
            </thead>
            <tbody>
              {auditData?.dataAnomalies.map((item, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="p-2 border">{item.parent_table}</td>
                  <td className="p-2 border">{item.referenced_table}</td>
                  <td className="p-2 border text-red-500">{item.disabled_constraints}</td>
                  <td className="p-2 border text-orange-500">{item.untrusted_constraints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-sm text-gray-500 mt-4">
        Última actualización: {auditData?.timestamp}
      </div>
    </div>
  );
};

export default AuditDashboard;