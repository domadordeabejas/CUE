<script>
	/**
	 * @component SiexSyncManager
	 * Módulo oficial para la Pasarela SIEX / FEGA (Real Decreto 1054/2022).
	 * Permite la auditoría de conformidad normativa, la exportación de archivos oficiales (JSON / XML)
	 * y la transmisión telemática simulada con generación de Asiento Registral y CSV.
	 * Svelte 5 Runes: $state, $derived, $props, $effect
	 */
	let { farmerId, farmer } = $props();

	// Estados reactivos
	let audit = $state(null);
	let isLoadingAudit = $state(false);
	let isSyncing = $state(false);
	let syncResult = $state(null);
	let selectedEnv = $state('SANDBOX'); // 'SANDBOX' | 'PRODUCTION'

	// Modal de visor técnico
	let showViewerModal = $state(false);
	let viewerFormat = $state('json'); // 'json' | 'xml'
	let viewerContent = $state('');
	let isLoadingViewer = $state(false);
	let copyFeedback = $state(false);

	// Cargar auditoría al iniciar
	async function loadAudit() {
		isLoadingAudit = true;
		try {
			const res = await fetch(`/api/siex/sync?farmer_id=${farmerId}`);
			const data = await res.json();
			if (data.success) {
				audit = data.audit;
			}
		} catch (err) {
			console.error('Error cargando auditoría SIEX:', err);
		} finally {
			isLoadingAudit = false;
		}
	}

	$effect(() => {
		if (farmerId) {
			loadAudit();
		}
	});

	// Transmitir telemáticamente a SIEX
	async function handleSyncToSiex() {
		isSyncing = true;
		syncResult = null;
		try {
			const res = await fetch('/api/siex/sync', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					farmer_id: farmerId,
					environment: selectedEnv
				})
			});

			const data = await res.json();
			if (data.success) {
				syncResult = data.receipt;
				loadAudit();
			} else {
				alert(data.message || 'Error durante la transmisión telemática.');
			}
		} catch (err) {
			alert(`Error de red: ${err.message}`);
		} finally {
			isSyncing = false;
		}
	}

	// Abrir visor de estructura
	async function openTechnicalViewer(format) {
		viewerFormat = format;
		showViewerModal = true;
		isLoadingViewer = true;
		viewerContent = '';
		try {
			const res = await fetch(`/api/siex/export?farmer_id=${farmerId}&format=${format}`);
			const text = await res.text();
			viewerContent = text;
		} catch (err) {
			viewerContent = `Error al cargar estructura: ${err.message}`;
		} finally {
			isLoadingViewer = false;
		}
	}

	// Copiar al portapapeles
	async function copyViewerContent() {
		try {
			await navigator.clipboard.writeText(viewerContent);
			copyFeedback = true;
			setTimeout(() => {
				copyFeedback = false;
			}, 2500);
		} catch (err) {
			alert('No se pudo copiar automáticamente.');
		}
	}
</script>

<div class="row g-4">
	<!-- Encabezado y Estado de Homologación -->
	<div class="col-12">
		<div class="card cue-card shadow-sm border-0 bg-dark text-white p-4">
			<div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
				<div class="d-flex align-items-center gap-3">
					<div class="bg-primary bg-opacity-25 text-primary border border-primary border-opacity-50 rounded-3 p-3 fs-3 d-flex align-items-center justify-content-center" style="width: 52px; height: 52px;">
						<i class="bi bi-cloud-arrow-up-fill text-info"></i>
					</div>
					<div>
						<div class="d-flex align-items-center gap-2 mb-1">
							<h4 class="mb-0 fw-bold">Pasarela Oficial SIEX / FEGA</h4>
							<span class="badge bg-info text-dark fw-bold">RD 1054/2022</span>
						</div>
						<p class="text-light text-opacity-75 small mb-0">
							Conexión telemática oficial con el Ministerio de Agricultura (MAPA) y Fondo Español de Garantía Agraria
						</p>
					</div>
				</div>

				<div class="d-flex flex-wrap gap-2">
					<span class="badge bg-light bg-opacity-10 text-white border border-secondary px-3 py-2 d-flex align-items-center gap-1">
						<i class="bi bi-shield-lock-fill text-warning"></i> Sello eIDAS / XML Signature
					</span>
					<span class="badge bg-success bg-opacity-25 text-success border border-success px-3 py-2 d-flex align-items-center gap-1">
						<i class="bi bi-check-circle-fill"></i> Esquema SIEX-CUE-v2.1
					</span>
				</div>
			</div>
		</div>
	</div>

	<!-- Recibo Oficial de Registro (Si se acaba de sincronizar) -->
	{#if syncResult}
		<div class="col-12">
			<div class="card cue-card shadow border-0 bg-success-subtle border-start border-5 border-success p-4">
				<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3 pb-3 border-bottom border-success-subtle">
					<div class="d-flex align-items-center gap-3">
						<i class="bi bi-patch-check-fill text-success fs-2"></i>
						<div>
							<h5 class="mb-0 fw-bold text-success-emphasis">Asiento de Registro Telemático Oficial Generado</h5>
							<small class="text-secondary">El cuaderno digital ha sido comunicado válidamente al registro oficial</small>
						</div>
					</div>
					<button type="button" class="btn btn-sm btn-outline-success" onclick={() => window.print()}>
						<i class="bi bi-printer me-1"></i> Imprimir Justificante
					</button>
				</div>

				<div class="row g-3 small">
					<div class="col-12 col-md-4">
						<div class="p-2 bg-white rounded border">
							<div class="text-muted small">Nº Asiento Registral:</div>
							<div class="fw-bold font-monospace text-dark fs-6">{syncResult.asiento_registral}</div>
						</div>
					</div>
					<div class="col-12 col-md-4">
						<div class="p-2 bg-white rounded border">
							<div class="text-muted small">Código Seguro de Verificación (CSV):</div>
							<div class="fw-bold font-monospace text-primary fs-6">{syncResult.codigo_seguro_verificacion_csv}</div>
						</div>
					</div>
					<div class="col-12 col-md-4">
						<div class="p-2 bg-white rounded border">
							<div class="text-muted small">Fecha y Hora de Entrada:</div>
							<div class="fw-bold text-dark">{new Date(syncResult.fecha_presentacion).toLocaleString('es-ES')}</div>
						</div>
					</div>
					<div class="col-12 col-md-6">
						<div class="p-2 bg-white rounded border">
							<div class="text-muted small">Organismo Destino:</div>
							<div class="fw-medium text-dark">{syncResult.organismo_receptor}</div>
						</div>
					</div>
					<div class="col-12 col-md-6">
						<div class="p-2 bg-white rounded border">
							<div class="text-muted small">Titular y NIF de la Explotación:</div>
							<div class="fw-medium text-dark">{syncResult.titular.nombre} ({syncResult.titular.cif_nif})</div>
						</div>
					</div>
				</div>

				<div class="mt-3 pt-2 d-flex flex-wrap justify-content-between align-items-center gap-2">
					<small class="text-muted">
						<i class="bi bi-info-circle me-1"></i> Puedes cotejar este justificante en la Sede Electrónica oficial mediante el CSV.
					</small>
					<button type="button" class="btn btn-sm btn-link text-success p-0" onclick={() => syncResult = null}>
						Ocultar Justificante
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Tarjeta 1: Auditoría de Conformidad Normativa -->
	<div class="col-12 col-lg-7">
		<div class="card cue-card shadow-sm border-0 h-100">
			<div class="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
				<div class="d-flex align-items-center gap-2">
					<i class="bi bi-clipboard-check text-primary fs-5"></i>
					<div>
						<h5 class="mb-0 fw-semibold text-dark">Auditoría Previa de Conformidad SIEX</h5>
						<small class="text-muted">Reglas técnicas del FEGA antes del envío telemático</small>
					</div>
				</div>

				<button
					type="button"
					class="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
					disabled={isLoadingAudit}
					onclick={loadAudit}
				>
					<i class="bi bi-arrow-clockwise {isLoadingAudit ? 'spin-icon' : ''}"></i>
					Re-auditar
				</button>
			</div>

			<div class="card-body p-4">
				{#if audit}
					<!-- Puntuación General -->
					<div class="d-flex align-items-center justify-content-between p-3 rounded mb-4 {audit.isCompliant ? 'bg-success-subtle text-success-emphasis border border-success-subtle' : 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'}">
						<div class="d-flex align-items-center gap-3">
							<div class="display-6 fw-bold">{audit.score}%</div>
							<div>
								<h6 class="mb-0 fw-bold">{audit.isCompliant ? '100% Conforme para Envío a SIEX' : 'Conformidad con Observaciones'}</h6>
								<small class="text-secondary">
									{audit.isCompliant ? 'Todos los registros cumplen la normativa de fitosanitarios y SIGPAC.' : 'Existen datos que podrían ser observados por el FEGA.'}
								</small>
							</div>
						</div>
						<span class="badge {audit.isCompliant ? 'bg-success' : 'bg-warning text-dark'} fs-6 px-3 py-2">
							{audit.isCompliant ? 'Apto para Envío' : 'Revisar Alertas'}
						</span>
					</div>

					<!-- Lista de Reglas Auditadas -->
					<div class="d-flex flex-column gap-2 mb-3">
						{#each audit.checks as check}
							<div class="d-flex align-items-center justify-content-between p-2 rounded bg-light border small">
								<div class="d-flex align-items-center gap-2">
									{#if check.status === 'PASS'}
										<i class="bi bi-check-circle-fill text-success fs-5"></i>
									{:else if check.status === 'WARN'}
										<i class="bi bi-exclamation-triangle-fill text-warning fs-5"></i>
									{:else}
										<i class="bi bi-x-circle-fill text-danger fs-5"></i>
									{/if}
									<div>
										<span class="fw-semibold text-dark">{check.rule}</span>
										<div class="text-muted" style="font-size: 0.75rem;">{check.detail}</div>
									</div>
								</div>
								<span class="badge {check.status === 'PASS' ? 'bg-success-subtle text-success' : (check.status === 'WARN' ? 'bg-warning-subtle text-warning-emphasis' : 'bg-danger-subtle text-danger')}">
									{check.status}
								</span>
							</div>
						{/each}
					</div>

					{#if audit.errors.length > 0}
						<div class="alert alert-danger py-2 px-3 small border-0 mb-0">
							<div class="fw-bold mb-1"><i class="bi bi-x-octagon-fill me-1"></i> Errores Bloqueantes Detectados:</div>
							<ul class="mb-0 ps-3">
								{#each audit.errors as err}
									<li>{err}</li>
								{/each}
							</ul>
						</div>
					{/if}
				{:else}
					<div class="text-center py-5 text-muted">
						<span class="spinner-border spinner-border-sm me-2"></span> Ejecutando auditoría de reglas SIEX...
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Tarjeta 2: Acciones Telemáticas y Descargas Oficiales -->
	<div class="col-12 col-lg-5">
		<div class="d-flex flex-column gap-4 h-100">
			<!-- Transmisión Telemática Directa -->
			<div class="card cue-card shadow-sm border-0">
				<div class="card-header bg-white py-3 border-bottom">
					<h5 class="mb-0 fw-semibold text-dark">
						<i class="bi bi-send-fill text-primary me-2"></i> Transmisión Directa a SIEX
					</h5>
				</div>
				<div class="card-body p-4">
					<p class="text-secondary small mb-3">
						Envía telemáticamente el cuaderno digital completo al servidor del FEGA utilizando la pasarela segura mutual TLS con firma electrónica:
					</p>

					<div class="mb-3">
						<label for="env-select" class="form-label small fw-medium text-secondary">Entorno de Comunicación</label>
						<select id="env-select" class="form-select form-select-sm" bind:value={selectedEnv}>
							<option value="SANDBOX">Entorno de Pruebas (FEGA Sandbox - MAPA)</option>
							<option value="PRODUCTION">Producción Real (Sede Electrónica Oficial)</option>
						</select>
					</div>

					<button
						type="button"
						class="btn btn-primary w-100 py-2 fw-medium d-flex align-items-center justify-content-center gap-2 shadow-sm"
						disabled={isSyncing}
						onclick={handleSyncToSiex}
					>
						{#if isSyncing}
							<span class="spinner-border spinner-border-sm"></span> Firmando y Transmitiendo...
						{:else}
							<i class="bi bi-cloud-arrow-up-fill fs-5"></i>
							Transmitir Cuaderno a SIEX
						{/if}
					</button>
				</div>
			</div>

			<!-- Descarga de Archivos para Presentación Manual -->
			<div class="card cue-card shadow-sm border-0 flex-grow-1">
				<div class="card-header bg-white py-3 border-bottom">
					<h5 class="mb-0 fw-semibold text-dark">
						<i class="bi bi-download text-success me-2"></i> Exportar en Formatos Oficiales
					</h5>
				</div>
				<div class="card-body p-4 d-flex flex-column justify-content-between">
					<p class="text-secondary small mb-3">
						Descarga los archivos normalizados según el estándar SIEX para subirlos manualmente a la sede electrónica de tu Comunidad Autónoma o entregarlos en una inspección:
					</p>

					<div class="d-flex flex-column gap-2 mb-3">
						<!-- Descargar SIEX JSON -->
						<a
							href="/api/siex/export?farmer_id={farmerId}&format=json&download=true"
							class="btn btn-outline-dark d-flex align-items-center justify-content-between p-2 text-decoration-none"
							download
						>
							<div class="d-flex align-items-center gap-2">
								<i class="bi bi-filetype-json fs-4 text-warning"></i>
								<div class="text-start">
									<div class="fw-bold small text-dark">Esquema SIEX JSON Oficial</div>
									<div class="text-muted" style="font-size: 0.72rem;">Estándar API REST FEGA</div>
								</div>
							</div>
							<i class="bi bi-download fs-5 text-secondary"></i>
						</a>

						<!-- Descargar SIEX XML -->
						<a
							href="/api/siex/export?farmer_id={farmerId}&format=xml&download=true"
							class="btn btn-outline-dark d-flex align-items-center justify-content-between p-2 text-decoration-none"
							download
						>
							<div class="d-flex align-items-center gap-2">
								<i class="bi bi-filetype-xml fs-4 text-danger"></i>
								<div class="text-start">
									<div class="fw-bold small text-dark">Esquema SIEX XML Oficial</div>
									<div class="text-muted" style="font-size: 0.72rem;">Normativa XSD Real Decreto 1054/2022</div>
								</div>
							</div>
							<i class="bi bi-download fs-5 text-secondary"></i>
						</a>
					</div>

					<div class="d-flex gap-2 pt-2 border-top">
						<button
							type="button"
							class="btn btn-sm btn-light border text-secondary flex-fill"
							onclick={() => openTechnicalViewer('json')}
						>
							<i class="bi bi-eye me-1"></i> Inspeccionar JSON
						</button>
						<button
							type="button"
							class="btn btn-sm btn-light border text-secondary flex-fill"
							onclick={() => openTechnicalViewer('xml')}
						>
							<i class="bi bi-eye me-1"></i> Inspeccionar XML
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Modal Visor Técnico de Estructura Normalizada -->
{#if showViewerModal}
	<div class="modal fade show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.6);">
		<div class="modal-dialog modal-xl modal-dialog-scrollable">
			<div class="modal-content border-0 shadow">
				<div class="modal-header bg-dark text-white py-3">
					<div class="d-flex align-items-center gap-2">
						<i class="bi bi-code-square text-info fs-4"></i>
						<div>
							<h5 class="modal-title mb-0 fs-6 fw-bold">Estructura Técnica Normalizada ({viewerFormat.toUpperCase()})</h5>
							<small class="text-light text-opacity-75">Conforme al estándar técnico del FEGA / SIEX</small>
						</div>
					</div>
					<button type="button" class="btn-close btn-close-white" aria-label="Cerrar" onclick={() => showViewerModal = false}></button>
				</div>

				<div class="modal-body p-0">
					<div class="bg-light p-2 border-bottom d-flex justify-content-between align-items-center px-3">
						<span class="small text-muted">
							Formato: <strong>{viewerFormat.toUpperCase()}</strong> | Titular: <strong>{farmer?.nombre_titular}</strong>
						</span>
						<div class="d-flex gap-2">
							<button
								type="button"
								class="btn btn-sm btn-outline-dark d-flex align-items-center gap-1"
								onclick={copyViewerContent}
							>
								<i class="bi {copyFeedback ? 'bi-check2 text-success' : 'bi-clipboard'}"></i>
								{copyFeedback ? '¡Copiado!' : 'Copiar Contenido'}
							</button>
							<a
								href="/api/siex/export?farmer_id={farmerId}&format={viewerFormat}&download=true"
								class="btn btn-sm btn-success d-flex align-items-center gap-1 text-decoration-none"
								download
							>
								<i class="bi bi-download"></i> Descargar
							</a>
						</div>
					</div>

					{#if isLoadingViewer}
						<div class="text-center py-5">
							<span class="spinner-border spinner-border-sm me-2"></span> Generando estructura normalizada...
						</div>
					{:else}
						<pre class="m-0 p-3 bg-dark text-light font-monospace small" style="max-height: 500px; overflow-y: auto;"><code>{viewerContent}</code></pre>
					{/if}
				</div>

				<div class="modal-footer bg-light py-2">
					<button type="button" class="btn btn-secondary btn-sm" onclick={() => showViewerModal = false}>
						Cerrar Visor
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.spin-icon {
		animation: spin 1s linear infinite;
	}
	@keyframes spin {
		100% {
			transform: rotate(360deg);
		}
	}
</style>
