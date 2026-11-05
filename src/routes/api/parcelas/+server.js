import { json } from '@sveltejs/kit';
import { getParcelasByFarmer, createParcela, updateParcela, deleteParcela } from '$lib/server/db.js';

/**
 * GET: Obtener parcelas de un agricultor con protección por sesión
 */
export async function GET({ url, locals }) {
	const farmerId = (locals.user && locals.user.rol !== 'SUPERADMIN' && locals.user.farmer_id)
		? locals.user.farmer_id
		: url.searchParams.get('farmer_id');

	if (!farmerId) return json({ success: false, message: 'farmer_id requerido' }, { status: 400 });

	try {
		const parcelas = getParcelasByFarmer(farmerId);
		return json({ success: true, parcelas });
	} catch (err) {
		return json({ success: false, message: err.message }, { status: 500 });
	}
}

/**
 * POST: Registrar una nueva parcela/cultivo para el agricultor autenticado
 */
export async function POST({ request, locals }) {
	try {
		const body = await request.json();
		if (locals.user && locals.user.rol !== 'SUPERADMIN' && locals.user.farmer_id) {
			body.farmer_id = locals.user.farmer_id;
		}

		const parcela = createParcela(body);
		return json({
			success: true,
			message: `Parcela ${parcela.nombre_referencia} (${parcela.cultivo_actual}) registrada en el SIGPAC.`,
			parcela
		});
	} catch (err) {
		return json({ success: false, message: err.message }, { status: 400 });
	}
}

/**
 * PUT: Actualizar una parcela existente
 */
export async function PUT({ request, locals }) {
	try {
		const body = await request.json();
		const { id, ...data } = body;
		if (!id) return json({ success: false, message: 'ID de parcela requerido' }, { status: 400 });

		if (locals.user && locals.user.rol !== 'SUPERADMIN' && locals.user.farmer_id) {
			data.farmer_id = locals.user.farmer_id;
		}

		const updated = updateParcela(id, data);
		return json({
			success: true,
			message: `Parcela ${updated.nombre_referencia} actualizada.`,
			parcela: updated
		});
	} catch (err) {
		return json({ success: false, message: err.message }, { status: 400 });
	}
}

/**
 * DELETE: Eliminar o desactivar una parcela
 */
export async function DELETE({ url, locals }) {
	const id = url.searchParams.get('id');
	const farmerId = (locals.user && locals.user.rol !== 'SUPERADMIN' && locals.user.farmer_id)
		? locals.user.farmer_id
		: url.searchParams.get('farmer_id');

	if (!id || !farmerId) return json({ success: false, message: 'id y farmer_id requeridos' }, { status: 400 });

	try {
		const result = deleteParcela(id, farmerId);
		return json({ success: true, message: 'Parcela eliminada correctamente.', result });
	} catch (err) {
		return json({ success: false, message: err.message }, { status: 400 });
	}
}
