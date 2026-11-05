import { json } from '@sveltejs/kit';
import { getTratamientosByFarmer, insertTratamiento } from '$lib/server/db.js';
import { supabase } from '$lib/supabase.js';

/**
 * GET: Listar tratamientos filtrados por la explotación del usuario autenticado
 * Prioriza consulta en tiempo real desde Supabase si está disponible
 */
export async function GET({ url, locals }) {
	let farmerId;
	if (locals.user && locals.user.rol !== 'SUPERADMIN' && locals.user.farmer_id) {
		farmerId = locals.user.farmer_id;
	} else {
		farmerId = url.searchParams.get('farmer_id') || 'a0000000-0000-0000-0000-000000000001';
	}

	try {
		// 1. Intento de consulta en Supabase
		const { data: sbData, error: sbError } = await supabase
			.from('tratamientos_fitosanitarios')
			.select('*')
			.eq('farmer_id', farmerId)
			.order('fecha_tratamiento', { ascending: false });

		if (!sbError && sbData && sbData.length > 0) {
			return json({ success: true, tratamientos: sbData, source: 'SUPABASE' });
		}

		// 2. Fallback al motor local validado
		const tratamientos = getTratamientosByFarmer(farmerId);
		return json({ success: true, tratamientos, source: 'LOCAL' });
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

		// Validación estricta en servidor
		const result = insertTratamiento(body);

		// Sincronización asíncrona hacia Supabase (si la tabla está creada)
		try {
			await supabase
				.from('tratamientos_fitosanitarios')
				.insert([{
					farmer_id: result.farmer_id,
					parcela_id: result.parcela_id,
					operario_id: result.operario_id,
					maquinaria_id: result.maquinaria_id,
					fecha_tratamiento: result.fecha_tratamiento,
					problema_fitosanitario: result.problema_fitosanitario,
					nombre_comercial: result.nombre_comercial,
					numero_registro_magrama: result.numero_registro_magrama,
					materia_activa: result.materia_activa,
					dosis_valor: result.dosis_valor,
					dosis_unidad: result.dosis_unidad,
					volumen_caldo_l_ha: result.volumen_caldo_l_ha,
					superficie_tratada_ha: result.superficie_tratada_ha,
					plazo_seguridad_dias: result.plazo_seguridad_dias,
					fecha_recoleccion_permitida: result.fecha_recoleccion_permitida,
					justificacion_tratamiento: result.justificacion_tratamiento,
					condiciones_meteorologicas: result.condiciones_meteorologicas,
					observaciones: result.observaciones
				}]);
		} catch (sbErr) {
			console.log('ℹ️ [Supabase Sync Note]:', sbErr.message);
		}

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
