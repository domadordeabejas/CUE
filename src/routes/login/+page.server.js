/**
 * @file login/+page.server.js
 * Acción del servidor para autenticación de agricultores y establecimiento de sesión.
 */

import { authenticateUser, createSession } from '$lib/server/auth.js';
import { fail, redirect } from '@sveltejs/kit';

export const actions = {
	default: async ({ request, cookies, url }) => {
		const data = await request.formData();
		const email = data.get('email')?.toString().trim();
		const password = data.get('password')?.toString();
		const redirectTo = url.searchParams.get('redirectTo');

		if (!email || !password) {
			return fail(400, {
				email,
				error: 'Por favor, introduce tu correo electrónico y tu contraseña.'
			});
		}

		try {
			const user = authenticateUser(email, password);
			const sessionId = createSession(user.id);

			// Establecer cookie HTTP-only segura de sesión
			cookies.set('cue_session', sessionId, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				maxAge: 60 * 60 * 24 * 7, // 7 días
				secure: process.env.NODE_ENV === 'production'
			});

			// Redirección contextual según el rol o destino solicitado
			if (redirectTo && redirectTo.startsWith('/')) {
				throw redirect(303, redirectTo);
			}

			if (user.rol === 'SUPERADMIN') {
				throw redirect(303, '/admin');
			} else {
				throw redirect(303, '/cue');
			}
		} catch (err) {
			// Si es una redirección de SvelteKit, relanzarla
			if (err?.status === 303 || err?.location) {
				throw err;
			}

			return fail(400, {
				email,
				error: err.message || 'Error de autenticación. Verifica tus credenciales.'
			});
		}
	}
};
