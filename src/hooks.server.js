/**
 * @file hooks.server.js
 * Middleware de seguridad de SvelteKit para control de acceso y autenticación basada en sesiones.
 * Extrae la cookie 'cue_session', puebla locals.user y protege rutas operativas (/cue, /admin).
 */

import { getSession } from '$lib/server/auth.js';
import { getFarmerById } from '$lib/server/db.js';
import { redirect } from '@sveltejs/kit';

export async function handle({ event, resolve }) {
	const sessionId = event.cookies.get('cue_session');
	let session = null;

	if (sessionId) {
		session = getSession(sessionId);
	}

	if (session && session.user) {
		event.locals.user = session.user;
		if (session.user.farmer_id) {
			event.locals.farmer = getFarmerById(session.user.farmer_id);
		} else {
			event.locals.farmer = null;
		}
	} else {
		event.locals.user = null;
		event.locals.farmer = null;
	}

	const pathname = event.url.pathname;

	// Protección de rutas que requieren autenticación
	if (pathname.startsWith('/cue') || pathname.startsWith('/admin')) {
		if (!event.locals.user) {
			const redirectTarget = pathname + event.url.search;
			throw redirect(303, `/login?redirectTo=${encodeURIComponent(redirectTarget)}`);
		}

		// Restricción para /admin: Solo rol SUPERADMIN
		if (pathname.startsWith('/admin') && event.locals.user.rol !== 'SUPERADMIN') {
			throw redirect(303, '/cue?tab=equipo');
		}
	}

	// Si el usuario ya está autenticado e intenta acceder a /login
	if (pathname === '/login' && event.locals.user) {
		if (event.locals.user.rol === 'SUPERADMIN') {
			throw redirect(303, '/admin');
		} else {
			throw redirect(303, '/cue');
		}
	}

	return resolve(event);
}
