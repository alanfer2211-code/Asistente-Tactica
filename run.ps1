# Ejecuta el servidor en Windows (PowerShell)
# 1) Activa tu venv si aplica
# 2) Instala deps: pip install -r requirements.txt
# 3) Corre:
uvicorn tactica_profesional:app --reload --host 0.0.0.0 --port 8000 --app-dir .
