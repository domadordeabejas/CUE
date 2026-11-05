/**
 * @file logout/+server.js
 * Endpoint para cierre de sesión seguro: destruye la sesión y elimina la cookie.
 */

import { destroySession } from '$lib/server/auth.js';
import { redirect } from '@sveltejs/kit';

export async function GET({ cookies }) {
	const sessionId = cookies.get('cue_session');
	if (sessionId) {
		destroySession(sessionId);
		cookies.delete('cue_session', { path: '/' });
	}

	throw redirect(303, '/login');
}

export async function POST({ cookies }) {
	const sessionId = cookies.get('cue_session');
	if (sessionId) {
		destroySession(sessionId);
		cookies.delete('cue_session', { path: '/' });
	}

	throw redirect(303, '/login');
}
