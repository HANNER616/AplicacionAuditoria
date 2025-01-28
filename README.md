# AplicacionAuditoria


## INICIALIZAR FRONT Y BACK

### BACK

- cd backend 
- npm install express mssql dotenv cors
- node server.js

### FRONT
- cd frontend/auditoria-db
- npm install
- npm run dev



## Contenedor docker

 docker pull mcr.microsoft.com/mssql/server:2022-latest

 docker run -e 'ACCEPT_EULA=Y' -e 'MSSQL_SA_PASSWORD=Admin123' -p 1433:1433 --name sql_server -d mcr.microsoft.com/mssql/server:2022-latest

