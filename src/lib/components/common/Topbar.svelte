<script>
	/**
	 * @component Topbar
	 * Barra superior contextual y limpia para CUE Digital SaaS con estado de sesión.
	 * Svelte 5 Runes: $derived, $props, onclick
	 */
	import { page } from '$app/state';
	import RealtimeIndicator from './RealtimeIndicator.svelte';

	let {
		onToggleSidebar,
		currentUser = null,
		currentRole = 'AGRICULTOR',
		currentTenant = 'Agropecuaria Las Hazas S.L.',
		currentFarmerId = '',
		currentUserName = 'Antonio Pérez Moreno'
	} = $props();

	// Título y breadcrumb contextual dinámico
	let sectionMeta = $derived.by(() => {
		const path = page.url.pathname;
		const tab = page.url.searchParams.get('tab') || '';

		if (path === '/') {
			return {
				category: 'Inicio',
				title: 'Portal de Explotaciones Agrícolas',
				icon: 'bi-house-door-fill text-success'
			};
		}

		if (path === '/cue') {
			switch (tab) {
				case 'list':
					return {
						category: 'Mi Explotación',
						title: 'Libro de Registro Oficial CUE',
						icon: 'bi-journal-check text-success'
					};
				case 'parcelas':
					return {
						category: 'Mi Explotación',
						title: 'Mis Cultivos y Parcelas SIGPAC',
						icon: 'bi-geo-alt-fill text-warning'
					};
				case 'equipo':
					return {
						category: 'Mi Explotación',
						title: 'Personal Aplicador (Carnets ROPO)',
						icon: 'bi-person-badge-fill text-info'
					};
				case 'maquinas':
					return {
						category: 'Mi Explotación',
						title: 'Maquinaria y Equipos (ROMA / ITEAF)',
						icon: 'bi-truck text-primary'
					};
				case 'form':
				default:
					return {
						category: 'Mi Explotación',
						title: 'Nuevo Tratamiento Fitosanitario',
						icon: 'bi-plus-circle-fill text-success'
					};
			}
		}

		if (path === '/admin') {
			switch (tab) {
				case 'sql':
					return {
						category: 'Super-Admin',
						title: 'Consola de Ejecución SQL (DDL/DML)',
						icon: 'bi-terminal-fill text-warning'
					};
				case 'db':
					return {
						category: 'Super-Admin',
						title: 'Configuración de Base de Datos & Supabase',
						icon: 'bi-database-fill-gear text-success'
					};
				case 'apis':
					return {
						category: 'Super-Admin',
						title: 'Pasarelas Oficiales (SIEX / SIGPAC)',
						icon: 'bi-cloud-arrow-up-fill text-info'
					};
				case 'users':
				default:
					return {
						category: 'Super-Admin',
						title: 'Gestión de Usuarios y Explotaciones (Tenants)',
						icon: 'bi-people-fill text-primary'
					};
			}
		}

		return {
			category: 'CUE Digital',
			title: 'Cuaderno Digital de Explotación',
			icon: 'bi-journal-bookmark-fill text-success'
		};
	});
</script>

<header class="cue-topbar bg-white border-bottom sticky-top px-3 py-2 px-md-4 shadow-sm">
	<div class="d-flex align-items-center justify-content-between gap-3">
		<!-- Izquierda: Botón Hamburguesa + Breadcrumb / Título Contextual -->
		<div class="d-flex align-items-center gap-2 gap-md-3">
			<button
				type="button"
				class="btn btn-sm btn-light border d-flex align-items-center justify-content-center p-2"
				style="width: 38px; height: 38px;"
				aria-label="Alternar menú lateral"
				onclick={onToggleSidebar}
			>
				<i class="bi bi-list fs-5 text-dark"></i>
			</button>

			<div class="d-flex flex-column lh-sm">
				<div class="d-flex align-items-center gap-2">
					<small class="text-muted fw-semibold text-uppercase" style="font-size: 0.68rem; letter-spacing: 0.04em;">
						{sectionMeta.category}
					</small>
					<span class="text-muted" style="font-size: 0.7rem;">&rsaquo;</span>
					<span class="badge bg-success-subtle text-success border border-success-subtle d-none d-sm-inline-block" style="font-size: 0.65rem;">
						{currentTenant}
					</span>
				</div>
				<h1 class="h6 fw-bold mb-0 text-dark d-flex align-items-center gap-2 text-truncate" style="font-size: 1rem;">
					<i class="bi {sectionMeta.icon}"></i>
					<span class="text-truncate">{sectionMeta.title}</span>
				</h1>
			</div>
		</div>

		<!-- Derecha: Acciones Rápidas, Realtime & Perfil -->
		<div class="d-flex align-items-center gap-2 gap-md-3">
			<!-- Indicador en Vivo Supabase Realtime -->
			<RealtimeIndicator />

			<!-- Botón Acción Rápida: + Tratamiento (visible para agricultor o asesor) -->
			{#if currentRole !== 'SUPERADMIN' && currentUser}
				<a
					href="/cue?tab=form"
					class="btn btn-sm btn-success d-none d-sm-inline-flex align-items-center gap-1 shadow-sm px-3"
				>
					<i class="bi bi-plus-lg"></i>
					<span>Tratamiento</span>
				</a>
			{/if}

			<!-- Explotación / Usuario Badge y Logout -->
			{#if currentUser}
				<div class="d-flex align-items-center gap-2 ps-2 border-start">
					<div
						class="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold shadow-sm"
						style="background: {currentRole === 'SUPERADMIN' ? '#4f46e5' : '#16a34a'}; width: 34px; height: 34px; font-size: 0.8rem;"
						title="{currentUserName} ({currentRole})"
					>
						{currentUserName.charAt(0)}
					</div>
					<div class="d-none d-md-flex flex-column lh-1">
						<span class="fw-bold text-dark text-truncate" style="max-width: 130px; font-size: 0.82rem;">
							{currentUserName}
						</span>
						<span class="text-muted" style="font-size: 0.7rem;">
							{currentRole}
						</span>
					</div>

					<!-- Enlace Cerrar Sesión -->
					<a
						href="/logout"
						class="btn btn-sm btn-outline-secondary p-1 border-0 text-danger ms-1"
						title="Cerrar sesión"
						aria-label="Cerrar sesión"
					>
						<i class="bi bi-box-arrow-right fs-5"></i>
					</a>
				</div>
			{:else}
				<a href="/login" class="btn btn-sm btn-primary">
					<i class="bi bi-box-arrow-in-right me-1"></i> Iniciar Sesión
				</a>
			{/if}
		</div>
	</div>
</header>

<style>
	.cue-topbar {
		z-index: 1030;
		min-height: 60px;
	}
</style>
