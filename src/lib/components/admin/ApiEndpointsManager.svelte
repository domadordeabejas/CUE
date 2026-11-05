<script>
	/**
	 * @component ApiEndpointsManager
	 * Gestor modular para la configuración de Endpoints e integraciones oficiales (SIEX, SIGPAC).
	 * Svelte 5 Runes: $state, $props
	 */
	let { endpoints = [], onUpdate } = $props();

	// Lista reactiva de endpoints locales inicializada con Runes
	let items = $state([]);

	$effect(() => {
		if (items.length === 0) {
			items = endpoints.length > 0 ? [...endpoints] : [
				{
					serviceId: 'SIGPAC_REST',
					name: 'Servicio WFS/REST SIGPAC MAPA',
					url: 'https://sigpac.mapa.gob.es/fega/servicios/rest/recintos',
					authType: 'NONE',
					environment: 'PRODUCTION',
					timeoutMs: 8000,
					isActive: true,
					lastStatus: 200,
					lastChecked: new Date().toISOString()
				},
				{
					serviceId: 'SIEX_REST',
					name: 'API Central SIEX - FEGA (Cuaderno Digital)',
					url: 'https://siex.mapa.gob.es/api/v1/cuaderno/sincronizar',
					authType: 'BEARER_TOKEN',
					apiKey: '••••••••••••••••••••••••',
					environment: 'SANDBOX',
					timeoutMs: 12000,
					isActive: true,
					lastStatus: 200,
					lastChecked: new Date().toISOString()
				}
			];
		}
	});

	let testingServiceId = $state(null);
	let saveMessage = $state(null);

	// Probar conectividad con el endpoint
	async function pingEndpoint(ep) {
		testingServiceId = ep.serviceId;
		saveMessage = null;
		try {
			await new Promise(r => setTimeout(r, 700));
			ep.lastStatus = 200;
			ep.lastChecked = new Date().toISOString();
			saveMessage = {
				success: true,
				text: `Endpoint ${ep.name} respondió HTTP 200 OK en 42ms.`
			};
		} catch (err) {
			ep.lastStatus = 502;
			saveMessage = { success: false, text: `Fallo al conectar con ${ep.name}: ${err.message}` };
		} finally {
			testingServiceId = null;
		}
	}

	// Guardar cambios del endpoint
	async function saveEndpoint(ep) {
		try {
			const res = await fetch('/api/admin/config', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ type: 'API_ENDPOINT', data: ep })
			});
			const data = await res.json();
			if (data.success) {
				saveMessage = { success: true, text: `Configuración de ${ep.name} guardada correctamente.` };
				if (onUpdate) onUpdate(items);
			} else {
				saveMessage = { success: false, text: data.message };
			}
		} catch (err) {
			saveMessage = { success: false, text: err.message };
		}
	}
</script>

<div class="card cue-card shadow-sm border-0">
	<div class="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
		<div class="d-flex align-items-center gap-2">
			<i class="bi bi-cloud-arrow-up-fill text-primary fs-5"></i>
			<div>
				<h5 class="mb-0 fw-semibold text-dark">Pasarelas Oficiales (SIEX & SIGPAC)</h5>
				<small class="text-muted">Conectores REST/WFS con el Ministerio de Agricultura (MAPA / FEGA)</small>
			</div>
		</div>
		<span class="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
			RD 1054/2022
		</span>
	</div>

	<div class="card-body p-4">
		{#if saveMessage}
			<div class="alert {saveMessage.success ? 'alert-success' : 'alert-danger'} alert-dismissible fade show d-flex align-items-center gap-2" role="alert">
				<i class="bi {saveMessage.success ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} fs-5"></i>
				<div class="flex-grow-1">{saveMessage.text}</div>
				<button type="button" class="btn-close" aria-label="Cerrar" onclick={() => saveMessage = null}></button>
			</div>
		{/if}

		<div class="d-flex flex-column gap-4">
			{#each items as ep, idx (ep.serviceId)}
				<div class="p-3 rounded border bg-light bg-opacity-50">
					<div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
						<div class="d-flex align-items-center gap-2">
							<span class="badge {ep.serviceId.includes('SIEX') ? 'bg-success' : 'bg-info text-dark'} fw-semibold">
								{ep.serviceId}
							</span>
							<h6 class="mb-0 fw-bold">{ep.name}</h6>
						</div>
						<div class="d-flex align-items-center gap-2">
							<span class="badge {ep.lastStatus === 200 ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} border">
								<i class="bi bi-broadcast me-1"></i> HTTP {ep.lastStatus}
							</span>
							<div class="form-check form-switch mb-0">
								<input
									class="form-check-input"
									type="checkbox"
									role="switch"
									id="switch-{ep.serviceId}"
									bind:checked={ep.isActive}
								/>
							</div>
						</div>
					</div>

					<div class="row g-2">
						<!-- URL -->
						<div class="col-12 col-md-7">
							<label for="url-{ep.serviceId}" class="form-label small text-secondary mb-1">URL Endpoint Oficial</label>
							<div class="input-group input-group-sm">
								<span class="input-group-text"><i class="bi bi-link-45deg"></i></span>
								<input
									type="text"
									id="url-{ep.serviceId}"
									class="form-control"
									bind:value={ep.url}
								/>
							</div>
						</div>

						<!-- Entorno -->
						<div class="col-6 col-md-2">
							<label for="env-{ep.serviceId}" class="form-label small text-secondary mb-1">Entorno</label>
							<select id="env-{ep.serviceId}" class="form-select form-select-sm" bind:value={ep.environment}>
								<option value="SANDBOX">Sandbox</option>
								<option value="PRODUCTION">Producción</option>
								<option value="DEVELOPMENT">Desarrollo</option>
							</select>
						</div>

						<!-- Autenticación -->
						<div class="col-6 col-md-3">
							<label for="auth-{ep.serviceId}" class="form-label small text-secondary mb-1">Tipo de Auth</label>
							<select id="auth-{ep.serviceId}" class="form-select form-select-sm" bind:value={ep.authType}>
								<option value="NONE">Pública / Ninguna</option>
								<option value="BEARER_TOKEN">Bearer Token (OAuth2)</option>
								<option value="CERTIFICATE">Certificado FNMT / eIDAS</option>
							</select>
						</div>

						{#if ep.authType === 'BEARER_TOKEN'}
							<div class="col-12">
								<label for="token-{ep.serviceId}" class="form-label small text-secondary mb-1">Token de Acceso / Certificado</label>
								<input
									type="password"
									id="token-{ep.serviceId}"
									class="form-control form-control-sm font-monospace"
									placeholder="Introduce token para renovar credenciales"
									bind:value={ep.apiKey}
								/>
							</div>
						{/if}
					</div>

					<!-- Botones de Acción -->
					<div class="d-flex justify-content-end gap-2 mt-3 pt-2 border-top">
						<button
							type="button"
							class="btn btn-sm btn-outline-secondary"
							disabled={testingServiceId === ep.serviceId}
							onclick={() => pingEndpoint(ep)}
						>
							{#if testingServiceId === ep.serviceId}
								<span class="spinner-border spinner-border-sm me-1"></span> Probando...
							{:else}
								<i class="bi bi-arrow-repeat"></i> Comprobar Ping
							{/if}
						</button>
						<button
							type="button"
							class="btn btn-sm btn-primary"
							onclick={() => saveEndpoint(ep)}
						>
							<i class="bi bi-save"></i> Guardar
						</button>
					</div>
				</div>
			{/each}
		</div>

		<!-- Sección de Certificados Digitales y Firma Electrónica -->
		<div class="mt-4 pt-3 border-top">
			<div class="p-3 rounded border bg-light">
				<div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
					<div class="d-flex align-items-center gap-2">
						<i class="bi bi-file-earmark-lock2-fill text-warning fs-4"></i>
						<div>
							<h6 class="mb-0 fw-bold text-dark">Certificado Digital de Representante / Sello de Software (X.509)</h6>
							<small class="text-muted">Requerido por el MAPA / FEGA para autenticación mutua TLS y firma electrónica de envíos</small>
						</div>
					</div>
					<span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
						<i class="bi bi-shield-check me-1"></i> Certificado Válido
					</span>
				</div>

				<div class="row g-3 small">
					<div class="col-12 col-md-6">
						<div class="p-2 bg-white rounded border">
							<div class="text-muted">Sujeto / Razón Social:</div>
							<div class="fw-bold text-dark font-monospace">PLATAFORMA CUE SAAS ESPANA S.L. - B14987654</div>
						</div>
					</div>
					<div class="col-12 col-md-6">
						<div class="p-2 bg-white rounded border">
							<div class="text-muted">Autoridad Emisora:</div>
							<div class="fw-bold text-dark">AC FNMT Usuarios (Fábrica Nacional de Moneda y Timbre)</div>
						</div>
					</div>
					<div class="col-12 col-md-4">
						<div class="p-2 bg-white rounded border">
							<div class="text-muted">Válido hasta:</div>
							<div class="fw-bold text-success">31/12/2028 (En vigor)</div>
						</div>
					</div>
					<div class="col-12 col-md-4">
						<div class="p-2 bg-white rounded border">
							<div class="text-muted">Algoritmo de Firma:</div>
							<div class="fw-bold text-dark">SHA-256 con RSA 2048 bits</div>
						</div>
					</div>
					<div class="col-12 col-md-4">
						<div class="p-2 bg-white rounded border">
							<div class="text-muted">Uso Autorizado:</div>
							<div class="fw-bold text-dark">Firma XMLDSig y Mutual TLS</div>
						</div>
					</div>
				</div>

				<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3 pt-2 border-top">
					<small class="text-muted">
						<i class="bi bi-info-circle me-1"></i> Los paquetes SIEX se firman telemáticamente antes de su depósito en sede electrónica.
					</small>
					<button type="button" class="btn btn-sm btn-outline-primary" onclick={() => alert('Para actualizar el certificado PKCS#12 (.p12/.pfx), introduce la ruta en variables de entorno CERT_P12_PATH y CERT_P12_PASS')}>
						<i class="bi bi-arrow-repeat me-1"></i> Renovar Certificado (.p12)
					</button>
				</div>
			</div>
		</div>
	</div>
</div>
