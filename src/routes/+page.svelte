<script>
	/**
	 * @component LandingPage
	 * Portal principal de bienvenida y arquitectura del SaaS CUE Digital.
	 * Svelte 5 Runes: $props
	 */
	let { data } = $props();
</script>

<div class="container py-4 py-md-5">
	<!-- Hero Section Mobile-First -->
	<div class="row align-items-center mb-5 g-4">
		<div class="col-12 col-lg-7">
			<div class="badge bg-success-subtle text-success border border-success-subtle mb-3 px-3 py-2 fw-semibold">
				<i class="bi bi-patch-check-fill me-1"></i> Cumplimiento Oficial RD 1054/2022 & SIEX
			</div>
			<h1 class="display-5 fw-bold text-dark lh-sm mb-3">
				Plataforma SaaS Multi-tenant para el <span class="text-success">Cuaderno Digital de Explotación Agrícola</span> (CUE)
			</h1>
			<p class="lead text-secondary mb-4">
				Gestión integral, trazable y automatizada de parcelas SIGPAC, operarios certificados en ROPO, maquinaria inscrita en ROMA e inspecciones técnicas ITEAF en vigor.
			</p>

			<div class="d-flex flex-wrap gap-2">
				{#if data?.user}
					<a href="/cue" class="btn btn-primary btn-lg">
						<i class="bi bi-journal-plus"></i> Continuar al Cuaderno ({data.user.nombre})
					</a>
					{#if data.user.rol === 'SUPERADMIN'}
						<a href="/admin" class="btn btn-outline-dark btn-lg">
							<i class="bi bi-shield-lock"></i> Consola Super-Admin
						</a>
					{/if}
					<a href="/logout" class="btn btn-outline-danger btn-lg">
						<i class="bi bi-box-arrow-right"></i> Salir
					</a>
				{:else}
					<a href="/login" class="btn btn-primary btn-lg shadow-sm">
						<i class="bi bi-box-arrow-in-right"></i> Iniciar Sesión con Usuario y Contraseña
					</a>
					<a href="/login" class="btn btn-outline-secondary btn-lg">
						<i class="bi bi-info-circle"></i> Ver Cuentas Demo
					</a>
				{/if}
			</div>
		</div>

		<div class="col-12 col-lg-5">
			<div class="card cue-card shadow-sm border-0 p-4 bg-white">
				<h5 class="fw-bold mb-3 d-flex align-items-center gap-2">
					<i class="bi bi-layers-fill text-success"></i> Arquitectura del MVP
				</h5>
				<ul class="list-unstyled mb-0 d-flex flex-column gap-3 small">
					<li class="d-flex align-items-start gap-2">
						<i class="bi bi-check-circle-fill text-success fs-5"></i>
						<div>
							<strong>Frontend Svelte 5 Nativo:</strong>
							<div class="text-muted">Uso exclusivo de Runes ($state, $derived, $props, onclick) sin dependencias obsoletas.</div>
						</div>
					</li>
					<li class="d-flex align-items-start gap-2">
						<i class="bi bi-check-circle-fill text-success fs-5"></i>
						<div>
							<strong>Aislamiento Multi-tenant:</strong>
							<div class="text-muted">Particionamiento estricto por <code>farmer_id</code> y borrado en cascada (ON DELETE CASCADE).</div>
						</div>
					</li>
					<li class="d-flex align-items-start gap-2">
						<i class="bi bi-check-circle-fill text-success fs-5"></i>
						<div>
							<strong>Validación Reactiva ROPO & ROMA:</strong>
							<div class="text-muted">Bloqueo automático si el carnet de aplicador o la inspección ITEAF están vencidos.</div>
						</div>
					</li>
					<li class="d-flex align-items-start gap-2">
						<i class="bi bi-check-circle-fill text-success fs-5"></i>
						<div>
							<strong>Super-Admin Global:</strong>
							<div class="text-muted">Gestores modulares para credenciales SQL, endpoints SIEX/SIGPAC y consola DDL/DML.</div>
						</div>
					</li>
				</ul>
			</div>
		</div>
	</div>

	<!-- Tarjetas de Acceso a Módulos -->
	<div class="row g-4">
		<!-- Módulo Agricultor -->
		<div class="col-12 col-md-6">
			<div class="card cue-card h-100 p-4 border-0 shadow-sm">
				<div class="d-flex align-items-center gap-3 mb-3">
					<div class="bg-success text-white rounded-3 p-3 fs-3 d-flex align-items-center justify-content-center" style="width: 56px; height: 56px;">
						<i class="bi bi-tree"></i>
					</div>
					<div>
						<h4 class="fw-bold mb-0">Módulo del Agricultor</h4>
						<small class="text-muted">Gestión de Campo y Fitosanitarios</small>
					</div>
				</div>
				<p class="text-secondary small mb-4">
					Registra tratamientos fitosanitarios con validación en tiempo real. Selectores interactivos para recintos SIGPAC, operarios con carnet ROPO no caducado y equipos ROMA con ITEAF en vigor.
				</p>
				<div class="mt-auto">
					<a href="/cue" class="btn btn-outline-success w-100">
						Entrar al Cuaderno CUE <i class="bi bi-arrow-right ms-1"></i>
					</a>
				</div>
			</div>
		</div>

		<!-- Módulo SuperAdmin -->
		<div class="col-12 col-md-6">
			<div class="card cue-card h-100 p-4 border-0 shadow-sm">
				<div class="d-flex align-items-center gap-3 mb-3">
					<div class="bg-dark text-white rounded-3 p-3 fs-3 d-flex align-items-center justify-content-center" style="width: 56px; height: 56px;">
						<i class="bi bi-gear-wide-connected"></i>
					</div>
					<div>
						<h4 class="fw-bold mb-0">Panel de Super-Admin</h4>
						<small class="text-muted">Infraestructura, APIs y SQL</small>
					</div>
				</div>
				<p class="text-secondary small mb-4">
					Configuración de base de datos SQL multi-tenant, gestión de endpoints del FEGA (SIEX y SIGPAC) y consola segura para ejecutar sentencias DDL/DML con auditoría de logs.
				</p>
				<div class="mt-auto">
					<a href="/admin" class="btn btn-outline-dark w-100">
						Entrar a Administración <i class="bi bi-arrow-right ms-1"></i>
					</a>
				</div>
			</div>
		</div>
	</div>
</div>
