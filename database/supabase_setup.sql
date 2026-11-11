-- ============================================================================
-- SCRIPT DE INSTALACIÓN COMPLETA PARA SUPABASE (CUE SAAS MULTI-TENANT)
-- Copia y pega este script en el "SQL Editor" de tu proyecto Supabase:
-- https://supabase.com/dashboard/project/xeqnlmfyvijdgclfhzgf/sql
-- ============================================================================

-- Habilitar extensiones requeridas si están disponibles
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TABLAS CORE MULTI-TENANT (TEXT IDs para compatibilidad total con el SaaS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.farmers (
    id TEXT PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    farmer_id TEXT REFERENCES public.farmers(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS public.explotaciones (
    id TEXT PRIMARY KEY,
    farmer_id TEXT NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
    codigo_rea VARCHAR(50) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    titular_nif VARCHAR(20) NOT NULL,
    municipio_sede VARCHAR(100) NOT NULL,
    provincia_sede VARCHAR(100) NOT NULL,
    tipo_explotacion VARCHAR(50) NOT NULL DEFAULT 'AGRICOLA_MIXTA',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_sb_farmer_rea UNIQUE (farmer_id, codigo_rea)
);

CREATE TABLE IF NOT EXISTS public.parcelas (
    id TEXT PRIMARY KEY,
    farmer_id TEXT NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
    explotacion_id TEXT NOT NULL REFERENCES public.explotaciones(id) ON DELETE CASCADE,
    nombre_referencia VARCHAR(150) NOT NULL,
    provincia SMALLINT NOT NULL CHECK (provincia BETWEEN 1 AND 52),
    municipio SMALLINT NOT NULL CHECK (municipio > 0),
    agregado SMALLINT NOT NULL DEFAULT 0 CHECK (agregado >= 0),
    zona SMALLINT NOT NULL DEFAULT 0 CHECK (zona >= 0),
    poligono SMALLINT NOT NULL CHECK (poligono > 0),
    parcela INTEGER NOT NULL CHECK (parcela > 0),
    recinto INTEGER NOT NULL CHECK (recinto > 0),
    superficie_ha DECIMAL(10, 4) NOT NULL CHECK (superficie_ha > 0),
    uso_sigpac VARCHAR(10) NOT NULL,
    sistema_explotacion VARCHAR(20) NOT NULL DEFAULT 'SECANO' CHECK (sistema_explotacion IN ('SECANO', 'REGADIO')),
    cultivo_actual VARCHAR(100) NOT NULL,
    variedad VARCHAR(100),
    fecha_siembra_plantacion DATE,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_sb_sigpac_recinto UNIQUE (farmer_id, provincia, municipio, agregado, zona, poligono, parcela, recinto)
);

CREATE TABLE IF NOT EXISTS public.ropo_trabajadores (
    id TEXT PRIMARY KEY,
    farmer_id TEXT NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
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
    CONSTRAINT chk_sb_ropo_fechas CHECK (fecha_caducidad > fecha_expedicion),
    CONSTRAINT uq_sb_farmer_ropo UNIQUE (farmer_id, numero_ropo)
);

CREATE TABLE IF NOT EXISTS public.roma_maquinaria (
    id TEXT PRIMARY KEY,
    farmer_id TEXT NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
    tipo_maquina VARCHAR(100) NOT NULL,
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
    CONSTRAINT chk_sb_iteaf_fechas CHECK (fecha_caducidad_iteaf > fecha_ultima_iteaf),
    CONSTRAINT uq_sb_farmer_roma UNIQUE (farmer_id, numero_roma)
);

-- ============================================================================
-- 2. ACTIVIDADES DEL CUE (CON BORRADO EN CASCADA ATADO AL FARMER_ID)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tratamientos_fitosanitarios (
    id TEXT PRIMARY KEY,
    farmer_id TEXT NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
    parcela_id TEXT NOT NULL REFERENCES public.parcelas(id) ON DELETE CASCADE,
    operario_id TEXT NOT NULL REFERENCES public.ropo_trabajadores(id) ON DELETE RESTRICT,
    maquinaria_id TEXT NOT NULL REFERENCES public.roma_maquinaria(id) ON DELETE RESTRICT,
    fecha_tratamiento DATE NOT NULL,
    problema_fitosanitario VARCHAR(255) NOT NULL,
    nombre_comercial VARCHAR(255) NOT NULL,
    numero_registro_magrama VARCHAR(100) NOT NULL,
    materia_activa VARCHAR(255) NOT NULL,
    dosis_valor DECIMAL(10, 3) NOT NULL CHECK (dosis_valor > 0),
    dosis_unidad VARCHAR(20) NOT NULL CHECK (dosis_unidad IN ('kg/ha', 'l/ha', 'l/hl', '%', 'g/hl')),
    volumen_caldo_l_ha DECIMAL(10, 2) CHECK (volumen_caldo_l_ha >= 0),
    superficie_tratada_ha DECIMAL(10, 4) NOT NULL CHECK (superficie_tratada_ha > 0),
    plazo_seguridad_dias INTEGER NOT NULL DEFAULT 0 CHECK (plazo_seguridad_dias >= 0),
    fecha_recoleccion_permitida DATE,
    justificacion_tratamiento TEXT NOT NULL,
    condiciones_meteorologicas VARCHAR(255),
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.fertilizaciones (
    id TEXT PRIMARY KEY,
    farmer_id TEXT NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
    parcela_id TEXT NOT NULL REFERENCES public.parcelas(id) ON DELETE CASCADE,
    fecha_fertilizacion DATE NOT NULL,
    tipo_fertilizante VARCHAR(50) NOT NULL,
    nombre_producto VARCHAR(255) NOT NULL,
    dosis_kg_ha DECIMAL(10, 2) NOT NULL,
    unidades_nitrogeno_n DECIMAL(8, 2) DEFAULT 0,
    unidades_fosforo_p DECIMAL(8, 2) DEFAULT 0,
    unidades_potasio_k DECIMAL(8, 2) DEFAULT 0,
    metodo_aplicacion VARCHAR(100),
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.riegos (
    id TEXT PRIMARY KEY,
    farmer_id TEXT NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
    parcela_id TEXT NOT NULL REFERENCES public.parcelas(id) ON DELETE CASCADE,
    fecha_riego DATE NOT NULL,
    volumen_m3 DECIMAL(10, 2) NOT NULL CHECK (volumen_m3 > 0),
    metodo_riego VARCHAR(50) NOT NULL,
    duracion_horas DECIMAL(6, 2),
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.config_database (
    id TEXT PRIMARY KEY,
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL DEFAULT 5432,
    database_name VARCHAR(100) NOT NULL,
    username VARCHAR(100) NOT NULL,
    password_encrypted TEXT NOT NULL,
    ssl_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    max_connections INTEGER NOT NULL DEFAULT 20,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.config_api_endpoints (
    service_id VARCHAR(50) PRIMARY KEY,
    service_name VARCHAR(150) NOT NULL,
    endpoint_url TEXT NOT NULL,
    auth_type VARCHAR(50) NOT NULL DEFAULT 'NONE',
    api_key_encrypted TEXT,
    environment VARCHAR(20) NOT NULL DEFAULT 'SANDBOX',
    timeout_ms INTEGER NOT NULL DEFAULT 10000,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    extra_headers TEXT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.sql_execution_logs (
    id TEXT PRIMARY KEY,
    "sqlScript" TEXT NOT NULL,
    "operationType" VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    "rowsAffected" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "executionTimeMs" INTEGER NOT NULL DEFAULT 0,
    "userEmail" VARCHAR(150) NOT NULL,
    "executedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2B. ÍNDICES MULTI-TENANT Y CLAVES FORÁNEAS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_farmer_id ON public.users(farmer_id);
CREATE INDEX IF NOT EXISTS idx_explotaciones_farmer_id ON public.explotaciones(farmer_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_farmer_id ON public.parcelas(farmer_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_explotacion_id ON public.parcelas(explotacion_id);
CREATE INDEX IF NOT EXISTS idx_ropo_farmer_id ON public.ropo_trabajadores(farmer_id);
CREATE INDEX IF NOT EXISTS idx_roma_farmer_id ON public.roma_maquinaria(farmer_id);
CREATE INDEX IF NOT EXISTS idx_tratamientos_farmer_id ON public.tratamientos_fitosanitarios(farmer_id);
CREATE INDEX IF NOT EXISTS idx_tratamientos_parcela_id ON public.tratamientos_fitosanitarios(parcela_id);
CREATE INDEX IF NOT EXISTS idx_tratamientos_operario_id ON public.tratamientos_fitosanitarios(operario_id);
CREATE INDEX IF NOT EXISTS idx_tratamientos_maquinaria_id ON public.tratamientos_fitosanitarios(maquinaria_id);
CREATE INDEX IF NOT EXISTS idx_fertilizaciones_farmer_id ON public.fertilizaciones(farmer_id);
CREATE INDEX IF NOT EXISTS idx_fertilizaciones_parcela_id ON public.fertilizaciones(parcela_id);
CREATE INDEX IF NOT EXISTS idx_riegos_farmer_id ON public.riegos(farmer_id);
CREATE INDEX IF NOT EXISTS idx_riegos_parcela_id ON public.riegos(parcela_id);

-- ============================================================================
-- 3. HABILITACIÓN DE SUPABASE REALTIME (PUBLICACIÓN POSTGRES EN TIEMPO REAL)
-- ============================================================================

ALTER TABLE public.farmers REPLICA IDENTITY FULL;
ALTER TABLE public.users REPLICA IDENTITY FULL;
ALTER TABLE public.explotaciones REPLICA IDENTITY FULL;
ALTER TABLE public.parcelas REPLICA IDENTITY FULL;
ALTER TABLE public.ropo_trabajadores REPLICA IDENTITY FULL;
ALTER TABLE public.roma_maquinaria REPLICA IDENTITY FULL;
ALTER TABLE public.tratamientos_fitosanitarios REPLICA IDENTITY FULL;
ALTER TABLE public.fertilizaciones REPLICA IDENTITY FULL;
ALTER TABLE public.riegos REPLICA IDENTITY FULL;
ALTER TABLE public.config_database REPLICA IDENTITY FULL;
ALTER TABLE public.config_api_endpoints REPLICA IDENTITY FULL;
ALTER TABLE public.sql_execution_logs REPLICA IDENTITY FULL;

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'farmers',
        'users',
        'explotaciones',
        'parcelas',
        'ropo_trabajadores',
        'roma_maquinaria',
        'tratamientos_fitosanitarios',
        'fertilizaciones',
        'riegos',
        'config_database',
        'config_api_endpoints',
        'sql_execution_logs'
    ]
    LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = tbl) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- 4. POLÍTICAS ROW LEVEL SECURITY (RLS) PARA ACCESO SEGURO
-- ============================================================================

ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.explotaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ropo_trabajadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roma_maquinaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tratamientos_fitosanitarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fertilizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riegos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_database ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_api_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sql_execution_logs ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas existentes si se ejecuta de nuevo
DROP POLICY IF EXISTS "Permitir acceso farmers" ON public.farmers;
DROP POLICY IF EXISTS "Permitir acceso users" ON public.users;
DROP POLICY IF EXISTS "Permitir acceso explotaciones" ON public.explotaciones;
DROP POLICY IF EXISTS "Permitir acceso parcelas" ON public.parcelas;
DROP POLICY IF EXISTS "Permitir acceso ropo" ON public.ropo_trabajadores;
DROP POLICY IF EXISTS "Permitir acceso roma" ON public.roma_maquinaria;
DROP POLICY IF EXISTS "Permitir acceso tratamientos" ON public.tratamientos_fitosanitarios;
DROP POLICY IF EXISTS "Permitir acceso fertilizaciones" ON public.fertilizaciones;
DROP POLICY IF EXISTS "Permitir acceso riegos" ON public.riegos;
DROP POLICY IF EXISTS "Permitir acceso config_database" ON public.config_database;
DROP POLICY IF EXISTS "Permitir acceso config_api_endpoints" ON public.config_api_endpoints;
DROP POLICY IF EXISTS "Permitir acceso sql_logs" ON public.sql_execution_logs;

-- Políticas de lectura y escritura para la app
CREATE POLICY "Permitir acceso farmers" ON public.farmers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acceso users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acceso explotaciones" ON public.explotaciones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acceso parcelas" ON public.parcelas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acceso ropo" ON public.ropo_trabajadores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acceso roma" ON public.roma_maquinaria FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acceso tratamientos" ON public.tratamientos_fitosanitarios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acceso fertilizaciones" ON public.fertilizaciones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acceso riegos" ON public.riegos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acceso config_database" ON public.config_database FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acceso config_api_endpoints" ON public.config_api_endpoints FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acceso sql_logs" ON public.sql_execution_logs FOR ALL USING (true) WITH CHECK (true);

-- Permisos explícitos para acceso vía Data API (anon/publishable & authenticated)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

-- ============================================================================
-- 5. DATOS DE PRUEBA (SEED MULTI-TENANT) PARA SUPABASE
-- ============================================================================

-- Inquilinos / Agricultores
INSERT INTO public.farmers (id, nombre_titular, cif_nif, email_contacto, telefono, direccion, codigo_postal, municipio, provincia, estado)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'Agropecuaria Las Hazas S.L.', 'B14987654', 'info@agrohazassl.es', '+34600123456', 'Ctra. de la Vega km 4', '14005', 'Córdoba', 'Córdoba', 'ACTIVO'),
    ('a0000000-0000-0000-0000-000000000002', 'Herederos de Juan Gómez C.B.', 'E02123456', 'contacto@fincagomez.com', '+34611987654', 'Camino del Prado s/n', '02001', 'Albacete', 'Albacete', 'ACTIVO')
ON CONFLICT (id) DO NOTHING;

-- Usuarios Multi-tenant (scrypt: Admin123!, Agro123!, Asesor123!, Gomez123!)
INSERT INTO public.users (id, farmer_id, nombre, apellidos, email, password_hash, rol, nif, telefono, is_active)
VALUES
    ('u0000000-0000-0000-0000-000000000001', NULL, 'Carlos', 'Administrador Global', 'admin@cue-saas.es', '8ee4be81f774c712cd093b942c018d51:f6abeb2e06ae0fdd9111f6e6d4a995b2e6330ea2dbde8042a837193090ee40501a425eebbd3b59c908c5b7e4ec8f45601d676ea792711e279f82f146465cf25d', 'SUPERADMIN', '12345678Z', '+34699000111', TRUE),
    ('u0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Antonio', 'Pérez Moreno', 'antonio@agrohazassl.es', '1250fa52d80f4e85bde64252d7a3fcb9:6ab3850e3700d0630078db89fee04defcd77798270cf140390e34defe562e69fb3c71e0cc60d47fccbc0f63956fef3be27a4d0589263b569a4dcf310efd1b78a', 'AGRICULTOR', '30998877A', '+34600123456', TRUE),
    ('u0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Elena', 'Martínez Rivas', 'elena.asesora@coopcordoba.com', '68ecf034ba7fab5d35b31eb285414b9e:3e8fee858a63e3513f5ea9ef03f248301c52a17fc57e0e061cb99a3ae1f3ba1fcfd559d3e542c69544feeb2bee3e97078fc3e2ec437f1a7f35b864447bd04244', 'ASESOR', '44556677B', '+34622334455', TRUE),
    ('u0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'Juan', 'Gómez Sánchez', 'juan@fincagomez.com', 'e5183af1aeff1e981a1c93a56759c8ed:bdfeec9efabf5298e960bb186712e36daa09cbe65b49584389cba9f97748a3e1836d799308bc12ff913096fa0efda3a92464f25c499b115c41287692d18ce52c', 'AGRICULTOR', '05123456F', '+34611987654', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Explotaciones
INSERT INTO public.explotaciones (id, farmer_id, codigo_rea, nombre, titular_nif, municipio_sede, provincia_sede, tipo_explotacion)
VALUES
    ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'ES140210004921', 'Finca Montefrío y La Campana', 'B14987654', 'Córdoba', 'Córdoba', 'AGRICOLA_MIXTA'),
    ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'ES020010008892', 'Finca Los Llanos y El Salobral', 'E02123456', 'Albacete', 'Albacete', 'AGRICOLA_MIXTA')
ON CONFLICT (id) DO NOTHING;

-- Parcelas y Cultivos Independientes por Inquilino
INSERT INTO public.parcelas (id, farmer_id, explotacion_id, nombre_referencia, provincia, municipio, agregado, zona, poligono, parcela, recinto, superficie_ha, uso_sigpac, sistema_explotacion, cultivo_actual, variedad, activa)
VALUES
    ('p0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'El Olivar de la Loma (Picual)', 14, 21, 0, 0, 12, 45, 1, 6.4500, 'OL', 'REGADIO', 'Olivar Almazara', 'Picual', TRUE),
    ('p0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Vega Baja - Almendros', 14, 21, 0, 0, 12, 48, 2, 4.1200, 'FY', 'REGADIO', 'Almendro', 'Lauranne', TRUE),
    ('p0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Ruedos Trigo Duro', 14, 21, 0, 0, 14, 102, 1, 12.8000, 'TA', 'SECANO', 'Trigo Duro', 'Avispa', TRUE),
    ('p0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'La Viña del Llano (Tempranillo)', 2, 1, 0, 0, 5, 23, 1, 8.5000, 'VI', 'REGADIO', 'Vid para Vinificación', 'Tempranillo', TRUE),
    ('p0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'Cereal Secano El Hondo', 2, 1, 0, 0, 8, 110, 2, 22.0000, 'TA', 'SECANO', 'Cebada Cervecera', 'Pewter', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ROPO Trabajadores
INSERT INTO public.ropo_trabajadores (id, farmer_id, nombre, apellidos, nif, numero_ropo, tipo_carnet, fecha_expedicion, fecha_caducidad, activo)
VALUES
    ('r0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Manuel', 'García Romero', '28876543C', '01-14/0009841-C', 'CUALIFICADO', '2023-04-10', '2028-04-10', TRUE),
    ('r0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Rafael', 'Cano Lucena', '30234567D', '01-14/0015432-B', 'BASICO', '2022-02-15', '2027-02-15', TRUE),
    ('r0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Joaquín', 'Solís Benítez', '31445566E', '01-14/0002199-C', 'CUALIFICADO', '2019-01-10', '2024-01-10', FALSE),
    ('r0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'Pedro', 'Alarcón Ruiz', '04998811K', '01-02/0004812-C', 'CUALIFICADO', '2023-06-01', '2028-06-01', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ROMA Maquinaria
INSERT INTO public.roma_maquinaria (id, farmer_id, tipo_maquina, marca, modelo, numero_roma, numero_bastidor, fecha_adquisicion, fecha_ultima_iteaf, fecha_caducidad_iteaf, activo)
VALUES
    ('m0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Atomizador Arrastrado 3000L', 'FEDUR', 'MAXI-TURBO 3000', '14/14021-00892', 'FED-2021-99823', '2021-03-15', '2023-05-20', '2026-05-20', TRUE),
    ('m0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Pulverizador Hidráulico Barras 12m', 'HARDI', 'MASTER PLUS 1200', '14/14021-01204', 'HAR-2022-44102', '2022-09-01', '2024-06-11', '2027-06-11', TRUE),
    ('m0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Atomizador Antiguo 1500L', 'ILEMO', 'SUPER-1500', '14/14021-00109', 'ILE-2010-00112', '2010-04-10', '2020-03-01', '2023-03-01', FALSE),
    ('m0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'Pulverizador Hidráulico 2000L', 'AGUIRRE', 'TAURUS 2000', '02/02001-00431', 'AGU-2022-11892', '2022-09-01', '2024-03-10', '2027-03-10', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Tratamientos Fitosanitarios
INSERT INTO public.tratamientos_fitosanitarios (
    id, farmer_id, parcela_id, operario_id, maquinaria_id,
    fecha_tratamiento, problema_fitosanitario, nombre_comercial,
    numero_registro_magrama, materia_activa, dosis_valor, dosis_unidad,
    volumen_caldo_l_ha, superficie_tratada_ha, plazo_seguridad_dias,
    fecha_recoleccion_permitida, justificacion_tratamiento,
    condiciones_meteorologicas, observaciones
)
VALUES
    ('t0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000001', 'r0000000-0000-0000-0000-000000000001', 'm0000000-0000-0000-0000-000000000001', '2026-03-15', 'Repilo del Olivar (Spilocaea oleagina)', 'Cobre Nordox 75 WG', '22456', 'Óxido cuproso 75%', 150.00, 'g/hl', 1000.00, 6.4500, 14, '2026-03-29', 'Tratamiento preventivo primaveral tras lluvias continuadas según prescripción técnica GIP.', 'Viento 4 km/h, 18ºC, humedad 65%, cielo despejado.', 'Tratamiento completado favorablemente. Boquillas antideriva cerámicas utilizadas.'),
    ('t0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000002', 'r0000000-0000-0000-0000-000000000002', 'm0000000-0000-0000-0000-000000000001', '2026-04-02', 'Mancha Ocre del Almendro (Polystigma fulvum)', 'Score 25 EC', '18745', 'Difenoconazol 25%', 0.05, 'l/hl', 800.00, 4.1200, 21, '2026-04-23', 'Detección de primeros síntomas foliares en el 5% de la masa foliar.', 'Viento en calma, 20ºC, sin previsión de lluvias en 48 horas.', 'Respetada la banda de seguridad de 5 metros con cauce de arroyo colindante.'),
    ('t0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'p0000000-0000-0000-0000-000000000004', 'r0000000-0000-0000-0000-000000000004', 'm0000000-0000-0000-0000-000000000004', '2026-04-10', 'Oídio de la Vid (Erysiphe necator)', 'Azufre Micronizado 80%', '12333', 'Azufre 80%', 30.00, 'kg/ha', 0.00, 8.5000, 5, '2026-04-15', 'Tratamiento de espolvoreo preventivo en estado fenológico de racimos visibles.', 'Viento 2 km/h, 21ºC, aplicación matinal temprana.', 'Espolvoreo uniforme en toda la viña Tempranillo.')
ON CONFLICT (id) DO NOTHING;

-- Fertilizaciones
INSERT INTO public.fertilizaciones (id, farmer_id, parcela_id, fecha_fertilizacion, tipo_fertilizante, nombre_producto, dosis_kg_ha, unidades_nitrogeno_n, unidades_fosforo_p, unidades_potasio_k, metodo_aplicacion, observaciones)
VALUES
    ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000003', '2026-02-20', 'MINERAL_INORGANICO', 'Fertiberia Complejo N-P-K 20-8-10', 250.00, 50.00, 20.00, 25.00, 'COBERTERA_FONDO', 'Abonado de cobertera previo al ahijamiento del trigo duro conforme al plan de abonado racional.')
ON CONFLICT (id) DO NOTHING;

-- Riegos
INSERT INTO public.riegos (id, farmer_id, parcela_id, fecha_riego, volumen_m3, metodo_riego, duracion_horas, observaciones)
VALUES
    ('w0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000001', '2026-04-05', 2500.00, 'GOTEO', 18.50, 'Riego deficitario controlado. Concesión Confederación Hidrográfica del Guadalquivir. Lectura contador: 142.890 m3.')
ON CONFLICT (id) DO NOTHING;

-- Configuración de Conexión a Base de Datos
INSERT INTO public.config_database (id, host, port, database_name, username, password_encrypted, ssl_enabled, max_connections, is_active)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'db.xeqnlmfyvijdgclfhzgf.supabase.co', 5432, 'postgres', 'postgres', '••••••••••••••••', TRUE, 20, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Configuración de APIs Oficiales
INSERT INTO public.config_api_endpoints (service_id, service_name, endpoint_url, auth_type, api_key_encrypted, environment, timeout_ms, is_active, extra_headers)
VALUES
    ('SIGPAC_REST', 'Servicio WFS/REST SIGPAC MAPA', 'https://sigpac.mapa.gob.es/fega/servicios/rest/recintos', 'NONE', NULL, 'PRODUCTION', 8000, TRUE, '{"Accept": "application/json"}'),
    ('SIEX_REST', 'API Central SIEX - FEGA (Cuaderno Digital)', 'https://siex.mapa.gob.es/api/v1/cuaderno/sincronizar', 'BEARER_TOKEN', 'enc_siex_token_991823712', 'SANDBOX', 12000, TRUE, '{"Content-Type": "application/json", "X-Platform-ID": "CUE-SAAS-SPAIN"}')
ON CONFLICT (service_id) DO NOTHING;
