import { json } from '@sveltejs/kit';
import { checkSupabaseStatus } from '$lib/server/supabase-client.js';

/**
 * GET /api/admin/supabase-status
 * Verifica la conectividad con Supabase Cloud y el estado de existencia de todas las tablas DDL
 */
export async function GET({ locals }) {
	// Verificar que el usuario tenga rol SUPERADMIN
	if (!locals.user || locals.user.rol !== 'SUPERADMIN') {
		return json({ success: false, message: 'Acceso no autorizado' }, { status: 403 });
	}

	try {
		const status = await checkSupabaseStatus();
		return json({
			success: true,
			...status
		});
	} catch (err) {
		return json({
			success: false,
			connected: false,
			message: `Error al comprobar Supabase: ${err.message}`
		}, { status: 500 });
	}
}
