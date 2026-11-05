/**
 * @file api/siex/sync/+server.js
 * Endpoint para auditoría previa (Pre-flight) y sincronización telemática con SIEX / FEGA
 */

import { json } from '@sveltejs/kit';
import { validateSiexCompliance, dispatchToSiex } from '$lib/server/siex.js';

export async function GET({ url, locals }) {
	let farmerId = locals.user?.farmer_id;
	if (locals.user?.rol === 'SUPERADMIN') {
		farmerId = url.searchParams.get('farmer_id') || farmerId;
	}

	if (!farmerId) {
		return json({ success: false, message: 'Identificador de explotación no especificado.' }, { status: 400 });
	}

	try {
		const audit = validateSiexCompliance(farmerId);
		return json({
			success: true,
			audit
		});
	} catch (err) {
		return json({ success: false, message: err.message }, { status: 500 });
	}
}

export async function POST({ request, locals }) {
	const body = await request.json().catch(() => ({}));
	let farmerId = locals.user?.farmer_id;
	if (locals.user?.rol === 'SUPERADMIN') {
		farmerId = body.farmer_id || farmerId;
	}

	if (!farmerId) {
		return json({ success: false, message: 'Identificador de explotación no especificado.' }, { status: 400 });
	}

	try {
		const environment = body.environment || 'SANDBOX';
		const receipt = dispatchToSiex(farmerId, { environment });
		return json({
			success: true,
			message: 'Cuaderno CUE transmitido e inscrito telemáticamente en el Registro de SIEX / FEGA.',
			receipt
		});
	} catch (err) {
		return json({ success: false, message: err.message }, { status: 500 });
	}
}
