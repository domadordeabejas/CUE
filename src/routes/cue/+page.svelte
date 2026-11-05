<script>
	/**
	 * @component CuePage
	 * Interfaz principal del Agricultor para el Cuaderno Digital de Explotación Agrícola (CUE).
	 * Permite la gestión aislada e independiente de cultivos, parcelas SIGPAC, operarios y tratamientos fitosanitarios.
	 * Svelte 5 Runes: $state, $derived, $props, $effect, onclick
	 */
	import TratamientoForm from '$lib/components/cue/TratamientoForm.svelte';
	import TratamientosList from '$lib/components/cue/TratamientosList.svelte';
	import ParcelasManager from '$lib/components/cue/ParcelasManager.svelte';
	import SiexSyncManager from '$lib/components/cue/SiexSyncManager.svelte';
	import { subscribeToTratamientosRealtime } from '$lib/supabase.js';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	let { data } = $props();

	// Estados reactivos aislados del agricultor
	let tratamientos = $state([]);
	let parcelas = $state([]);
	let usersList = $state([]);
	let showUserModal = $state(false);
	let isSavingUser = $state(false);
	let userError = $state(null);
	let userSuccess = $state(null);

	// Campos para nuevo usuario de la explotación
	let newUserName = $state('');
	let newUserApellidos = $state('');
	let newUserEmail = $state('');
	let newUserPassword = $state('');
	let newUserNif = $state('');
	let newUserTelefono = $state('');
	let newUserRol = $state('AGRICULTOR');

	// Pestaña activa sincronizada con la URL y la barra lateral
	let activeTab = $derived(page.url.searchParams.get('tab') || 'form');

	$effect(() => {
		// Sincronización reactiva con datos del SSR
		tratamientos = [...data.tratamientos];
		parcelas = [...data.parcelas];
		usersList = [...(data.users || [])];

		// Suscripción en tiempo real a Supabase filtrada
		const unsubscribe = subscribeToTratamientosRealtime((payload) => {
			if (payload.eventType === 'INSERT' && payload.new) {
				const nuevo = payload.new;
				// Garantizar aislamiento multi-tenant en tiempo real
				if (nuevo.farmer_id && nuevo.farmer_id !== data.farmerId) {
					return;
				}

				const alreadyExists = tratamientos.some(t => t.id === nuevo.id);
				if (!alreadyExists) {
					const parcela = parcelas.find(p => p.id === nuevo.parcela_id);
					const operario = data.operarios.find(o => o.id === nuevo.operario_id);
					const maquina = data.maquinas.find(m => m.id === nuevo.maquinaria_id);

					const enriched = {
						...nuevo,
						parcela_nombre: parcela ? parcela.nombre_referencia : (nuevo.parcela_nombre || 'Parcela'),
						sigpac_str: parcela ? `${parcela.provincia}/${parcela.municipio}/Pol.${parcela.poligono}/Parc.${parcela.parcela}/Rec.${parcela.recinto}` : '',
						operario_nombre: operario ? `${operario.nombre} ${operario.apellidos} (${operario.numero_ropo})` : (nuevo.operario_nombre || 'Operario'),
						maquina_nombre: maquina ? `${maquina.tipo_maquina} (${maquina.numero_roma})` : (nuevo.maquina_nombre || 'Maquinaria')
					};
					tratamientos = [enriched, ...tratamientos];
				}
			}
		});

		return () => {
			unsubscribe();
		};
	});

	function switchTab(tab) {
		goto(`?tab=${tab}&farmer_id=${data.farmerId}`, { replaceState: false, keepFocus: true });
	}

	// Manejador cuando se registra un nuevo tratamiento fitosanitario
	function handleNewTratamiento(nuevo) {
		const parcela = parcelas.find(p => p.id === nuevo.parcela_id);
		const operario = data.operarios.find(o => o.id === nuevo.operario_id);
		const maquina = data.maquinas.find(m => m.id === nuevo.maquinaria_id);

		const enriched = {
			...nuevo,
			parcela_nombre: parcela ? parcela.nombre_referencia : 'Parcela',
			sigpac_str: parcela ? `${parcela.provincia}/${parcela.municipio}/Pol.${parcela.poligono}/Parc.${parcela.parcela}/Rec.${parcela.recinto}` : '',
			operario_nombre: operario ? `${operario.nombre} ${operario.apellidos} (${operario.numero_ropo})` : 'Operario',
			maquina_nombre: maquina ? `${maquina.tipo_maquina} (${maquina.numero_roma})` : 'Maquinaria'
		};

		tratamientos = [enriched, ...tratamientos];
		switchTab('list');
	}

	function handleParcelasUpdate(updatedList) {
		parcelas = [...updatedList];
	}

	// Manejo de creación de usuarios de la explotación
	async function handleCreateUser(e) {
		e.preventDefault();
		isSavingUser = true;
		userError = null;
		userSuccess = null;
		try {
			const res = await fetch('/api/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					farmer_id: data.farmerId,
					nombre: newUserName.trim(),
					apellidos: newUserApellidos.trim(),
					email: newUserEmail.trim(),
					password_hash: newUserPassword,
					rol: newUserRol,
					nif: newUserNif.trim() || 'Sin NIF',
					telefono: newUserTelefono.trim() || '',
					is_active: 1
				})
			});
			const result = await res.json();
			if (result.success) {
				usersList = [...usersList, result.user];
				userSuccess = `Usuario ${result.user.nombre} añadido al equipo de ${data.farmer.nombre_titular} con éxito.`;
				showUserModal = false;
				newUserName = '';
				newUserApellidos = '';
				newUserEmail = '';
				newUserPassword = '';
				newUserNif = '';
				newUserTelefono = '';
			} else {
				userError = result.message || 'Error al registrar usuario.';
			}
		} catch (err) {
			userError = err.message;
		} finally {
			isSavingUser = false;
		}
	}

	// Activar / Desactivar acceso de usuario
	async function toggleUserStatus(u) {
		const newStatus = u.is_active ? 0 : 1;
		try {
			const res = await fetch('/api/users', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: u.id,
					is_active: newStatus
				})
			});
			const result = await res.json();
			if (result.success) {
				usersList = usersList.map((item) => (item.id === u.id ? { ...item, is_active: newStatus } : item));
			}
		} catch (err) {
			alert('Error al modificar estado: ' + err.message);
		}
	}
</script>

<div class="container-fluid px-3 px-md-4 py-3">
	<!-- Encabezado de la Explotación Agrícola del Agricultor -->
	<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3 pb-3 border-bottom">
		<div class="d-flex align-items-center gap-3">
			<div class="bg-success text-white rounded-3 p-3 fs-3 d-flex align-items-center justify-content-center shadow-sm" style="width: 48px; height: 48px;">
				<i class="bi bi-journal-bookmark-fill"></i>
			</div>
			<div>
				<div class="d-flex flex-wrap align-items-center gap-2">
					<h3 class="mb-0 fw-bold text-dark fs-4">{data.farmer.nombre_titular}</h3>
					<span class="badge bg-success-subtle text-success border border-success-subtle font-monospace">
						CIF/NIF: {data.farmer.cif_nif}
					</span>
					<span class="badge bg-light text-secondary border">
						{data.farmer.municipio} ({data.farmer.provincia})
					</span>
				</div>
				<p class="text-muted small mb-0">
					Cuaderno Digital de Explotación Agrícola (CUE) &bull; Gestión 100% independiente de cultivos y tratamientos
				</p>
			</div>
		</div>

		<!-- Selector Rápido de Sección Mobile-Friendly -->
		<div class="d-flex flex-wrap gap-1 bg-white p-1 rounded-3 border shadow-sm" role="navigation" aria-label="Secciones rápidas">
			<button
				type="button"
				class="btn btn-sm {activeTab === 'form' ? 'btn-success text-white' : 'btn-light text-secondary border-0'}"
				onclick={() => switchTab('form')}
			>
				<i class="bi bi-plus-circle me-1"></i> Tratamiento
			</button>
			<button
				type="button"
				class="btn btn-sm {activeTab === 'list' ? 'btn-success text-white' : 'btn-light text-secondary border-0'}"
				onclick={() => switchTab('list')}
			>
				<i class="bi bi-table me-1"></i> Cuaderno ({tratamientos.length})
			</button>
			<button
				type="button"
				class="btn btn-sm {activeTab === 'parcelas' ? 'btn-success text-white' : 'btn-light text-secondary border-0'}"
				onclick={() => switchTab('parcelas')}
			>
				<i class="bi bi-geo-alt me-1"></i> Cultivos ({parcelas.length})
			</button>
			<button
				type="button"
				class="btn btn-sm {activeTab === 'equipo' ? 'btn-success text-white' : 'btn-light text-secondary border-0'}"
				onclick={() => switchTab('equipo')}
			>
				<i class="bi bi-person-badge me-1"></i> ROPO ({data.operarios.length})
			</button>
			<button
				type="button"
				class="btn btn-sm {activeTab === 'maquinas' ? 'btn-success text-white' : 'btn-light text-secondary border-0'}"
				onclick={() => switchTab('maquinas')}
			>
				<i class="bi bi-truck me-1"></i> ROMA ({data.maquinas.length})
			</button>
			<button
				type="button"
				class="btn btn-sm {activeTab === 'siex' ? 'btn-info text-dark fw-bold' : 'btn-light text-secondary border-0'}"
				onclick={() => switchTab('siex')}
			>
				<i class="bi bi-cloud-arrow-up-fill me-1 text-primary"></i> SIEX / FEGA
			</button>
		</div>
	</div>

	<!-- Tarjetas de Resumen KPI de la Explotación -->
	<div class="row g-3 mb-4">
		<!-- Cultivos y Parcelas SIGPAC -->
		<div class="col-6 col-lg-3">
			<button
				type="button"
				class="card cue-card border-0 p-3 shadow-sm h-100 cursor-pointer text-start w-100"
				onclick={() => switchTab('parcelas')}
			>
				<div class="small text-muted mb-1 d-flex justify-content-between w-100">
					<span>Cultivos y Parcelas</span>
					<i class="bi bi-geo-alt text-success"></i>
				</div>
				<div class="d-flex align-items-baseline gap-2">
					<h4 class="fw-bold mb-0 text-dark">{parcelas.length}</h4>
					<small class="text-muted">recintos declarados</small>
				</div>
			</button>
		</div>

		<!-- Operarios ROPO -->
		<div class="col-6 col-lg-3">
			<button
				type="button"
				class="card cue-card border-0 p-3 shadow-sm h-100 cursor-pointer text-start w-100"
				onclick={() => switchTab('equipo')}
			>
				<div class="small text-muted mb-1 d-flex justify-content-between w-100">
					<span>Aplicadores ROPO</span>
					<i class="bi bi-person-badge text-primary"></i>
				</div>
				<div class="d-flex align-items-baseline gap-2">
					<h4 class="fw-bold mb-0 text-dark">
						{data.operarios.filter(o => !o.isExpired).length}
					</h4>
					<small class="text-success">vigentes</small>
					{#if data.operarios.some(o => o.isExpired)}
						<span class="badge bg-danger-subtle text-danger small">1 caducado</span>
					{/if}
				</div>
			</button>
		</div>

		<!-- Maquinaria ROMA / ITEAF -->
		<div class="col-6 col-lg-3">
			<button
				type="button"
				class="card cue-card border-0 p-3 shadow-sm h-100 cursor-pointer text-start w-100"
				onclick={() => switchTab('maquinas')}
			>
				<div class="small text-muted mb-1 d-flex justify-content-between w-100">
					<span>Maquinaria ROMA</span>
					<i class="bi bi-truck text-secondary"></i>
				</div>
				<div class="d-flex align-items-baseline gap-2">
					<h4 class="fw-bold mb-0 text-dark">
						{data.maquinas.filter(m => !m.isExpired).length}
					</h4>
					<small class="text-success">ITEAF OK</small>
					{#if data.maquinas.some(m => m.isExpired)}
						<span class="badge bg-danger-subtle text-danger small">1 vencida</span>
					{/if}
				</div>
			</button>
		</div>

		<!-- Total Tratamientos Registrados -->
		<div class="col-6 col-lg-3">
			<button
				type="button"
				class="card cue-card border-0 p-3 shadow-sm h-100 cursor-pointer text-start w-100"
				onclick={() => switchTab('list')}
			>
				<div class="small text-muted mb-1 d-flex justify-content-between w-100">
					<span>Tratamientos CUE</span>
					<i class="bi bi-shield-check text-success"></i>
				</div>
				<div class="d-flex align-items-baseline gap-2">
					<h4 class="fw-bold mb-0 text-dark">{tratamientos.length}</h4>
					<small class="text-muted">firmados</small>
				</div>
			</button>
		</div>
	</div>

	<!-- CONTENIDO SEGÚN LA SECCIÓN ACTIVA -->
	{#if activeTab === 'form'}
		<div class="fade show mb-4">
			<TratamientoForm
				{parcelas}
				operarios={data.operarios}
				maquinas={data.maquinas}
				farmerId={data.farmerId}
				onSuccess={handleNewTratamiento}
			/>
		</div>
	{:else if activeTab === 'list'}
		<div class="fade show mb-4">
			<TratamientosList items={tratamientos} />
		</div>
	{:else if activeTab === 'parcelas'}
		<div class="fade show mb-4">
			<ParcelasManager
				initialParcelas={parcelas}
				farmerId={data.farmerId}
				onUpdate={handleParcelasUpdate}
			/>
		</div>
	{:else if activeTab === 'equipo'}
		<div class="fade show mb-4">
			<div class="card cue-card border-0 shadow-sm p-4">
				<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
					<div>
						<h5 class="fw-bold mb-0 d-flex align-items-center gap-2">
							<i class="bi bi-person-badge text-primary"></i> Personal Aplicador y Carnets ROPO
						</h5>
						<small class="text-muted">Registro Oficial de Productores y Operadores (RD 1311/2012) asociados a {data.farmer.nombre_titular}</small>
					</div>
					<div class="d-flex align-items-center gap-2">
						{#if data.user.rol === 'SUPERADMIN'}
							<a href="/admin?tab=users" class="btn btn-sm btn-outline-secondary">
								<i class="bi bi-shield-lock me-1"></i> Consola SuperAdmin
							</a>
						{/if}
						<button
							type="button"
							class="btn btn-sm btn-primary d-flex align-items-center gap-1 shadow-sm"
							onclick={() => { userError = null; userSuccess = null; showUserModal = true; }}
						>
							<i class="bi bi-person-plus-fill"></i> Añadir Usuario / Asesor
						</button>
					</div>
				</div>

				<div class="row g-3 mb-4">
					{#each data.operarios as op (op.id)}
						<div class="col-12 col-md-6">
							<div class="p-3 border rounded-3 bg-white shadow-sm d-flex align-items-center justify-content-between {op.isExpired ? 'border-danger' : 'border-success-subtle'}">
								<div class="d-flex align-items-center gap-3">
									<div class="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold" style="width: 44px; height: 44px; background-color: {op.isExpired ? '#dc2626' : '#16a34a'};">
										<i class="bi bi-person-fill fs-5"></i>
									</div>
									<div>
										<div class="fw-bold text-dark">{op.nombre} {op.apellidos}</div>
										<div class="small font-monospace text-muted">ROPO: {op.numero_ropo}</div>
										<div class="small mt-1">
											<span class="badge bg-primary-subtle text-primary border border-primary-subtle">
												Nivel: {op.nivel_capacitacion}
											</span>
										</div>
									</div>
								</div>

								<div class="text-end">
									{#if op.isExpired}
										<span class="badge bg-danger text-white mb-1">Carnet Caducado</span>
									{:else}
										<span class="badge bg-success-subtle text-success border border-success-subtle mb-1">Vigente</span>
									{/if}
									<div class="small text-muted font-monospace" style="font-size: 0.72rem;">
										Vence: {op.fecha_caducidad_ropo}
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>

				<div class="d-flex justify-content-between align-items-center mb-3">
					<h6 class="fw-bold text-muted text-uppercase mb-0" style="font-size: 0.75rem;">
						Usuarios con Acceso a la Explotación ({usersList.length})
					</h6>
					<button
						type="button"
						class="btn btn-sm btn-outline-primary py-0 px-2"
						style="font-size: 0.75rem;"
						onclick={() => { userError = null; userSuccess = null; showUserModal = true; }}
					>
						<i class="bi bi-plus"></i> Añadir Acceso
					</button>
				</div>

				{#if userSuccess}
					<div class="alert alert-success alert-dismissible fade show py-2 px-3 small d-flex align-items-center gap-2 mb-3" role="alert">
						<i class="bi bi-check-circle-fill fs-5"></i>
						<div class="flex-grow-1">{userSuccess}</div>
						<button type="button" class="btn-close" aria-label="Cerrar" onclick={() => userSuccess = null}></button>
					</div>
				{/if}

				<div class="row g-3">
					{#each usersList as u (u.id)}
						<div class="col-12 col-md-6">
							<div class="p-3 border rounded-3 bg-white shadow-sm d-flex align-items-center justify-content-between">
								<div class="d-flex align-items-center gap-3">
									<div class="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold" style="width: 40px; height: 40px; background-color: {u.rol === 'AGRICULTOR' ? '#16a34a' : '#0284c7'};">
										{u.nombre.charAt(0)}{u.apellidos ? u.apellidos.charAt(0) : ''}
									</div>
									<div>
										<div class="fw-semibold text-dark">{u.nombre} {u.apellidos}</div>
										<small class="text-muted font-monospace">{u.email}</small>
										<div class="text-muted" style="font-size: 0.72rem;">NIF: {u.nif || 'N/A'} {u.telefono ? `| Tel: ${u.telefono}` : ''}</div>
									</div>
								</div>
								<div class="d-flex flex-column align-items-end gap-1">
									<span class="badge {u.is_active ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'} border">
										{u.rol}
									</span>
									<button
										type="button"
										class="btn btn-link btn-sm p-0 text-decoration-none"
										style="font-size: 0.75rem;"
										onclick={() => toggleUserStatus(u)}
									>
										{u.is_active ? 'Desactivar' : 'Activar'}
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{:else if activeTab === 'maquinas'}
		<div class="fade show mb-4">
			<div class="card cue-card border-0 shadow-sm p-4">
				<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
					<div>
						<h5 class="fw-bold mb-0 d-flex align-items-center gap-2">
							<i class="bi bi-truck text-secondary"></i> Parque de Maquinaria y Equipos Fitosanitarios
						</h5>
						<small class="text-muted">Registro Oficial de Maquinaria Agrícola (ROMA) e Inspección Técnica ITEAF (RD 170/2021)</small>
					</div>
					<span class="badge bg-light text-secondary border">
						{data.maquinas.length} Equipos Registrados
					</span>
				</div>

				<div class="row g-3">
					{#each data.maquinas as m (m.id)}
						<div class="col-12 col-md-6">
							<div class="p-3 border rounded-3 bg-white shadow-sm {m.isExpired ? 'border-danger' : 'border-secondary-subtle'}">
								<div class="d-flex align-items-start justify-content-between mb-2">
									<div class="d-flex align-items-center gap-2">
										<div class="p-2 rounded bg-light text-dark">
											<i class="bi bi-truck fs-4"></i>
										</div>
										<div>
											<div class="fw-bold text-dark">{m.tipo_maquina}</div>
											<div class="text-muted small">{m.marca_modelo}</div>
										</div>
									</div>
									{#if m.isExpired}
										<span class="badge bg-danger text-white">ITEAF Vencida</span>
									{:else}
										<span class="badge bg-success-subtle text-success border border-success-subtle">ITEAF en Vigor</span>
									{/if}
								</div>

								<div class="p-2 rounded bg-light border small font-monospace d-flex justify-content-between">
									<span><strong>ROMA:</strong> {m.numero_roma}</span>
									<span><strong>Próx. ITEAF:</strong> {m.fecha_proxima_iteaf}</span>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{:else if activeTab === 'siex'}
		<div class="fade show mb-4">
			<SiexSyncManager farmerId={data.farmerId} farmer={data.farmer} />
		</div>
	{/if}
</div>

<!-- Modal para Crear / Asignar Usuario a la Explotación -->
{#if showUserModal}
	<div class="modal fade show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
		<div class="modal-dialog modal-dialog-centered">
			<div class="modal-content border-0 shadow">
				<div class="modal-header bg-success text-white py-3">
					<h5 class="modal-title fs-6 fw-bold">
						<i class="bi bi-person-plus-fill me-2"></i> Añadir Usuario al Equipo de {data.farmer.nombre_titular}
					</h5>
					<button type="button" class="btn-close btn-close-white" aria-label="Cerrar" onclick={() => showUserModal = false}></button>
				</div>
				<form onsubmit={handleCreateUser}>
					<div class="modal-body p-4">
						{#if userError}
							<div class="alert alert-danger py-2 px-3 small mb-3">
								<i class="bi bi-exclamation-triangle-fill me-1"></i> {userError}
							</div>
						{/if}

						<div class="row g-2 mb-3">
							<div class="col-6">
								<label for="new-u-name" class="form-label small fw-medium text-secondary">Nombre *</label>
								<input type="text" id="new-u-name" class="form-control form-control-sm" bind:value={newUserName} required />
							</div>
							<div class="col-6">
								<label for="new-u-ape" class="form-label small fw-medium text-secondary">Apellidos *</label>
								<input type="text" id="new-u-ape" class="form-control form-control-sm" bind:value={newUserApellidos} required />
							</div>
						</div>

						<div class="mb-3">
							<label for="new-u-email" class="form-label small fw-medium text-secondary">Correo Electrónico (Login) *</label>
							<input type="email" id="new-u-email" class="form-control form-control-sm" placeholder="usuario@finca.es" bind:value={newUserEmail} required />
						</div>

						<div class="mb-3">
							<label for="new-u-pass" class="form-label small fw-medium text-secondary">Contraseña Inicial *</label>
							<input type="password" id="new-u-pass" class="form-control form-control-sm" placeholder="Mínimo 6 caracteres" bind:value={newUserPassword} required />
						</div>

						<div class="row g-2 mb-3">
							<div class="col-6">
								<label for="new-u-nif" class="form-label small fw-medium text-secondary">DNI / NIF</label>
								<input type="text" id="new-u-nif" class="form-control form-control-sm" placeholder="12345678A" bind:value={newUserNif} />
							</div>
							<div class="col-6">
								<label for="new-u-tel" class="form-label small fw-medium text-secondary">Teléfono</label>
								<input type="tel" id="new-u-tel" class="form-control form-control-sm" placeholder="+34 600..." bind:value={newUserTelefono} />
							</div>
						</div>

						<div class="mb-2">
							<label for="new-u-rol" class="form-label small fw-medium text-secondary">Rol en la Explotación</label>
							<select id="new-u-rol" class="form-select form-select-sm" bind:value={newUserRol}>
								<option value="AGRICULTOR">Agricultor / Operario de Campo</option>
								<option value="ASESOR">Asesor Técnico Fitosanitario (GIP)</option>
							</select>
							<small class="text-muted" style="font-size: 0.72rem;">
								El usuario tendrá acceso exclusivo y aislado a los cuadernos y parcelas de <strong>{data.farmer.nombre_titular}</strong>.
							</small>
						</div>
					</div>

					<div class="modal-footer bg-light py-2">
						<button type="button" class="btn btn-sm btn-outline-secondary" onclick={() => showUserModal = false}>
							Cancelar
						</button>
						<button type="submit" class="btn btn-sm btn-success" disabled={isSavingUser}>
							{#if isSavingUser}
								<span class="spinner-border spinner-border-sm me-1"></span> Guardando...
							{:else}
								<i class="bi bi-check2 me-1"></i> Crear y Asignar Usuario
							{/if}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

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
