# SIGNBRIDGE

Aquí se van  a subir los documentos requeridos para el proyecto formativo.

- <a href="https://github.com/Lincoln1986/SIGNBRIDGE/tree/main/DOCS"> Documentos </a>

## Activación del backend
En la <a href="https://github.com/Lincoln1986/SIGNBRIDGE/tree/main/Backend-SignBridge"> Carpeta Backend </a>  iniciamos un entorno virtual de FAST API con estos <a href="https://github.com/Lincoln1986/SIGNBRIDGE/blob/main/Backend-SignBridge/requirements.txt">requerimientos</a>. A continuación ejecutamos el siguiente comando en consola: 
```bash
venv\Scripts\activate && uvicorn main:app --reload
```

## Activación del fronted
En la <a href="https://github.com/Lincoln1986/SIGNBRIDGE/tree/main/Frontend-SignBridge"> Carpeta Frontend </a> iniciamos el fronted de REACT desde la consola, funciona junto con el backend siempre y cuando el backend se encuentre en rutado junto con el frontend, comandos para iniciar el fronted: 
```bash
npm install && npm run dev
```
