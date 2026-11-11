<script>
	/**
	 * @component UserManager
	 * Gestor modular de Usuarios e Inquilinos (Multi-tenant) para el SuperAdmin.
	 * Permite crear agricultores/explotaciones independientes, asignar roles y usuarios.
	 * Svelte 5 Runes: $state, $derived, $props, $effect, onsubmit, onclick
	 */
	let { initialFarmers = [], initialUsers = [], onRefresh } = $props();

	// Estados reactivos con Runes
	let farmers = $state([]);
	let users = $state([]);
	let selectedFarmerFilter = $state('ALL'); // 'ALL' o farmerId
	let activeSubTab = $state('users'); // 'users' | 'farmers'

	// Modales y formularios
	let showFarmerModal = $state(false);
	let showUserModal = $state(false);
	let feedbackMessage = $state(null); // { success: boolean, text: string }

	// Formulario Nuevo Agricultor
	let newFarmer = $state({
		nombre_titular: '',
		cif_nif: '',
		email_contacto: '',
		telefono: '',
		municipio: '',
		provincia: '',
		codigo_rea: '',
		admin_nombre: '',
		admin_apellidos: '',
		admin_email: ''
	});

	// Formulario Nuevo Usuario
	let newUser = $state({
		nombre: '',
		apellidos: '',
		email: '',
		rol: 'AGRICULTOR',
		farmer_id: '',
		nif: '',
		telefono: ''
	});

	$effect(() => {
		farmers = [...initialFarmers];
		users = [...initialUsers];
	});

	// Usuarios filtrados por inquilino derivado
	let filteredUsers = $derived.by(() => {
		if (selectedFarmerFilter === 'ALL') return users;
		return users.filter(u => u.farmer_id === selectedFarmerFilter);
	});

	// Cargar datos actualizados desde la API
	async function reloadData() {
		try {
			const [resF, resU] = await Promise.all([
				fetch('/api/farmers'),
				fetch('/api/users')
			]);
			const [dataF, dataU] = await Promise.all([resF.json(), resU.json()]);
			if (dataF.success) farmers = dataF.farmers;
			if (dataU.success) users = dataU.users;
			if (onRefresh) onRefresh();
		} catch (err) {
			console.error('Error reloading users/farmers:', err);
		}
	}

	// Crear Nuevo Agricultor / Explotación
	async function handleCreateFarmer(e) {
		e.preventDefault();
		try {
			const res = await fetch('/api/farmers', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(newFarmer)
			});
			const data = await res.json();
			if (data.success) {
				feedbackMessage = { success: true, text: data.message };
				showFarmerModal = false;
				newFarmer = {
					nombre_titular: '',
					cif_nif: '',
					email_contacto: '',
					telefono: '',
					municipio: '',
					provincia: '',
					codigo_rea: '',
					admin_nombre: '',
					admin_apellidos: '',
					admin_email: ''
				};
				await reloadData();
			} else {
				feedbackMessage = { success: false, text: data.message };
			}
		} catch (err) {
			feedbackMessage = { success: false, text: err.message };
		}
	}

	// Crear Nuevo Usuario
	async function handleCreateUser(e) {
		e.preventDefault();
		try {
			const res = await fetch('/api/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(newUser)
			});
			const data = await res.json();
			if (data.success) {
				feedbackMessage = { success: true, text: data.message };
				showUserModal = false;
				newUser = {
					nombre: '',
					apellidos: '',
					email: '',
					rol: 'AGRICULTOR',
					farmer_id: farmers[0]?.id || '',
					nif: '',
					telefono: ''
				};
				await reloadData();
			} else {
				feedbackMessage = { success: false, text: data.message };
			}
		} catch (err) {
			feedbackMessage = { success: false, text: err.message };
		}
	}

	// Alternar estado activo de un usuario
	async function toggleUserStatus(user) {
		try {
			const res = await fetch('/api/users', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: user.id, is_active: !user.is_active })
			});
			const data = await res.json();
			if (data.success) {
				user.is_active = !user.is_active;
				feedbackMessage = { success: true, text: `Estado de ${user.nombre} actualizado.` };
			}
		} catch (err) {
			feedbackMessage = { success: false, text: err.message };
		}
	}

	// Eliminar usuario
	async function handleDeleteUser(user) {
		if (!confirm(`¿Deseas eliminar al usuario ${user.nombre} ${user.apellidos}?`)) return;
		try {
			const res = await fetch(`/api/users?id=${user.id}`, { method: 'DELETE' });
			const data = await res.json();
			if (data.success) {
				users = users.filter(u => u.id !== user.id);
				feedbackMessage = { success: true, text: data.message };
			}
		} catch (err) {
			feedbackMessage = { success: false, text: err.message };
		}
	}
</script>

<div class="card cue-card shadow-sm border-0">
	<div class="card-header bg-white py-3 border-bottom d-flex flex-wrap align-items-center justify-content-between gap-2">
		<div class="d-flex align-items-center gap-2">
			<i class="bi bi-people-fill text-primary fs-5"></i>
			<div>
				<h5 class="mb-0 fw-semibold text-dark">Gestión de Usuarios e Inquilinos (Multi-tenant)</h5>
				<small class="text-muted">Aislamiento de accesos por titular agrícola, roles y asesores técnicos</small>
			</div>
		</div>

		<!-- Botones de Acción -->
		<div class="d-flex gap-2">
			<button
				type="button"
				class="btn btn-sm btn-outline-success"
				onclick={() => showFarmerModal = true}
			>
				<i class="bi bi-building-add"></i> Nueva Explotación
			</button>
			<button
				type="button"
				class="btn btn-sm btn-primary"
				onclick={() => {
					newUser.farmer_id = farmers[0]?.id || '';
					showUserModal = true;
				}}
			>
				<i class="bi bi-person-plus-fill"></i> Nuevo Usuario
			</button>
		</div>
	</div>

	<div class="card-body p-3 p-md-4">
		{#if feedbackMessage}
			<div class="alert {feedbackMessage.success ? 'alert-success' : 'alert-danger'} alert-dismissible fade show d-flex align-items-center gap-2 py-2 small" role="alert">
				<i class="bi {feedbackMessage.success ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} fs-5"></i>
				<div class="flex-grow-1">{feedbackMessage.text}</div>
				<button type="button" class="btn-close" aria-label="Cerrar" onclick={() => feedbackMessage = null}></button>
			</div>
		{/if}

		<!-- Sub-navegación entre Usuarios y Explotaciones -->
		<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 pb-2 border-bottom">
			<ul class="nav nav-tabs border-0 gap-1">
				<li class="nav-item">
					<button
						class="nav-link {activeSubTab === 'users' ? 'active fw-bold' : 'text-secondary'}"
						onclick={() => activeSubTab = 'users'}
					>
						<i class="bi bi-person-vcard me-1"></i> Usuarios del Sistema ({filteredUsers.length})
					</button>
				</li>
				<li class="nav-item">
					<button
						class="nav-link {activeSubTab === 'farmers' ? 'active fw-bold' : 'text-secondary'}"
						onclick={() => activeSubTab = 'farmers'}
					>
						<i class="bi bi-buildings me-1"></i> Explotaciones / Inquilinos ({farmers.length})
					</button>
				</li>
			</ul>

			{#if activeSubTab === 'users'}
				<!-- Filtro por Inquilino -->
				<div class="d-flex align-items-center gap-2">
					<label for="filter-farmer" class="small text-muted mb-0 text-nowrap">Filtrar por Explotación:</label>
					<select
						id="filter-farmer"
						class="form-select form-select-sm"
						style="max-width: 250px;"
						bind:value={selectedFarmerFilter}
					>
						<option value="ALL">Todas las Explotaciones</option>
						{#each farmers as f (f.id)}
							<option value={f.id}>{f.nombre_titular}</option>
						{/each}
					</select>
				</div>
			{/if}
		</div>

		<!-- VISTA 1: TABLA DE USUARIOS -->
		{#if activeSubTab === 'users'}
			<div class="table-responsive">
				<table class="table table-hover align-middle mb-0" style="font-size: 0.88rem;">
					<thead class="table-light">
						<tr>
							<th scope="col" class="ps-3">Usuario</th>
							<th scope="col">Rol</th>
							<th scope="col">Explotación Agrícola Asignada</th>
							<th scope="col">NIF / Contacto</th>
							<th scope="col">Estado</th>
							<th scope="col" class="text-end pe-3">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredUsers as u (u.id)}
							<tr>
								<!-- Nombre y Email -->
								<td class="ps-3">
									<div class="d-flex align-items-center gap-2">
										<div class="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold shadow-sm" style="width: 34px; height: 34px; background-color: {u.rol === 'SUPERADMIN' ? '#1f2937' : (u.rol === 'AGRICULTOR' ? '#1b5e20' : '#0284c7')}; font-size: 0.8rem;">
											{u.nombre.charAt(0)}{u.apellidos.charAt(0)}
										</div>
										<div>
											<div class="fw-bold text-dark">{u.nombre} {u.apellidos}</div>
											<small class="text-muted">{u.email}</small>
										</div>
									</div>
								</td>

								<!-- Rol -->
								<td>
									{#if u.rol === 'SUPERADMIN'}
										<span class="badge bg-dark px-2 py-1"><i class="bi bi-shield-fill me-1"></i> SuperAdmin</span>
									{:else if u.rol === 'AGRICULTOR'}
										<span class="badge bg-success px-2 py-1"><i class="bi bi-person-fill me-1"></i> Agricultor Titular</span>
									{:else}
										<span class="badge bg-info text-dark px-2 py-1"><i class="bi bi-mortarboard-fill me-1"></i> Asesor GIP</span>
									{/if}
								</td>

								<!-- Explotación -->
								<td>
									<div class="text-truncate" style="max-width: 220px;" title={u.farmer_nombre}>
										<i class="bi bi-building text-secondary me-1"></i>
										<span class="fw-medium">{u.farmer_nombre}</span>
									</div>
								</td>

								<!-- NIF y Teléfono -->
								<td>
									<div><span class="font-monospace small fw-semibold">{u.nif}</span></div>
									<small class="text-muted">{u.telefono || 'Sin teléfono'}</small>
								</td>

								<!-- Estado -->
								<td>
									<button
										type="button"
										class="btn btn-sm py-0 px-2 {u.is_active ? 'btn-outline-success' : 'btn-outline-secondary'}"
										onclick={() => toggleUserStatus(u)}
									>
										{#if u.is_active}
											<i class="bi bi-check-circle-fill me-1"></i> Activo
										{:else}
											<i class="bi bi-dash-circle me-1"></i> Inactivo
										{/if}
									</button>
								</td>

								<!-- Acciones -->
								<td class="text-end pe-3">
									{#if u.rol !== 'SUPERADMIN'}
										<button
											type="button"
											class="btn btn-sm btn-outline-danger py-1 px-2"
											title="Eliminar usuario"
											onclick={() => handleDeleteUser(u)}
										>
											<i class="bi bi-trash"></i>
										</button>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}

		<!-- VISTA 2: TABLA DE INQUILINOS / EXPLOTACIONES -->
		{#if activeSubTab === 'farmers'}
			<div class="table-responsive">
				<table class="table table-hover align-middle mb-0" style="font-size: 0.88rem;">
					<thead class="table-light">
						<tr>
							<th scope="col" class="ps-3">Explotación / Titular</th>
							<th scope="col">CIF / NIF</th>
							<th scope="col">Sede / Ubicación</th>
							<th scope="col" class="text-center">Cultivos / Parcelas</th>
							<th scope="col" class="text-center">Usuarios Asignados</th>
							<th scope="col" class="text-center">Tratamientos CUE</th>
							<th scope="col">Estado</th>
						</tr>
					</thead>
					<tbody>
						{#each farmers as f (f.id)}
							<tr>
								<td class="ps-3">
									<div class="fw-bold text-dark">{f.nombre_titular}</div>
									<small class="text-muted font-monospace">{f.email_contacto}</small>
								</td>
								<td>
									<span class="font-monospace fw-semibold badge bg-light text-dark border">{f.cif_nif}</span>
								</td>
								<td>
									<div>{f.municipio} ({f.provincia})</div>
									<small class="text-muted">{f.telefono || ''}</small>
								</td>
								<td class="text-center">
									<span class="badge bg-success-subtle text-success border">
										{f.parcelasCount ?? 0} recintos
									</span>
								</td>
								<td class="text-center">
									<span class="badge bg-primary-subtle text-primary border">
										{f.usersCount ?? 0} usuarios
									</span>
								</td>
								<td class="text-center">
									<span class="badge bg-dark-subtle text-dark border">
										{f.tratCount ?? 0} registros
									</span>
								</td>
								<td>
									<span class="badge bg-success text-white px-2 py-1">
										{f.estado}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

<!-- MODAL: REGISTRAR NUEVA EXPLOTACIÓN (TENANT) -->
{#if showFarmerModal}
	<div class="modal d-block bg-dark bg-opacity-50" tabindex="-1" role="dialog">
		<div class="modal-dialog modal-lg modal-dialog-centered" role="document">
			<div class="modal-content border-0 shadow">
				<div class="modal-header bg-success text-white">
					<h5 class="modal-title fw-bold">
						<i class="bi bi-building-add me-2"></i> Alta de Nueva Explotación Agrícola (Tenant)
					</h5>
					<button type="button" class="btn-close btn-close-white" aria-label="Cerrar" onclick={() => showFarmerModal = false}></button>
				</div>
				<form onsubmit={handleCreateFarmer}>
					<div class="modal-body p-4">
						<p class="text-muted small mb-3">
							Crea un nuevo inquilino agrícola con espacio de trabajo 100% aislado. Podrá gestionar sus parcelas, ROPO y CUE de forma independiente.
						</p>

						<h6 class="text-success fw-bold small text-uppercase mb-2">1. Datos Fiscales de la Explotación</h6>
						<div class="row g-2 mb-3">
							<div class="col-12 col-md-8">
								<label for="f-nombre" class="form-label small text-secondary mb-1">Nombre o Razón Social</label>
								<input type="text" id="f-nombre" class="form-control form-control-sm" placeholder="ej: Finca Los Olivos S.L." bind:value={newFarmer.nombre_titular} required />
							</div>
							<div class="col-12 col-md-4">
								<label for="f-cif" class="form-label small text-secondary mb-1">CIF / NIF</label>
								<input type="text" id="f-cif" class="form-control form-control-sm font-monospace" placeholder="B12345678" bind:value={newFarmer.cif_nif} required />
							</div>
							<div class="col-12 col-md-6">
								<label for="f-email" class="form-label small text-secondary mb-1">Email de Contacto</label>
								<input type="email" id="f-email" class="form-control form-control-sm" placeholder="contacto@finca.es" bind:value={newFarmer.email_contacto} required />
							</div>
							<div class="col-12 col-md-6">
								<label for="f-tel" class="form-label small text-secondary mb-1">Teléfono</label>
								<input type="tel" id="f-tel" class="form-control form-control-sm" placeholder="+34 600..." bind:value={newFarmer.telefono} />
							</div>
							<div class="col-12 col-md-6">
								<label for="f-mun" class="form-label small text-secondary mb-1">Municipio</label>
								<input type="text" id="f-mun" class="form-control form-control-sm" placeholder="Municipio" bind:value={newFarmer.municipio} />
							</div>
							<div class="col-12 col-md-6">
								<label for="f-prov" class="form-label small text-secondary mb-1">Provincia</label>
								<input type="text" id="f-prov" class="form-control form-control-sm" placeholder="Provincia" bind:value={newFarmer.provincia} />
							</div>
							<div class="col-12">
								<label for="f-rea" class="form-label small text-secondary mb-1">Código REA (Opcional)</label>
								<input type="text" id="f-rea" class="form-control form-control-sm font-monospace" placeholder="ES..." bind:value={newFarmer.codigo_rea} />
							</div>
						</div>

						<h6 class="text-success fw-bold small text-uppercase mb-2 pt-2 border-top">2. Usuario Titular Administrador</h6>
						<div class="row g-2">
							<div class="col-12 col-md-6">
								<label for="f-adm-nom" class="form-label small text-secondary mb-1">Nombre</label>
								<input type="text" id="f-adm-nom" class="form-control form-control-sm" placeholder="Nombre" bind:value={newFarmer.admin_nombre} />
							</div>
							<div class="col-12 col-md-6">
								<label for="f-adm-ape" class="form-label small text-secondary mb-1">Apellidos</label>
								<input type="text" id="f-adm-ape" class="form-control form-control-sm" placeholder="Apellidos" bind:value={newFarmer.admin_apellidos} />
							</div>
							<div class="col-12">
								<label for="f-adm-em" class="form-label small text-secondary mb-1">Email de Acceso al CUE</label>
								<input type="email" id="f-adm-em" class="form-control form-control-sm" placeholder="email@usuario.es" bind:value={newFarmer.admin_email} />
							</div>
						</div>
					</div>
					<div class="modal-footer bg-light">
						<button type="button" class="btn btn-outline-secondary" onclick={() => showFarmerModal = false}>Cancelar</button>
						<button type="submit" class="btn btn-success"><i class="bi bi-check2-circle"></i> Registrar Explotación</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

<!-- MODAL: CREAR NUEVO USUARIO -->
{#if showUserModal}
	<div class="modal d-block bg-dark bg-opacity-50" tabindex="-1" role="dialog">
		<div class="modal-dialog modal-dialog-centered" role="document">
			<div class="modal-content border-0 shadow">
				<div class="modal-header bg-primary text-white">
					<h5 class="modal-title fw-bold">
						<i class="bi bi-person-plus-fill me-2"></i> Alta de Usuario en el Sistema
					</h5>
					<button type="button" class="btn-close btn-close-white" aria-label="Cerrar" onclick={() => showUserModal = false}></button>
				</div>
				<form onsubmit={handleCreateUser}>
					<div class="modal-body p-4">
						<div class="row g-2 mb-3">
							<div class="col-12 col-md-6">
								<label for="u-nom" class="form-label small text-secondary mb-1">Nombre</label>
								<input type="text" id="u-nom" class="form-control" placeholder="Nombre" bind:value={newUser.nombre} required />
							</div>
							<div class="col-12 col-md-6">
								<label for="u-ape" class="form-label small text-secondary mb-1">Apellidos</label>
								<input type="text" id="u-ape" class="form-control" placeholder="Apellidos" bind:value={newUser.apellidos} required />
							</div>
							<div class="col-12">
								<label for="u-email" class="form-label small text-secondary mb-1">Correo Electrónico</label>
								<input type="email" id="u-email" class="form-control" placeholder="email@dominio.com" bind:value={newUser.email} required />
							</div>
							<div class="col-12 col-md-6">
								<label for="u-rol" class="form-label small text-secondary mb-1">Rol de Acceso</label>
								<select id="u-rol" class="form-select" bind:value={newUser.rol}>
									<option value="AGRICULTOR">Agricultor (Titular / Empleado)</option>
									<option value="ASESOR">Asesor Técnico Fitosanitario</option>
									<option value="SUPERADMIN">Super-Admin (Acceso Global)</option>
								</select>
							</div>

							{#if newUser.rol !== 'SUPERADMIN'}
								<div class="col-12 col-md-6">
									<label for="u-farmer" class="form-label small text-secondary mb-1">Asignar a Explotación</label>
									<select id="u-farmer" class="form-select" bind:value={newUser.farmer_id} required>
										{#each farmers as f (f.id)}
											<option value={f.id}>{f.nombre_titular}</option>
										{/each}
									</select>
								</div>
							{/if}

							<div class="col-12 col-md-6">
								<label for="u-nif" class="form-label small text-secondary mb-1">NIF / DNI</label>
								<input type="text" id="u-nif" class="form-control" placeholder="12345678A" bind:value={newUser.nif} />
							</div>
							<div class="col-12 col-md-6">
								<label for="u-tel" class="form-label small text-secondary mb-1">Teléfono</label>
								<input type="tel" id="u-tel" class="form-control" placeholder="+34..." bind:value={newUser.telefono} />
							</div>
						</div>
					</div>
					<div class="modal-footer bg-light">
						<button type="button" class="btn btn-outline-secondary" onclick={() => showUserModal = false}>Cancelar</button>
						<button type="submit" class="btn btn-primary"><i class="bi bi-person-check-fill"></i> Crear Usuario</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
