<script>
	/**
	 * @component Sidebar
	 * Barra lateral modular e intuitiva para CUE Digital SaaS con soporte de autenticación real.
	 * Svelte 5 Runes: $state, $derived, $props, onclick
	 */
	import { page } from '$app/state';

	let {
		isOpen = false,
		isCollapsed = false,
		currentUser = null,
		currentFarmer = null,
		currentRole = 'AGRICULTOR',
		currentTenant = 'Agropecuaria Las Hazas S.L.',
		currentFarmerId = '',
		currentUserName = 'Antonio Pérez Moreno',
		onClose
	} = $props();

	// Detección reactiva de ruta activa
	let currentPath = $derived(page.url.pathname);
	let currentTab = $derived(page.url.searchParams.get('tab') || '');

	function isActive(path, tab = null) {
		if (path === '/' && currentPath === '/') return true;
		if (path === '/cue' && currentPath === '/cue') {
			if (!tab && (!currentTab || currentTab === 'form')) return true;
			return currentTab === tab;
		}
		if (path === '/admin' && currentPath === '/admin') {
			if (!tab && (!currentTab || currentTab === 'users')) return true;
			return currentTab === tab;
		}
		return false;
	}

	function handleLinkClick() {
		if (onClose) {
			onClose();
		}
	}
</script>

<!-- ASIDE BARRA LATERAL -->
<aside
	class="cue-sidebar d-flex flex-column"
	class:mobile-open={isOpen}
	class:collapsed={isCollapsed}
	aria-label="Menú principal de navegación"
>
	<!-- Cabecera / Marca -->
	<div class="sidebar-header d-flex align-items-center justify-content-between p-3 border-bottom border-dark-subtle">
		<a href="/" class="d-flex align-items-center gap-2 text-decoration-none" onclick={handleLinkClick}>
			<span class="brand-icon d-flex align-items-center justify-content-center text-white rounded-3 shadow-sm">
				🌱
			</span>
			<div class="d-flex flex-column lh-1 brand-text">
				<span class="text-white fw-bold fs-5 tracking-wide">CUE Digital</span>
				<span class="badge bg-success-subtle text-success border border-success-subtle mt-1" style="font-size: 0.65rem; width: fit-content;">
					RD 1054/2022 & SIEX
				</span>
			</div>
		</a>

		<!-- Botón Cerrar en Móvil -->
		<button
			type="button"
			class="btn-close btn-close-white d-lg-none"
			aria-label="Cerrar menú"
			onclick={onClose}
		></button>
	</div>

	<!-- Selector / Estado de Explotación Agrícola Activa (Tenant Card) -->
	<div class="p-3 border-bottom border-dark-subtle tenant-card-wrapper">
		<div class="tenant-card p-3 rounded-3">
			<div class="d-flex align-items-center justify-content-between mb-1">
				<small class="text-uppercase tracking-wider text-muted fw-semibold" style="font-size: 0.68rem;">
					<i class="bi bi-geo-alt-fill text-success me-1"></i> Explotación Activa
				</small>
				<span class="badge bg-success-subtle text-success border border-success-subtle" style="font-size: 0.62rem;">
					{currentRole === 'SUPERADMIN' ? 'Auditoría Global' : 'Asignada'}
				</span>
			</div>
			<div class="text-white fw-bold text-truncate" title={currentTenant} style="font-size: 0.92rem;">
				{currentTenant}
			</div>
			<div class="d-flex align-items-center gap-2 mt-1">
				<span class="badge bg-dark border border-secondary text-light font-monospace" style="font-size: 0.68rem;">
					{currentFarmer?.cif_nif ? `CIF: ${currentFarmer.cif_nif}` : (currentRole === 'SUPERADMIN' ? 'SaaS Central' : 'Titular Autenticado')}
				</span>
				{#if currentFarmer?.municipio}
					<span class="text-muted" style="font-size: 0.72rem;">
						{currentFarmer.municipio}
					</span>
				{/if}
			</div>
		</div>
	</div>

	<!-- Lista de Enlaces de Navegación Organizados -->
	<div class="sidebar-scroll flex-grow-1 py-3 px-2">
		<!-- GRUPO 1: CUADERNO DE EXPLOTACIÓN (CUE) -->
		<div class="nav-section-title px-3 mb-2 text-uppercase fw-bold text-muted" style="font-size: 0.7rem; letter-spacing: 0.05em;">
			Mi Explotación (CUE)
		</div>

		<nav class="nav flex-column gap-1 mb-4">
			<!-- 1. Nuevo Tratamiento (Acceso Destacado) -->
			<a
				href="/cue?tab=form"
				class="nav-item-link cta-item d-flex align-items-center justify-content-between px-3 py-2 rounded-3 text-decoration-none"
				class:active={isActive('/cue', 'form')}
				onclick={handleLinkClick}
			>
				<div class="d-flex align-items-center gap-2">
					<i class="bi bi-plus-circle-fill text-success fs-5"></i>
					<span class="fw-semibold">Nuevo Tratamiento</span>
				</div>
				<span class="badge bg-success text-white shadow-sm" style="font-size: 0.68rem;">+ Fitosanitario</span>
			</a>

			<!-- 2. Libro de Registro CUE -->
			<a
				href="/cue?tab=list"
				class="nav-item-link d-flex align-items-center justify-content-between px-3 py-2 rounded-3 text-decoration-none"
				class:active={isActive('/cue', 'list')}
				onclick={handleLinkClick}
			>
				<div class="d-flex align-items-center gap-2">
					<i class="bi bi-journal-text fs-5 text-secondary"></i>
					<span>Libro de Registro CUE</span>
				</div>
				<i class="bi bi-chevron-right chevron-icon"></i>
			</a>

			<!-- 3. Mis Cultivos y Parcelas SIGPAC -->
			<a
				href="/cue?tab=parcelas"
				class="nav-item-link d-flex align-items-center justify-content-between px-3 py-2 rounded-3 text-decoration-none"
				class:active={isActive('/cue', 'parcelas')}
				onclick={handleLinkClick}
			>
				<div class="d-flex align-items-center gap-2">
					<i class="bi bi-geo-alt-fill fs-5 text-warning"></i>
					<span>Cultivos y Parcelas</span>
				</div>
				<span class="badge bg-secondary-subtle text-secondary" style="font-size: 0.68rem;">SIGPAC</span>
			</a>

			<!-- 4. Personal Aplicador (ROPO) -->
			<a
				href="/cue?tab=equipo"
				class="nav-item-link d-flex align-items-center justify-content-between px-3 py-2 rounded-3 text-decoration-none"
				class:active={isActive('/cue', 'equipo')}
				onclick={handleLinkClick}
			>
				<div class="d-flex align-items-center gap-2">
					<i class="bi bi-person-badge-fill fs-5 text-info"></i>
					<span>Personal y Carnets ROPO</span>
				</div>
				<i class="bi bi-chevron-right chevron-icon"></i>
			</a>

			<!-- 5. Maquinaria y Equipos (ROMA / ITEAF) -->
			<a
				href="/cue?tab=maquinas"
				class="nav-item-link d-flex align-items-center justify-content-between px-3 py-2 rounded-3 text-decoration-none"
				class:active={isActive('/cue', 'maquinas')}
				onclick={handleLinkClick}
			>
				<div class="d-flex align-items-center gap-2">
					<i class="bi bi-truck fs-5 text-primary"></i>
					<span>Maquinaria (ROMA/ITEAF)</span>
				</div>
				<i class="bi bi-chevron-right chevron-icon"></i>
			</a>

			<!-- 6. Pasarela Oficial SIEX / FEGA -->
			<a
				href="/cue?tab=siex"
				class="nav-item-link d-flex align-items-center justify-content-between px-3 py-2 rounded-3 text-decoration-none"
				class:active={isActive('/cue', 'siex')}
				onclick={handleLinkClick}
			>
				<div class="d-flex align-items-center gap-2">
					<i class="bi bi-cloud-arrow-up-fill fs-5 text-success"></i>
					<span>Pasarela SIEX / FEGA</span>
				</div>
				<span class="badge bg-primary text-white" style="font-size: 0.65rem;">Oficial</span>
			</a>
		</nav>

		<!-- GRUPO 2: ADMINISTRACIÓN & SISTEMA (Visible para SuperAdmin) -->
		{#if currentRole === 'SUPERADMIN'}
			<div class="nav-section-title px-3 mb-2 text-uppercase fw-bold text-muted" style="font-size: 0.7rem; letter-spacing: 0.05em;">
				Administración SaaS Global
			</div>

			<nav class="nav flex-column gap-1 mb-3">
				<!-- 6. Gestión de Usuarios y Tenants -->
				<a
					href="/admin?tab=users"
					class="nav-item-link d-flex align-items-center justify-content-between px-3 py-2 rounded-3 text-decoration-none"
					class:active={isActive('/admin', 'users')}
					onclick={handleLinkClick}
				>
					<div class="d-flex align-items-center gap-2">
						<i class="bi bi-people-fill fs-5 text-primary"></i>
						<span>Usuarios y Explotaciones</span>
					</div>
					<i class="bi bi-chevron-right chevron-icon"></i>
				</a>

				<!-- 7. Consola SQL -->
				<a
					href="/admin?tab=sql"
					class="nav-item-link d-flex align-items-center justify-content-between px-3 py-2 rounded-3 text-decoration-none"
					class:active={isActive('/admin', 'sql')}
					onclick={handleLinkClick}
				>
					<div class="d-flex align-items-center gap-2">
						<i class="bi bi-terminal-fill fs-5 text-warning"></i>
						<span>Consola SQL (DDL/DML)</span>
					</div>
					<i class="bi bi-chevron-right chevron-icon"></i>
				</a>

				<!-- 8. Credenciales Base de Datos & Supabase -->
				<a
					href="/admin?tab=db"
					class="nav-item-link d-flex align-items-center justify-content-between px-3 py-2 rounded-3 text-decoration-none"
					class:active={isActive('/admin', 'db')}
					onclick={handleLinkClick}
				>
					<div class="d-flex align-items-center gap-2">
						<i class="bi bi-database-fill-gear fs-5 text-success"></i>
						<span>Base de Datos & Supabase</span>
					</div>
					<i class="bi bi-chevron-right chevron-icon"></i>
				</a>

				<!-- 9. Pasarelas SIEX y SIGPAC -->
				<a
					href="/admin?tab=apis"
					class="nav-item-link d-flex align-items-center justify-content-between px-3 py-2 rounded-3 text-decoration-none"
					class:active={isActive('/admin', 'apis')}
					onclick={handleLinkClick}
				>
					<div class="d-flex align-items-center gap-2">
						<i class="bi bi-cloud-arrow-up-fill fs-5 text-info"></i>
						<span>Pasarelas SIEX y SIGPAC</span>
					</div>
					<i class="bi bi-chevron-right chevron-icon"></i>
				</a>

				<!-- 10. Generador & Reinicio de Base de Datos -->
				<a
					href="/admin?tab=generator"
					class="nav-item-link d-flex align-items-center justify-content-between px-3 py-2 rounded-3 text-decoration-none"
					class:active={isActive('/admin', 'generator')}
					onclick={handleLinkClick}
				>
					<div class="d-flex align-items-center gap-2">
						<i class="bi bi-arrow-repeat fs-5 text-danger"></i>
						<span>Generador & Reinicio BD</span>
					</div>
					<i class="bi bi-chevron-right chevron-icon"></i>
				</a>
			</nav>
		{/if}
	</div>

	<!-- Pie de la Barra Lateral: Usuario Activo y Logout -->
	<div class="sidebar-footer p-3 border-top border-dark-subtle mt-auto">
		<div class="d-flex align-items-center justify-content-between gap-2">
			<div class="d-flex align-items-center gap-2 text-truncate">
				<div
					class="user-avatar rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
					style="background: {currentRole === 'SUPERADMIN' ? '#4f46e5' : '#16a34a'}; width: 38px; height: 38px; font-size: 0.88rem;"
				>
					{currentUserName.charAt(0)}
				</div>
				<div class="d-flex flex-column text-truncate lh-sm">
					<span class="text-white fw-semibold text-truncate" style="font-size: 0.85rem;">
						{currentUserName}
					</span>
					<span class="text-muted" style="font-size: 0.72rem;">
						{currentUser?.email || currentRole}
					</span>
				</div>
			</div>

			<!-- Botón Cerrar Sesión -->
			<a
				href="/logout"
				class="btn btn-sm btn-outline-danger p-2 border-0"
				title="Cerrar sesión segura"
				aria-label="Cerrar sesión"
			>
				<i class="bi bi-box-arrow-right fs-5"></i>
			</a>
		</div>
	</div>
</aside>

<style>
	.cue-sidebar {
		width: 270px;
		background-color: #0f172a; /* Slate 900 */
		border-right: 1px solid #1e293b;
		color: #94a3b8;
		height: 100vh;
		position: fixed;
		top: 0;
		left: 0;
		bottom: 0;
		z-index: 1040;
		transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
		display: flex;
		flex-direction: column;
	}

	.brand-icon {
		width: 36px;
		height: 36px;
		background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
		font-size: 1.25rem;
	}

	.tenant-card {
		background-color: #1e293b;
		border: 1px solid #334155;
	}

	.sidebar-scroll {
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: #334155 transparent;
	}

	.nav-item-link {
		color: #94a3b8;
		font-size: 0.88rem;
		transition: all 0.15s ease-in-out;
		border: 1px solid transparent;
	}

	.nav-item-link:hover {
		color: #ffffff;
		background-color: #1e293b;
	}

	.nav-item-link.active {
		color: #ffffff;
		background-color: #1e293b;
		border-color: #334155;
		border-left: 3px solid #22c55e;
	}

	.nav-item-link.cta-item {
		background-color: rgba(34, 197, 94, 0.08);
		border: 1px solid rgba(34, 197, 94, 0.25);
		color: #4ade80;
	}

	.nav-item-link.cta-item:hover,
	.nav-item-link.cta-item.active {
		background-color: rgba(34, 197, 94, 0.18);
		color: #ffffff;
		border-color: #22c55e;
	}

	.chevron-icon {
		font-size: 0.72rem;
		opacity: 0.5;
		transition: transform 0.15s ease;
	}

	.nav-item-link:hover .chevron-icon {
		opacity: 1;
		transform: translateX(2px);
	}

	/* Comportamiento Móvil */
	@media (max-width: 991.98px) {
		.cue-sidebar {
			transform: translateX(-100%);
			box-shadow: 4px 0 24px rgba(0, 0, 0, 0.4);
		}

		.cue-sidebar.mobile-open {
			transform: translateX(0);
		}
	}
</style>
