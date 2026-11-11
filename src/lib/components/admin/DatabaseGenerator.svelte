<script>
	/**
	 * @component DatabaseGenerator
	 * Módulo de Administración para el Reinicio Completo del Proyecto (Factory Reset)
	 * y Generación / Inicialización de Esquemas DDL y Datos Demo al cambiar de Base de Datos.
	 * Svelte 5 Runes: $state, $derived, $props, $effect
	 */
	import { goto } from '$app/navigation';

	let { onScriptLoadToConsole } = $props();

	// Estados reactivos con Runes
	let isResetting = $state(false);
	let isGenerating = $state(false);
	let isLoadingStats = $state(false);
	let resetStatus = $state(null); // { success: boolean, message: string }
	let stats = $state(null);

	// Configuración de generación para nueva base de datos
	let selectedDialect = $state('postgres');
	let includeDemo = $state(true);
	let generatedSql = $state('');
	let showSqlModal = $state(false);
	let copyFeedback = $state(false);

	// Cargar estadísticas iniciales de la base de datos
	async function loadDatabaseStats() {
		isLoadingStats = true;
		try {
			const res = await fetch('/api/admin/database-generator');
			const data = await res.json();
			if (data.success) {
				stats = data.stats;
			}
		} catch (err) {
			console.error('Error cargando estadísticas:', err);
		} finally {
			isLoadingStats = false;
		}
	}

	$effect(() => {
		loadDatabaseStats();
	});

	// 1. Reiniciar Proyecto Completo
	async function handleResetProject() {
		const confirmed = confirm(
			'¿Estás seguro de que deseas REINICIAR EL PROYECTO COMPLETO?\n\n' +
			'Esta acción restablecerá todas las tablas relacionales y recargará todos los datos de demostración iniciales (explotaciones, usuarios, parcelas SIGPAC, operarios ROPO y maquinaria ROMA).\n\n' +
			'Cualquier cambio manual se perderá.'
		);

		if (!confirmed) return;

		isResetting = true;
		resetStatus = null;

		try {
			const res = await fetch('/api/admin/database-generator', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'reset_project' })
			});

			const data = await res.json();
			if (data.success) {
				resetStatus = {
					success: true,
					message: data.message
				};
				stats = data.stats;
			} else {
				resetStatus = {
					success: false,
					message: data.message || 'Error al reiniciar el proyecto.'
				};
			}
		} catch (err) {
			resetStatus = {
				success: false,
				message: `Error de red: ${err.message}`
			};
		} finally {
			isResetting = false;
		}
	}

	// 2. Generar Script SQL para Nueva Base de Datos
	async function handleGenerateScript() {
		isGenerating = true;
		try {
			const res = await fetch('/api/admin/database-generator', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'get_script',
					dialect: selectedDialect,
					includeDemo
				})
			});

			const data = await res.json();
			if (data.success) {
				generatedSql = data.script;
				showSqlModal = true;
			} else {
				alert(data.message || 'Error al generar el script SQL.');
			}
		} catch (err) {
			alert(`Error: ${err.message}`);
		} finally {
			isGenerating = false;
		}
	}

	// 3. Inicializar directamente en la BD Local
	async function handleInitLocalDb() {
		if (!confirm('¿Deseas inicializar la base de datos local con el esquema y datos seleccionados?')) return;
		isGenerating = true;
		try {
			const res = await fetch('/api/admin/database-generator', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'init_database',
					dialect: selectedDialect,
					includeDemo
				})
			});
			const data = await res.json();
			if (data.success) {
				resetStatus = {
					success: true,
					message: `Base de datos inicializada con éxito para ${selectedDialect.toUpperCase()}.`
				};
				stats = data.stats;
			}
		} catch (err) {
			resetStatus = { success: false, message: err.message };
		} finally {
			isGenerating = false;
		}
	}

	// 4. Copiar script al portapapeles
	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(generatedSql);
			copyFeedback = true;
			setTimeout(() => {
				copyFeedback = false;
			}, 2500);
		} catch (err) {
			alert('No se pudo copiar automáticamente. Por favor, selecciona y copia manualmente.');
		}
	}

	// 5. Descargar script como archivo .sql
	function downloadSqlFile() {
		const filename = `cue_${selectedDialect}_init_${includeDemo ? 'with_demo' : 'schema_only'}.sql`;
		const blob = new Blob([generatedSql], { type: 'text/sql;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}

	// 6. Enviar a la consola SQL interna
	function sendToSqlConsole() {
		if (onScriptLoadToConsole) {
			onScriptLoadToConsole(generatedSql);
		} else {
			goto('/admin?tab=sql');
		}
	}
</script>

<div class="row g-4">
	<!-- Alerta de Estado / Feedback de Operación -->
	{#if resetStatus}
		<div class="col-12">
			<div class="alert {resetStatus.success ? 'alert-success' : 'alert-danger'} alert-dismissible fade show d-flex align-items-center gap-3 py-3 shadow-sm border-0" role="alert">
				<i class="bi {resetStatus.success ? 'bi-check-circle-fill' : 'bi-exclamation-octagon-fill'} fs-3"></i>
				<div class="flex-grow-1">
					<h6 class="alert-heading mb-1 fw-bold">{resetStatus.success ? 'Operación Completada' : 'Error en la Operación'}</h6>
					<p class="mb-0 small">{resetStatus.message}</p>
				</div>
				<button type="button" class="btn-close" aria-label="Cerrar" onclick={() => resetStatus = null}></button>
			</div>
		</div>
	{/if}

	<!-- Tarjeta 1: Reinicio de Proyecto (Factory Reset) -->
	<div class="col-12 col-lg-6">
		<div class="card cue-card shadow-sm border-0 h-100">
			<div class="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
				<div class="d-flex align-items-center gap-2">
					<i class="bi bi-arrow-counterclockwise text-danger fs-5"></i>
					<div>
						<h5 class="mb-0 fw-semibold text-dark">Reiniciar Proyecto Completo</h5>
						<small class="text-muted">Restablecer la base de datos al estado inicial de fábrica</small>
					</div>
				</div>
				<span class="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1">
					Factory Reset
				</span>
			</div>

			<div class="card-body p-4 d-flex flex-column justify-content-between">
				<div>
					<p class="text-secondary small mb-3">
						Esta opción permite <strong>devolver toda la plataforma a su estado inicial de demostración</strong> en cualquier momento.
						Elimina registros temporales creados en pruebas y restaura íntegramente las tablas con los datos oficiales:
					</p>

					<div class="bg-light p-3 rounded mb-3 small border">
						<ul class="list-unstyled mb-0 d-flex flex-column gap-1 text-muted">
							<li><i class="bi bi-check-circle-fill text-success me-2"></i> <strong>2 Explotaciones / Tenants:</strong> Agropecuaria Las Hazas y Herederos Gómez.</li>
							<li><i class="bi bi-check-circle-fill text-success me-2"></i> <strong>4 Usuarios con contraseñas:</strong> SuperAdmin, 2 Agricultores y Asesor.</li>
							<li><i class="bi bi-check-circle-fill text-success me-2"></i> <strong>5 Parcelas SIGPAC:</strong> Olivar Picual, Almendro, Trigo, Viñedo y Cebada.</li>
							<li><i class="bi bi-check-circle-fill text-success me-2"></i> <strong>4 Operarios ROPO:</strong> Carnets vigentes y verificación de caducidad.</li>
							<li><i class="bi bi-check-circle-fill text-success me-2"></i> <strong>4 Máquinas ROMA:</strong> Atomizadores y barras con inspecciones ITEAF.</li>
							<li><i class="bi bi-check-circle-fill text-success me-2"></i> <strong>3 Tratamientos fitosanitarios:</strong> Registros normativos completos del CUE.</li>
						</ul>
					</div>

					<div class="alert alert-warning py-2 px-3 small border-0 bg-warning-subtle text-warning-emphasis d-flex align-items-center gap-2">
						<i class="bi bi-exclamation-triangle-fill"></i>
						<span>Atención: Cualquier tratamiento o parcela creada manualmente será borrada.</span>
					</div>
				</div>

				<div class="pt-3 border-top mt-3 text-end">
					<button
						type="button"
						class="btn btn-danger w-100 py-2 fw-medium d-flex align-items-center justify-content-center gap-2"
						disabled={isResetting}
						onclick={handleResetProject}
					>
						{#if isResetting}
							<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
							Restableciendo Proyecto y BD...
						{:else}
							<i class="bi bi-arrow-repeat fs-5"></i>
							Reiniciar Todo el Proyecto
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Tarjeta 2: Generador al Cambiar de Base de Datos -->
	<div class="col-12 col-lg-6">
		<div class="card cue-card shadow-sm border-0 h-100">
			<div class="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
				<div class="d-flex align-items-center gap-2">
					<i class="bi bi-database-fill-up text-primary fs-5"></i>
					<div>
						<h5 class="mb-0 fw-semibold text-dark">Cambio de Base de Datos</h5>
						<small class="text-muted">Generar esquemas DDL y sembrado para nuevos motores SQL</small>
					</div>
				</div>
				<span class="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
					Migración
				</span>
			</div>

			<div class="card-body p-4 d-flex flex-column justify-content-between">
				<div>
					<p class="text-secondary small mb-3">
						Si has cambiado la conexión de base de datos en las credenciales (o quieres configurar una nueva instancia de <strong>PostgreSQL, Supabase Cloud o MySQL</strong>), genera el script DDL e inicializa las tablas:
					</p>

					<!-- Selector de Motor / Dialecto -->
					<div class="mb-3">
						<label for="db-dialect" class="form-label fw-medium text-secondary small">Motor de Base de Datos de Destino</label>
						<select id="db-dialect" class="form-select form-select-sm" bind:value={selectedDialect}>
							<option value="postgres">PostgreSQL / Supabase Cloud (con UUID, RLS y Realtime)</option>
							<option value="sqlite">SQLite 3 Nativo (Almacenamiento local ACID)</option>
							<option value="mysql">MySQL 8.0+ / MariaDB</option>
						</select>
					</div>

					<!-- Opción incluir datos demo -->
					<div class="form-check form-switch mb-3">
						<input
							class="form-check-input"
							type="checkbox"
							role="switch"
							id="includeDemoCheck"
							bind:checked={includeDemo}
						/>
						<label class="form-check-label small fw-medium" for="includeDemoCheck">
							Poblar automáticamente con todos los datos normativos de demostración
						</label>
					</div>

					<div class="p-3 bg-light rounded border small text-muted mb-3">
						<i class="bi bi-info-circle text-primary me-1"></i>
						Al generar el script para <strong>{selectedDialect.toUpperCase()}</strong>, obtendrás el archivo SQL unificado listo para ejecutar en el editor SQL de Supabase, pgAdmin o DBeaver.
					</div>
				</div>

				<div class="pt-3 border-top mt-3 d-flex flex-column flex-sm-row gap-2">
					<button
						type="button"
						class="btn btn-outline-primary flex-fill d-flex align-items-center justify-content-center gap-2"
						disabled={isGenerating}
						onclick={handleGenerateScript}
					>
						{#if isGenerating}
							<span class="spinner-border spinner-border-sm"></span> Generando...
						{:else}
							<i class="bi bi-file-earmark-code"></i>
							Ver / Descargar Script SQL
						{/if}
					</button>

					<button
						type="button"
						class="btn btn-primary flex-fill d-flex align-items-center justify-content-center gap-2"
						disabled={isGenerating}
						onclick={handleInitLocalDb}
					>
						<i class="bi bi-play-circle-fill"></i>
						Inicializar BD Ahora
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Tarjeta 3: Diagnóstico y Estado en Tiempo Real de las Tablas -->
	<div class="col-12">
		<div class="card cue-card shadow-sm border-0">
			<div class="card-header bg-white py-3 border-bottom d-flex flex-wrap align-items-center justify-content-between gap-2">
				<div class="d-flex align-items-center gap-2">
					<i class="bi bi-table text-success fs-5"></i>
					<div>
						<h5 class="mb-0 fw-semibold text-dark">Diagnóstico de Tablas en la Base de Datos</h5>
						<small class="text-muted">Recuento de filas almacenadas en cada tabla relacional del CUE</small>
					</div>
				</div>

				<div class="d-flex align-items-center gap-2">
					<button
						type="button"
						class="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
						disabled={isLoadingStats}
						onclick={loadDatabaseStats}
					>
						<i class="bi bi-arrow-clockwise {isLoadingStats ? 'spin-icon' : ''}"></i>
						Refrescar Recuento
					</button>
				</div>
			</div>

			<div class="card-body p-4">
				{#if stats}
					<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3 p-3 bg-light rounded border">
						<div>
							<span class="text-muted small">Motor Relacional Activo:</span>
							<span class="fw-bold ms-1 text-dark">{stats.engine}</span>
						</div>
						<div>
							<span class="text-muted small">Ubicación Física:</span>
							<code class="ms-1 small">{stats.dbPath}</code>
						</div>
						<div>
							<span class="text-muted small">Tamaño de Archivo:</span>
							<span class="badge bg-secondary ms-1">{stats.sizeKb} KB</span>
						</div>
						<div>
							<span class="text-muted small">Total Registros:</span>
							<span class="badge bg-success ms-1">{stats.totalRecords} filas</span>
						</div>
					</div>

					<div class="table-responsive">
						<table class="table table-hover table-sm align-middle mb-0">
							<thead class="table-light small">
								<tr>
									<th>Tabla SQL</th>
									<th>Descripción Funcional CUE</th>
									<th class="text-center">Filas Persistidas</th>
									<th class="text-center">Estado</th>
								</tr>
							</thead>
							<tbody class="small">
								{#each Object.entries(stats.tableCounts) as [tableName, count]}
									<tr>
										<td><code class="fw-bold text-primary">{tableName}</code></td>
										<td class="text-secondary">
											{#if tableName === 'farmers'}Inquilinos / Sociedades Agrarias (Tenants)
											{:else if tableName === 'users'}Usuarios con contraseñas criptográficas scrypt
											{:else if tableName === 'explotaciones'}Explotaciones Agrarias (Código REA / REGEPA)
											{:else if tableName === 'parcelas'}Parcelas y Recintos SIGPAC Georreferenciados
											{:else if tableName === 'ropo_trabajadores'}Aplicadores oficiales ROPO con fecha caducidad
											{:else if tableName === 'roma_maquinaria'}Maquinaria inscrita en ROMA con ITEAF vigente
											{:else if tableName === 'tratamientos_fitosanitarios'}Cuaderno Oficial CUE (Tratamientos fitosanitarios)
											{:else if tableName === 'fertilizaciones'}Planes y registros de fertilización N-P-K
											{:else if tableName === 'riegos'}Volúmenes y métodos de riego por parcela
											{:else if tableName === 'config_database'}Parámetros de conexión SQL Multi-tenant
											{:else if tableName === 'config_api_endpoints'}Pasarelas y endpoints SIEX y SIGPAC
											{:else if tableName === 'sql_execution_logs'}Auditoría de sentencias ejecutadas en consola
											{:else}Tabla auxiliar del sistema
											{/if}
										</td>
										<td class="text-center">
											<span class="badge {count > 0 ? 'bg-primary-subtle text-primary border border-primary-subtle' : 'bg-light text-muted border'} px-2 py-1">
												{count} registros
											</span>
										</td>
										<td class="text-center">
											{#if count > 0}
												<span class="text-success"><i class="bi bi-check-circle-fill me-1"></i> Poblada</span>
											{:else}
												<span class="text-muted"><i class="bi bi-dash-circle me-1"></i> Vacía</span>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<div class="text-center py-4 text-muted">
						<span class="spinner-border spinner-border-sm me-2"></span> Cargando diagnóstico de tablas...
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Modal / Visor de Script SQL Generado -->
{#if showSqlModal}
	<div class="modal fade show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
		<div class="modal-dialog modal-xl modal-dialog-scrollable">
			<div class="modal-content border-0 shadow">
				<div class="modal-header bg-dark text-white py-3">
					<div class="d-flex align-items-center gap-2">
						<i class="bi bi-file-earmark-code fs-4 text-warning"></i>
						<div>
							<h5 class="modal-title mb-0 fs-6 fw-bold">Script SQL Generado ({selectedDialect.toUpperCase()})</h5>
							<small class="text-light text-opacity-75">Listo para desplegar en tu nueva base de datos</small>
						</div>
					</div>
					<button type="button" class="btn-close btn-close-white" aria-label="Cerrar" onclick={() => showSqlModal = false}></button>
				</div>

				<div class="modal-body p-0">
					<div class="bg-light p-2 border-bottom d-flex flex-wrap align-items-center justify-content-between gap-2 px-3">
						<span class="small text-muted">
							Longitud del script: <strong>{generatedSql.length}</strong> caracteres | Dialecto: <strong>{selectedDialect}</strong>
						</span>
						<div class="d-flex gap-2">
							<button
								type="button"
								class="btn btn-sm btn-outline-dark d-flex align-items-center gap-1"
								onclick={copyToClipboard}
							>
								<i class="bi {copyFeedback ? 'bi-check2 text-success' : 'bi-clipboard'}"></i>
								{copyFeedback ? '¡Copiado!' : 'Copiar Script'}
							</button>
							<button
								type="button"
								class="btn btn-sm btn-success d-flex align-items-center gap-1"
								onclick={downloadSqlFile}
							>
								<i class="bi bi-download"></i>
								Descargar .sql
							</button>
						</div>
					</div>

					<pre class="m-0 p-3 bg-dark text-light font-monospace small" style="max-height: 480px; overflow-y: auto;"><code>{generatedSql}</code></pre>
				</div>

				<div class="modal-footer bg-light py-2 d-flex flex-wrap justify-content-between gap-2">
					<button
						type="button"
						class="btn btn-outline-secondary btn-sm"
						onclick={() => showSqlModal = false}
					>
						Cerrar
					</button>
					<div class="d-flex flex-wrap gap-2">
						{#if selectedDialect === 'postgres'}
							<a
								href="https://supabase.com/dashboard/project/xeqnlmfyvijdgclfhzgf/sql"
								target="_blank"
								rel="noopener noreferrer"
								class="btn btn-success btn-sm text-white d-flex align-items-center gap-1"
							>
								<i class="bi bi-box-arrow-up-right"></i>
								Abrir SQL Editor de Supabase
							</a>
						{/if}
						<button
							type="button"
							class="btn btn-warning btn-sm text-dark d-flex align-items-center gap-1"
							onclick={() => {
								showSqlModal = false;
								sendToSqlConsole();
							}}
						>
							<i class="bi bi-terminal-fill"></i>
							Abrir en la Consola SQL Interna
						</button>
					</div>
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
