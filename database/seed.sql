-- ============================================================================
-- SEED DATA COMPLETO PARA PRUEBAS Y DEMOSTRACIÓN DEL MVP CUE
-- Normativa: Real Decreto 1054/2022 y SIEX (España)
-- ============================================================================

-- 1. Inquilinos / Agricultores (Sociedades Agrarias)
INSERT INTO farmers (id, nombre_titular, cif_nif, email_contacto, telefono, direccion, codigo_postal, municipio, provincia, estado)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'Agropecuaria Las Hazas S.L.', 'B14987654', 'info@agrohazassl.es', '+34600123456', 'Ctra. de la Vega km 4', '14005', 'Córdoba', 'Córdoba', 'ACTIVO'),
    ('a0000000-0000-0000-0000-000000000002', 'Herederos de Juan Gómez C.B.', 'E02123456', 'contacto@fincagomez.com', '+34611987654', 'Camino del Prado s/n', '02001', 'Albacete', 'Albacete', 'ACTIVO')
ON CONFLICT (id) DO NOTHING;

-- 2. Usuarios con contraseñas criptográficas (scrypt: Admin123!, Agro123!, Asesor123!, Gomez123!)
INSERT INTO users (id, farmer_id, nombre, apellidos, email, password_hash, rol, nif, telefono, is_active)
VALUES
    -- SuperAdmin de la plataforma (Sin farmer_id)
    ('u0000000-0000-0000-0000-000000000001', NULL, 'Carlos', 'Administrador Global', 'admin@cue-saas.es', '8ee4be81f774c712cd093b942c018d51:f6abeb2e06ae0fdd9111f6e6d4a995b2e6330ea2dbde8042a837193090ee40501a425eebbd3b59c908c5b7e4ec8f45601d676ea792711e279f82f146465cf25d', 'SUPERADMIN', '12345678Z', '+34699000111', TRUE),
    -- Agricultor 1 (Titular Las Hazas - Córdoba)
    ('u0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Antonio', 'Pérez Moreno', 'antonio@agrohazassl.es', '1250fa52d80f4e85bde64252d7a3fcb9:6ab3850e3700d0630078db89fee04defcd77798270cf140390e34defe562e69fb3c71e0cc60d47fccbc0f63956fef3be27a4d0589263b569a4dcf310efd1b78a', 'AGRICULTOR', '30998877A', '+34600123456', TRUE),
    -- Asesora Técnica Fitosanitaria de la Cooperativa
    ('u0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Elena', 'Martínez Rivas', 'elena.asesora@coopcordoba.com', '68ecf034ba7fab5d35b31eb285414b9e:3e8fee858a63e3513f5ea9ef03f248301c52a17fc57e0e061cb99a3ae1f3ba1fcfd559d3e542c69544feeb2bee3e97078fc3e2ec437f1a7f35b864447bd04244', 'ASESOR', '44556677B', '+34622334455', TRUE),
    -- Agricultor 2 (Titular Finca Gómez - Albacete)
    ('u0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'Juan', 'Gómez Sánchez', 'juan@fincagomez.com', 'e5183af1aeff1e981a1c93a56759c8ed:bdfeec9efabf5298e960bb186712e36daa09cbe65b49584389cba9f97748a3e1836d799308bc12ff913096fa0efda3a92464f25c499b115c41287692d18ce52c', 'AGRICULTOR', '05123456F', '+34611987654', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 3. Explotaciones Agrarias (Códigos REA)
INSERT INTO explotaciones (id, farmer_id, codigo_rea, nombre, titular_nif, municipio_sede, provincia_sede, tipo_explotacion)
VALUES
    ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'ES140210004921', 'Finca Montefrío y La Campana', 'B14987654', 'Córdoba', 'Córdoba', 'AGRICOLA_MIXTA'),
    ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'ES020010008892', 'Finca Los Llanos y El Salobral', 'E02123456', 'Albacete', 'Albacete', 'AGRICOLA_MIXTA')
ON CONFLICT (id) DO NOTHING;

-- 4. Parcelas y Recintos SIGPAC
INSERT INTO parcelas (id, farmer_id, explotacion_id, nombre_referencia, provincia, municipio, agregado, zona, poligono, parcela, recinto, superficie_ha, uso_sigpac, sistema_explotacion, cultivo_actual, variedad, activa)
VALUES
    -- Explotación 1: Las Hazas (Córdoba)
    ('p0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'El Olivar de la Loma (Picual)', 14, 21, 0, 0, 12, 45, 1, 6.4500, 'OL', 'REGADIO', 'Olivar Almazara', 'Picual', TRUE),
    ('p0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Vega Baja - Almendros', 14, 21, 0, 0, 12, 48, 2, 4.1200, 'FY', 'REGADIO', 'Almendro', 'Lauranne', TRUE),
    ('p0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Ruedos Trigo Duro', 14, 21, 0, 0, 14, 102, 1, 12.8000, 'TA', 'SECANO', 'Trigo Duro', 'Avispa', TRUE),
    -- Explotación 2: Finca Gómez (Albacete)
    ('p0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'La Viña del Llano (Tempranillo)', 2, 1, 0, 0, 5, 23, 1, 8.5000, 'VI', 'REGADIO', 'Vid para Vinificación', 'Tempranillo', TRUE),
    ('p0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'Cereal Secano El Hondo', 2, 1, 0, 0, 8, 110, 2, 22.0000, 'TA', 'SECANO', 'Cebada Cervecera', 'Pewter', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 5. ROPO - Trabajadores y Aplicadores Fitosanitarios
INSERT INTO ropo_trabajadores (id, farmer_id, nombre, apellidos, nif, numero_ropo, tipo_carnet, fecha_expedicion, fecha_caducidad, activo)
VALUES
    -- Operario con Carnet Cualificado Vigente (Caduca en 2028)
    ('r0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Manuel', 'García Romero', '28876543C', '01-14/0009841-C', 'CUALIFICADO', '2023-04-10', '2028-04-10', TRUE),
    -- Operario con Carnet Básico Vigente (Caduca en 2027)
    ('r0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Rafael', 'Cano Lucena', '30234567D', '01-14/0015432-B', 'BASICO', '2022-02-15', '2027-02-15', TRUE),
    -- Operario con Carnet CADUCADO (Expiró en 2024 - Para comprobar validación reactiva)
    ('r0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Joaquín', 'Solís Benítez', '31445566E', '01-14/0002199-C', 'CUALIFICADO', '2019-01-10', '2024-01-10', FALSE),
    -- Operario Cualificado de Finca Gómez (Albacete)
    ('r0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'Pedro', 'Alarcón Ruiz', '04998811K', '01-02/0004812-C', 'CUALIFICADO', '2023-06-01', '2028-06-01', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 6. ROMA - Maquinaria e Inspecciones ITEAF
INSERT INTO roma_maquinaria (id, farmer_id, tipo_maquina, marca, modelo, numero_roma, numero_bastidor, fecha_adquisicion, fecha_ultima_iteaf, fecha_caducidad_iteaf, activo)
VALUES
    -- Atomizador arrastrado con ITEAF favorable vigente (Caduca en 2026)
    ('m0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Atomizador Arrastrado 3000L', 'FEDUR', 'MAXI-TURBO 3000', '14/14021-00892', 'FED-2021-99823', '2021-03-15', '2023-05-20', '2026-05-20', TRUE),
    -- Barra pulverizadora con ITEAF vigente (Caduca en 2027)
    ('m0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Pulverizador Hidráulico Barras 12m', 'HARDI', 'MASTER PLUS 1200', '14/14021-01204', 'HAR-2022-44102', '2022-09-01', '2024-06-11', '2027-06-11', TRUE),
    -- Cuba antigua con ITEAF CADUCADA (Caducó en 2023 - Debe bloquearse el uso en tratamientos)
    ('m0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Atomizador Antiguo 1500L', 'ILEMO', 'SUPER-1500', '14/14021-00109', 'ILE-2010-00112', '2010-04-10', '2020-03-01', '2023-03-01', FALSE),
    -- Pulverizador de Finca Gómez (Albacete)
    ('m0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'Pulverizador Hidráulico 2000L', 'AGUIRRE', 'TAURUS 2000', '02/02001-00431', 'AGU-2022-11892', '2022-09-01', '2024-03-10', '2027-03-10', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 7. Tratamientos Fitosanitarios Registrados (Cuaderno de Campo CUE)
INSERT INTO tratamientos_fitosanitarios (
    id, farmer_id, parcela_id, operario_id, maquinaria_id,
    fecha_tratamiento, problema_fitosanitario, nombre_comercial,
    numero_registro_magrama, materia_activa, dosis_valor, dosis_unidad,
    volumen_caldo_l_ha, superficie_tratada_ha, plazo_seguridad_dias,
    fecha_recoleccion_permitida, justificacion_tratamiento,
    condiciones_meteorologicas, observaciones
)
VALUES
    (
        't0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'p0000000-0000-0000-0000-000000000001',
        'r0000000-0000-0000-0000-000000000001',
        'm0000000-0000-0000-0000-000000000001',
        '2026-03-15',
        'Repilo del Olivar (Spilocaea oleagina)',
        'Cobre Nordox 75 WG',
        '22456',
        'Óxido cuproso 75%',
        150.00,
        'g/hl',
        1000.00,
        6.4500,
        14,
        '2026-03-29',
        'Tratamiento preventivo primaveral tras lluvias continuadas según prescripción técnica GIP.',
        'Viento 4 km/h, 18ºC, humedad 65%, cielo despejado.',
        'Tratamiento completado favorablemente. Boquillas antideriva cerámicas utilizadas.'
    ),
    (
        't0000000-0000-0000-0000-000000000002',
        'a0000000-0000-0000-0000-000000000001',
        'p0000000-0000-0000-0000-000000000002',
        'r0000000-0000-0000-0000-000000000002',
        'm0000000-0000-0000-0000-000000000001',
        '2026-04-02',
        'Mancha Ocre del Almendro (Polystigma fulvum)',
        'Score 25 EC',
        '18745',
        'Difenoconazol 25%',
        0.05,
        'l/hl',
        800.00,
        4.1200,
        21,
        '2026-04-23',
        'Detección de primeros síntomas foliares en el 5% de la masa foliar.',
        'Viento en calma, 20ºC, sin previsión de lluvias en 48 horas.',
        'Respetada la banda de seguridad de 5 metros con cauce de arroyo colindante.'
    ),
    (
        't0000000-0000-0000-0000-000000000003',
        'a0000000-0000-0000-0000-000000000002',
        'p0000000-0000-0000-0000-000000000004',
        'r0000000-0000-0000-0000-000000000004',
        'm0000000-0000-0000-0000-000000000004',
        '2026-04-10',
        'Oídio de la Vid (Erysiphe necator)',
        'Azufre Micronizado 80%',
        '12333',
        'Azufre 80%',
        30.00,
        'kg/ha',
        0.00,
        8.5000,
        5,
        '2026-04-15',
        'Tratamiento de espolvoreo preventivo en estado fenológico de racimos visibles.',
        'Viento 2 km/h, 21ºC, aplicación matinal temprana.',
        'Espolvoreo uniforme en toda la viña Tempranillo.'
    )
ON CONFLICT (id) DO NOTHING;

-- 8. Fertilizaciones y Enmiendas del Suelo
INSERT INTO fertilizaciones (
    id, farmer_id, parcela_id, fecha_fertilizacion, tipo_fertilizante,
    nombre_producto, dosis_kg_ha, unidades_nitrogeno_n, unidades_fosforo_p,
    unidades_potasio_k, metodo_aplicacion, observaciones
)
VALUES
    (
        'f0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'p0000000-0000-0000-0000-000000000003',
        '2026-02-20',
        'MINERAL_INORGANICO',
        'Fertiberia Complejo N-P-K 20-8-10',
        250.00,
        50.00,
        20.00,
        25.00,
        'COBERTERA_FONDO',
        'Abonado de cobertera previo al ahijamiento del trigo duro conforme al plan de abonado racional.'
    )
ON CONFLICT (id) DO NOTHING;

-- 9. Riegos y Consumo de Agua
INSERT INTO riegos (
    id, farmer_id, parcela_id, fecha_riego, volumen_m3,
    metodo_riego, duracion_horas, observaciones
)
VALUES
    (
        'w0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'p0000000-0000-0000-0000-000000000001',
        '2026-04-05',
        2500.00,
        'GOTEO',
        18.50,
        'Riego deficitario controlado. Concesión Confederación Hidrográfica del Guadalquivir. Lectura contador: 142.890 m3.'
    )
ON CONFLICT (id) DO NOTHING;

-- 10. Configuración de Conexión a Base de Datos (SuperAdmin)
INSERT INTO config_database (id, host, port, database_name, username, password_encrypted, ssl_enabled, max_connections, is_active)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'db.xeqnlmfyvijdgclfhzgf.supabase.co', 5432, 'postgres', 'postgres', 'enc_aes256_Gk8f93j2...', TRUE, 20, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 11. Configuración de APIs Oficiales (SIEX, SIGPAC)
INSERT INTO config_api_endpoints (service_id, service_name, endpoint_url, auth_type, api_key_encrypted, environment, timeout_ms, is_active, extra_headers)
VALUES
    ('SIGPAC_REST', 'Servicio WFS/REST SIGPAC MAPA', 'https://sigpac.mapa.gob.es/fega/servicios/rest/recintos', 'NONE', NULL, 'PRODUCTION', 8000, TRUE, '{"Accept": "application/json"}'),
    ('SIEX_REST', 'API Central SIEX - FEGA (Cuaderno Digital)', 'https://siex.mapa.gob.es/api/v1/cuaderno/sincronizar', 'BEARER_TOKEN', 'enc_siex_token_991823712', 'SANDBOX', 12000, TRUE, '{"Content-Type": "application/json", "X-Platform-ID": "CUE-SAAS-SPAIN"}')
ON CONFLICT (service_id) DO NOTHING;
