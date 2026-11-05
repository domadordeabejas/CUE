<script>
	/**
	 * @component RealtimeIndicator
	 * Indicador visual de conexión en tiempo real con Supabase y stream de eventos en vivo.
	 * Svelte 5 Runes: $state, $props, $effect
	 */
	import { supabase, subscribeToTratamientosRealtime } from '$lib/supabase.js';

	let connectionState = $state('CONNECTING'); // 'CONNECTED' | 'CONNECTING' | 'ERROR'
	let lastEvent = $state(null);
	let eventCount = $state(0);
	let isFlashing = $state(false);

	$effect(() => {
		// Comprobación inicial de conexión Supabase
		supabase
			.channel('ping_health')
			.subscribe((status) => {
				if (status === 'SUBSCRIBED') {
					connectionState = 'CONNECTED';
				} else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
					connectionState = 'ERROR';
				}
			});

		// Suscripción al stream en tiempo real
		const unsubscribe = subscribeToTratamientosRealtime((payload) => {
			eventCount++;
			lastEvent = {
				type: payload.eventType,
				product: payload.new?.nombre_comercial || 'Tratamiento CUE',
				time: new Date().toLocaleTimeString(),
				source: payload.source
			};

			// Efecto de pulso luminoso en la UI
			isFlashing = true;
			setTimeout(() => {
				isFlashing = false;
			}, 2500);
		});

		return () => {
			unsubscribe();
		};
	});
</script>

<div class="d-flex align-items-center gap-2">
	<!-- Badge de Estado de Conexión -->
	<div
		class="badge rounded-pill border px-2 py-1 d-flex align-items-center gap-1 transition-all {isFlashing ? 'bg-warning text-dark border-warning shadow' : 'bg-success-subtle text-success border-success-subtle'}"
		style="font-size: 0.78rem;"
		title="Conectado a https://xeqnlmfyvijdgclfhzgf.supabase.co"
	>
		<span class="pulsing-dot {isFlashing ? 'bg-warning' : 'bg-success'}"></span>
		<span class="fw-semibold">Supabase Realtime</span>
		{#if eventCount > 0}
			<span class="badge bg-success text-white rounded-circle ms-1" style="font-size: 0.65rem;">
				{eventCount}
			</span>
		{/if}
	</div>

	<!-- Notificación flotante de último evento recibido en tiempo real -->
	{#if isFlashing && lastEvent}
		<div class="badge bg-dark text-white border border-secondary shadow-sm py-1 px-2 d-none d-sm-inline-flex align-items-center gap-1 animate-fade-in" style="font-size: 0.75rem;">
			<i class="bi bi-broadcast text-warning"></i>
			<span>{lastEvent.type}: <strong>{lastEvent.product}</strong> ({lastEvent.time})</span>
		</div>
	{/if}
</div>

<style>
	.pulsing-dot {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		animation: pulse-ring 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
	}

	@keyframes pulse-ring {
		0% {
			transform: scale(0.9);
			box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7);
		}
		70% {
			transform: scale(1.1);
			box-shadow: 0 0 0 6px rgba(22, 163, 74, 0);
		}
		100% {
			transform: scale(0.9);
			box-shadow: 0 0 0 0 rgba(22, 163, 74, 0);
		}
	}

	.animate-fade-in {
		animation: fadeIn 0.3s ease-in-out;
	}

	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(-3px); }
		to { opacity: 1; transform: translateY(0); }
	}
</style>
