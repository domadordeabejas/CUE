import { getDbConfig, getApiEndpoints, getSqlLogs, getFarmers, getUsers, syncFromSupabase } from '$lib/server/db.js';

/**
 * Server Load para el Panel de SuperAdmin
 * Carga configuraciones de infraestructura, listado de inquilinos y usuarios
 */
export async function load() {
	await syncFromSupabase();
	return {
		dbConfig: getDbConfig(),
		apiEndpoints: getApiEndpoints(),
		sqlLogs: getSqlLogs(),
		farmers: getFarmers(),
		users: getUsers()
	};
}
