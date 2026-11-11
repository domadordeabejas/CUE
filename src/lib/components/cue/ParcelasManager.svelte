<script>
	/**
	 * @component ParcelasManager
	 * Gestor modular de Cultivos y Parcelas SIGPAC para el Agricultor.
	 * Permite dar de alta nuevos recintos catastrales, editar cultivos y gestionar superficies de forma independiente.
	 * Svelte 5 Runes: $state, $derived, $props, $effect, onsubmit, onclick
	 */
	let { initialParcelas = [], farmerId = '', onUpdate } = $props();

	// Lista reactiva de parcelas
	let parcelas = $state([]);
	let showAddModal = $state(false);
	let isSubmitting = $state(false);
	let feedback = $state(null); // { success: boolean, text: string }

	// Formulario de Nueva Parcela / Cultivo
	let newParcela = $state({
		nombre_referencia: '',
		provincia: 14,
		municipio: 21,
		agregado: 0,
		zona: 0,
		poligono: 1,
		parcela: 1,
		recinto: 1,
		superficie_ha: 1.0,
		uso_sigpac: 'TA',
		sistema_explotacion: 'SECANO',
		cultivo_actual: '',
		variedad: '',
		fecha_siembra_plantacion: ''
	});

	$effect(() => {
		parcelas = [...initialParcelas];
	});

	// Superficie total cultivada derivada
	let totalSuperficie = $derived(
		parcelas.reduce((acc, p) => acc + Number(p.superficie_ha || 0), 0).toFixed(2)
	);

	// Guardar nueva parcela
	async function handleCreateParcela(e) {
		e.preventDefault();
		isSubmitting = true;
		feedback = null;

		try {
			const payload = {
				...newParcela,
				farmer_id: farmerId
			};

			const res = await fetch('/api/parcelas', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			const data = await res.json();
			if (data.success) {
				parcelas = [data.parcela, ...parcelas];
				feedback = { success: true, text: data.message };
				showAddModal = false;
				newParcela = {
					nombre_referencia: '',
					provincia: 14,
					municipio: 21,
					agregado: 0,
					zona: 0,
					poligono: 1,
					parcela: 1,
					recinto: 1,
					superficie_ha: 1.0,
					uso_sigpac: 'TA',
					sistema_explotacion: 'SECANO',
					cultivo_actual: '',
					variedad: '',
					fecha_siembra_plantacion: ''
				};
				if (onUpdate) onUpdate(parcelas);
			} else {
				feedback = { success: false, text: data.message };
			}
		} catch (err) {
			feedback = { success: false, text: err.message };
		} finally {
			isSubmitting = false;
		}
	}

	// Eliminar parcela
	async function handleDeleteParcela(p) {
		if (!confirm(`¿Deseas eliminar la parcela "${p.nombre_referencia}" de tu explotación?`)) return;

		try {
			const res = await fetch(`/api/parcelas?id=${p.id}&farmer_id=${farmerId}`, { method: 'DELETE' });
			const data = await res.json();
			if (data.success) {
				parcelas = parcelas.filter(item => item.id !== p.id);
				feedback = { success: true, text: `Parcela ${p.nombre_referencia} dada de baja.` };
				if (onUpdate) onUpdate(parcelas);
			} else {
				feedback = { success: false, text: data.message };
			}
		} catch (err) {
			feedback = { success: false, text: err.message };
		}
	}
</script>

<div class="card cue-card shadow-sm border-0">
	<div class="card-header bg-white py-3 border-bottom d-flex flex-wrap align-items-center justify-content-between gap-2">
		<div class="d-flex align-items-center gap-2">
			<i class="bi bi-geo-alt-fill text-success fs-4"></i>
			<div>
				<h5 class="mb-0 fw-bold text-dark">Gestión Independiente de Parcelas y Cultivos</h5>
				<small class="text-muted">Registro oficial de recintos SIGPAC exclusivos de tu explotación agraria</small>
			</div>
		</div>

		<div class="d-flex align-items-center gap-2">
			<span class="badge bg-light text-dark border px-2 py-2">
				Total: <strong>{totalSuperficie} ha</strong> declaradas
			</span>
			<button
				type="button"
				class="btn btn-sm btn-success"
				onclick={() => showAddModal = true}
			>
				<i class="bi bi-plus-circle me-1"></i> Añadir Parcela / Cultivo
			</button>
		</div>
	</div>

	<div class="card-body p-3 p-md-4">
		{#if feedback}
			<div class="alert {feedback.success ? 'alert-success' : 'alert-danger'} alert-dismissible fade show d-flex align-items-center gap-2 py-2 small" role="alert">
				<i class="bi {feedback.success ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} fs-5"></i>
				<div class="flex-grow-1">{feedback.text}</div>
				<button type="button" class="btn-close" aria-label="Cerrar" onclick={() => feedback = null}></button>
			</div>
		{/if}

		{#if parcelas.length === 0}
			<div class="text-center py-5 text-muted">
				<i class="bi bi-map fs-1 d-block mb-2 text-secondary opacity-50"></i>
				<p class="mb-2">No tienes parcelas ni cultivos registrados en esta explotación.</p>
				<button type="button" class="btn btn-outline-success btn-sm" onclick={() => showAddModal = true}>
					<i class="bi bi-plus-lg me-1"></i> Dar de Alta tu Primera Parcela
				</button>
			</div>
		{:else}
			<div class="table-responsive">
				<table class="table table-hover align-middle mb-0" style="font-size: 0.88rem;">
					<thead class="table-light">
						<tr>
							<th scope="col" class="ps-3">Nombre Parcela</th>
							<th scope="col">Coordenadas SIGPAC (Prov/Mun/Pol/Parc/Rec)</th>
							<th scope="col">Cultivo y Variedad</th>
							<th scope="col">Uso SIGPAC</th>
							<th scope="col">Régimen Hídrico</th>
							<th scope="col" class="text-end">Superficie (ha)</th>
							<th scope="col" class="text-end pe-3">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{#each parcelas as p (p.id)}
							<tr>
								<!-- Nombre -->
								<td class="ps-3">
									<div class="fw-bold text-dark">{p.nombre_referencia}</div>
								</td>

								<!-- SIGPAC -->
								<td>
									<span class="badge bg-secondary-subtle text-dark border font-monospace">
										{p.provincia}/{p.municipio}/Pol.{p.poligono}/Parc.{p.parcela}/Rec.{p.recinto}
									</span>
								</td>

								<!-- Cultivo y Variedad -->
								<td>
									<div class="fw-semibold text-primary">{p.cultivo_actual}</div>
									<small class="text-muted">{p.variedad || 'Variedad estándar'}</small>
								</td>

								<!-- Uso SIGPAC -->
								<td>
									<span class="badge bg-primary-subtle text-primary border font-monospace">
										{p.uso_sigpac}
									</span>
								</td>

								<!-- Régimen -->
								<td>
									<span class="badge {p.sistema_explotacion === 'REGADIO' ? 'bg-info-subtle text-info-emphasis' : 'bg-warning-subtle text-warning-emphasis'} border">
										{p.sistema_explotacion}
									</span>
								</td>

								<!-- Superficie -->
								<td class="text-end font-monospace fw-bold text-dark">
									{p.superficie_ha} ha
								</td>

								<!-- Acciones -->
								<td class="text-end pe-3">
									<button
										type="button"
										class="btn btn-sm btn-outline-danger py-1 px-2"
										title="Dar de baja parcela"
										onclick={() => handleDeleteParcela(p)}
									>
										<i class="bi bi-trash"></i>
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

<!-- MODAL: AÑADIR NUEVA PARCELA / CULTIVO -->
{#if showAddModal}
	<div class="modal d-block bg-dark bg-opacity-50" tabindex="-1" role="dialog">
		<div class="modal-dialog modal-lg modal-dialog-centered" role="document">
			<div class="modal-content border-0 shadow">
				<div class="modal-header bg-success text-white">
					<h5 class="modal-title fw-bold">
						<i class="bi bi-geo-alt-fill me-2"></i> Alta de Parcela y Cultivo SIGPAC
					</h5>
					<button type="button" class="btn-close btn-close-white" aria-label="Cerrar" onclick={() => showAddModal = false}></button>
				</div>
				<form onsubmit={handleCreateParcela}>
					<div class="modal-body p-4">
						<div class="row g-3">
							<!-- Nombre de Referencia -->
							<div class="col-12 col-md-6">
								<label for="p-nombre" class="form-label small fw-semibold text-secondary">Nombre de Referencia de la Parcela</label>
								<input
									type="text"
									id="p-nombre"
									class="form-control"
									placeholder="ej: El Encinar Alto, Pago de San Juan..."
									bind:value={newParcela.nombre_referencia}
									required
								/>
							</div>

							<!-- Cultivo Actual -->
							<div class="col-12 col-md-6">
								<label for="p-cultivo" class="form-label small fw-semibold text-secondary">Cultivo Agrícola Actual</label>
								<input
									type="text"
									id="p-cultivo"
									class="form-control"
									placeholder="ej: Olivar Almazara, Almendro, Trigo Duro..."
									bind:value={newParcela.cultivo_actual}
									required
								/>
							</div>

							<!-- Variedad -->
							<div class="col-12 col-md-4">
								<label for="p-variedad" class="form-label small fw-semibold text-secondary">Variedad (Opcional)</label>
								<input
									type="text"
									id="p-variedad"
									class="form-control"
									placeholder="ej: Picual, Lauranne, Avispa..."
									bind:value={newParcela.variedad}
								/>
							</div>

							<!-- Superficie en Hectáreas -->
							<div class="col-12 col-md-4">
								<label for="p-sup" class="form-label small fw-semibold text-secondary">Superficie Declarada (ha)</label>
								<input
									type="number"
									step="0.0001"
									min="0.0001"
									id="p-sup"
									class="form-control font-monospace"
									placeholder="ej: 5.2500"
									bind:value={newParcela.superficie_ha}
									required
								/>
							</div>

							<!-- Régimen Hídrico -->
							<div class="col-12 col-md-4">
								<label for="p-reg" class="form-label small fw-semibold text-secondary">Régimen Hídrico</label>
								<select id="p-reg" class="form-select" bind:value={newParcela.sistema_explotacion}>
									<option value="SECANO">Secano</option>
									<option value="REGADIO">Regadío</option>
								</select>
							</div>

							<!-- Coordenadas SIGPAC -->
							<div class="col-12">
								<h6 class="text-uppercase text-secondary fw-bold small mt-3 mb-2">
									<i class="bi bi-compass text-success me-1"></i> Identificación Catastral SIGPAC
								</h6>
							</div>

							<div class="col-6 col-md-2">
								<label for="p-prov" class="form-label small text-secondary">Provincia</label>
								<input type="number" id="p-prov" class="form-control form-control-sm font-monospace" min="1" max="52" bind:value={newParcela.provincia} required />
							</div>
							<div class="col-6 col-md-2">
								<label for="p-mun" class="form-label small text-secondary">Municipio</label>
								<input type="number" id="p-mun" class="form-control form-control-sm font-monospace" min="1" bind:value={newParcela.municipio} required />
							</div>
							<div class="col-4 col-md-2">
								<label for="p-pol" class="form-label small text-secondary">Polígono</label>
								<input type="number" id="p-pol" class="form-control form-control-sm font-monospace" min="1" bind:value={newParcela.poligono} required />
							</div>
							<div class="col-4 col-md-2">
								<label for="p-parc" class="form-label small text-secondary">Parcela</label>
								<input type="number" id="p-parc" class="form-control form-control-sm font-monospace" min="1" bind:value={newParcela.parcela} required />
							</div>
							<div class="col-4 col-md-2">
								<label for="p-rec" class="form-label small text-secondary">Recinto</label>
								<input type="number" id="p-rec" class="form-control form-control-sm font-monospace" min="1" bind:value={newParcela.recinto} required />
							</div>
							<div class="col-12 col-md-2">
								<label for="p-uso" class="form-label small text-secondary">Uso SIGPAC</label>
								<select id="p-uso" class="form-select form-select-sm" bind:value={newParcela.uso_sigpac}>
									<option value="TA">TA (Tierra Arable)</option>
									<option value="FY">FY (Frutales)</option>
									<option value="VI">VI (Viñedo)</option>
									<option value="OL">OL (Olivar)</option>
									<option value="TH">TH (Huerta)</option>
									<option value="PR">PR (Pastizal)</option>
								</select>
							</div>
						</div>
					</div>
					<div class="modal-footer bg-light">
						<button type="button" class="btn btn-outline-secondary" onclick={() => showAddModal = false}>Cancelar</button>
						<button type="submit" class="btn btn-success" disabled={isSubmitting}>
							{#if isSubmitting}
								<span class="spinner-border spinner-border-sm me-1"></span> Registrando...
							{:else}
								<i class="bi bi-check2-circle"></i> Guardar Parcela
							{/if}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
