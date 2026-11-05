<script>
	/**
	 * @component LoginPage
	 * Pantalla de inicio de sesión segura para agricultores y administradores de CUE SaaS.
	 * Svelte 5 Runes: $state, $props, onclick
	 */
	let { form } = $props();

	let email = $state('');
	let password = $state('');
	let showPassword = $state(false);
	let isSubmitting = $state(false);

	$effect(() => {
		if (form?.email && !email) {
			email = form.email;
		}
	});

	const DEMO_PRESETS = [
		{
			name: 'Antonio Pérez',
			farmer: 'Agropecuaria Las Hazas S.L.',
			email: 'antonio@agrohazassl.es',
			pass: 'Agro123!',
			role: 'AGRICULTOR',
			location: 'Córdoba (Olivar / Trigo)',
			badgeColor: 'bg-success'
		},
		{
			name: 'Juan Gómez',
			farmer: 'Herederos de Juan Gómez C.B.',
			email: 'juan@fincagomez.com',
			pass: 'Gomez123!',
			role: 'AGRICULTOR',
			location: 'Albacete (Viñedo / Cebada)',
			badgeColor: 'bg-success'
		},
		{
			name: 'Elena Martínez',
			farmer: 'Cooperativa Agrícola (GIP)',
			email: 'elena.asesora@coopcordoba.com',
			pass: 'Asesor123!',
			role: 'ASESOR TÉCNICO',
			location: 'Asesoría Homologada',
			badgeColor: 'bg-info text-dark'
		},
		{
			name: 'Carlos Administrador',
			farmer: 'Plataforma SaaS Global',
			email: 'admin@cue-saas.es',
			pass: 'Admin123!',
			role: 'SUPERADMIN',
			location: 'Consola Central & SQL',
			badgeColor: 'bg-dark'
		}
	];

	function fillCredentials(preset) {
		email = preset.email;
		password = preset.pass;
	}
</script>

<svelte:head>
	<title>Iniciar Sesión | CUE Digital SaaS</title>
</svelte:head>

<div class="login-wrapper d-flex align-items-center justify-content-center min-vh-100 py-5 px-3">
	<div class="container" style="max-width: 960px;">
		<div class="row g-4 align-items-center justify-content-center">
			<!-- Columna Izquierda: Presentación y Confianza -->
			<div class="col-12 col-lg-6 pe-lg-4 text-center text-lg-start">
				<div class="d-inline-flex align-items-center gap-2 bg-success-subtle text-success border border-success-subtle px-3 py-1 rounded-pill mb-3">
					<i class="bi bi-shield-lock-fill"></i>
					<small class="fw-semibold">Acceso Seguro &bull; Real Decreto 1054/2022</small>
				</div>

				<h1 class="display-6 fw-bold text-dark lh-sm mb-3">
					Cuaderno Digital de Explotación Agrícola (<span class="text-success">CUE</span>)
				</h1>
				<p class="text-secondary mb-4">
					Accede a tu explotación agrícola para registrar tratamientos fitosanitarios, consultar el historial de parcelas SIGPAC y certificar inspecciones técnicas de equipos con validez oficial ante el SIEX y las CC.AA.
				</p>

				<!-- Bloque de Aislamiento de Datos -->
				<div class="card border-0 bg-white shadow-sm p-3 mb-4 rounded-3 text-start">
					<div class="d-flex align-items-center gap-3">
						<div class="p-3 bg-light text-success rounded-circle fs-4">
							<i class="bi bi-person-check-fill"></i>
						</div>
						<div>
							<h6 class="fw-bold mb-0 text-dark">Aislamiento Estricto por Agricultor</h6>
							<small class="text-muted">
								Cada titular accede exclusivamente a sus propios cultivos, operarios y registros oficiales con clave criptográfica.
							</small>
						</div>
					</div>
				</div>

				<!-- Cuentas Rápidas de Demostración -->
				<div class="text-start">
					<small class="text-uppercase fw-bold text-muted d-block mb-2" style="font-size: 0.72rem; letter-spacing: 0.05em;">
						Cuentas de Acceso Rápido (Demo) &bull; Haz clic para rellenar:
					</small>
					<div class="row g-2">
						{#each DEMO_PRESETS as preset}
							<div class="col-12 col-sm-6">
								<button
									type="button"
									class="btn btn-outline-secondary w-100 p-2 text-start bg-white d-flex flex-column border-opacity-50 hover-preset"
									onclick={() => fillCredentials(preset)}
								>
									<div class="d-flex align-items-center justify-content-between w-100">
										<strong class="text-dark small text-truncate">{preset.name}</strong>
										<span class="badge {preset.badgeColor} small" style="font-size: 0.65rem;">{preset.role}</span>
									</div>
									<small class="text-muted text-truncate" style="font-size: 0.75rem;">{preset.farmer}</small>
								</button>
							</div>
						{/each}
					</div>
				</div>
			</div>

			<!-- Columna Derecha: Tarjeta del Formulario -->
			<div class="col-12 col-lg-5">
				<div class="card cue-card shadow-lg border-0 p-4 p-sm-5 bg-white rounded-4">
					<div class="text-center mb-4">
						<div class="brand-avatar mx-auto mb-3 shadow-sm d-flex align-items-center justify-content-center text-white fs-2 rounded-4">
							🌱
						</div>
						<h2 class="h4 fw-bold text-dark mb-1">Iniciar Sesión</h2>
						<p class="text-muted small mb-0">Introduce tus credenciales para acceder a tu CUE</p>
					</div>

					{#if form?.error}
						<div class="alert alert-danger py-2 px-3 small d-flex align-items-center gap-2 mb-3" role="alert">
							<i class="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
							<span>{form.error}</span>
						</div>
					{/if}

					<form method="POST" onsubmit={() => isSubmitting = true}>
						<!-- Campo Email / Usuario -->
						<div class="mb-3">
							<label for="email" class="form-label small fw-semibold text-secondary">
								Correo Electrónico del Titular
							</label>
							<div class="input-group">
								<span class="input-group-text bg-light text-muted border-end-0">
									<i class="bi bi-envelope"></i>
								</span>
								<input
									type="email"
									id="email"
									name="email"
									class="form-control border-start-0 ps-0"
									placeholder="ejemplo@explotacion.es"
									bind:value={email}
									required
									autocomplete="username"
								/>
							</div>
						</div>

						<!-- Campo Contraseña -->
						<div class="mb-4">
							<div class="d-flex justify-content-between align-items-center mb-1">
								<label for="password" class="form-label small fw-semibold text-secondary mb-0">
									Contraseña
								</label>
								<small class="text-muted" style="font-size: 0.72rem;">Cifrado SHA-512 / scrypt</small>
							</div>
							<div class="input-group">
								<span class="input-group-text bg-light text-muted border-end-0">
									<i class="bi bi-key"></i>
								</span>
								<input
									type={showPassword ? 'text' : 'password'}
									id="password"
									name="password"
									class="form-control border-start-0 border-end-0 ps-0"
									placeholder="••••••••••••"
									bind:value={password}
									required
									autocomplete="current-password"
								/>
								<button
									type="button"
									class="btn btn-outline-secondary border-start-0 bg-light text-muted"
									aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
									onclick={() => showPassword = !showPassword}
								>
									<i class="bi {showPassword ? 'bi-eye-slash' : 'bi-eye'}"></i>
								</button>
							</div>
						</div>

						<!-- Botón de Envío -->
						<button
							type="submit"
							class="btn btn-primary w-100 py-2 fw-semibold shadow-sm d-flex align-items-center justify-content-center gap-2"
							disabled={isSubmitting}
						>
							{#if isSubmitting}
								<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
								<span>Verificando credenciales...</span>
							{:else}
								<i class="bi bi-box-arrow-in-right"></i>
								<span>Acceder a la Explotación</span>
							{/if}
						</button>
					</form>

					<div class="mt-4 pt-3 border-top text-center">
						<small class="text-muted d-flex align-items-center justify-content-center gap-1" style="font-size: 0.75rem;">
							<i class="bi bi-lock-fill text-success"></i> Conexión Segura SSL &bull; Sesión HttpOnly
						</small>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.login-wrapper {
		background: radial-gradient(circle at top right, #e2e8f0 0%, #f8fafc 100%);
	}

	.brand-avatar {
		width: 64px;
		height: 64px;
		background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
	}

	.hover-preset {
		transition: all 0.15s ease;
	}

	.hover-preset:hover {
		border-color: #16a34a !important;
		background-color: rgba(22, 163, 74, 0.05) !important;
		transform: translateY(-1px);
	}
</style>
