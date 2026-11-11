import { json } from '@sveltejs/kit';
import {
	getDbConfig,
	updateDbConfig,
	getApiEndpoints,
	updateApiEndpoint
} from '$lib/server/db.js';

/**
 * GET: Obtener configuraciones del sistema (Credenciales BD y Endpoints)
 */
export async function GET() {
	return json({
		success: true,
		dbConfig: getDbConfig(),
		apiEndpoints: getApiEndpoints()
	});
}

/**
 * POST: Actualizar configuración de base de datos o endpoints de API
 */
export async function POST({ request }) {
	try {
		const payload = await request.json();
		const { type, data } = payload;

		if (type === 'DB_CONFIG') {
			const updated = await updateDbConfig(data);
			return json({
				success: true,
				message: 'Configuración de conexión SQL actualizada con éxito.',
				dbConfig: updated
			});
		}

		if (type === 'API_ENDPOINT') {
			const updatedList = await updateApiEndpoint(data);
			return json({
				success: true,
				message: `Endpoint ${data.name || data.serviceId} actualizado correctamente.`,
				apiEndpoints: updatedList
			});
		}

		return json({ success: false, message: 'Tipo de configuración no soportado.' }, { status: 400 });
	} catch (err) {
		return json({ success: false, message: err.message }, { status: 500 });
	}
}
