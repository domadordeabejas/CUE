<script>
	/**
	 * @component Navbar
	 * Barra de navegación principal responsive Mobile-First con gestión de usuarios e inquilinos multi-tenant.
	 * Svelte 5 Runes: $state, $derived, $props
	 */
	import RealtimeIndicator from './RealtimeIndicator.svelte';

	let {
		currentRole = 'AGRICULTOR',
		currentTenant = 'Agropecuaria Las Hazas S.L.',
		currentFarmerId = 'a0000000-0000-0000-0000-000000000001',
		currentUserName = 'Antonio Pérez Moreno',
		onRoleChange,
		onUserSwitch
	} = $props();

	// Lista de perfiles predefinidos para conmutación inmediata de agricultor/usuario
	const DEMO_USERS = [
		{
			id: 'u0000000-0000-0000-0000-000000000002',
			name: 'Antonio Pérez',
			farmerId: 'a0000000-0000-0000-0000-000000000001',
			farmerName: 'Agropecuaria Las Hazas S.L.',
			role: 'AGRICULTOR',
			location: 'Córdoba (Olivar / Almendro / Trigo)'
		},
		{
			id: 'u0000000-0000-0000-0000-000000000004',
			name: 'Juan Gómez',
			farmerId: 'a0000000-0000-0000-0000-000000000002',
			farmerName: 'Herederos de Juan Gómez C.B.',
			role: 'AGRICULTOR',
			location: 'Albacete (Viñedo / Cebada)'
		},
		{
			id: 'u0000000-0000-0000-0000-000000000003',
			name: 'Elena Martínez',
			farmerId: 'a0000000-0000-0000-0000-000000000001',
			farmerName: 'Cooperativa Agrícola (Asesoría)',
			role: 'ASESOR',
			location: 'Asesora Técnica GIP'
		},
		{
			id: 'u0000000-0000-0000-0000-000000000001',
			name: 'Carlos Admin',
			farmerId: null,
			farmerName: 'Plataforma SaaS Global',
			role: 'SUPERADMIN',
			location: 'Administración General'
		}
	];

	function selectUser(user) {
		if (onUserSwitch) {
			onUserSwitch(user);
		} else {
			if (user.role === 'SUPERADMIN') {
				window.location.href = '/admin';
			} else {
				window.location.href = `/cue?farmer_id=${user.farmerId}`;
			}
		}
	}
</script>

<nav class="navbar navbar-expand-lg navbar-dark bg-dark sticky-top shadow-sm py-2 px-3">
	<div class="container-fluid">
		<!-- Brand & Logo -->
		<a class="navbar-brand d-flex align-items-center gap-2 fw-bold" href="/">
			<span class="fs-4">🌱</span>
			<div class="d-flex flex-column lh-1">
				<span class="text-white fw-bold">CUE Digital</span>
				<small class="text-white-50" style="font-size: 0.72rem;">SaaS Cuaderno de Campo</small>
			</div>
		</a>

		<!-- Botón Hamburguesa Móvil -->
		<button
			class="navbar-toggler border-0"
			type="button"
			data-bs-toggle="collapse"
			data-bs-target="#navbarCueContent"
			aria-controls="navbarCueContent"
			aria-expanded="false"
			aria-label="Toggle navigation"
		>
			<span class="navbar-toggler-icon"></span>
		</button>

		<!-- Menú de Enlaces -->
		<div class="collapse navbar-collapse" id="navbarCueContent">
			<ul class="navbar-nav me-auto mb-2 mb-lg-0 ms-lg-3 gap-lg-1">
				<li class="nav-item">
					<a class="nav-link py-2 px-3 rounded text-white-50 hover-light" href="/cue{currentFarmerId ? `?farmer_id=${currentFarmerId}` : ''}">
						<i class="bi bi-journal-check me-1 text-success"></i> Mi Cuaderno CUE
					</a>
				</li>
				<li class="nav-item">
					<a class="nav-link py-2 px-3 rounded text-white-50 hover-light" href="/admin">
						<i class="bi bi-shield-lock-fill me-1 text-warning"></i> Super-Admin
					</a>
				</li>
			</ul>

			<!-- Selector de Contexto y Tenant Multi-tenant -->
			<div class="d-flex flex-wrap align-items-center gap-2 pt-2 pt-lg-0">
				<!-- Indicador Supabase Realtime -->
				<RealtimeIndicator />

				<!-- Conmutador de Usuario / Agricultor Activo -->
				<div class="dropdown">
					<button
						class="btn btn-sm btn-outline-light d-flex align-items-center gap-2 dropdown-toggle py-1 px-2"
						type="button"
						id="userDropdown"
						data-bs-toggle="dropdown"
						aria-expanded="false"
					>
						<div
							class="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold"
							style="width: 26px; height: 26px; background-color: {currentRole === 'SUPERADMIN' ? '#ea580c' : '#16a34a'}; font-size: 0.75rem;"
						>
							{currentUserName.charAt(0)}
						</div>
						<div class="text-start d-flex flex-column lh-1">
							<span class="small fw-semibold">{currentUserName}</span>
							<small class="text-white-50 text-truncate" style="font-size: 0.68rem; max-width: 140px;">
								{currentTenant}
							</small>
						</div>
					</button>

					<ul class="dropdown-menu dropdown-menu-end shadow-lg border-0 py-2" aria-labelledby="userDropdown" style="min-width: 290px;">
						<li class="dropdown-header small text-uppercase text-secondary fw-bold px-3 pb-1">
							<i class="bi bi-arrow-repeat me-1"></i> Cambiar Agricultor / Sesión
						</li>
						{#each DEMO_USERS as u (u.id)}
							<li>
								<button
									type="button"
									class="dropdown-item d-flex align-items-center justify-content-between py-2 px-3 {currentFarmerId === u.farmerId || (currentRole === 'SUPERADMIN' && u.role === 'SUPERADMIN') ? 'active bg-success text-white' : ''}"
									onclick={() => selectUser(u)}
								>
									<div>
										<div class="fw-bold small">{u.name}</div>
										<small class="d-block {currentFarmerId === u.farmerId ? 'text-white-50' : 'text-muted'}" style="font-size: 0.75rem;">
											{u.farmerName}
										</small>
									</div>
									<span class="badge {currentFarmerId === u.farmerId ? 'bg-white text-dark' : 'bg-light text-secondary'} border small">
										{u.role}
									</span>
								</button>
							</li>
						{/each}
						<li><hr class="dropdown-divider"></li>
						<li>
							<a class="dropdown-item small text-primary" href="/admin">
								<i class="bi bi-person-gear me-1"></i> Gestionar Todos los Usuarios y Explotaciones
							</a>
						</li>
					</ul>
				</div>
			</div>
		</div>
	</div>
</nav>

<style>
	.hover-light:hover {
		color: #ffffff !important;
		background-color: rgba(255, 255, 255, 0.1);
	}
</style>
