import {
	getFarmerById,
	getParcelasByFarmer,
	getOperariosByFarmer,
	getMaquinariaByFarmer,
	getTratamientosByFarmer,
	getUsers
} from '$lib/server/db.js';
import { error } from '@sveltejs/kit';

/**
 * Server Load para el Cuaderno Digital del Agricultor (CUE)
 * Aislamiento estricto forzado por la sesión del usuario autenticado
 */
export async function load({ locals, url }) {
	const user = locals.user;
	if (!user) {
		throw error(401, 'No autenticado');
	}

	// Si es SUPERADMIN puede auditar cualquier explotación mediante ?farmer_id
	// Si es AGRICULTOR o ASESOR, se fuerza OBLIGATORIAMENTE su farmer_id asignado
	let farmerId;
	if (user.rol === 'SUPERADMIN') {
		farmerId = url.searchParams.get('farmer_id') || 'a0000000-0000-0000-0000-000000000001';
	} else {
		farmerId = user.farmer_id;
	}

	if (!farmerId) {
		throw error(403, 'No tienes ninguna explotación agrícola asignada.');
	}

	const farmer = getFarmerById(farmerId) || {
		id: farmerId,
		nombre_titular: 'Explotación Agrícola',
		cif_nif: 'Sin CIF',
		municipio: 'España',
		provincia: ''
	};

	return {
		farmerId,
		farmer,
		user,
		parcelas: getParcelasByFarmer(farmerId),
		operarios: getOperariosByFarmer(farmerId),
		maquinas: getMaquinariaByFarmer(farmerId),
		tratamientos: getTratamientosByFarmer(farmerId),
		users: getUsers(farmerId)
	};
}
