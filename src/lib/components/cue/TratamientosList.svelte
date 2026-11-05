<script>
	/**
	 * @component TratamientosList
	 * Historial y visualizador oficial de Tratamientos Fitosanitarios registrados en el CUE.
	 * Svelte 5 Runes: $state, $derived, $props
	 */
	let { items = [] } = $props();

	let searchTerm = $state('');

	// Filtro reactivo derivado
	let filteredItems = $derived.by(() => {
		if (!searchTerm.trim()) return items;
		const query = searchTerm.toLowerCase();
		return items.filter(t =>
			t.nombre_comercial?.toLowerCase().includes(query) ||
			t.materia_activa?.toLowerCase().includes(query) ||
			t.problema_fitosanitario?.toLowerCase().includes(query) ||
			t.parcela_nombre?.toLowerCase().includes(query) ||
			t.sigpac_str?.toLowerCase().includes(query)
		);
	});
</script>

<div class="card cue-card shadow-sm border-0">
	<div class="card-header bg-white py-3 border-bottom d-flex flex-wrap align-items-center justify-content-between gap-2">
		<div class="d-flex align-items-center gap-2">
			<i class="bi bi-journal-text text-primary fs-4"></i>
			<div>
				<h5 class="mb-0 fw-bold text-dark">Registro Oficial de Tratamientos (CUE)</h5>
				<small class="text-muted">Historial inmutable de aplicaciones fitosanitarias auditables por la autoridad competente</small>
			</div>
		</div>

		<!-- Buscador rápido -->
		<div class="input-group input-group-sm" style="max-width: 280px;">
			<span class="input-group-text bg-light text-muted"><i class="bi bi-search"></i></span>
			<input
				type="text"
				class="form-control"
				placeholder="Buscar por producto, plaga o parcela..."
				bind:value={searchTerm}
			/>
		</div>
	</div>

	<div class="card-body p-0">
		{#if filteredItems.length === 0}
			<div class="text-center py-5 text-muted">
				<i class="bi bi-journal-x fs-1 d-block mb-2 text-secondary opacity-50"></i>
				<p class="mb-0">No hay tratamientos registrados que coincidan con la búsqueda.</p>
			</div>
		{:else}
			<!-- Vista Tabla para Pantallas Medianas y Grandes -->
			<div class="table-responsive d-none d-md-block">
				<table class="table table-hover align-middle mb-0" style="font-size: 0.88rem;">
					<thead class="table-light border-bottom">
						<tr>
							<th scope="col" class="ps-3">Fecha</th>
							<th scope="col">Parcela / SIGPAC</th>
							<th scope="col">Problema / Plaga</th>
							<th scope="col">Producto Fitosanitario</th>
							<th scope="col">Dosis y Superficie</th>
							<th scope="col">Operario y Maquinaria</th>
							<th scope="col">P. Seg.</th>
							<th scope="col" class="pe-3">Cosecha Legal</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredItems as t (t.id)}
							<tr>
								<!-- Fecha -->
								<td class="ps-3 fw-semibold text-nowrap">
									<i class="bi bi-calendar3 text-secondary me-1"></i> {t.fecha_tratamiento}
								</td>

								<!-- Parcela SIGPAC -->
								<td>
									<div class="fw-semibold text-dark">{t.parcela_nombre}</div>
									<small class="text-muted font-monospace">{t.sigpac_str}</small>
								</td>

								<!-- Problema -->
								<td>
									<span class="badge bg-danger-subtle text-danger border border-danger-subtle">
										{t.problema_fitosanitario}
									</span>
								</td>

								<!-- Producto -->
								<td>
									<div class="fw-bold text-dark">{t.nombre_comercial}</div>
									<small class="text-muted d-block">{t.materia_activa}</small>
									<small class="text-secondary font-monospace" style="font-size: 0.75rem;">Reg: {t.numero_registro_magrama}</small>
								</td>

								<!-- Dosis -->
								<td>
									<div><strong class="text-primary">{t.dosis_valor}</strong> {t.dosis_unidad}</div>
									<small class="text-muted">{t.superficie_tratada_ha} ha tratadas</small>
									{#if t.volumen_caldo_l_ha}
										<small class="text-secondary d-block font-monospace" style="font-size: 0.75rem;">Caldo: {t.volumen_caldo_l_ha} l/ha</small>
									{/if}
								</td>

								<!-- Operario y Maquina -->
								<td>
									<div class="text-truncate" style="max-width: 170px;" title={t.operario_nombre}>
										<i class="bi bi-person-check text-success me-1"></i> {t.operario_nombre}
									</div>
									<div class="text-truncate text-muted" style="max-width: 170px; font-size: 0.78rem;" title={t.maquina_nombre}>
										<i class="bi bi-truck text-secondary me-1"></i> {t.maquina_nombre}
									</div>
								</td>

								<!-- Plazo de Seguridad -->
								<td class="text-center">
									<span class="badge bg-secondary-subtle text-secondary font-monospace">
										{t.plazo_seguridad_dias} d
									</span>
								</td>

								<!-- Fecha Cosecha Permitida -->
								<td class="pe-3 text-nowrap">
									<span class="badge bg-success-subtle text-success border border-success-subtle font-monospace">
										<i class="bi bi-check2-circle me-1"></i> {t.fecha_recoleccion_permitida || t.fecha_tratamiento}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Vista Cards Mobile-First para Pantallas Pequeñas (< 768px) -->
			<div class="d-md-none p-3 d-flex flex-column gap-3">
				{#each filteredItems as t (t.id)}
					<div class="border rounded p-3 bg-white shadow-sm">
						<div class="d-flex justify-content-between align-items-center mb-2">
							<span class="fw-bold text-primary">
								<i class="bi bi-calendar-event me-1"></i> {t.fecha_tratamiento}
							</span>
							<span class="badge bg-success-subtle text-success border">
								Cosecha: {t.fecha_recoleccion_permitida}
							</span>
						</div>

						<h6 class="mb-1 fw-bold text-dark">{t.nombre_comercial}</h6>
						<p class="text-muted small mb-2">{t.materia_activa} &bull; Reg: {t.numero_registro_magrama}</p>

						<div class="mb-2">
							<span class="badge bg-danger-subtle text-danger border">
								{t.problema_fitosanitario}
							</span>
						</div>

						<div class="p-2 bg-light rounded small mb-2">
							<div><strong>Parcela:</strong> {t.parcela_nombre}</div>
							<div class="font-monospace text-secondary" style="font-size: 0.75rem;">{t.sigpac_str}</div>
							<div class="mt-1">
								<strong>Dosis:</strong> {t.dosis_valor} {t.dosis_unidad} &bull; 
								<strong>Tratado:</strong> {t.superficie_tratada_ha} ha
							</div>
						</div>

						<div class="small text-muted d-flex flex-column gap-1" style="font-size: 0.8rem;">
							<div><i class="bi bi-person text-success"></i> {t.operario_nombre}</div>
							<div><i class="bi bi-truck text-secondary"></i> {t.maquina_nombre}</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
