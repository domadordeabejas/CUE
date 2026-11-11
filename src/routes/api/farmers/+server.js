import { json } from '@sveltejs/kit';
import { getFarmers, createFarmer, updateFarmer } from '$lib/server/db.js';

/**
 * GET: Obtener lista de inquilinos / agricultores
 */
export async function GET() {
	try {
		const farmers = getFarmers();
		return json({ success: true, farmers });
	} catch (err) {
		return json({ success: false, message: err.message }, { status: 500 });
	}
}

/**
 * POST: Registrar un nuevo agricultor (Tenant)
 */
export async function POST({ request }) {
	try {
		const body = await request.json();
		const farmer = await createFarmer(body);
		return json({
			success: true,
			message: `Explotación agrícola ${farmer.nombre_titular} dada de alta con éxito.`,
			farmer
		});
	} catch (err) {
		return json({ success: false, message: err.message }, { status: 400 });
	}
}

/**
 * PUT: Modificar datos de una explotación agrícola
 */
export async function PUT({ request }) {
	try {
		const body = await request.json();
		const { id, ...data } = body;
		if (!id) return json({ success: false, message: 'ID de agricultor requerido' }, { status: 400 });

		const updated = await updateFarmer(id, data);
		return json({
			success: true,
			message: `Datos de ${updated.nombre_titular} actualizados.`,
			farmer: updated
		});
	} catch (err) {
		return json({ success: false, message: err.message }, { status: 400 });
	}
}
