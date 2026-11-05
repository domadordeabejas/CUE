# CUE Digital SaaS - Cuaderno Digital de Explotación Agrícola (España)

Plataforma SaaS multi-tenant diseñada para el cumplimiento estricto del **Real Decreto 1054/2022** y la interoperabilidad con el **SIEX** (Sistema de Información de Explotaciones Agrícolas) y **SIGPAC** del Ministerio de Agricultura, Pesca y Alimentación (MAPA / FEGA).

---

## 1. Stack Tecnológico

- **Frontend:** **Svelte 5** (uso estricto y exclusivo de Runes: `$state`, `$derived`, `$effect`, `$props`, y sintaxis moderna de eventos `onclick`, `onchange`, `onsubmit`). Cero sintaxis heredada de Svelte 4 (`$:`, `export let`).
- **Estilos:** **Bootstrap 5.3** (clases semánticas nativas) y CSS minimalista Mobile-First con controles táctiles optimizados para el trabajo en campo con barra lateral responsiva.
- **Backend:** **SvelteKit 2** (Node.js 24) gestionando rutas de API seguras, SSR (Server-Side Rendering), autenticación criptográfica `scrypt` y sesiones HTTP-only.
- **Base de Datos:** **SQL Relacional Dual**:
  - **Local Persistente:** SQLite 3 nativo de Node.js 24 (`node:sqlite`) con claves foráneas activas y modo WAL.
  - **Nube:** PostgreSQL / Supabase con soporte para réplicas y WebSockets en tiempo real (*Realtime*).
- **Interoperabilidad Oficial:** Generador de formatos oficiales **SIEX JSON** y **SIEX XML** con cálculo de Asiento Registral y Código Seguro de Verificación (CSV).

---

## 2. Usuarios y Credenciales de Demostración

| Perfil / Titular | Correo (Usuario) | Contraseña | Rol | Datos Aislados en BD |
| :--- | :--- | :--- | :--- | :--- |
| **Antonio Pérez**<br>*(Agropecuaria Las Hazas S.L.)* | `antonio@agrohazassl.es` | `Agro123!` | `AGRICULTOR` | **3 parcelas en Córdoba** (Olivar y Trigo), 2 operarios ROPO y 2 atomizadores. |
| **Juan Gómez**<br>*(Herederos de Juan Gómez C.B.)* | `juan@fincagomez.com` | `Gomez123!` | `AGRICULTOR` | **2 parcelas en Albacete** (Viñedo y Cebada), 2 operarios ROPO y 2 pulverizadores. |
| **Elena Martínez**<br>*(Cooperativa Agrícola)* | `elena.asesora@coopcordoba.com` | `Asesor123!` | `ASESOR` | Asesoría técnica en Gestión Integrada de Plagas (GIP). |
| **Carlos Administrador**<br>*(Plataforma CUE)* | `admin@cue-saas.es` | `Admin123!` | `SUPERADMIN` | Consola SQL, gestor de endpoints SIEX/SIGPAC y reinicio de BD. |

---

## 3. Estructura del Proyecto

```text
CUE/
├── database/
│   ├── cue_database.sqlite        # Archivo persistente de base de datos SQL local
│   ├── schema.sql                 # Script DDL completo (PostgreSQL / MySQL)
│   ├── seed.sql                   # Inserciones con todos los datos demo oficiales
│   └── supabase_setup.sql         # Script unificado para Supabase con RLS y Realtime
├── src/
│   ├── app.html                   # Plantilla HTML con soporte Mobile-First
│   ├── app.css                    # Estilos globales y tokens Bootstrap 5
│   ├── hooks.server.js            # Middleware de seguridad RBAC y cookies HTTP-only
│   ├── lib/
│   │   ├── server/
│   │   │   ├── auth.js            # Hashing criptográfico scrypt y sesiones
│   │   │   ├── db.js              # Capa de datos y consultas SQL preparadas
│   │   │   ├── siex.js            # Motor de serialización oficial SIEX (JSON/XML)
│   │   │   └── sqlite.js          # Driver relacional SQLite 3 (node:sqlite)
│   │   └── components/
│   │       ├── common/
│   │       │   ├── Navbar.svelte  # Barra superior de navegación y perfil
│   │       │   └── Sidebar.svelte # Menú lateral responsivo y accesible
│   │       ├── admin/
│   │       │   ├── UserManager.svelte          # Gestión global de inquilinos y usuarios
│   │       │   ├── DbConfigManager.svelte      # Conexión SQL y Supabase
│   │       │   ├── ApiEndpointsManager.svelte  # Pasarelas SIEX, SIGPAC y certificados
│   │       │   ├── SqlRunnerManager.svelte     # Consola SQL interactiva
│   │       │   └── DatabaseGenerator.svelte    # Factory reset y migración de BD
│   │       └── cue/
│   │           ├── ParcelaSelector.svelte      # Selector reactivo SIGPAC
│   │           ├── OperarioSelector.svelte     # Selector ROPO con validación de caducidad
│   │           ├── MaquinaSelector.svelte      # Selector ROMA con validación ITEAF
│   │           ├── TratamientoForm.svelte      # Formulario normativo de fitosanitarios
│   │           ├── TratamientosList.svelte     # Libro de registro oficial CUE
│   │           ├── ParcelasManager.svelte      # Gestión de recintos y cultivos
│   │           └── SiexSyncManager.svelte      # Pasarela oficial telemática SIEX / FEGA
│   └── routes/
│       ├── +layout.svelte         # Layout raíz con Navbar y Sidebar
│       ├── +page.svelte           # Landing informativa del portal
│       ├── login/                 # Inicio de sesión con accesos rápidos demo
│       ├── logout/                # Cierre de sesión seguro y borrado de cookies
│       ├── admin/                 # Consola de administración SuperAdmin
│       ├── cue/                   # Cuaderno Digital de Explotación del Agricultor
│       └── api/                   # Endpoints REST (tratamientos, parcelas, siex, etc.)
├── .env.example                   # Plantilla de variables de entorno
├── package.json
├── svelte.config.js
└── vite.config.js
```

---

## 4. Instrucciones de Ejecución

### 1. Instalación de dependencias
```bash
npm install
```

### 2. Variables de entorno (Opcional)
Copia `.env.example` a `.env` si deseas conectar una instancia remota de Supabase:
```bash
cp .env.example .env
```

### 3. Modo Desarrollo
```bash
npm run dev
```
Abre tu navegador en `http://localhost:5173`.

### 4. Compilación y Despliegue en Producción
```bash
npm run build
npm run preview
```

---

## 5. Aspectos Clave de Cumplimiento Normativo

1. **Aislamiento Multi-tenant:** Toda consulta e inserción está estrictamente particionada por `farmer_id` en el servidor (Zero-Trust).
2. **Validación ROPO:** Bloqueo reactivo si el carnet del operario está caducado en la fecha del tratamiento (RD 1311/2012).
3. **Validación ITEAF:** Control obligatorio de la inspección técnica periódica de la maquinaria (RD 170/2021).
4. **Validación SIGPAC:** Control de superficie tratada para no rebasar la superficie catastral del recinto oficial.
5. **Cálculo de Plazo de Seguridad:** Determinación automática de la fecha más temprana legal para recolección según el registro oficial del MAPA.
6. **Interoperabilidad SIEX / FEGA:** Exportación inmediata en esquemas normalizados JSON y XML y simulación telemática con asiento registral.
