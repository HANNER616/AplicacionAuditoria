import React, { useEffect, useState } from "react";

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);  // Para manejar el estado de carga
  const [error, setError] = useState(null);  // Para manejar errores

  // Fetch de la API cuando el componente se monte
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Realizar la solicitud a tu backend
        const response = await fetch("http://localhost:5000/auditoria/integridad-referencial");
        
        // Verificar si la respuesta es exitosa
        if (!response.ok) {
          throw new Error("Error al obtener los datos");
        }

        const result = await response.json();
        setData(result);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);  // Cambiar el estado de carga cuando termine
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="App">
      <h1>Integridad Referencial</h1>
      <ul>
        {data.map((item, index) => (
          <li key={index}>
            {item.FK_name} | {item.parent_table} -&gt; {item.referenced_table}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
