<script>
	/**
	 * @component Layout
	 * Layout raíz del SaaS CUE con Barra Lateral (Sidebar) Mobile-First, autenticación y Svelte 5 Runes.
	 * Svelte 5 Runes: $state, $derived, $props, {@render children()}
	 */
	import '../app.css';
	import Sidebar from '$lib/components/common/Sidebar.svelte';
	import Topbar from '$lib/components/common/Topbar.svelte';
	import { page } from '$app/state';

	let { data, children } = $props();

	// Estados reactivos de la barra lateral
	let isMobileSidebarOpen = $state(false);
	let isDesktopCollapsed = $state(false);

	// Detección de ruta de login (pantalla limpia sin sidebar)
	let isLoginPage = $derived(page.url.pathname === '/login');

	// Datos de sesión autenticada inyectados desde el servidor
	let currentUser = $derived(data?.user || null);
	let currentFarmer = $derived(data?.farmer || null);

	let currentTenant = $derived(
		currentFarmer
			? currentFarmer.nombre_titular
			: (currentUser?.rol === 'SUPERADMIN' ? 'Plataforma SaaS Global' : 'Explotación Agrícola')
	);

	let currentUserName = $derived(
		currentUser
			? `${currentUser.nombre} ${currentUser.apellidos}`
			: 'Invitado'
	);

	let currentRole = $derived(currentUser?.rol || 'INVITADO');
	let currentFarmerId = $derived(currentUser?.farmer_id || '');

	function toggleSidebar() {
		if (typeof window !== 'undefined' && window.innerWidth < 992) {
			isMobileSidebarOpen = !isMobileSidebarOpen;
		} else {
			isDesktopCollapsed = !isDesktopCollapsed;
		}
	}
</script>

{#if isLoginPage}
	<!-- Vista completa y limpia para autenticación -->
	<main>
		{@render children()}
	</main>
{:else}
	<div class="app-shell" class:desktop-collapsed={isDesktopCollapsed}>
		<!-- Backdrop sombreado para cierre táctil en móvil -->
		{#if isMobileSidebarOpen}
			<button
				type="button"
				class="sidebar-backdrop d-lg-none"
				aria-label="Cerrar barra lateral"
				onclick={() => isMobileSidebarOpen = false}
			></button>
		{/if}

		<!-- Barra Lateral (Sidebar) -->
		<Sidebar
			isOpen={isMobileSidebarOpen}
			isCollapsed={isDesktopCollapsed}
			{currentUser}
			{currentFarmer}
			{currentRole}
			{currentTenant}
			{currentFarmerId}
			{currentUserName}
			onClose={() => isMobileSidebarOpen = false}
		/>

		<!-- Área de Contenido Principal -->
		<div class="app-main d-flex flex-column min-vh-100">
			<Topbar
				onToggleSidebar={toggleSidebar}
				{currentUser}
				{currentRole}
				{currentTenant}
				{currentFarmerId}
				{currentUserName}
			/>

			<main class="flex-grow-1">
				{@render children()}
			</main>

			<!-- Footer Minimalista -->
			<footer class="bg-white border-top py-3 text-center text-muted small mt-4">
				<div class="container-fluid px-4 d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2">
					<div>
						<strong>CUE Digital SaaS</strong> &bull; Conforme al Real Decreto 1054/2022 y FEGA/SIEX (España)
					</div>
					<div class="d-flex align-items-center gap-2">
						<span class="badge bg-success-subtle text-success border">Svelte 5 Runes</span>
						<span class="badge bg-primary-subtle text-primary border">Sesión HttpOnly</span>
						<span class="badge bg-dark-subtle text-dark border">Supabase Realtime</span>
					</div>
				</div>
			</footer>
		</div>
	</div>
{/if}

<style>
	.app-shell {
		min-height: 100vh;
		display: flex;
		background-color: var(--cue-bg, #f8fafc);
	}

	.sidebar-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(15, 23, 42, 0.65);
		backdrop-filter: blur(2px);
		z-index: 1035;
		border: none;
		cursor: pointer;
		padding: 0;
		margin: 0;
		width: 100%;
		height: 100%;
	}

	.app-main {
		margin-left: 270px;
		width: calc(100% - 270px);
		min-width: 0;
		transition: margin-left 0.25s ease, width 0.25s ease;
	}

	.app-shell.desktop-collapsed .app-main {
		margin-left: 0;
		width: 100%;
	}

	.app-shell.desktop-collapsed :global(.cue-sidebar) {
		transform: translateX(-100%);
	}

	@media (max-width: 991.98px) {
		.app-main {
			margin-left: 0;
			width: 100%;
		}
	}
</style>
