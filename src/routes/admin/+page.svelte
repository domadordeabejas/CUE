<script>
	/**
	 * @component AdminPage
	 * Panel de Control Global para el Super-Admin del SaaS CUE.
	 * Integra los 4 gestores modulares: Usuarios/Inquilinos, BD SQL, Endpoints SIEX/SIGPAC y Consola SQL.
	 * Svelte 5 Runes: $derived, $props, onclick
	 */
	import UserManager from '$lib/components/admin/UserManager.svelte';
	import DbConfigManager from '$lib/components/admin/DbConfigManager.svelte';
	import ApiEndpointsManager from '$lib/components/admin/ApiEndpointsManager.svelte';
	import SqlRunnerManager from '$lib/components/admin/SqlRunnerManager.svelte';
	import DatabaseGenerator from '$lib/components/admin/DatabaseGenerator.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	let { data } = $props();

	// Tab activa sincronizada con la URL y la barra lateral
	let activeTab = $derived(page.url.searchParams.get('tab') || 'users');
	let consoleInitialSql = $state('');

	function switchTab(tab) {
		goto(`?tab=${tab}`, { replaceState: false, keepFocus: true });
	}

	function handleSqlExecution(result) {
		console.log('SQL Execution complete:', result);
	}

	function handleScriptLoadToConsole(script) {
		consoleInitialSql = script;
		switchTab('sql');
	}
</script>

<div class="container-fluid px-3 px-md-4 py-3">
	<!-- Encabezado de Administración -->
	<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3 pb-3 border-bottom">
		<div class="d-flex align-items-center gap-3">
			<div class="bg-dark text-white rounded-3 p-3 fs-3 d-flex align-items-center justify-content-center shadow-sm" style="width: 48px; height: 48px;">
				<i class="bi bi-shield-lock-fill"></i>
			</div>
			<div>
				<h3 class="mb-0 fw-bold text-dark fs-4">Panel de Administración Global (Super-Admin)</h3>
				<p class="text-muted small mb-0">Gestión de inquilinos agrícolas, usuarios aislados, infraestructura SQL y pasarelas oficiales</p>
			</div>
		</div>

		<!-- Badges de Estado del Sistema y Acción Rápida -->
		<div class="d-flex flex-wrap align-items-center gap-2">
			<span class="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 d-flex align-items-center gap-1">
				<i class="bi bi-circle-fill" style="font-size: 0.5rem;"></i> Supabase PostgreSQL Online
			</span>
			<span class="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 d-flex align-items-center gap-1">
				<i class="bi bi-shield-check"></i> Rol: SuperAdmin
			</span>
			<button
				type="button"
				class="btn btn-sm btn-outline-danger shadow-sm d-flex align-items-center gap-1 px-3 py-1"
				onclick={() => switchTab('generator')}
			>
				<i class="bi bi-arrow-repeat"></i> Reiniciar / Generar BD
			</button>
		</div>
	</div>

	<!-- KPIs de Infraestructura y Multi-tenant -->
	<div class="row g-3 mb-4">
		<div class="col-6 col-md-3">
			<button
				type="button"
				class="card cue-card border-0 p-3 shadow-sm h-100 cursor-pointer text-start w-100"
				onclick={() => switchTab('users')}
			>
				<div class="small text-muted mb-1 w-100">Explotaciones (Tenants)</div>
				<div class="d-flex align-items-baseline gap-2">
					<h3 class="fw-bold mb-0 text-dark">{data.farmers.length}</h3>
					<span class="badge bg-success-subtle text-success small">Aisladas</span>
				</div>
			</button>
		</div>
		<div class="col-6 col-md-3">
			<button
				type="button"
				class="card cue-card border-0 p-3 shadow-sm h-100 cursor-pointer text-start w-100"
				onclick={() => switchTab('users')}
			>
				<div class="small text-muted mb-1 w-100">Usuarios Registrados</div>
				<div class="d-flex align-items-baseline gap-2">
					<h3 class="fw-bold mb-0 text-dark">{data.users.length}</h3>
					<span class="badge bg-primary-subtle text-primary small">Activos</span>
				</div>
			</button>
		</div>
		<div class="col-6 col-md-3">
			<button
				type="button"
				class="card cue-card border-0 p-3 shadow-sm h-100 cursor-pointer text-start w-100"
				onclick={() => switchTab('apis')}
			>
				<div class="small text-muted mb-1 w-100">Estado SIEX / FEGA</div>
				<div class="d-flex align-items-baseline gap-2">
					<h3 class="fw-bold mb-0 text-success">200 OK</h3>
					<span class="badge bg-light text-dark border small">Sandbox</span>
				</div>
			</button>
		</div>
		<div class="col-6 col-md-3">
			<button
				type="button"
				class="card cue-card border-0 p-3 shadow-sm h-100 cursor-pointer text-start w-100"
				onclick={() => switchTab('apis')}
			>
				<div class="small text-muted mb-1 w-100">WFS SIGPAC</div>
				<div class="d-flex align-items-baseline gap-2">
					<h3 class="fw-bold mb-0 text-info">Activo</h3>
					<span class="badge bg-light text-dark border small">MAPA</span>
				</div>
			</button>
		</div>
	</div>

	<!-- Selector Rápido de Pestañas Modulares -->
	<div class="d-flex flex-wrap gap-2 mb-4 border-bottom pb-3">
		<button
			type="button"
			class="btn btn-sm {activeTab === 'users' ? 'btn-primary' : 'btn-outline-secondary bg-white'}"
			onclick={() => switchTab('users')}
		>
			<i class="bi bi-people-fill me-1"></i> 1. Gestión de Usuarios e Inquilinos
		</button>
		<button
			type="button"
			class="btn btn-sm {activeTab === 'sql' ? 'btn-warning text-dark' : 'btn-outline-secondary bg-white'}"
			onclick={() => switchTab('sql')}
		>
			<i class="bi bi-terminal me-1"></i> 2. Consola SQL (DDL / DML)
		</button>
		<button
			type="button"
			class="btn btn-sm {activeTab === 'db' ? 'btn-success text-white' : 'btn-outline-secondary bg-white'}"
			onclick={() => switchTab('db')}
		>
			<i class="bi bi-database me-1"></i> 3. Credenciales BD SQL & Supabase
		</button>
		<button
			type="button"
			class="btn btn-sm {activeTab === 'apis' ? 'btn-info text-white' : 'btn-outline-secondary bg-white'}"
			onclick={() => switchTab('apis')}
		>
			<i class="bi bi-cloud-arrow-up me-1"></i> 4. Endpoints APIs (SIEX / SIGPAC)
		</button>
		<button
			type="button"
			class="btn btn-sm {activeTab === 'generator' ? 'btn-danger text-white' : 'btn-outline-secondary bg-white'}"
			onclick={() => switchTab('generator')}
		>
			<i class="bi bi-arrow-repeat me-1"></i> 5. Generador & Reinicio BD
		</button>
	</div>

	<!-- Contenido de la Tab Activa -->
	<div class="tab-content">
		{#if activeTab === 'users'}
			<div class="fade show">
				<UserManager
					initialFarmers={data.farmers}
					initialUsers={data.users}
				/>
			</div>
		{:else if activeTab === 'sql'}
			<div class="fade show">
				<SqlRunnerManager initialSql={consoleInitialSql} onExecutionComplete={handleSqlExecution} />
			</div>
		{:else if activeTab === 'db'}
			<div class="fade show">
				<DbConfigManager initialConfig={data.dbConfig} />
			</div>
		{:else if activeTab === 'apis'}
			<div class="fade show">
				<ApiEndpointsManager endpoints={data.apiEndpoints} />
			</div>
		{:else if activeTab === 'generator'}
			<div class="fade show">
				<DatabaseGenerator onScriptLoadToConsole={handleScriptLoadToConsole} />
			</div>
		{/if}
	</div>
</div>

<style>
	.cursor-pointer {
		cursor: pointer;
		transition: transform 0.15s ease, box-shadow 0.15s ease;
	}
	.cursor-pointer:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 12px rgba(0, 0, 0, 0.08) !important;
	}
</style>
