-- ============================================================================
-- PLATAFORMA SAAS MULTI-TENANT CUE (CUADERNO DIGITAL DE EXPLOTACIÓN AGRÍCOLA)
-- Script DDL de Base de Datos Relacional (PostgreSQL / MySQL compatible)
-- Normativa: Real Decreto 1054/2022 y SIEX (España)
-- ============================================================================

-- Habilitar extensión UUID si estamos en PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. ESTRUCTURA MULTI-TENANT Y CONTROL DE ACCESO
-- ============================================================================

-- Tabla de Inquilinos / Agricultores (Tenant principal)
CREATE TABLE IF NOT EXISTS farmers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_titular VARCHAR(150) NOT NULL,
    cif_nif VARCHAR(20) NOT NULL UNIQUE,
    email_contacto VARCHAR(150) NOT NULL,
    telefono VARCHAR(20),
    direccion VARCHAR(255),
    codigo_postal VARCHAR(10),
    municipio VARCHAR(100),
    provincia VARCHAR(100),
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'SUSPENDIDO', 'INACTIVO')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Usuarios con roles específicos
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE, -- NULL únicamente para SUPERADMIN
    nombre VARCHAR(100) NOT NULL,
    apellidos VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('SUPERADMIN', 'AGRICULTOR', 'ASESOR')),
    nif VARCHAR(20) NOT NULL,
    telefono VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. EXPLOTACIONES Y PARCELAS AGRÍCOLAS (SIGPAC)
-- ============================================================================

-- Explotaciones Agrarias (Código REA / REGEPA)
CREATE TABLE IF NOT EXISTS explotaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    codigo_rea VARCHAR(50) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    titular_nif VARCHAR(20) NOT NULL,
    municipio_sede VARCHAR(100) NOT NULL,
    provincia_sede VARCHAR(100) NOT NULL,
    tipo_explotacion VARCHAR(50) NOT NULL DEFAULT 'AGRICOLA',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_farmer_rea UNIQUE (farmer_id, codigo_rea)
);

-- Parcelas y Recintos SIGPAC
CREATE TABLE IF NOT EXISTS parcelas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    explotacion_id UUID NOT NULL REFERENCES explotaciones(id) ON DELETE CASCADE,
    nombre_referencia VARCHAR(150) NOT NULL,
    provincia SMALLINT NOT NULL CHECK (provincia BETWEEN 1 AND 52),
    municipio SMALLINT NOT NULL CHECK (municipio > 0),
    agregado SMALLINT NOT NULL DEFAULT 0 CHECK (agregado >= 0),
    zona SMALLINT NOT NULL DEFAULT 0 CHECK (zona >= 0),
    poligono SMALLINT NOT NULL CHECK (poligono > 0),
    parcela INTEGER NOT NULL CHECK (parcela > 0),
    recinto INTEGER NOT NULL CHECK (recinto > 0),
    superficie_ha DECIMAL(10, 4) NOT NULL CHECK (superficie_ha > 0),
    uso_sigpac VARCHAR(10) NOT NULL, -- Ej: TA (Tierra Arable), FY (Frutales), VI (Viñedo), OL (Olivar), TH (Huerta)
    sistema_explotacion VARCHAR(20) NOT NULL DEFAULT 'SECANO' CHECK (sistema_explotacion IN ('SECANO', 'REGADIO')),
    cultivo_actual VARCHAR(100) NOT NULL,
    variedad VARCHAR(100),
    fecha_siembra_plantacion DATE,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_sigpac_recinto UNIQUE (farmer_id, provincia, municipio, agregado, zona, poligono, parcela, recinto)
);

-- ============================================================================
-- 3. REGISTROS OFICIALES: ROPO (OPERARIOS) Y ROMA (MAQUINARIA)
-- ============================================================================

-- ROPO: Registro Oficial de Productores y Operadores de medios de defensa fitosanitaria
CREATE TABLE IF NOT EXISTS ropo_trabajadores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    apellidos VARCHAR(150) NOT NULL,
    nif VARCHAR(20) NOT NULL,
    numero_ropo VARCHAR(50) NOT NULL,
    tipo_carnet VARCHAR(50) NOT NULL CHECK (tipo_carnet IN ('BASICO', 'CUALIFICADO', 'FUMIGADOR', 'PILOTO_APLICADOR', 'ASESOR')),
    fecha_expedicion DATE NOT NULL,
    fecha_caducidad DATE NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_ropo_fechas CHECK (fecha_caducidad > fecha_expedicion),
    CONSTRAINT uq_farmer_ropo UNIQUE (farmer_id, numero_ropo)
);

-- ROMA: Registro Oficial de Maquinaria Agrícola + Control ITEAF
CREATE TABLE IF NOT EXISTS roma_maquinaria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    tipo_maquina VARCHAR(100) NOT NULL, -- Tractor, Pulverizador Hidráulico, Atomizador, Esparcidor
    marca VARCHAR(100) NOT NULL,
    modelo VARCHAR(100) NOT NULL,
    numero_roma VARCHAR(50) NOT NULL,
    numero_bastidor VARCHAR(100),
    fecha_adquisicion DATE,
    fecha_ultima_iteaf DATE NOT NULL,
    fecha_caducidad_iteaf DATE NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_iteaf_fechas CHECK (fecha_caducidad_iteaf > fecha_ultima_iteaf),
    CONSTRAINT uq_farmer_roma UNIQUE (farmer_id, numero_roma)
);

-- ============================================================================
-- 4. ACTIVIDADES DEL CUE (CON BORRADO EN CASCADA ATADO AL FARMER_ID)
-- ============================================================================

-- Actividad: Tratamientos Fitosanitarios
CREATE TABLE IF NOT EXISTS tratamientos_fitosanitarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    parcela_id UUID NOT NULL REFERENCES parcelas(id) ON DELETE CASCADE,
    operario_id UUID NOT NULL REFERENCES ropo_trabajadores(id) ON DELETE RESTRICT,
    maquinaria_id UUID NOT NULL REFERENCES roma_maquinaria(id) ON DELETE RESTRICT,
    fecha_tratamiento DATE NOT NULL,
    problema_fitosanitario VARCHAR(255) NOT NULL, -- Plaga / Patógeno / Mala hierba
    nombre_comercial VARCHAR(255) NOT NULL,
    numero_registro_magrama VARCHAR(100) NOT NULL, -- Registro Oficial MAPA
    materia_activa VARCHAR(255) NOT NULL,
    dosis_valor DECIMAL(10, 3) NOT NULL CHECK (dosis_valor > 0),
    dosis_unidad VARCHAR(20) NOT NULL CHECK (dosis_unidad IN ('kg/ha', 'l/ha', '%', 'g/hl')),
    volumen_caldo_l_ha DECIMAL(10, 2) CHECK (volumen_caldo_l_ha >= 0),
    superficie_tratada_ha DECIMAL(10, 4) NOT NULL CHECK (superficie_tratada_ha > 0),
    plazo_seguridad_dias INTEGER NOT NULL DEFAULT 0 CHECK (plazo_seguridad_dias >= 0),
    fecha_recoleccion_permitida DATE,
    justificacion_tratamiento TEXT NOT NULL, -- Superación umbral o indicación técnica
    condiciones_meteorologicas VARCHAR(255), -- Temperatura, viento (prevención deriva)
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Actividad: Fertilización y Enmiendas
CREATE TABLE IF NOT EXISTS fertilizaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    parcela_id UUID NOT NULL REFERENCES parcelas(id) ON DELETE CASCADE,
    fecha_aplicacion DATE NOT NULL,
    tipo_abono VARCHAR(50) NOT NULL CHECK (tipo_abono IN ('ORGANICO', 'MINERAL', 'FERTIRRIGACION', 'ENMIENDA')),
    nombre_producto VARCHAR(255) NOT NULL,
    riqueza_npk VARCHAR(50), -- Ej: 15-15-15, 27-0-0
    cantidad_aplicada DECIMAL(10, 2) NOT NULL CHECK (cantidad_aplicada > 0),
    unidad_medida VARCHAR(20) NOT NULL DEFAULT 'kg/ha' CHECK (unidad_medida IN ('kg/ha', 'l/ha', 't/ha')),
    unidades_n_kg_ha DECIMAL(8, 2) DEFAULT 0 CHECK (unidades_n_kg_ha >= 0),
    unidades_p2o5_kg_ha DECIMAL(8, 2) DEFAULT 0 CHECK (unidades_p2o5_kg_ha >= 0),
    unidades_k2o_kg_ha DECIMAL(8, 2) DEFAULT 0 CHECK (unidades_k2o_kg_ha >= 0),
    superficie_fertilizada_ha DECIMAL(10, 4) NOT NULL CHECK (superficie_fertilizada_ha > 0),
    metodo_aplicacion VARCHAR(100), -- Fondo, Cobertera, Foliar
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Actividad: Riego y Volúmenes de Agua
CREATE TABLE IF NOT EXISTS riegos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    parcela_id UUID NOT NULL REFERENCES parcelas(id) ON DELETE CASCADE,
    fecha_riego DATE NOT NULL,
    volumen_m3 DECIMAL(10, 2) NOT NULL CHECK (volumen_m3 > 0),
    duracion_horas DECIMAL(6, 2) CHECK (duracion_horas > 0),
    origen_agua VARCHAR(100) NOT NULL CHECK (origen_agua IN ('COMUNIDAD_REGANTES', 'POZO_SUBTERRANEO', 'CONCESION_SUPERFICIAL', 'BALSA_RECOGIDA', 'REUTILIZADA')),
    sistema_riego VARCHAR(50) NOT NULL CHECK (sistema_riego IN ('GOTEO', 'ASPERSION', 'PIVOT', 'GRAVEDAD_INUNDACION')),
    lectura_contador_inicio DECIMAL(12, 2),
    lectura_contador_fin DECIMAL(12, 2),
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Actividad: Cosecha y Trazabilidad de Lotes
CREATE TABLE IF NOT EXISTS cosechas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    parcela_id UUID NOT NULL REFERENCES parcelas(id) ON DELETE CASCADE,
    fecha_cosecha DATE NOT NULL,
    producto_cosechado VARCHAR(100) NOT NULL,
    variedad VARCHAR(100),
    cantidad_kg DECIMAL(12, 2) NOT NULL CHECK (cantidad_kg > 0),
    superficie_cosechada_ha DECIMAL(10, 4) NOT NULL CHECK (superficie_cosechada_ha > 0),
    rendimiento_kg_ha DECIMAL(10, 2),
    lote_trazabilidad VARCHAR(100) NOT NULL,
    destino_comercial VARCHAR(255),
    numero_albaran VARCHAR(100),
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 5. TABLAS DE ADMINISTRACIÓN GLOBAL Y CONFIGURACIÓN (SUPERADMIN)
-- ============================================================================

-- Configuración de Conexiones a Bases de Datos SQL
CREATE TABLE IF NOT EXISTS config_database (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL DEFAULT 5432,
    database_name VARCHAR(100) NOT NULL,
    username VARCHAR(100) NOT NULL,
    password_encrypted TEXT NOT NULL,
    ssl_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    max_connections INTEGER NOT NULL DEFAULT 10,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Configuración de Endpoints e Integraciones Externas (SIEX / SIGPAC / FEGA)
CREATE TABLE IF NOT EXISTS config_api_endpoints (
    service_id VARCHAR(50) PRIMARY KEY, -- 'SIEX_SOAP', 'SIEX_REST', 'SIGPAC_WMS', 'SIGPAC_REST'
    service_name VARCHAR(150) NOT NULL,
    endpoint_url TEXT NOT NULL,
    auth_type VARCHAR(50) NOT NULL DEFAULT 'BEARER_TOKEN' CHECK (auth_type IN ('BEARER_TOKEN', 'BASIC_AUTH', 'CERTIFICATE', 'NONE')),
    api_key_encrypted TEXT,
    environment VARCHAR(20) NOT NULL DEFAULT 'SANDBOX' CHECK (environment IN ('DEVELOPMENT', 'SANDBOX', 'PRODUCTION')),
    timeout_ms INTEGER NOT NULL DEFAULT 10000,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    extra_headers JSONB,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Log de Auditoría para Sentencias DDL/DML Ejecutadas por SuperAdmin
CREATE TABLE IF NOT EXISTS sql_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(150) NOT NULL,
    sql_script TEXT NOT NULL,
    operation_type VARCHAR(20) NOT NULL, -- DDL, DML, SELECT
    status VARCHAR(20) NOT NULL CHECK (status IN ('SUCCESS', 'ERROR')),
    rows_affected INTEGER DEFAULT 0,
    error_message TEXT,
    execution_time_ms INTEGER NOT NULL,
    ip_address VARCHAR(50),
    executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 6. ÍNDICES DE RENDIMIENTO Y MULTI-TENANT ISOLATION
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_farmer ON users(farmer_id);
CREATE INDEX IF NOT EXISTS idx_explotaciones_farmer ON explotaciones(farmer_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_farmer ON parcelas(farmer_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_sigpac ON parcelas(provincia, municipio, poligono, parcela, recinto);
CREATE INDEX IF NOT EXISTS idx_ropo_farmer_caducidad ON ropo_trabajadores(farmer_id, fecha_caducidad, activo);
CREATE INDEX IF NOT EXISTS idx_roma_farmer_caducidad ON roma_maquinaria(farmer_id, fecha_caducidad_iteaf, activo);
CREATE INDEX IF NOT EXISTS idx_tratamientos_farmer_fecha ON tratamientos_fitosanitarios(farmer_id, fecha_tratamiento DESC);
CREATE INDEX IF NOT EXISTS idx_fertilizaciones_farmer_fecha ON fertilizaciones(farmer_id, fecha_aplicacion DESC);
CREATE INDEX IF NOT EXISTS idx_riegos_farmer_fecha ON riegos(farmer_id, fecha_riego DESC);
CREATE INDEX IF NOT EXISTS idx_cosechas_farmer_fecha ON cosechas(farmer_id, fecha_cosecha DESC);
