/**
 * @file supabase-client.js
 * Cliente de Servidor para Supabase y Gestor de Sincronización en la Nube.
 * Conecta directamente a Supabase PostgreSQL vía PostgREST y Realtime,
 * gestionando el almacenamiento primario en la nube y la sincronización con SQLite local.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

export const SUPABASE_URL =
	process.env.NEXT_PUBLIC_SUPABASE_URL ||
	process.env.PUBLIC_SUPABASE_URL ||
	'https://xeqnlmfyvijdgclfhzgf.supabase.co';

export const SUPABASE_KEY =
	process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
	process.env.PUBLIC_SUPABASE_ANON_KEY ||
	'sb_publishable_Ppp5160TqdfVeWKEZ05W3A_LtduAkoK';

export const SUPABASE_SQL_EDITOR_URL =
	'https://supabase.com/dashboard/project/xeqnlmfyvijdgclfhzgf/sql';

/**
 * Cliente singleton de Supabase para operaciones en el backend
 */
export const supabaseServer = createClient(SUPABASE_URL, SUPABASE_KEY, {
	auth: {
		persistSession: false,
		autoRefreshToken: false
	}
});

// Lista oficial de tablas en Supabase
export const REQUIRED_TABLES = [
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

/**
 * Obtiene el script DDL y seed completo para Supabase
 */
export function getSupabaseSetupSql() {
	try {
		const filePath = path.resolve(process.cwd(), 'database', 'supabase_setup.sql');
		if (fs.existsSync(filePath)) {
			return fs.readFileSync(filePath, 'utf-8');
		}
	} catch (err) {
		console.error('Error leyendo database/supabase_setup.sql:', err.message);
	}
	return '';
}

/**
 * Diagnóstico exhaustivo del estado de Supabase y sus tablas
 */
export async function checkSupabaseStatus() {
	const startTime = performance.now();
	let connected = false;
	const tableStatuses = [];

	try {
		// Probar cada tabla directamente mediante supabaseServer (soporta claves sb_publishable_* y anon JWT)
		let anyPostgrestResponse = false;
		let invalidKeyError = false;

		for (const tableName of REQUIRED_TABLES) {
			try {
				const { data, error, count, status } = await supabaseServer
					.from(tableName)
					.select('*', { count: 'exact', head: false })
					.limit(1);

				if (status && status !== 0) {
					anyPostgrestResponse = true;
				}
				if (status === 401 || error?.message?.toLowerCase().includes('invalid api key')) {
					invalidKeyError = true;
				}

				if (error) {
					// PGRST205 significa que PostgREST respondió correctamente pero la tabla aún no existe
					if (error.code === 'PGRST205') {
						anyPostgrestResponse = true;
					}
					tableStatuses.push({
						name: tableName,
						exists: false,
						error: error.message || error.code,
						count: 0
					});
				} else {
					anyPostgrestResponse = true;
					tableStatuses.push({
						name: tableName,
						exists: true,
						error: null,
						count: count ?? (Array.isArray(data) ? data.length : 0)
					});
				}
			} catch (tableErr) {
				tableStatuses.push({
					name: tableName,
					exists: false,
					error: tableErr.message,
					count: 0
				});
			}
		}

		connected = anyPostgrestResponse && !invalidKeyError;
	} catch (netErr) {
		connected = false;
		return {
			connected: false,
			latencyMs: Math.round(performance.now() - startTime),
			supabaseUrl: SUPABASE_URL,
			sqlEditorUrl: SUPABASE_SQL_EDITOR_URL,
			tablesReady: false,
			tables: [],
			errorMessage: `No se pudo alcanzar el endpoint de Supabase: ${netErr.message}`
		};
	}

	const latencyMs = Math.round(performance.now() - startTime);
	const existingCount = tableStatuses.filter((t) => t.exists).length;
	const tablesReady = existingCount === REQUIRED_TABLES.length;

	return {
		connected,
		latencyMs,
		supabaseUrl: SUPABASE_URL,
		sqlEditorUrl: SUPABASE_SQL_EDITOR_URL,
		tablesReady,
		tablesExisting: existingCount,
		tablesTotal: REQUIRED_TABLES.length,
		tables: tableStatuses,
		sqlScript: getSupabaseSetupSql()
	};
}

/**
 * Sube y sincroniza todos los registros de la base de datos local a Supabase
 * @param {Object} allData
 */
export async function syncAllDataToSupabase(allData) {
	const results = {};
	const errors = [];

	// 1. Inquilinos (farmers)
	if (allData.farmers?.length) {
		const { data, error } = await supabaseServer
			.from('farmers')
			.upsert(allData.farmers, { onConflict: 'id' });
		if (error) errors.push(`Error en farmers: ${error.message}`);
		results.farmers = error ? 0 : allData.farmers.length;
	}

	// 2. Usuarios
	if (allData.users?.length) {
		const usersToUpsert = allData.users.map((u) => ({
			id: u.id,
			farmer_id: u.farmer_id || null,
			nombre: u.nombre,
			apellidos: u.apellidos,
			email: u.email,
			password_hash: u.password_hash,
			rol: u.rol,
			nif: u.nif,
			telefono: u.telefono,
			is_active: Boolean(u.is_active)
		}));
		const { error } = await supabaseServer
			.from('users')
			.upsert(usersToUpsert, { onConflict: 'id' });
		if (error) errors.push(`Error en users: ${error.message}`);
		results.users = error ? 0 : usersToUpsert.length;
	}

	// 3. Explotaciones
	if (allData.explotaciones?.length) {
		const { error } = await supabaseServer
			.from('explotaciones')
			.upsert(allData.explotaciones, { onConflict: 'id' });
		if (error) errors.push(`Error en explotaciones: ${error.message}`);
		results.explotaciones = error ? 0 : allData.explotaciones.length;
	}

	// 4. Parcelas
	if (allData.parcelas?.length) {
		const parcelasToUpsert = allData.parcelas.map((p) => ({
			id: p.id,
			farmer_id: p.farmer_id,
			explotacion_id: p.explotacion_id,
			nombre_referencia: p.nombre_referencia,
			provincia: p.provincia,
			municipio: p.municipio,
			agregado: p.agregado || 0,
			zona: p.zona || 0,
			poligono: p.poligono,
			parcela: p.parcela,
			recinto: p.recinto,
			superficie_ha: p.superficie_ha,
			uso_sigpac: p.uso_sigpac,
			sistema_explotacion: p.sistema_explotacion || 'SECANO',
			cultivo_actual: p.cultivo_actual,
			variedad: p.variedad || '',
			fecha_siembra_plantacion: p.fecha_siembra_plantacion || null,
			activa: Boolean(p.activa)
		}));
		const { error } = await supabaseServer
			.from('parcelas')
			.upsert(parcelasToUpsert, { onConflict: 'id' });
		if (error) errors.push(`Error en parcelas: ${error.message}`);
		results.parcelas = error ? 0 : parcelasToUpsert.length;
	}

	// 5. ROPO Trabajadores
	if (allData.ropo_trabajadores?.length) {
		const ropoToUpsert = allData.ropo_trabajadores.map((r) => ({
			...r,
			activo: Boolean(r.activo)
		}));
		const { error } = await supabaseServer
			.from('ropo_trabajadores')
			.upsert(ropoToUpsert, { onConflict: 'id' });
		if (error) errors.push(`Error en ropo_trabajadores: ${error.message}`);
		results.ropo_trabajadores = error ? 0 : ropoToUpsert.length;
	}

	// 6. ROMA Maquinaria
	if (allData.roma_maquinaria?.length) {
		const romaToUpsert = allData.roma_maquinaria.map((m) => ({
			...m,
			activo: Boolean(m.activo)
		}));
		const { error } = await supabaseServer
			.from('roma_maquinaria')
			.upsert(romaToUpsert, { onConflict: 'id' });
		if (error) errors.push(`Error en roma_maquinaria: ${error.message}`);
		results.roma_maquinaria = error ? 0 : romaToUpsert.length;
	}

	// 7. Tratamientos Fitosanitarios
	if (allData.tratamientos_fitosanitarios?.length) {
		const { error } = await supabaseServer
			.from('tratamientos_fitosanitarios')
			.upsert(allData.tratamientos_fitosanitarios, { onConflict: 'id' });
		if (error) errors.push(`Error en tratamientos_fitosanitarios: ${error.message}`);
		results.tratamientos_fitosanitarios = error ? 0 : allData.tratamientos_fitosanitarios.length;
	}

	// 8. Fertilizaciones
	if (allData.fertilizaciones?.length) {
		const { error } = await supabaseServer
			.from('fertilizaciones')
			.upsert(allData.fertilizaciones, { onConflict: 'id' });
		if (error) errors.push(`Error en fertilizaciones: ${error.message}`);
		results.fertilizaciones = error ? 0 : allData.fertilizaciones.length;
	}

	// 9. Riegos
	if (allData.riegos?.length) {
		const { error } = await supabaseServer
			.from('riegos')
			.upsert(allData.riegos, { onConflict: 'id' });
		if (error) errors.push(`Error en riegos: ${error.message}`);
		results.riegos = error ? 0 : allData.riegos.length;
	}

	// 10. Endpoints APIs
	if (allData.config_api_endpoints?.length) {
		const endpointsToUpsert = allData.config_api_endpoints.map((ep) => ({
			...ep,
			is_active: Boolean(ep.is_active)
		}));
		const { error } = await supabaseServer
			.from('config_api_endpoints')
			.upsert(endpointsToUpsert, { onConflict: 'service_id' });
		if (error) errors.push(`Error en config_api_endpoints: ${error.message}`);
		results.config_api_endpoints = error ? 0 : endpointsToUpsert.length;
	}

	// 11. Configuración DB
	if (allData.config_database?.length) {
		const cfgToUpsert = allData.config_database.map((c) => ({
			...c,
			ssl_enabled: Boolean(c.ssl_enabled),
			is_active: Boolean(c.is_active)
		}));
		const { error } = await supabaseServer
			.from('config_database')
			.upsert(cfgToUpsert, { onConflict: 'id' });
		if (error) errors.push(`Error en config_database: ${error.message}`);
		results.config_database = error ? 0 : cfgToUpsert.length;
	}

	// 12. Logs de auditoría SQL / SIEX
	if (allData.sql_execution_logs?.length) {
		const { error } = await supabaseServer
			.from('sql_execution_logs')
			.upsert(allData.sql_execution_logs, { onConflict: 'id' });
		if (error) errors.push(`Error en sql_execution_logs: ${error.message}`);
		results.sql_execution_logs = error ? 0 : allData.sql_execution_logs.length;
	}

	return {
		success: errors.length === 0,
		results,
		errors
	};
}

/**
 * Ejecuta de forma segura una operación de replicación en Supabase sin romper la operación local
 * @param {string} label
 * @param {Promise<{ error: any }>} opPromise
 */
export async function replicateToSupabase(label, opPromise) {
	try {
		const { error } = await opPromise;
		if (error) {
			console.warn(`Supabase ${label} sync:`, error.message);
			return false;
		}
		lastPullTime = 0;
		return true;
	} catch (sbErr) {
		console.warn(`Supabase replication warning (${label}):`, sbErr.message);
		return false;
	}
}

/**
 * Extrae una instantánea completa de las 12 tablas de la BD SQLite local
 * @param {import('node:sqlite').DatabaseSync} db
 */
export function extractLocalSnapshot(db) {
	return {
		farmers: db.prepare('SELECT * FROM farmers;').all(),
		users: db.prepare('SELECT * FROM users;').all(),
		explotaciones: db.prepare('SELECT * FROM explotaciones;').all(),
		parcelas: db.prepare('SELECT * FROM parcelas;').all(),
		ropo_trabajadores: db.prepare('SELECT * FROM ropo_trabajadores;').all(),
		roma_maquinaria: db.prepare('SELECT * FROM roma_maquinaria;').all(),
		tratamientos_fitosanitarios: db.prepare('SELECT * FROM tratamientos_fitosanitarios;').all(),
		fertilizaciones: db.prepare('SELECT * FROM fertilizaciones;').all(),
		riegos: db.prepare('SELECT * FROM riegos;').all(),
		config_database: db.prepare('SELECT * FROM config_database;').all(),
		config_api_endpoints: db.prepare('SELECT * FROM config_api_endpoints;').all(),
		sql_execution_logs: db.prepare('SELECT * FROM sql_execution_logs;').all()
	};
}

/**
 * Comprueba la disponibilidad de Supabase y sube la instantánea completa de las 12 tablas
 * @param {import('node:sqlite').DatabaseSync} db
 */
export async function syncLocalSnapshotToSupabase(db) {
	try {
		const sbStatus = await checkSupabaseStatus();
		if (!sbStatus.connected || !sbStatus.tablesReady) {
			return { synced: false, reason: sbStatus.errorMessage || 'Tablas no disponibles' };
		}
		const syncResult = await syncAllDataToSupabase(extractLocalSnapshot(db));
		return { synced: true, ...syncResult };
	} catch (err) {
		return { synced: false, error: err.message };
	}
}

let lastPullTime = 0;

/**
 * Descarga todos los datos desde Supabase y actualiza la caché relacional SQLite
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {boolean} force - Si es true ignora el throttle de 2 segundos
 */
export async function hydrateLocalFromSupabase(db, force = false) {
	const now = Date.now();
	if (!force && now - lastPullTime < 2000) {
		return { hydrated: false, skipped: true };
	}

	try {
		const { data: farmers, error: fErr } = await supabaseServer.from('farmers').select('*');
		if (fErr || !farmers) {
			return { hydrated: false, reason: fErr?.message || 'Tablas no disponibles' };
		}

		lastPullTime = now;

		const [usersRes, expRes, parcRes, ropoRes, romaRes, tratRes, fertRes, riegoRes, cfgDbRes, cfgApiRes, logsRes] = await Promise.all([
			supabaseServer.from('users').select('*'),
			supabaseServer.from('explotaciones').select('*'),
			supabaseServer.from('parcelas').select('*'),
			supabaseServer.from('ropo_trabajadores').select('*'),
			supabaseServer.from('roma_maquinaria').select('*'),
			supabaseServer.from('tratamientos_fitosanitarios').select('*'),
			supabaseServer.from('fertilizaciones').select('*'),
			supabaseServer.from('riegos').select('*'),
			supabaseServer.from('config_database').select('*'),
			supabaseServer.from('config_api_endpoints').select('*'),
			supabaseServer.from('sql_execution_logs').select('*').order('executedAt', { ascending: false }).limit(100)
		]);

		db.exec('PRAGMA foreign_keys = OFF;');
		try {
			// Upsert Farmers
			if (farmers.length > 0) {
				const stmt = db.prepare(`
					INSERT INTO farmers (id, nombre_titular, cif_nif, email_contacto, telefono, direccion, codigo_postal, municipio, provincia, estado, created_at, updated_at)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
					ON CONFLICT(id) DO UPDATE SET
						nombre_titular = excluded.nombre_titular,
						cif_nif = excluded.cif_nif,
						email_contacto = excluded.email_contacto,
						telefono = excluded.telefono,
						direccion = excluded.direccion,
						codigo_postal = excluded.codigo_postal,
						municipio = excluded.municipio,
						provincia = excluded.provincia,
						estado = excluded.estado,
						updated_at = excluded.updated_at;
				`);
				for (const f of farmers) {
					stmt.run(f.id, f.nombre_titular, f.cif_nif, f.email_contacto, f.telefono || '', f.direccion || '', f.codigo_postal || '', f.municipio || '', f.provincia || '', f.estado || 'ACTIVO', f.created_at, f.updated_at);
				}
			}

			// Upsert Users
			if (usersRes.data?.length > 0) {
				const stmt = db.prepare(`
					INSERT INTO users (id, farmer_id, nombre, apellidos, email, password_hash, rol, nif, telefono, is_active, created_at, updated_at)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
					ON CONFLICT(id) DO UPDATE SET
						farmer_id = excluded.farmer_id,
						nombre = excluded.nombre,
						apellidos = excluded.apellidos,
						email = excluded.email,
						password_hash = excluded.password_hash,
						rol = excluded.rol,
						nif = excluded.nif,
						telefono = excluded.telefono,
						is_active = excluded.is_active,
						updated_at = excluded.updated_at;
				`);
				for (const u of usersRes.data) {
					stmt.run(u.id, u.farmer_id || null, u.nombre, u.apellidos, u.email, u.password_hash, u.rol, u.nif, u.telefono || '', u.is_active ? 1 : 0, u.created_at, u.updated_at);
				}
			}

			// Upsert Explotaciones
			if (expRes.data?.length > 0) {
				const stmt = db.prepare(`
					INSERT INTO explotaciones (id, farmer_id, codigo_rea, nombre, titular_nif, municipio_sede, provincia_sede, tipo_explotacion, created_at, updated_at)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
					ON CONFLICT(id) DO UPDATE SET
						nombre = excluded.nombre,
						codigo_rea = excluded.codigo_rea,
						updated_at = excluded.updated_at;
				`);
				for (const e of expRes.data) {
					stmt.run(e.id, e.farmer_id, e.codigo_rea, e.nombre, e.titular_nif, e.municipio_sede, e.provincia_sede, e.tipo_explotacion, e.created_at, e.updated_at);
				}
			}

			// Upsert Parcelas
			if (parcRes.data?.length > 0) {
				const stmt = db.prepare(`
					INSERT INTO parcelas (id, farmer_id, explotacion_id, nombre_referencia, provincia, municipio, agregado, zona, poligono, parcela, recinto, superficie_ha, uso_sigpac, sistema_explotacion, cultivo_actual, variedad, fecha_siembra_plantacion, activa, created_at, updated_at)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
					ON CONFLICT(id) DO UPDATE SET
						nombre_referencia = excluded.nombre_referencia,
						superficie_ha = excluded.superficie_ha,
						cultivo_actual = excluded.cultivo_actual,
						variedad = excluded.variedad,
						uso_sigpac = excluded.uso_sigpac,
						sistema_explotacion = excluded.sistema_explotacion,
						activa = excluded.activa,
						updated_at = excluded.updated_at;
				`);
				for (const p of parcRes.data) {
					stmt.run(p.id, p.farmer_id, p.explotacion_id, p.nombre_referencia, p.provincia, p.municipio, p.agregado || 0, p.zona || 0, p.poligono, p.parcela, p.recinto, p.superficie_ha, p.uso_sigpac, p.sistema_explotacion, p.cultivo_actual, p.variedad || '', p.fecha_siembra_plantacion || null, p.activa ? 1 : 0, p.created_at, p.updated_at);
				}
			}

			// Upsert ROPO
			if (ropoRes.data?.length > 0) {
				const stmt = db.prepare(`
					INSERT INTO ropo_trabajadores (id, farmer_id, nombre, apellidos, nif, numero_ropo, tipo_carnet, fecha_expedicion, fecha_caducidad, activo, created_at, updated_at)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
					ON CONFLICT(id) DO UPDATE SET
						activo = excluded.activo,
						fecha_caducidad = excluded.fecha_caducidad,
						updated_at = excluded.updated_at;
				`);
				for (const r of ropoRes.data) {
					stmt.run(r.id, r.farmer_id, r.nombre, r.apellidos, r.nif, r.numero_ropo, r.tipo_carnet, r.fecha_expedicion, r.fecha_caducidad, r.activo ? 1 : 0, r.created_at, r.updated_at);
				}
			}

			// Upsert ROMA
			if (romaRes.data?.length > 0) {
				const stmt = db.prepare(`
					INSERT INTO roma_maquinaria (id, farmer_id, tipo_maquina, marca, modelo, numero_roma, numero_bastidor, fecha_adquisicion, fecha_ultima_iteaf, fecha_caducidad_iteaf, activo, created_at, updated_at)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
					ON CONFLICT(id) DO UPDATE SET
						activo = excluded.activo,
						fecha_caducidad_iteaf = excluded.fecha_caducidad_iteaf,
						updated_at = excluded.updated_at;
				`);
				for (const m of romaRes.data) {
					stmt.run(m.id, m.farmer_id, m.tipo_maquina, m.marca, m.modelo, m.numero_roma, m.numero_bastidor || '', m.fecha_adquisicion || null, m.fecha_ultima_iteaf, m.fecha_caducidad_iteaf, m.activo ? 1 : 0, m.created_at, m.updated_at);
				}
			}

			// Upsert Tratamientos
			if (tratRes.data?.length > 0) {
				const stmt = db.prepare(`
					INSERT INTO tratamientos_fitosanitarios (id, farmer_id, parcela_id, operario_id, maquinaria_id, fecha_tratamiento, problema_fitosanitario, nombre_comercial, numero_registro_magrama, materia_activa, dosis_valor, dosis_unidad, volumen_caldo_l_ha, superficie_tratada_ha, plazo_seguridad_dias, fecha_recoleccion_permitida, justificacion_tratamiento, condiciones_meteorologicas, observaciones, created_at)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
					ON CONFLICT(id) DO NOTHING;
				`);
				for (const t of tratRes.data) {
					stmt.run(t.id, t.farmer_id, t.parcela_id, t.operario_id, t.maquinaria_id, t.fecha_tratamiento, t.problema_fitosanitario, t.nombre_comercial, t.numero_registro_magrama, t.materia_activa, t.dosis_valor, t.dosis_unidad, t.volumen_caldo_l_ha || 0, t.superficie_tratada_ha, t.plazo_seguridad_dias || 0, t.fecha_recoleccion_permitida || t.fecha_tratamiento, t.justificacion_tratamiento, t.condiciones_meteorologicas || '', t.observaciones || '', t.created_at);
				}
			}

			// Upsert Fertilizaciones
			if (fertRes.data?.length > 0) {
				const stmt = db.prepare(`
					INSERT INTO fertilizaciones (id, farmer_id, parcela_id, fecha_fertilizacion, tipo_fertilizante, nombre_producto, dosis_kg_ha, unidades_nitrogeno_n, unidades_fosforo_p, unidades_potasio_k, metodo_aplicacion, observaciones, created_at)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
					ON CONFLICT(id) DO NOTHING;
				`);
				for (const f of fertRes.data) {
					stmt.run(f.id, f.farmer_id, f.parcela_id, f.fecha_fertilizacion, f.tipo_fertilizante, f.nombre_producto, f.dosis_kg_ha, f.unidades_nitrogeno_n || 0, f.unidades_fosforo_p || 0, f.unidades_potasio_k || 0, f.metodo_aplicacion || 'Manual', f.observaciones || '', f.created_at);
				}
			}

			// Upsert Riegos
			if (riegoRes.data?.length > 0) {
				const stmt = db.prepare(`
					INSERT INTO riegos (id, farmer_id, parcela_id, fecha_riego, volumen_m3, metodo_riego, duracion_horas, observaciones, created_at)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
					ON CONFLICT(id) DO NOTHING;
				`);
				for (const rg of riegoRes.data) {
					stmt.run(rg.id, rg.farmer_id, rg.parcela_id, rg.fecha_riego, rg.volumen_m3, rg.metodo_riego, rg.duracion_horas ?? null, rg.observaciones || '', rg.created_at);
				}
			}

			// Upsert Config Database
			if (cfgDbRes.data?.length > 0) {
				const stmt = db.prepare(`
					INSERT INTO config_database (id, host, port, database_name, username, password_encrypted, ssl_enabled, max_connections, is_active)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
					ON CONFLICT(id) DO UPDATE SET
						host = excluded.host,
						port = excluded.port,
						database_name = excluded.database_name,
						username = excluded.username,
						ssl_enabled = excluded.ssl_enabled,
						max_connections = excluded.max_connections,
						is_active = excluded.is_active;
				`);
				for (const c of cfgDbRes.data) {
					stmt.run(c.id, c.host, c.port, c.database_name, c.username, c.password_encrypted, c.ssl_enabled ? 1 : 0, c.max_connections, c.is_active ? 1 : 0);
				}
			}

			// Upsert Config API Endpoints
			if (cfgApiRes.data?.length > 0) {
				const stmt = db.prepare(`
					INSERT INTO config_api_endpoints (service_id, service_name, endpoint_url, auth_type, api_key_encrypted, environment, timeout_ms, is_active, extra_headers)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
					ON CONFLICT(service_id) DO UPDATE SET
						service_name = excluded.service_name,
						endpoint_url = excluded.endpoint_url,
						auth_type = excluded.auth_type,
						environment = excluded.environment,
						timeout_ms = excluded.timeout_ms,
						is_active = excluded.is_active;
				`);
				for (const ep of cfgApiRes.data) {
					stmt.run(ep.service_id, ep.service_name, ep.endpoint_url, ep.auth_type, ep.api_key_encrypted || null, ep.environment, ep.timeout_ms, ep.is_active ? 1 : 0, ep.extra_headers || null);
				}
			}

			// Upsert SQL Execution Logs
			if (logsRes.data?.length > 0) {
				const stmt = db.prepare(`
					INSERT INTO sql_execution_logs (id, sqlScript, operationType, status, rowsAffected, errorMessage, executionTimeMs, userEmail, executedAt)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
					ON CONFLICT(id) DO NOTHING;
				`);
				for (const l of logsRes.data) {
					stmt.run(l.id, l.sqlScript, l.operationType, l.status, l.rowsAffected ?? 0, l.errorMessage || null, l.executionTimeMs ?? 0, l.userEmail, l.executedAt);
				}
			}
		} finally {
			db.exec('PRAGMA foreign_keys = ON;');
		}

		return {
			hydrated: true,
			counts: {
				farmers: farmers.length,
				users: usersRes.data?.length || 0,
				explotaciones: expRes.data?.length || 0,
				parcelas: parcRes.data?.length || 0,
				ropo_trabajadores: ropoRes.data?.length || 0,
				roma_maquinaria: romaRes.data?.length || 0,
				tratamientos: tratRes.data?.length || 0,
				fertilizaciones: fertRes.data?.length || 0,
				riegos: riegoRes.data?.length || 0,
				config_database: cfgDbRes.data?.length || 0,
				config_api_endpoints: cfgApiRes.data?.length || 0,
				sql_execution_logs: logsRes.data?.length || 0
			}
		};
	} catch (err) {
		console.warn('Hydrate from Supabase skipped:', err.message);
		return { hydrated: false, error: err.message };
	}
}
