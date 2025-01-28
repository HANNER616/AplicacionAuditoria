const express = require("express");
const { getForeignKeyConstraints } = require("../controllers/auditController");
const router = express.Router();

router.get("/integridad-referencial", getForeignKeyConstraints);

module.exports = router;
