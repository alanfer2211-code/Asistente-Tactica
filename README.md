# TÃ¡ctica Profesional â€” Backend + Frontend

## EjecuciÃ³n local
1. Crear/activar entorno virtual.
2. Instalar dependencias:
   `pip install -r requirements.txt`
3. Ejecutar servidor:
   `uvicorn tactica_profesional:app --reload --host 0.0.0.0 --port 8000 --app-dir .`
4. Abrir en navegador:
   `http://localhost:8000/dashboard.html` o `http://localhost:8000/static/index.html`

## Deploy en Render (URL pÃºblica)
Render detecta FastAPI como servicio web si incluyes `render.yaml`.
ConfiguraciÃ³n recomendada:
- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn -k uvicorn.workers.UvicornWorker tactica_profesional:app --bind 0.0.0.0:$PORT`
- Root dir: repositorio (este)

Pasos:
1. Subir el repo a GitHub.
2. En Render: New + Web Service.
3. Conectar tu repo y usar `render.yaml`.
4. Configurar variables de entorno (ver abajo).
5. Deploy.

URL pÃºblica: Render te darÃ¡ una URL del tipo `https://tu-app.onrender.com`.
La app sirve:
- `GET /` redirige a `/static/index.html`
- `GET /static/index.html`
- `GET /docs` (Swagger)

## GeneraciÃ³n de reportes (PDF/Excel/Word)
Los reportes se generan desde los endpoints del backend y se guardan en `exports/` con el formato:
`Informe_YYYYMMDD_HHMM.*` (PDF, XLSX, DOCX).

Rutas relevantes:
- `POST /api/v1/analyze-and-report`  
  Genera reportes a partir de archivos (PDF/imagen/Excel/CSV).
- `POST /api/v1/struct/verify`  
  Genera reportes de verificaciÃ³n estructural.
- `POST /api/v1/budget/compare`  
  Genera reportes comparativos de presupuesto.
- `POST /api/v1/report/generate`  
  Genera reportes desde `analysis_id` o datos enviados en el body.

Los archivos quedan accesibles vÃ­a:
- `/exports/<archivo>`  
- `/outputs/<archivo>` (alias)

## PublicaciÃ³n web
1. Desplegar el backend (FastAPI) en un servidor/VPS.
2. Asegurar que el puerto 8000 (o el que uses) estÃ© abierto.
3. Configurar un reverse proxy (Nginx/Apache) apuntando a Uvicorn/Gunicorn.
4. Servir la app en:
   - `/dashboard.html` (panel unificado)
   - `/static/index.html` (home)

Para producciÃ³n en Linux, un ejemplo tÃ­pico es:
- `gunicorn -k uvicorn.workers.UvicornWorker tactica_profesional:app -b 0.0.0.0:8000`

## Variables de entorno
Obligatorias para IA real:
- `OPENAI_API_KEY`: clave de OpenAI. Si estÃ¡ vacÃ­a o en `SIMULACION`, la app entra en modo demo.

Opcionales:
- `PORT`: Render lo inyecta automÃ¡ticamente.
