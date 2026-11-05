/**
 * @file api/siex/export/+server.js
 * Endpoint para exportar y descargar el Cuaderno de Explotación CUE en los formatos oficiales de SIEX (JSON y XML)
 */

import { generateSiexPayload, generateSiexXml } from '$lib/server/siex.js';
import { getFarmerById } from '$lib/server/db.js';

export async function GET({ url, locals }) {
	// Obtener farmer_id de la sesión autenticada o del parámetro si es SUPERADMIN
	let farmerId = locals.user?.farmer_id;
	if (locals.user?.rol === 'SUPERADMIN') {
		farmerId = url.searchParams.get('farmer_id') || farmerId;
	}

	if (!farmerId) {
		return new Response(JSON.stringify({ success: false, message: 'Identificador de explotación no especificado o sesión no válida.' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const format = url.searchParams.get('format') || 'json';
	const isDownload = url.searchParams.get('download') === 'true';

	try {
		const farmer = getFarmerById(farmerId);
		const cif = farmer ? farmer.cif_nif.replace(/[^a-zA-Z0-9]/g, '') : 'explotacion';
		const dateStr = new Date().toISOString().split('T')[0];

		if (format === 'xml') {
			const xml = generateSiexXml(farmerId);
			const headers = {
				'Content-Type': 'application/xml; charset=utf-8'
			};
			if (isDownload) {
				headers['Content-Disposition'] = `attachment; filename="CUE_SIEX_OFICIAL_${cif}_${dateStr}.xml"`;
			}
			return new Response(xml, { headers });
		} else {
			const jsonPayload = generateSiexPayload(farmerId);
			const jsonStr = JSON.stringify(jsonPayload, null, 2);
			const headers = {
				'Content-Type': 'application/json; charset=utf-8'
			};
			if (isDownload) {
				headers['Content-Disposition'] = `attachment; filename="CUE_SIEX_OFICIAL_${cif}_${dateStr}.json"`;
			}
			return new Response(jsonStr, { headers });
		}
	} catch (err) {
		return new Response(JSON.stringify({ success: false, message: err.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}
