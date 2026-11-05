<script>
	/**
	 * @component SqlRunnerManager
	 * Gestor modular para la ejecución segura de scripts DDL/DML y consultas SQL por el SuperAdmin.
	 * Svelte 5 Runes: $state, $derived, $props
	 */
	let { onExecutionComplete, initialSql = '' } = $props();

	// Snippets predefinidos para agilidad de uso
	const SQL_SNIPPETS = {
		SELECT_PARCELAS: `-- Consulta de Parcelas SIGPAC activas aisladas por Tenant
SELECT id, farmer_id, nombre_referencia, provincia, municipio, poligono, parcela, recinto, superficie_ha, uso_sigpac, cultivo_actual 
FROM parcelas 
LIMIT 10;`,
		SELECT_ROPO: `-- Inspección de operarios y caducidad de carnet fitosanitario
SELECT id, nombre, apellidos, numero_ropo, tipo_carnet, fecha_caducidad, activo 
FROM ropo_trabajadores 
ORDER BY fecha_caducidad ASC;`,
		SELECT_TRATAMIENTOS: `-- Consulta de tratamientos fitosanitarios registrados en CUE
SELECT id, farmer_id, parcela_id, nombre_comercial, materia_activa, dosis_valor, dosis_unidad, superficie_tratada_ha, fecha_tratamiento 
FROM tratamientos_fitosanitarios 
ORDER BY fecha_tratamiento DESC;`,
		ADD_INDEX: `-- Optimización: Crear índice compuesto para acelerar reportes del CUE
CREATE INDEX IF NOT EXISTS idx_trat_fecha_plazo 
ON tratamientos_fitosanitarios (farmer_id, fecha_tratamiento, plazo_seguridad_dias);`,
		CLEANUP_EXPIRED: `-- Mantenimiento DML: Marcar como inactivos operarios con ROPO caducado
UPDATE ropo_trabajadores 
SET activo = FALSE 
WHERE fecha_caducidad < CURRENT_DATE AND activo = TRUE;`
	};

	// Estados reactivos con Runes
	let sqlScript = $state('');
	let isExecuting = $state(false);
	let executionResult = $state(null);
	let selectedSnippetKey = $state('SELECT_PARCELAS');

	$effect(() => {
		if (initialSql) {
			sqlScript = initialSql;
		} else if (!sqlScript) {
			sqlScript = SQL_SNIPPETS.SELECT_PARCELAS;
		}
	});

	// Derivados
	let isScriptEmpty = $derived(!sqlScript || sqlScript.trim().length === 0);

	// Cambio de snippet
	function handleSnippetChange(e) {
		const key = e.target.value;
		selectedSnippetKey = key;
		if (SQL_SNIPPETS[key]) {
			sqlScript = SQL_SNIPPETS[key];
		}
	}

	// Ejecución de script SQL
	async function runSql() {
		if (isScriptEmpty) return;

		isExecuting = true;
		executionResult = null;

		try {
			const res = await fetch('/api/admin/sql', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					sqlScript,
					userEmail: 'superadmin@cue-saas.es'
				})
			});

			const data = await res.json();
			executionResult = data;
			if (data.success && onExecutionComplete) {
				onExecutionComplete(data);
			}
		} catch (err) {
			executionResult = {
				success: false,
				message: err.message || 'Error de comunicación con el servidor.'
			};
		} finally {
			isExecuting = false;
		}
	}

	function clearConsole() {
		sqlScript = '';
		executionResult = null;
	}
</script>

<div class="card cue-card shadow-sm border-0">
	<div class="card-header bg-white py-3 border-bottom d-flex flex-wrap align-items-center justify-content-between gap-2">
		<div class="d-flex align-items-center gap-2">
			<i class="bi bi-terminal-fill text-dark fs-5"></i>
			<div>
				<h5 class="mb-0 fw-semibold text-dark">Consola de Ejecución SQL (DDL / DML)</h5>
				<small class="text-muted">Motor de migración de esquemas y consultas analíticas seguras</small>
			</div>
		</div>

		<!-- Selector de Snippets Rápidos -->
		<div class="d-flex align-items-center gap-2">
			<label for="snippet-select" class="form-label mb-0 small text-muted d-none d-sm-block">Plantillas:</label>
			<select
				id="snippet-select"
				class="form-select form-select-sm"
				style="max-width: 260px;"
				value={selectedSnippetKey}
				onchange={handleSnippetChange}
			>
				<option value="SELECT_PARCELAS">SELECT * FROM parcelas</option>
				<option value="SELECT_ROPO">SELECT * FROM ropo_trabajadores</option>
				<option value="SELECT_TRATAMIENTOS">SELECT * FROM tratamientos</option>
				<option value="ADD_INDEX">DDL: Crear Índice Compuesto</option>
				<option value="CLEANUP_EXPIRED">DML: Inactivar Carnets Vencidos</option>
			</select>
		</div>
	</div>

	<div class="card-body p-3 p-md-4">
		<!-- Editor de Código SQL -->
		<div class="mb-3">
			<div class="d-flex justify-content-between align-items-center mb-1">
				<span class="small text-secondary fw-semibold font-monospace">SQL Query Editor</span>
				<span class="badge bg-light text-dark border font-monospace">PostgreSQL / ANSI SQL</span>
			</div>
			<textarea
				class="form-control sql-console p-3"
				rows="7"
				bind:value={sqlScript}
				placeholder="Escribe sentencias DDL (CREATE, ALTER, DROP) o DML (SELECT, INSERT, UPDATE)..."
				spellcheck="false"
			></textarea>
		</div>

		<!-- Barra de Herramientas de Ejecución -->
		<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
			<button
				type="button"
				class="btn btn-sm btn-outline-secondary"
				onclick={clearConsole}
			>
				<i class="bi bi-trash3"></i> Limpiar
			</button>

			<div class="d-flex gap-2">
				<button
					type="button"
					class="btn btn-primary px-4"
					disabled={isExecuting || isScriptEmpty}
					onclick={runSql}
				>
					{#if isExecuting}
						<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
						Ejecutando SQL...
					{:else}
						<i class="bi bi-play-fill fs-5 lh-1"></i> Ejecutar Sentencia
					{/if}
				</button>
			</div>
		</div>

		<!-- Panel de Resultados -->
		{#if executionResult}
			<div class="border rounded p-3 bg-white">
				<div class="d-flex flex-wrap align-items-center justify-content-between border-bottom pb-2 mb-3 gap-2">
					<div class="d-flex align-items-center gap-2">
						<span class="badge {executionResult.success ? 'bg-success' : 'bg-danger'} px-2 py-1">
							{executionResult.success ? 'COMPLETADO' : 'ERROR'}
						</span>
						{#if executionResult.operationType}
							<span class="badge bg-dark font-monospace">{executionResult.operationType}</span>
						{/if}
						<span class="small text-muted">{executionResult.message}</span>
					</div>

					{#if executionResult.executionTimeMs !== undefined}
						<div class="small font-monospace text-secondary">
							<i class="bi bi-stopwatch me-1"></i>{executionResult.executionTimeMs} ms
							{#if executionResult.rowsAffected !== undefined}
								&bull; {executionResult.rowsAffected} registros
							{/if}
						</div>
					{/if}
				</div>

				<!-- Si es SELECT con resultados -->
				{#if executionResult.resultSet && Array.isArray(executionResult.resultSet) && executionResult.resultSet.length > 0}
					<div class="table-responsive" style="max-height: 280px;">
						<table class="table table-sm table-hover table-striped align-middle sql-result-table mb-0 border">
							<thead class="table-dark sticky-top">
								<tr>
									{#each Object.keys(executionResult.resultSet[0]) as col}
										<th scope="col" class="font-monospace small px-2 py-1">{col}</th>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each executionResult.resultSet as row}
									<tr>
										{#each Object.values(row) as val}
											<td class="font-monospace small px-2 py-1 text-truncate" style="max-width: 200px;">
												{typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val ?? '')}
											</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else if executionResult.success}
					<div class="text-success small py-2 d-flex align-items-center gap-2">
						<i class="bi bi-check2-all fs-5"></i>
						<span>Sentencia procesada con éxito en la base de datos sin conjunto de resultados tabular.</span>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
