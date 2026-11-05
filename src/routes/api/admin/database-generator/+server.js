/**
 * @file api/admin/database-generator/+server.js
 * Endpoint para generación de esquemas SQL, reinicio completo de proyecto (Factory Reset)
 * y migración a nuevas bases de datos.
 */

import { json } from '@sveltejs/kit';
import { resetProjectDatabase, getDatabaseStats, getSqlScriptByDialect } from '$lib/server/db.js';

export async function GET({ locals }) {
	if (locals.user && locals.user.rol !== 'SUPERADMIN') {
		return json({ success: false, message: 'No autorizado. Se requiere rol SUPERADMIN.' }, { status: 403 });
	}

	try {
		const stats = getDatabaseStats();
		return json({
			success: true,
			stats
		});
	} catch (err) {
		return json({
			success: false,
			message: err.message || 'Error al obtener estadísticas de la base de datos.'
		}, { status: 500 });
	}
}

export async function POST({ request, locals }) {
	if (locals.user && locals.user.rol !== 'SUPERADMIN') {
		return json({ success: false, message: 'No autorizado. Se requiere rol SUPERADMIN.' }, { status: 403 });
	}

	try {
		const body = await request.json();
		const { action = 'reset_project', dialect = 'postgres', includeDemo = true } = body;

		if (action === 'reset_project') {
			const result = resetProjectDatabase();
			return json({
				success: true,
				message: 'Proyecto reiniciado con éxito. Se han regenerado todas las tablas relacionales y reinsertado todos los datos de demostración.',
				stats: result.stats
			});
		}

		if (action === 'get_script') {
			const script = getSqlScriptByDialect(dialect, includeDemo);
			return json({
				success: true,
				dialect,
				includeDemo,
				scriptLength: script.length,
				script
			});
		}

		if (action === 'init_database') {
			// Si el destino es local SQLite, regenera la base de datos
			const result = resetProjectDatabase();
			return json({
				success: true,
				message: `Base de datos inicializada correctamente para el dialecto ${dialect.toUpperCase()}.`,
				stats: result.stats
			});
		}

		return json({ success: false, message: `Acción desconocida: ${action}` }, { status: 400 });
	} catch (err) {
		return json({
			success: false,
			message: err.message || 'Error durante la operación del generador de base de datos.'
		}, { status: 500 });
	}
}
