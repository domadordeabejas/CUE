/**
 * @file sqlite.js
 * Motor de Base de Datos SQL Relacional Persistente para CUE SaaS.
 * Utiliza el módulo SQLite nativo de Node.js 24 (node:sqlite) para almacenamiento local ACID en disco,
 * con claves foráneas, borrado en cascada (ON DELETE CASCADE) y auto-seeding.
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const DB_DIR = path.resolve(process.cwd(), 'database');
const DB_PATH = path.join(DB_DIR, 'cue_database.sqlite');

let dbInstance = null;

/**
 * Obtiene o inicializa la instancia de base de datos SQLite persistente
 * @returns {DatabaseSync}
 */
export function getDb() {
	if (dbInstance) {
		return dbInstance;
	}

	if (!fs.existsSync(DB_DIR)) {
		fs.mkdirSync(DB_DIR, { recursive: true });
	}

	dbInstance = new DatabaseSync(DB_PATH);
	dbInstance.exec('PRAGMA foreign_keys = ON;');
	initTables(dbInstance);
	autoSeedIfEmpty(dbInstance);

	return dbInstance;
}

/**
 * Crea las tablas relacionales del CUE si no existen
 * @param {DatabaseSync} db
 */
function initTables(db) {
	db.exec(`
		CREATE TABLE IF NOT EXISTS farmers (
			id TEXT PRIMARY KEY,
			nombre_titular TEXT NOT NULL,
			cif_nif TEXT NOT NULL UNIQUE,
			email_contacto TEXT NOT NULL,
			telefono TEXT,
			direccion TEXT,
			codigo_postal TEXT,
			municipio TEXT,
			provincia TEXT,
			estado TEXT NOT NULL DEFAULT 'ACTIVO',
			created_at TEXT DEFAULT (datetime('now')),
			updated_at TEXT DEFAULT (datetime('now'))
		);

		CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			farmer_id TEXT REFERENCES farmers(id) ON DELETE CASCADE,
			nombre TEXT NOT NULL,
			apellidos TEXT NOT NULL,
			email TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL,
			rol TEXT NOT NULL CHECK (rol IN ('SUPERADMIN', 'AGRICULTOR', 'ASESOR')),
			nif TEXT NOT NULL,
			telefono TEXT,
			is_active INTEGER NOT NULL DEFAULT 1,
			created_at TEXT DEFAULT (datetime('now')),
			updated_at TEXT DEFAULT (datetime('now'))
		);

		CREATE TABLE IF NOT EXISTS explotaciones (
			id TEXT PRIMARY KEY,
			farmer_id TEXT NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
			codigo_rea TEXT NOT NULL,
			nombre TEXT NOT NULL,
			titular_nif TEXT NOT NULL,
			municipio_sede TEXT NOT NULL,
			provincia_sede TEXT NOT NULL,
			tipo_explotacion TEXT NOT NULL DEFAULT 'AGRICOLA_MIXTA',
			created_at TEXT DEFAULT (datetime('now')),
			updated_at TEXT DEFAULT (datetime('now')),
			UNIQUE (farmer_id, codigo_rea)
		);

		CREATE TABLE IF NOT EXISTS parcelas (
			id TEXT PRIMARY KEY,
			farmer_id TEXT NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
			explotacion_id TEXT NOT NULL REFERENCES explotaciones(id) ON DELETE CASCADE,
			nombre_referencia TEXT NOT NULL,
			provincia INTEGER NOT NULL,
			municipio INTEGER NOT NULL,
			agregado INTEGER NOT NULL DEFAULT 0,
			zona INTEGER NOT NULL DEFAULT 0,
			poligono INTEGER NOT NULL,
			parcela INTEGER NOT NULL,
			recinto INTEGER NOT NULL,
			superficie_ha REAL NOT NULL,
			uso_sigpac TEXT NOT NULL,
			sistema_explotacion TEXT NOT NULL DEFAULT 'SECANO',
			cultivo_actual TEXT NOT NULL,
			variedad TEXT,
			fecha_siembra_plantacion TEXT,
			activa INTEGER NOT NULL DEFAULT 1,
			created_at TEXT DEFAULT (datetime('now')),
			updated_at TEXT DEFAULT (datetime('now')),
			UNIQUE (farmer_id, provincia, municipio, agregado, zona, poligono, parcela, recinto)
		);

		CREATE TABLE IF NOT EXISTS ropo_trabajadores (
			id TEXT PRIMARY KEY,
			farmer_id TEXT NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
			nombre TEXT NOT NULL,
			apellidos TEXT NOT NULL,
			nif TEXT NOT NULL,
			numero_ropo TEXT NOT NULL,
			tipo_carnet TEXT NOT NULL CHECK (tipo_carnet IN ('BASICO', 'CUALIFICADO', 'FUMIGADOR', 'PILOTO_APLICADOR', 'ASESOR')),
			fecha_expedicion TEXT NOT NULL,
			fecha_caducidad TEXT NOT NULL,
			activo INTEGER NOT NULL DEFAULT 1,
			created_at TEXT DEFAULT (datetime('now')),
			updated_at TEXT DEFAULT (datetime('now')),
			UNIQUE (farmer_id, numero_ropo)
		);

		CREATE TABLE IF NOT EXISTS roma_maquinaria (
			id TEXT PRIMARY KEY,
			farmer_id TEXT NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
			tipo_maquina TEXT NOT NULL,
			marca TEXT NOT NULL,
			modelo TEXT NOT NULL,
			numero_roma TEXT NOT NULL,
			numero_bastidor TEXT,
			fecha_adquisicion TEXT,
			fecha_ultima_iteaf TEXT,
			fecha_caducidad_iteaf TEXT NOT NULL,
			activo INTEGER NOT NULL DEFAULT 1,
			created_at TEXT DEFAULT (datetime('now')),
			updated_at TEXT DEFAULT (datetime('now')),
			UNIQUE (farmer_id, numero_roma)
		);

		CREATE TABLE IF NOT EXISTS tratamientos_fitosanitarios (
			id TEXT PRIMARY KEY,
			farmer_id TEXT NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
			parcela_id TEXT NOT NULL REFERENCES parcelas(id) ON DELETE CASCADE,
			operario_id TEXT NOT NULL REFERENCES ropo_trabajadores(id),
			maquinaria_id TEXT NOT NULL REFERENCES roma_maquinaria(id),
			fecha_tratamiento TEXT NOT NULL,
			problema_fitosanitario TEXT NOT NULL,
			nombre_comercial TEXT NOT NULL,
			numero_registro_magrama TEXT NOT NULL,
			materia_activa TEXT NOT NULL,
			dosis_valor REAL NOT NULL,
			dosis_unidad TEXT NOT NULL,
			volumen_caldo_l_ha REAL NOT NULL,
			superficie_tratada_ha REAL NOT NULL,
			plazo_seguridad_dias INTEGER NOT NULL,
			fecha_recoleccion_permitida TEXT NOT NULL,
			justificacion_tratamiento TEXT NOT NULL,
			condiciones_meteorologicas TEXT NOT NULL,
			observaciones TEXT,
			created_at TEXT DEFAULT (datetime('now'))
		);

		CREATE TABLE IF NOT EXISTS fertilizaciones (
			id TEXT PRIMARY KEY,
			farmer_id TEXT NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
			parcela_id TEXT NOT NULL REFERENCES parcelas(id) ON DELETE CASCADE,
			fecha_fertilizacion TEXT NOT NULL,
			tipo_fertilizante TEXT NOT NULL,
			nombre_producto TEXT NOT NULL,
			dosis_kg_ha REAL NOT NULL,
			unidades_nitrogeno_n REAL,
			unidades_fosforo_p REAL,
			unidades_potasio_k REAL,
			metodo_aplicacion TEXT NOT NULL,
			observaciones TEXT,
			created_at TEXT DEFAULT (datetime('now'))
		);

		CREATE TABLE IF NOT EXISTS riegos (
			id TEXT PRIMARY KEY,
			farmer_id TEXT NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
			parcela_id TEXT NOT NULL REFERENCES parcelas(id) ON DELETE CASCADE,
			fecha_riego TEXT NOT NULL,
			volumen_m3 REAL NOT NULL,
			metodo_riego TEXT NOT NULL,
			duracion_horas REAL,
			observaciones TEXT,
			created_at TEXT DEFAULT (datetime('now'))
		);

		CREATE TABLE IF NOT EXISTS sql_execution_logs (
			id TEXT PRIMARY KEY,
			sqlScript TEXT NOT NULL,
			operationType TEXT NOT NULL,
			status TEXT NOT NULL,
			rowsAffected INTEGER NOT NULL,
			errorMessage TEXT,
			executionTimeMs INTEGER NOT NULL,
			userEmail TEXT NOT NULL,
			executedAt TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS config_database (
			id TEXT PRIMARY KEY,
			host TEXT NOT NULL,
			port INTEGER NOT NULL,
			database_name TEXT NOT NULL,
			username TEXT NOT NULL,
			password_encrypted TEXT NOT NULL,
			ssl_enabled INTEGER NOT NULL DEFAULT 1,
			max_connections INTEGER NOT NULL DEFAULT 20,
			is_active INTEGER NOT NULL DEFAULT 1
		);

		CREATE TABLE IF NOT EXISTS config_api_endpoints (
			service_id TEXT PRIMARY KEY,
			service_name TEXT NOT NULL,
			endpoint_url TEXT NOT NULL,
			auth_type TEXT NOT NULL,
			api_key_encrypted TEXT,
			environment TEXT NOT NULL,
			timeout_ms INTEGER NOT NULL,
			is_active INTEGER NOT NULL DEFAULT 1,
			extra_headers TEXT
		);
	`);
}

/**
 * Sembrado automático de todos los datos de demostración si la base de datos está vacía
 * @param {DatabaseSync} db
 * @param {boolean} force
 */
export function seedDatabase(db = null, force = false) {
	const activeDb = db || getDb();

	if (!force) {
		const countRow = activeDb.prepare('SELECT count(*) as count FROM farmers;').get();
		if (countRow && countRow.count > 0) {
			return { seeded: false, message: 'La base de datos ya contiene datos.' };
		}
	} else {
		// Limpieza en cascada si es forzado
		activeDb.exec(`
			DELETE FROM riegos;
			DELETE FROM fertilizaciones;
			DELETE FROM tratamientos_fitosanitarios;
			DELETE FROM roma_maquinaria;
			DELETE FROM ropo_trabajadores;
			DELETE FROM parcelas;
			DELETE FROM explotaciones;
			DELETE FROM users;
			DELETE FROM farmers;
			DELETE FROM config_api_endpoints;
			DELETE FROM config_database;
		`);
	}

	// 1. Farmers
	const insertFarmer = activeDb.prepare(`
		INSERT INTO farmers (id, nombre_titular, cif_nif, email_contacto, telefono, direccion, codigo_postal, municipio, provincia, estado)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO NOTHING;
	`);

	insertFarmer.run('a0000000-0000-0000-0000-000000000001', 'Agropecuaria Las Hazas S.L.', 'B14987654', 'info@agrohazassl.es', '+34600123456', 'Ctra. de la Vega km 4', '14005', 'Córdoba', 'Córdoba', 'ACTIVO');
	insertFarmer.run('a0000000-0000-0000-0000-000000000002', 'Herederos de Juan Gómez C.B.', 'E02123456', 'contacto@fincagomez.com', '+34611987654', 'Camino del Prado s/n', '02001', 'Albacete', 'Albacete', 'ACTIVO');

	// 2. Users (con hashes scrypt reales)
	const insertUser = activeDb.prepare(`
		INSERT INTO users (id, farmer_id, nombre, apellidos, email, password_hash, rol, nif, telefono, is_active)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO NOTHING;
	`);

	insertUser.run(
		'u0000000-0000-0000-0000-000000000001', null, 'Carlos', 'Administrador Global', 'admin@cue-saas.es',
		'8ee4be81f774c712cd093b942c018d51:f6abeb2e06ae0fdd9111f6e6d4a995b2e6330ea2dbde8042a837193090ee40501a425eebbd3b59c908c5b7e4ec8f45601d676ea792711e279f82f146465cf25d',
		'SUPERADMIN', '12345678Z', '+34699000111', 1
	);
	insertUser.run(
		'u0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Antonio', 'Pérez Moreno', 'antonio@agrohazassl.es',
		'1250fa52d80f4e85bde64252d7a3fcb9:6ab3850e3700d0630078db89fee04defcd77798270cf140390e34defe562e69fb3c71e0cc60d47fccbc0f63956fef3be27a4d0589263b569a4dcf310efd1b78a',
		'AGRICULTOR', '30998877A', '+34600123456', 1
	);
	insertUser.run(
		'u0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Elena', 'Martínez Rivas', 'elena.asesora@coopcordoba.com',
		'68ecf034ba7fab5d35b31eb285414b9e:3e8fee858a63e3513f5ea9ef03f248301c52a17fc57e0e061cb99a3ae1f3ba1fcfd559d3e542c69544feeb2bee3e97078fc3e2ec437f1a7f35b864447bd04244',
		'ASESOR', '44556677B', '+34622334455', 1
	);
	insertUser.run(
		'u0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'Juan', 'Gómez Sánchez', 'juan@fincagomez.com',
		'e5183af1aeff1e981a1c93a56759c8ed:bdfeec9efabf5298e960bb186712e36daa09cbe65b49584389cba9f97748a3e1836d799308bc12ff913096fa0efda3a92464f25c499b115c41287692d18ce52c',
		'AGRICULTOR', '05123456F', '+34611987654', 1
	);

	// 3. Explotaciones
	const insertExplotacion = activeDb.prepare(`
		INSERT INTO explotaciones (id, farmer_id, codigo_rea, nombre, titular_nif, municipio_sede, provincia_sede, tipo_explotacion)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO NOTHING;
	`);

	insertExplotacion.run('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'ES140210004921', 'Finca Montefrío y La Campana', 'B14987654', 'Córdoba', 'Córdoba', 'AGRICOLA_MIXTA');
	insertExplotacion.run('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'ES020010008892', 'Finca Los Llanos y El Salobral', 'E02123456', 'Albacete', 'Albacete', 'AGRICOLA_MIXTA');

	// 4. Parcelas SIGPAC
	const insertParcela = activeDb.prepare(`
		INSERT INTO parcelas (id, farmer_id, explotacion_id, nombre_referencia, provincia, municipio, agregado, zona, poligono, parcela, recinto, superficie_ha, uso_sigpac, sistema_explotacion, cultivo_actual, variedad, activa)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO NOTHING;
	`);

	insertParcela.run('p0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'El Olivar de la Loma (Picual)', 14, 21, 0, 0, 12, 45, 1, 6.45, 'OL', 'REGADIO', 'Olivar Almazara', 'Picual', 1);
	insertParcela.run('p0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Vega Baja - Almendros', 14, 21, 0, 0, 12, 48, 2, 4.12, 'FY', 'REGADIO', 'Almendro', 'Lauranne', 1);
	insertParcela.run('p0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Ruedos Trigo Duro', 14, 21, 0, 0, 14, 102, 1, 12.8, 'TA', 'SECANO', 'Trigo Duro', 'Avispa', 1);
	insertParcela.run('p0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'La Viña del Llano (Tempranillo)', 2, 1, 0, 0, 5, 23, 1, 8.5, 'VI', 'REGADIO', 'Vid para Vinificación', 'Tempranillo', 1);
	insertParcela.run('p0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'Cereal Secano El Hondo', 2, 1, 0, 0, 8, 110, 2, 22.0, 'TA', 'SECANO', 'Cebada Cervecera', 'Pewter', 1);

	// 5. ROPO Trabajadores
	const insertRopo = activeDb.prepare(`
		INSERT INTO ropo_trabajadores (id, farmer_id, nombre, apellidos, nif, numero_ropo, tipo_carnet, fecha_expedicion, fecha_caducidad, activo)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO NOTHING;
	`);

	insertRopo.run('r0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Manuel', 'García Romero', '28876543C', '01-14/0009841-C', 'CUALIFICADO', '2023-04-10', '2028-04-10', 1);
	insertRopo.run('r0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Rafael', 'Cano Lucena', '30234567D', '01-14/0015432-B', 'BASICO', '2022-02-15', '2027-02-15', 1);
	insertRopo.run('r0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Joaquín', 'Solís Benítez', '31445566E', '01-14/0002199-C', 'CUALIFICADO', '2019-01-10', '2024-01-10', 0);
	insertRopo.run('r0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'Pedro', 'Alarcón Ruiz', '04998811K', '01-02/0004812-C', 'CUALIFICADO', '2023-06-01', '2028-06-01', 1);

	// 6. ROMA Maquinaria
	const insertRoma = activeDb.prepare(`
		INSERT INTO roma_maquinaria (id, farmer_id, tipo_maquina, marca, modelo, numero_roma, numero_bastidor, fecha_adquisicion, fecha_ultima_iteaf, fecha_caducidad_iteaf, activo)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO NOTHING;
	`);

	insertRoma.run('m0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Atomizador Arrastrado 3000L', 'FEDUR', 'MAXI-TURBO 3000', '14/14021-00892', 'FED-2021-99823', '2021-03-15', '2023-05-20', '2026-05-20', 1);
	insertRoma.run('m0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Pulverizador Hidráulico Barras 12m', 'HARDI', 'MASTER PLUS 1200', '14/14021-01204', 'HAR-2022-44102', '2022-09-01', '2024-06-11', '2027-06-11', 1);
	insertRoma.run('m0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Atomizador Antiguo 1500L', 'ILEMO', 'SUPER-1500', '14/14021-00109', 'ILE-2010-00112', '2010-04-10', '2020-03-01', '2023-03-01', 0);
	insertRoma.run('m0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'Pulverizador Hidráulico 2000L', 'AGUIRRE', 'TAURUS 2000', '02/02001-00431', 'AGU-2022-11892', '2022-09-01', '2024-03-10', '2027-03-10', 1);

	// 7. Tratamientos Fitosanitarios
	const insertTrat = activeDb.prepare(`
		INSERT INTO tratamientos_fitosanitarios (
			id, farmer_id, parcela_id, operario_id, maquinaria_id,
			fecha_tratamiento, problema_fitosanitario, nombre_comercial,
			numero_registro_magrama, materia_activa, dosis_valor, dosis_unidad,
			volumen_caldo_l_ha, superficie_tratada_ha, plazo_seguridad_dias,
			fecha_recoleccion_permitida, justificacion_tratamiento,
			condiciones_meteorologicas, observaciones
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO NOTHING;
	`);

	insertTrat.run(
		't0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
		'p0000000-0000-0000-0000-000000000001', 'r0000000-0000-0000-0000-000000000001', 'm0000000-0000-0000-0000-000000000001',
		'2026-03-15', 'Repilo del Olivar (Spilocaea oleagina)', 'Cobre Nordox 75 WG', '22456',
		'Óxido cuproso 75%', 150.00, 'g/hl', 1000.00, 6.45, 14, '2026-03-29',
		'Tratamiento preventivo primaveral tras lluvias continuadas según prescripción técnica GIP.',
		'Viento 4 km/h, 18ºC, humedad 65%, cielo despejado.',
		'Tratamiento completado favorablemente. Boquillas antideriva cerámicas utilizadas.'
	);

	insertTrat.run(
		't0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
		'p0000000-0000-0000-0000-000000000002', 'r0000000-0000-0000-0000-000000000002', 'm0000000-0000-0000-0000-000000000001',
		'2026-04-02', 'Mancha Ocre del Almendro (Polystigma fulvum)', 'Score 25 EC', '18745',
		'Difenoconazol 25%', 0.05, 'l/hl', 800.00, 4.12, 21, '2026-04-23',
		'Detección de primeros síntomas foliares en el 5% de la masa foliar.',
		'Viento en calma, 20ºC, sin previsión de lluvias en 48 horas.',
		'Respetada la banda de seguridad de 5 metros con cauce de arroyo colindante.'
	);

	insertTrat.run(
		't0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002',
		'p0000000-0000-0000-0000-000000000004', 'r0000000-0000-0000-0000-000000000004', 'm0000000-0000-0000-0000-000000000004',
		'2026-04-10', 'Oídio de la Vid (Erysiphe necator)', 'Azufre Micronizado 80%', '12333',
		'Azufre 80%', 30.00, 'kg/ha', 0.00, 8.50, 5, '2026-04-15',
		'Tratamiento de espolvoreo preventivo en estado fenológico de racimos visibles.',
		'Viento 2 km/h, 21ºC, aplicación matinal temprana.',
		'Espolvoreo uniforme en toda la viña Tempranillo.'
	);

	// 8. Fertilizaciones
	const insertFert = activeDb.prepare(`
		INSERT INTO fertilizaciones (id, farmer_id, parcela_id, fecha_fertilizacion, tipo_fertilizante, nombre_producto, dosis_kg_ha, unidades_nitrogeno_n, unidades_fosforo_p, unidades_potasio_k, metodo_aplicacion, observaciones)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO NOTHING;
	`);

	insertFert.run('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000003', '2026-02-20', 'MINERAL_INORGANICO', 'Fertiberia Complejo N-P-K 20-8-10', 250.00, 50.00, 20.00, 25.00, 'COBERTERA_FONDO', 'Abonado de cobertera previo al ahijamiento del trigo duro conforme al plan de abonado racional.');

	// 9. Riegos
	const insertRiego = activeDb.prepare(`
		INSERT INTO riegos (id, farmer_id, parcela_id, fecha_riego, volumen_m3, metodo_riego, duracion_horas, observaciones)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO NOTHING;
	`);

	insertRiego.run('w0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000001', '2026-04-05', 2500.00, 'GOTEO', 18.50, 'Riego deficitario controlado. Concesión Confederación Hidrográfica del Guadalquivir. Lectura contador: 142.890 m3.');

	// 10. Configuración BD
	const insertConfigDb = activeDb.prepare(`
		INSERT INTO config_database (id, host, port, database_name, username, password_encrypted, ssl_enabled, max_connections, is_active)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO NOTHING;
	`);

	insertConfigDb.run('c0000000-0000-0000-0000-000000000001', 'db.xeqnlmfyvijdgclfhzgf.supabase.co', 5432, 'postgres', 'postgres', '••••••••••••••••', 1, 20, 1);

	// 11. Endpoints APIs
	const insertApi = activeDb.prepare(`
		INSERT INTO config_api_endpoints (service_id, service_name, endpoint_url, auth_type, api_key_encrypted, environment, timeout_ms, is_active, extra_headers)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(service_id) DO NOTHING;
	`);

	insertApi.run('SIGPAC_REST', 'Servicio WFS/REST SIGPAC MAPA', 'https://sigpac.mapa.gob.es/fega/servicios/rest/recintos', 'NONE', null, 'PRODUCTION', 8000, 1, '{"Accept": "application/json"}');
	insertApi.run('SIEX_REST', 'API Central SIEX - FEGA (Cuaderno Digital)', 'https://siex.mapa.gob.es/api/v1/cuaderno/sincronizar', 'BEARER_TOKEN', 'enc_siex_token_991823712', 'SANDBOX', 12000, 1, '{"Content-Type": "application/json", "X-Platform-ID": "CUE-SAAS-SPAIN"}');

	return { seeded: true, message: 'Base de datos sembrada con éxito con todos los datos de demostración.' };
}

/**
 * Obtiene estadísticas en tiempo real de todas las tablas y del archivo de BD
 * @returns {Object}
 */
export function getDatabaseStats() {
	const db = getDb();
	const tables = [
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
	];
	const tableCounts = {};
	for (const table of tables) {
		try {
			const row = db.prepare(`SELECT count(*) as count FROM ${table};`).get();
			tableCounts[table] = row ? row.count : 0;
		} catch {
			tableCounts[table] = 0;
		}
	}
	let sizeBytes = 0;
	try {
		if (fs.existsSync(DB_PATH)) {
			sizeBytes = fs.statSync(DB_PATH).size;
		}
	} catch {
		// ignore
	}

	return {
		engine: 'SQLite 3 (node:sqlite)',
		dbPath: DB_PATH,
		sizeBytes,
		sizeKb: Math.round(sizeBytes / 1024),
		tableCounts,
		totalRecords: Object.values(tableCounts).reduce((a, b) => a + b, 0),
		lastChecked: new Date().toISOString()
	};
}

/**
 * Restablece por completo el proyecto: elimina todas las tablas,
 * vuelve a ejecutar el DDL y siembra los datos de demostración limpios.
 * @returns {Object}
 */
export function resetProjectDatabase() {
	const db = getDb();
	db.exec('PRAGMA foreign_keys = OFF;');
	const tables = [
		'sql_execution_logs',
		'riegos',
		'fertilizaciones',
		'tratamientos_fitosanitarios',
		'roma_maquinaria',
		'ropo_trabajadores',
		'parcelas',
		'explotaciones',
		'users',
		'farmers',
		'config_api_endpoints',
		'config_database'
	];
	for (const table of tables) {
		try {
			db.exec(`DROP TABLE IF EXISTS ${table};`);
		} catch {
			// ignore
		}
	}
	db.exec('PRAGMA foreign_keys = ON;');

	initTables(db);
	seedDatabase(db, true);

	const stats = getDatabaseStats();
	return {
		success: true,
		message: 'Proyecto y Base de Datos restablecidos al estado inicial de fábrica con éxito.',
		stats
	};
}

/**
 * Devuelve el script SQL de inicialización según el dialecto solicitado
 * @param {string} dialect - 'postgres' | 'supabase' | 'sqlite' | 'mysql'
 * @param {boolean} includeDemo - Si debe incluir el seed
 * @returns {string}
 */
export function getSqlScriptByDialect(dialect = 'postgres', includeDemo = true) {
	if (dialect === 'postgres' || dialect === 'supabase') {
		const setupPath = path.resolve(process.cwd(), 'database', 'supabase_setup.sql');
		if (fs.existsSync(setupPath)) {
			let content = fs.readFileSync(setupPath, 'utf-8');
			if (!includeDemo) {
				const splitIndex = content.indexOf('-- 5. DATOS DE PRUEBA') !== -1 
					? content.indexOf('-- 5. DATOS DE PRUEBA') 
					: content.indexOf('-- SEED DATA COMPLETO');
				if (splitIndex !== -1) {
					content = content.substring(0, splitIndex).trim();
				}
			}
			return content;
		}
	}

	const schemaPath = path.resolve(process.cwd(), 'database', 'schema.sql');
	const seedPath = path.resolve(process.cwd(), 'database', 'seed.sql');
	let sql = fs.existsSync(schemaPath) ? fs.readFileSync(schemaPath, 'utf-8') : '';
	if (includeDemo && fs.existsSync(seedPath)) {
		sql += '\n\n' + fs.readFileSync(seedPath, 'utf-8');
	}
	return sql;
}

/**
 * Función interna de sembrado automático en el primer arranque
 * @param {DatabaseSync} db
 */
function autoSeedIfEmpty(db) {
	try {
		const row = db.prepare('SELECT count(*) as count FROM farmers;').get();
		if (!row || row.count === 0) {
			seedDatabase(db, false);
		}
	} catch (e) {
		console.error('Error durante auto-seed:', e.message);
	}
}
