/**
 * @file api/admin/seed/+server.js
 * Endpoint para re-sembrar la base de datos con todos los datos de demostración oficiales.
 */

import { json } from '@sveltejs/kit';
import { reseedDemoData } from '$lib/server/db.js';

export async function POST({ locals }) {
	// Verificar que el usuario tenga rol de administración
	if (locals.user && locals.user.rol !== 'SUPERADMIN') {
		return json({ success: false, message: 'No autorizado. Se requiere rol SUPERADMIN.' }, { status: 403 });
	}

	try {
		const result = reseedDemoData(true);
		return json({
			success: true,
			message: 'Todos los datos de demostración han sido insertados y persistidos en la Base de Datos SQL correctamente.',
			result
		});
	} catch (err) {
		return json({
			success: false,
			message: err.message || 'Error al sembrar la base de datos.'
		}, { status: 500 });
	}
}
