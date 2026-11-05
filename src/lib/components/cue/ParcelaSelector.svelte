<script>
	/**
	 * @component ParcelaSelector
	 * Selector modular reactivo para parcelas agrícolas con desglose oficial SIGPAC.
	 * Svelte 5 Runes: $state, $derived, $props
	 */
	let { parcelas = [], selectedId = null, onSelect } = $props();

	let currentId = $state('');

	$effect(() => {
		if (!currentId && (selectedId || parcelas.length > 0)) {
			currentId = selectedId || (parcelas[0]?.id ?? '');
		}
	});

	// Parcela seleccionada derivada
	let selectedParcela = $derived(parcelas.find(p => p.id === currentId) || null);

	function handleChange(e) {
		const newId = e.target.value;
		currentId = newId;
		const found = parcelas.find(p => p.id === newId) || null;
		if (onSelect) onSelect(found);
	}
</script>

<div class="mb-3">
	<label for="select-parcela" class="form-label fw-semibold text-secondary d-flex align-items-center justify-content-between mb-1">
		<span><i class="bi bi-geo-alt-fill text-success me-1"></i> Parcela y Recinto SIGPAC</span>
		{#if selectedParcela}
			<span class="badge bg-light text-dark border font-monospace">
				{selectedParcela.superficie_ha} ha catastrales
			</span>
		{/if}
	</label>

	<select
		id="select-parcela"
		class="form-select"
		value={currentId}
		onchange={handleChange}
		required
	>
		<option value="" disabled>-- Selecciona una parcela agrícola --</option>
		{#each parcelas as p (p.id)}
			<option value={p.id}>
				{p.nombre_referencia} &bull; Pol. {p.poligono} / Parc. {p.parcela} / Rec. {p.recinto} ({p.cultivo_actual} - {p.superficie_ha} ha)
			</option>
		{/each}
	</select>

	<!-- Ficha Resumen SIGPAC -->
	{#if selectedParcela}
		<div class="mt-2 p-2 bg-light rounded border d-flex flex-wrap align-items-center justify-content-between gap-2" style="font-size: 0.82rem;">
			<div class="d-flex flex-wrap align-items-center gap-2">
				<span class="badge bg-secondary-subtle text-dark border">
					Prov: <strong>{selectedParcela.provincia}</strong> | Mun: <strong>{selectedParcela.municipio}</strong>
				</span>
				<span class="badge bg-secondary-subtle text-dark border">
					Pol: <strong>{selectedParcela.poligono}</strong> | Parc: <strong>{selectedParcela.parcela}</strong> | Rec: <strong>{selectedParcela.recinto}</strong>
				</span>
				<span class="badge bg-primary-subtle text-primary border">
					Uso SIGPAC: <strong>{selectedParcela.uso_sigpac}</strong>
				</span>
				<span class="badge {selectedParcela.sistema_explotacion === 'REGADIO' ? 'bg-info-subtle text-info-emphasis' : 'bg-warning-subtle text-warning-emphasis'} border">
					{selectedParcela.sistema_explotacion}
				</span>
			</div>
			<div class="text-secondary">
				Cultivo: <strong class="text-dark">{selectedParcela.cultivo_actual}</strong>
				{#if selectedParcela.variedad}
					<span>({selectedParcela.variedad})</span>
				{/if}
			</div>
		</div>
	{/if}
</div>
