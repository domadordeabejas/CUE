<script>
	/**
	 * @component MaquinaSelector
	 * Selector modular para maquinaria agrícola (ROMA) con validación técnica de ITEAF en vigor.
	 * Svelte 5 Runes: $state, $derived, $props
	 */
	let { maquinas = [], selectedId = null, fechaTratamiento = '', onSelect } = $props();

	let currentId = $state('');

	$effect(() => {
		if (!currentId && (selectedId || maquinas.length > 0)) {
			currentId = selectedId || (maquinas[0]?.id ?? '');
		}
	});

	// Máquina seleccionada derivada
	let selectedMaquina = $derived(maquinas.find(m => m.id === currentId) || null);

	// Validación reactiva de ITEAF vigente
	let isIteafExpired = $derived.by(() => {
		if (!selectedMaquina) return false;
		const checkDate = fechaTratamiento ? new Date(fechaTratamiento) : new Date();
		const expiryDate = new Date(selectedMaquina.fecha_caducidad_iteaf);
		return expiryDate < checkDate || !selectedMaquina.activo;
	});

	function handleChange(e) {
		const newId = e.target.value;
		currentId = newId;
		const found = maquinas.find(m => m.id === newId) || null;
		if (onSelect) onSelect(found, isIteafExpired);
	}
</script>

<div class="mb-3">
	<label for="select-maquina" class="form-label fw-semibold text-secondary d-flex align-items-center justify-content-between mb-1">
		<span><i class="bi bi-truck text-primary me-1"></i> Equipo de Tratamiento (ROMA / ITEAF)</span>
		{#if selectedMaquina}
			<span class="badge {isIteafExpired ? 'bg-danger text-white' : 'bg-success-subtle text-success border border-success-subtle'}">
				{#if isIteafExpired}
					<i class="bi bi-x-circle-fill me-1"></i> ITEAF Vencida
				{:else}
					<i class="bi bi-check-circle-fill me-1"></i> ITEAF Favorable
				{/if}
			</span>
		{/if}
	</label>

	<select
		id="select-maquina"
		class="form-select {isIteafExpired ? 'is-invalid border-danger' : ''}"
		value={currentId}
		onchange={handleChange}
		required
	>
		<option value="" disabled>-- Selecciona un equipo de aplicación --</option>
		{#each maquinas as maq (maq.id)}
			<option value={maq.id}>
				{maq.tipo_maquina} &bull; {maq.marca} {maq.modelo} (ROMA: {maq.numero_roma}) - ITEAF: {maq.fecha_caducidad_iteaf}
			</option>
		{/each}
	</select>

	<!-- Alerta de Bloqueo por ITEAF caducada -->
	{#if selectedMaquina && isIteafExpired}
		<div class="alert alert-danger py-2 px-3 mt-2 mb-0 d-flex align-items-center gap-2 small" role="alert">
			<i class="bi bi-shield-exclamation fs-5 text-danger flex-shrink-0"></i>
			<div>
				<strong>¡Inspección ITEAF Caducada!</strong> La máquina <u>{selectedMaquina.tipo_maquina} ({selectedMaquina.marca})</u> 
				tiene la inspección técnica vencida desde el <strong>{selectedMaquina.fecha_caducidad_iteaf}</strong>.
				Según el RD 170/2021, no se pueden realizar tratamientos con equipos no calibrados.
			</div>
		</div>
	{:else if selectedMaquina}
		<div class="mt-2 p-2 bg-light rounded border d-flex flex-wrap align-items-center justify-content-between gap-2" style="font-size: 0.82rem;">
			<div>
				ROMA: <span class="font-monospace fw-semibold">{selectedMaquina.numero_roma}</span> &bull; 
				Bastidor: <span class="font-monospace">{selectedMaquina.numero_bastidor || 'N/A'}</span>
			</div>
			<div class="text-secondary">
				Última ITEAF: <span>{selectedMaquina.fecha_ultima_iteaf}</span> &bull; 
				Válida hasta: <strong class="text-success">{selectedMaquina.fecha_caducidad_iteaf}</strong>
			</div>
		</div>
	{/if}
</div>
