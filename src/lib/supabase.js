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
 * Suscribe un callback a cambios en tiempo real en la tabla tratamientos_fitosanitarios
 * @param {Function} onEvent - Recibe { eventType: 'INSERT' | 'UPDATE' | 'DELETE', new: Object, old: Object }
 * @returns {Function} cleanup - Función para cancelar la suscripción
 */
export function subscribeToTratamientosRealtime(onEvent) {
	// 1. Canal oficial de Supabase Realtime (PostgreSQL Changes)
	const channel = supabase
		.channel('realtime_cue_tratamientos')
		.on(
			'postgres_changes',
			{
				event: '*',
				schema: 'public',
				table: 'tratamientos_fitosanitarios'
			},
			(payload) => {
				console.log('⚡ [Supabase Realtime] Evento recibido:', payload);
				if (onEvent) {
					onEvent({
						eventType: payload.eventType,
						new: payload.new,
						old: payload.old,
						source: 'SUPABASE_REALTIME'
					});
				}
			}
		)
		.subscribe((status, err) => {
			if (err) {
				console.warn('⚠️ [Supabase Realtime] Aviso de conexión:', err);
			} else {
				console.log(`🔌 [Supabase Realtime] Estado canal: ${status}`);
			}
		});

	// 2. Listener complementario para sincronización inter-pestañas inmediata
	const localHandler = (event) => {
		if (event.data && onEvent) {
			console.log('⚡ [Local Realtime Broadcast] Evento recibido:', event.data);
			onEvent({
				...event.data,
				source: 'LOCAL_BROADCAST'
			});
		}
	};

	if (localBroadcast) {
		localBroadcast.addEventListener('message', localHandler);
	}

	// Función de limpieza al desmontar el componente (Svelte 5 $effect)
	return () => {
		supabase.removeChannel(channel);
		if (localBroadcast) {
			localBroadcast.removeEventListener('message', localHandler);
		}
	};
}

/**
 * Emite un evento en tiempo real para todos los clientes conectados
 * @param {string} eventType - 'INSERT' | 'UPDATE' | 'DELETE'
 * @param {Object} data - Registro afectado
 */
export function broadcastLocalChange(eventType, data) {
	if (localBroadcast) {
		localBroadcast.postMessage({
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
