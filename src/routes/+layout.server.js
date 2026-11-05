/**
 * @file +layout.server.js
 * Expone la información de sesión y del agricultor autenticado a todas las páginas de la aplicación.
 */

export async function load({ locals }) {
	return {
		user: locals.user
			? {
					id: locals.user.id,
					nombre: locals.user.nombre,
					apellidos: locals.user.apellidos,
					email: locals.user.email,
					rol: locals.user.rol,
					farmer_id: locals.user.farmer_id
				}
			: null,
		farmer: locals.farmer || null
	};
}
