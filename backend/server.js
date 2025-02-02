const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const auditRoutes = require("./routes/auditRoutes");

dotenv.config();
const app = express();

// Configurar CORS para permitir solicitudes del frontend
app.use(
  cors({
    origin: "http://localhost:5173", // URL del frontend
  })
);
app.use(express.json());

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("¡Servidor corriendo correctamente!");
});

// Usar las rutas de auditoría
app.use("/auditoria", auditRoutes);

// Iniciar el servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));