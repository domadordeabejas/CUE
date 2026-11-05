import { getDbConfig, getApiEndpoints, getSqlLogs, getFarmers, getUsers } from '$lib/server/db.js';

/**
 * Server Load para el Panel de SuperAdmin
 * Carga configuraciones de infraestructura, listado de inquilinos y usuarios
 */
export async function load() {
	return {
		dbConfig: getDbConfig(),
		apiEndpoints: getApiEndpoints(),
		sqlLogs: getSqlLogs(),
		farmers: getFarmers(),
		users: getUsers()
	};
}
