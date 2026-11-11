/**
 * @file supabase.js
 * Cliente de Supabase y Gestor de Suscripciones en Tiempo Real (Realtime) para CUE Digital SaaS.
 * Soporta variables de entorno NEXT_PUBLIC_* y PUBLIC_*, canales de Postgres Changes y fallback broadcast.
 */

import { createClient } from '@supabase/supabase-js';

// Extracción de credenciales con soporte universal (Vite, SvelteKit y Node)
const SUPABASE_URL =
	(typeof import.meta !== 'undefined' && (import.meta.env?.NEXT_PUBLIC_SUPABASE_URL || import.meta.env?.PUBLIC_SUPABASE_URL)) ||
	process.env?.NEXT_PUBLIC_SUPABASE_URL ||
	process.env?.PUBLIC_SUPABASE_URL ||
	'https://xeqnlmfyvijdgclfhzgf.supabase.co';

const SUPABASE_KEY =
	(typeof import.meta !== 'undefined' && (import.meta.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || import.meta.env?.PUBLIC_SUPABASE_ANON_KEY)) ||
	process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
	process.env?.PUBLIC_SUPABASE_ANON_KEY ||
	'sb_publishable_Ppp5160TqdfVeWKEZ05W3A_LtduAkoK';

/**
 * Cliente singleton de Supabase configurado con opciones de Realtime
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
	auth: {
		persistSession: true,
		autoRefreshToken: true
	},
	realtime: {
		params: {
			eventsPerSecond: 10
		}
	}
});

// BroadcastChannel para sincronización instantánea entre pestañas del navegador
let localBroadcast = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
	localBroadcast = new BroadcastChannel('cue_realtime_channel');
}

/**
 * Suscribe un callback a cambios en tiempo real (INSERT, UPDATE, DELETE) sobre una o varias tablas de Supabase
 * @param {string[]} tables - Lista de tablas en el esquema public
 * @param {Function} onEvent - Recibe { table, eventType: 'INSERT' | 'UPDATE' | 'DELETE', new: Object, old: Object, source }
 * @param {string} [channelName] - Nombre único de canal
 * @returns {Function} cleanup - Función para cancelar la suscripción
 */
export function subscribeToRealtimeTables(tables = ['tratamientos_fitosanitarios'], onEvent, channelName = 'realtime_cue_sync') {
	const channel = supabase.channel(channelName);

	for (const table of tables) {
		channel.on(
			'postgres_changes',
			{
				event: '*',
				schema: 'public',
				table
			},
			(payload) => {
				if (onEvent) {
					onEvent({
						table,
						eventType: payload.eventType,
						new: payload.new,
						old: payload.old,
						source: 'SUPABASE_REALTIME'
					});
				}
			}
		);
	}

	channel.subscribe((status, err) => {
		if (err) {
			console.warn(`⚠️ [Supabase Realtime ${channelName}] Aviso de conexión:`, err);
		}
	});

	// Listener complementario para sincronización inter-pestañas inmediata
	const localHandler = (event) => {
		if (!event.data || !onEvent) return;
		const evtTable = event.data.table || 'tratamientos_fitosanitarios';
		if (tables.includes(evtTable)) {
			onEvent({
				...event.data,
				table: evtTable,
				source: 'LOCAL_BROADCAST'
			});
		}
	};

	if (localBroadcast) {
		localBroadcast.addEventListener('message', localHandler);
	}

	return () => {
		supabase.removeChannel(channel);
		if (localBroadcast) {
			localBroadcast.removeEventListener('message', localHandler);
		}
	};
}

/**
 * Suscribe un callback a cambios en tiempo real en la tabla tratamientos_fitosanitarios
 * @param {Function} onEvent - Recibe { eventType: 'INSERT' | 'UPDATE' | 'DELETE', new: Object, old: Object }
 * @returns {Function} cleanup - Función para cancelar la suscripción
 */
export function subscribeToTratamientosRealtime(onEvent) {
	return subscribeToRealtimeTables(['tratamientos_fitosanitarios'], onEvent, 'realtime_cue_tratamientos');
}

/**
 * Emite un evento en tiempo real para otras pestañas del navegador
 * @param {string} eventType - 'INSERT' | 'UPDATE' | 'DELETE'
 * @param {Object} data - Registro afectado
 * @param {string} [table] - Tabla afectada
 */
export function broadcastLocalChange(eventType, data, table = 'tratamientos_fitosanitarios') {
	if (localBroadcast && data) {
		localBroadcast.postMessage({
			table,
			eventType,
			new: data,
			timestamp: new Date().toISOString()
		});
	}
}

/**
 * Consulta tratamientos desde Supabase con fallback seguro
 * @param {string} farmerId
 */
export async function getTratamientosFromSupabase(farmerId) {
	try {
		const { data, error } = await supabase
			.from('tratamientos_fitosanitarios')
			.select('*')
			.eq('farmer_id', farmerId)
			.order('fecha_tratamiento', { ascending: false });

		if (error) {
			console.warn('ℹ️ [Supabase Query] Tabla no lista o sin datos en Supabase, usando datos locales:', error.message);
			return null;
		}
		return data;
	} catch (err) {
		console.warn('ℹ️ [Supabase Query Error]:', err.message);
		return null;
	}
}

/**
 * Inserta un tratamiento en Supabase y notifica en tiempo real
 * @param {Object} tratamientoData
 */
export async function saveTratamientoToSupabase(tratamientoData) {
	try {
		const { data, error } = await supabase
			.from('tratamientos_fitosanitarios')
			.insert([tratamientoData])
			.select()
			.single();

		if (error) {
			console.warn('ℹ️ [Supabase Insert]:', error.message);
			// Emitir por canal local para que la UI se actualice en tiempo real
			broadcastLocalChange('INSERT', tratamientoData);
			return { success: false, error: error.message };
		}

		// Emitir actualización
		broadcastLocalChange('INSERT', data);
		return { success: true, data };
	} catch (err) {
		broadcastLocalChange('INSERT', tratamientoData);
		return { success: false, error: err.message };
	}
}
