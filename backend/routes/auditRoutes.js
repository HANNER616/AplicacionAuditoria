const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController.js');

// Ruta principal para la auditoría completa de la base de datos
router.get('/database-audit', auditController.auditDatabase);

// Rutas individuales para cada tipo de auditoría
router.get('/missing-constraints', auditController.identifyMissingConstraints);
router.get('/constraint-anomalies', auditController.checkConstraintAnomalies);
router.get('/data-anomalies', auditController.checkDataAnomalies);

module.exports = router;