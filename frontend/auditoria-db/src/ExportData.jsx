import { useState } from 'react';
import * as XLSX from 'xlsx';

const useExportData = (auditData, databaseName) => {
  const [exporting, setExporting] = useState(false);

  const formatDataForExcel = (data) => {
    const sheets = {};

    // Missing Constraints Sheet
    if (data?.missingConstraints?.length > 0) {
      sheets['Relaciones sin Integridad'] = XLSX.utils.json_to_sheet(
        data.missingConstraints.map(item => ({
          'Tabla Origen': item.parent_table,
          'Columna Origen': item.parent_column,
          'Tabla Referenciada': item.referenced_table,
          'Estado': item.status
        }))
      );
    }

    // Constraint Anomalies Sheet
    if (data?.constraintAnomalies?.length > 0) {
      sheets['Anomalías en Restricciones'] = XLSX.utils.json_to_sheet(
        data.constraintAnomalies.map(item => ({
          'Tabla': item.TableName,
          'Nombre FK': item.FKName,
          'Comportamiento DELETE': item.DeleteBehavior,
          'Comportamiento UPDATE': item.UpdateBehavior,
          'Estado': item.Status
        }))
      );
    }

    // Data Anomalies Sheet
    if (data?.dataAnomalies?.length > 0) {
      sheets['Anomalías en Datos'] = XLSX.utils.json_to_sheet(
        data.dataAnomalies.map(item => ({
          'Tabla Origen': item.parent_table,
          'Tabla Referenciada': item.referenced_table,
          'Restricciones Deshabilitadas': item.disabled_constraints,
          'Restricciones No Confiables': item.untrusted_constraints
        }))
      );
    }

    // Isolated Tables Sheet
    if (data?.isolatedTables?.length > 0) {
      sheets['Tablas Aisladas'] = XLSX.utils.json_to_sheet(
        data.isolatedTables.map(item => ({
          'Tabla': item.TableName,
          'Disparador': item.TriggerName,
          'Estado': item.TriggerDisabled ? 'Deshabilitado' : 'Habilitado'
        }))
      );
    }

    // Normalization Status Sheet
    if (data?.normalizationStatus?.length > 0) {
      sheets['Estado de Normalización'] = XLSX.utils.json_to_sheet(
        data.normalizationStatus.map(item => ({
          'Tabla': item.TableName,
          'Número de Columnas': item.ColumnCount,
          'Estado': item.NormalizationStatus
        }))
      );
    }

    // DBCC Anomalies Sheet
    if (data?.dbccAnomalies?.length > 0) {
      sheets['Anomalías DBCC'] = XLSX.utils.json_to_sheet(
        data.dbccAnomalies.map(item => ({
          'Tabla': item.TableName,
          'Constraint':item.ConstraintName,
          'Tipo de Error':item.ErrorType,
          'Descripción':item.ErrorDescription,
          'Estado':item.Status,
          'Severidad':item.Severity,
          'Alerta':item.AlertType,
        }))
      );
    }

    // Trigger Anomalies Sheet
    if (data?.triggerAnomalies?.length > 0) {
      sheets['Anomalías en Disparadores'] = XLSX.utils.json_to_sheet(
        data.triggerAnomalies.map(item => ({
          'Tabla': item.TableName,
          'Disparador': item.TriggerName,
          'Estado': item.TriggerStatus
        }))
      );
    }

    return sheets;
  };

  const handleExport = async () => {
    if (!auditData) {
      alert('No hay datos para exportar');
      return;
    }

    try {
      setExporting(true);

      const sheets = formatDataForExcel(auditData);
      const workbook = XLSX.utils.book_new();

      // Add each sheet to the workbook
      Object.entries(sheets).forEach(([sheetName, sheet]) => {
        XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
      });

      // Add metadata sheet
      const metadataSheet = XLSX.utils.json_to_sheet([{
        'Base de Datos': databaseName,
        'Fecha de Auditoría': auditData.timestamp,
        'Generado el': new Date().toLocaleString()
      }]);
      XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Información');

      // Generate and download the file
      XLSX.writeFile(workbook, `Auditoría_${databaseName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error al exportar:', error);
      alert('Error al exportar los datos');
    } finally {
      setExporting(false);
    }
  };

  return { handleExport, exporting };
};

export default useExportData;