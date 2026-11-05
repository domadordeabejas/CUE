import { json } from '@sveltejs/kit';
import { getUsers, createUser, updateUser, deleteUser } from '$lib/server/db.js';

/**
 * GET: Obtener lista de usuarios (filtrable por farmer_id)
 */
export async function GET({ url }) {
	const farmerId = url.searchParams.get('farmer_id');
	try {
		const users = getUsers(farmerId);
		return json({ success: true, users });
	} catch (err) {
		return json({ success: false, message: err.message }, { status: 500 });
	}
}

/**
 * POST: Crear un nuevo usuario en la plataforma
 */
export async function POST({ request }) {
	try {
		const body = await request.json();
		const user = createUser(body);
		return json({
			success: true,
			message: `Usuario ${user.nombre} (${user.rol}) creado con éxito.`,
			user
		});
	} catch (err) {
		return json({ success: false, message: err.message }, { status: 400 });
	}
}

/**
 * PUT: Actualizar un usuario existente
 */
export async function PUT({ request }) {
	try {
		const body = await request.json();
		const { id, ...data } = body;
		if (!id) return json({ success: false, message: 'ID de usuario requerido' }, { status: 400 });

		const updated = updateUser(id, data);
		return json({
			success: true,
			message: `Usuario ${updated.nombre} actualizado.`,
			user: updated
		});
	} catch (err) {
		return json({ success: false, message: err.message }, { status: 400 });
	}
}

/**
 * DELETE: Eliminar un usuario
 */
export async function DELETE({ url }) {
	const id = url.searchParams.get('id');
	if (!id) return json({ success: false, message: 'ID de usuario requerido' }, { status: 400 });

	try {
		const res = deleteUser(id);
		return json({ success: true, message: 'Usuario eliminado correctamente.', data: res });
	} catch (err) {
		return json({ success: false, message: err.message }, { status: 400 });
	}
}
