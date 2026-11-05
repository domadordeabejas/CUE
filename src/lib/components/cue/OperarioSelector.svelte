<script>
	/**
	 * @component OperarioSelector
	 * Selector modular para operarios/aplicadores fitosanitarios con validación en tiempo real del ROPO.
	 * Svelte 5 Runes: $state, $derived, $props
	 */
	let { operarios = [], selectedId = null, fechaTratamiento = '', onSelect } = $props();

	let currentId = $state('');

	$effect(() => {
		if (!currentId && (selectedId || operarios.length > 0)) {
			currentId = selectedId || (operarios[0]?.id ?? '');
		}
	});

	// Operario derivado
	let selectedOperario = $derived(operarios.find(o => o.id === currentId) || null);

	// Validación reactiva de fecha de caducidad del carnet ROPO
	let isExpired = $derived.by(() => {
		if (!selectedOperario) return false;
		const checkDate = fechaTratamiento ? new Date(fechaTratamiento) : new Date();
		const expiryDate = new Date(selectedOperario.fecha_caducidad);
		return expiryDate < checkDate || !selectedOperario.activo;
	});

	function handleChange(e) {
		const newId = e.target.value;
		currentId = newId;
		const found = operarios.find(o => o.id === newId) || null;
		if (onSelect) onSelect(found, isExpired);
	}
</script>

<div class="mb-3">
	<label for="select-operario" class="form-label fw-semibold text-secondary d-flex align-items-center justify-content-between mb-1">
		<span><i class="bi bi-person-badge-fill text-primary me-1"></i> Aplicador / Operario (ROPO)</span>
		{#if selectedOperario}
			<span class="badge {isExpired ? 'bg-danger text-white' : 'bg-success-subtle text-success border border-success-subtle'}">
				{#if isExpired}
					<i class="bi bi-x-circle-fill me-1"></i> ROPO Caducado
				{:else}
					<i class="bi bi-shield-check me-1"></i> Carnet Vigente
				{/if}
			</span>
		{/if}
	</label>

	<select
		id="select-operario"
		class="form-select {isExpired ? 'is-invalid border-danger' : ''}"
		value={currentId}
		onchange={handleChange}
		required
	>
		<option value="" disabled>-- Selecciona un operario certificado --</option>
		{#each operarios as op (op.id)}
			<option value={op.id}>
				{op.nombre} {op.apellidos} &bull; ROPO: {op.numero_ropo} ({op.tipo_carnet}) - Cad: {op.fecha_caducidad}
			</option>
		{/each}
	</select>

	<!-- Alerta de Bloqueo si el carnet está caducado -->
	{#if selectedOperario && isExpired}
		<div class="alert alert-danger py-2 px-3 mt-2 mb-0 d-flex align-items-center gap-2 small" role="alert">
			<i class="bi bi-exclamation-octagon-fill fs-5 text-danger flex-shrink-0"></i>
			<div>
				<strong>¡Infracción Normativa detectada!</strong> El carnet fitosanitario ({selectedOperario.tipo_carnet}) de 
				<u>{selectedOperario.nombre} {selectedOperario.apellidos}</u> caducó el 
				<strong>{selectedOperario.fecha_caducidad}</strong>. El Real Decreto 1311/2012 prohíbe la aplicación por personal no cualificado en vigor.
			</div>
		</div>
	{:else if selectedOperario}
		<div class="mt-2 p-2 bg-light rounded border d-flex flex-wrap align-items-center justify-content-between gap-2" style="font-size: 0.82rem;">
			<div>
				NIF: <span class="font-monospace fw-semibold">{selectedOperario.nif}</span> &bull; 
				Nº ROPO: <span class="font-monospace fw-semibold">{selectedOperario.numero_ropo}</span>
			</div>
			<div class="text-secondary">
				Nivel: <span class="badge bg-primary-subtle text-primary border">{selectedOperario.tipo_carnet}</span>
				&bull; Caducidad: <strong class="text-success">{selectedOperario.fecha_caducidad}</strong>
			</div>
		</div>
	{/if}
</div>
