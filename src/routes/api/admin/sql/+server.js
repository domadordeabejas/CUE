import { json } from '@sveltejs/kit';
import { executeSqlScript, getSqlLogs } from '$lib/server/db.js';

/**
 * GET: Obtener historial de logs de ejecución SQL
 */
export async function GET() {
	try {
		const logs = getSqlLogs();
		return json({ success: true, logs });
	} catch (err) {
		return json({ success: false, message: err.message }, { status: 500 });
	}
}

/**
 * POST: Ejecutar script SQL (DDL / DML / SELECT) de forma segura
 */
export async function POST({ request }) {
	try {
		const body = await request.json();
		const { sqlScript, userEmail } = body;

		if (!sqlScript || typeof sqlScript !== 'string') {
			return json(
				{ success: false, message: 'Se requiere una sentencia SQL válida.' },
				{ status: 400 }
			);
		}

		// Protección básica contra sentencias destructivas accidentales no confirmadas
		const cleanSql = sqlScript.trim().toUpperCase();
		if (cleanSql.includes('DROP DATABASE') || cleanSql.includes('SHUTDOWN')) {
			return json(
				{ success: false, message: 'Operación bloqueada por política de seguridad: No está permitido destruir la base de datos completa.' },
				{ status: 403 }
			);
		}

		const result = await executeSqlScript(sqlScript, {
			email: userEmail || 'superadmin@cue-saas.es',
			rol: 'SUPERADMIN'
		});

		return json(result);
	} catch (err) {
		return json(
			{
				success: false,
				message: err.message || 'Error durante la ejecución del script SQL.'
			},
			{ status: 400 }
		);
	}
}
