import { json } from '@sveltejs/kit';
import { getTratamientosByFarmer, insertTratamiento, syncFromSupabase } from '$lib/server/db.js';

/**
 * GET: Listar tratamientos filtrados por la explotación del usuario autenticado
 * Sincroniza con Supabase y devuelve la vista relacional enriquecida
 */
export async function GET({ url, locals }) {
	let farmerId;
	if (locals.user && locals.user.rol !== 'SUPERADMIN' && locals.user.farmer_id) {
		farmerId = locals.user.farmer_id;
	} else {
		farmerId = url.searchParams.get('farmer_id') || 'a0000000-0000-0000-0000-000000000001';
	}

	try {
		const syncRes = await syncFromSupabase();
		const tratamientos = getTratamientosByFarmer(farmerId);
		const source = (syncRes?.error || syncRes?.reason) ? 'LOCAL' : 'SUPABASE';
		return json({ success: true, tratamientos, source });
	} catch (err) {
		return json({ success: false, message: err.message }, { status: 500 });
	}
}

/**
 * POST: Registrar un nuevo tratamiento fitosanitario en el CUE y sincronizar en Supabase
 * Enforza el farmer_id del usuario autenticado
 */
export async function POST({ request, locals }) {
	try {
		const body = await request.json();

		if (locals.user && locals.user.rol !== 'SUPERADMIN' && locals.user.farmer_id) {
			body.farmer_id = locals.user.farmer_id;
		}

		// Validación estricta en servidor, guardado local y replicación directa en Supabase
		const result = await insertTratamiento(body);

		return json({
			success: true,
			message: 'Tratamiento fitosanitario registrado y firmado legalmente en CUE',
			tratamiento: result
		});
	} catch (err) {
		return json({
			success: false,
			message: err.message || 'Error al registrar tratamiento'
		}, { status: 400 });
	}
}
