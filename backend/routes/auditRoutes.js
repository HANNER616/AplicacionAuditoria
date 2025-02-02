const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController.js');

// Ruta principal para la auditoría completa de la base de datos
router.post("/database-audit", auditController.auditDatabase);


module.exports = router;