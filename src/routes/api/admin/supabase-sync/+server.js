import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db.js';
import { syncAllDataToSupabase, checkSupabaseStatus, extractLocalSnapshot } from '$lib/server/supabase-client.js';

/**
 * POST /api/admin/supabase-sync
 * Extrae todos los datos de la base de datos relacional y los sincroniza/sube a Supabase Cloud
 */
export async function POST({ locals }) {
	if (!locals.user || locals.user.rol !== 'SUPERADMIN') {
		return json({ success: false, message: 'Acceso no autorizado' }, { status: 403 });
	}

	try {
		// 1. Verificar primero si las tablas existen en Supabase
		const status = await checkSupabaseStatus();
		if (!status.connected) {
			return json({
				success: false,
				message: 'No se puede conectar con Supabase Cloud. Verifica tu conexión de red o credenciales.'
			}, { status: 503 });
		}

		if (!status.tablesReady) {
			return json({
				success: false,
				tablesMissing: true,
				tablesExisting: status.tablesExisting,
				tablesTotal: status.tablesTotal,
				message: `Las tablas no han sido creadas en Supabase aún (${status.tablesExisting}/${status.tablesTotal} detectadas). Ejecuta el script SQL en el SQL Editor de Supabase antes de sincronizar.`
			}, { status: 400 });
		}

		// 2. Extraer todos los registros de SQLite local
		const allData = extractLocalSnapshot(getDb());

		// 3. Subir todos los datos a Supabase
		const syncResult = await syncAllDataToSupabase(allData);

		const totalSynced = Object.values(syncResult.results).reduce((acc, count) => acc + count, 0);

		return json({
			success: syncResult.success,
			totalSynced,
			details: syncResult.results,
			errors: syncResult.errors,
			message: syncResult.success
				? `Sincronización completada con éxito: ${totalSynced} registros actualizados en Supabase Cloud.`
				: `Sincronización parcial: ${totalSynced} registros actualizados con ${syncResult.errors.length} advertencias.`
		});
	} catch (err) {
		console.error('Error durante la sincronización con Supabase:', err);
		return json({
			success: false,
			message: `Error al sincronizar con Supabase: ${err.message}`
		}, { status: 500 });
	}
}
