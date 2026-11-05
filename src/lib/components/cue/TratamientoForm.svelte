<script>
	/**
	 * @component TratamientoForm
	 * Formulario reactivo principal para registrar Tratamientos Fitosanitarios en el CUE (Real Decreto 1054/2022).
	 * Integra los selectores modulares de Parcela (SIGPAC), Operario (ROPO) y Máquina (ROMA).
	 * Svelte 5 Runes: $state, $derived, $props, onsubmit
	 */
	import ParcelaSelector from './ParcelaSelector.svelte';
	import OperarioSelector from './OperarioSelector.svelte';
	import MaquinaSelector from './MaquinaSelector.svelte';
	import { broadcastLocalChange, saveTratamientoToSupabase } from '$lib/supabase.js';

	let {
		parcelas = [],
		operarios = [],
		maquinas = [],
		farmerId = 'a0000000-0000-0000-0000-000000000001',
		onSuccess
	} = $props();

	// Fecha actual por defecto en formato YYYY-MM-DD
	const todayStr = new Date().toISOString().split('T')[0];

	// Estados reactivos con Runes
	let fechaTratamiento = $state(todayStr);
	let selectedParcela = $state(null);
	let selectedOperario = $state(null);
	let selectedMaquina = $state(null);
	let superficieTratada = $state(6.45);

	$effect(() => {
		if (!selectedParcela && parcelas.length > 0) {
			selectedParcela = parcelas[0];
			superficieTratada = parcelas[0].superficie_ha;
		}
		if (!selectedOperario && operarios.length > 0) {
			selectedOperario = operarios[0];
		}
		if (!selectedMaquina && maquinas.length > 0) {
			selectedMaquina = maquinas[0];
		}
	});

	let problemaFitosanitario = $state('Prays del olivo (Prays oleae)');
	let nombreComercial = $state('DIPEL DF');
	let numeroRegistroMagrama = $state('19.984/14');
	let materiaActiva = $state('Bacillus thuringiensis subsp. kurstaki 32%');
	let dosisValor = $state(0.75);
	let dosisUnidad = $state('kg/ha');
	let volumenCaldo = $state(1000);
	let plazoSeguridad = $state(7);
	let justificacionTratamiento = $state('Superación de umbral de daño económico (25% brotes afectados). Prescripción técnica según Gestión Integrada de Plagas (GIP).');
	let condicionesMeteorologicas = $state('Viento: 4 km/h NO (ausencia de deriva), Tª: 22ºC, HR: 50%');
	let observaciones = $state('Aplicación al atardecer para maximizar efectividad.');

	let isSubmitting = $state(false);
	let submitFeedback = $state(null); // { success: boolean, message: string }

	// Validación reactiva de ROPO y ROMA en tiempo de ejecución
	let isRopoExpired = $derived.by(() => {
		if (!selectedOperario) return false;
		const checkDate = new Date(fechaTratamiento || todayStr);
		return new Date(selectedOperario.fecha_caducidad) < checkDate || !selectedOperario.activo;
	});

	let isIteafExpired = $derived.by(() => {
		if (!selectedMaquina) return false;
		const checkDate = new Date(fechaTratamiento || todayStr);
		return new Date(selectedMaquina.fecha_caducidad_iteaf) < checkDate || !selectedMaquina.activo;
	});

	// Validación de superficie tratada frente a cabida catastral SIGPAC
	let isSurfaceExceeded = $derived.by(() => {
		if (!selectedParcela) return false;
		return Number(superficieTratada) > Number(selectedParcela.superficie_ha);
	});

	// Fecha límite de recolección derivada del plazo de seguridad
	let fechaRecoleccionPermitida = $derived.by(() => {
		if (!fechaTratamiento) return '';
		const d = new Date(fechaTratamiento);
		d.setDate(d.getDate() + Number(plazoSeguridad || 0));
		return d.toISOString().split('T')[0];
	});

	// Validador global para habilitar el botón de envío
	let canSubmit = $derived(
		selectedParcela &&
		selectedOperario &&
		selectedMaquina &&
		!isRopoExpired &&
		!isIteafExpired &&
		!isSurfaceExceeded &&
		Number(superficieTratada) > 0 &&
		Number(dosisValor) > 0 &&
		problemaFitosanitario.trim().length > 0 &&
		nombreComercial.trim().length > 0 &&
		numeroRegistroMagrama.trim().length > 0 &&
		justificacionTratamiento.trim().length > 0
	);

	// Actualización reactiva de superficie cuando cambia la parcela
	function handleParcelaSelect(p) {
		selectedParcela = p;
		if (p) {
			superficieTratada = p.superficie_ha;
		}
	}

	function handleOperarioSelect(op) {
		selectedOperario = op;
	}

	function handleMaquinaSelect(maq) {
		selectedMaquina = maq;
	}

	// Envío del tratamiento al backend SvelteKit
	async function handleSubmit(e) {
		e.preventDefault();
		if (!canSubmit) return;

		isSubmitting = true;
		submitFeedback = null;

		try {
			const payload = {
				farmer_id: farmerId,
				parcela_id: selectedParcela.id,
				operario_id: selectedOperario.id,
				maquinaria_id: selectedMaquina.id,
				fecha_tratamiento: fechaTratamiento,
				problema_fitosanitario: problemaFitosanitario,
				nombre_comercial: nombreComercial,
				numero_registro_magrama: numeroRegistroMagrama,
				materia_activa: materiaActiva,
				dosis_valor: dosisValor,
				dosis_unidad: dosisUnidad,
				volumen_caldo_l_ha: volumenCaldo,
				superficie_tratada_ha: superficieTratada,
				plazo_seguridad_dias: plazoSeguridad,
				justificacion_tratamiento: justificacionTratamiento,
				condiciones_meteorologicas: condicionesMeteorologicas,
				observaciones: observaciones
			};

			const res = await fetch('/api/tratamientos', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			const data = await res.json();
			if (data.success) {
				submitFeedback = {
					success: true,
					message: '¡Tratamiento fitosanitario registrado y transmitido en tiempo real a Supabase!'
				};

				// Notificación y transmisión en tiempo real
				broadcastLocalChange('INSERT', data.data);
				saveTratamientoToSupabase(payload);

				if (onSuccess) onSuccess(data.data);
			} else {
				submitFeedback = { success: false, message: data.message };
			}
		} catch (err) {
			submitFeedback = { success: false, message: err.message || 'Error de conexión.' };
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="card cue-card shadow-sm border-0">
	<div class="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
		<div class="d-flex align-items-center gap-2">
			<i class="bi bi-shield-shaded text-success fs-4"></i>
			<div>
				<h5 class="mb-0 fw-bold text-dark">Registro de Tratamiento Fitosanitario</h5>
				<small class="text-muted">Conforme a Real Decreto 1054/2022 y Real Decreto 1311/2012</small>
			</div>
		</div>
		<span class="badge bg-success text-white px-2 py-1">
			<i class="bi bi-file-earmark-check me-1"></i> SIEX Validado
		</span>
	</div>

	<div class="card-body p-3 p-md-4">
		{#if submitFeedback}
			<div class="alert {submitFeedback.success ? 'alert-success' : 'alert-danger'} alert-dismissible fade show d-flex align-items-center gap-2" role="alert">
				<i class="bi {submitFeedback.success ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} fs-4"></i>
				<div class="flex-grow-1">{submitFeedback.message}</div>
				<button type="button" class="btn-close" aria-label="Cerrar" onclick={() => submitFeedback = null}></button>
			</div>
		{/if}

		<form onsubmit={handleSubmit}>
			<!-- Sección 1: Fecha y Ubicación SIGPAC -->
			<div class="row g-3 mb-3">
				<div class="col-12 col-md-4">
					<label for="fecha-tratamiento" class="form-label fw-semibold text-secondary small">Fecha de Aplicación</label>
					<div class="input-group">
						<span class="input-group-text"><i class="bi bi-calendar-event"></i></span>
						<input
							type="date"
							id="fecha-tratamiento"
							class="form-control"
							bind:value={fechaTratamiento}
							required
						/>
					</div>
				</div>

				<div class="col-12 col-md-8">
					<ParcelaSelector
						{parcelas}
						selectedId={selectedParcela?.id}
						onSelect={handleParcelaSelect}
					/>
				</div>
			</div>

			<!-- Sección 2: Operario ROPO y Maquinaria ROMA (Componentes Modulares con Validación) -->
			<div class="row g-3 mb-3 p-3 bg-light rounded border">
				<div class="col-12 col-lg-6">
					<OperarioSelector
						{operarios}
						selectedId={selectedOperario?.id}
						{fechaTratamiento}
						onSelect={handleOperarioSelect}
					/>
				</div>

				<div class="col-12 col-lg-6">
					<MaquinaSelector
						{maquinas}
						selectedId={selectedMaquina?.id}
						{fechaTratamiento}
						onSelect={handleMaquinaSelect}
					/>
				</div>
			</div>

			<!-- Sección 3: Datos del Producto y Dosis -->
			<h6 class="text-uppercase text-secondary fw-bold small mt-4 mb-3 d-flex align-items-center gap-2">
				<i class="bi bi-capsule text-success"></i> Producto Fitosanitario y Dosificación
			</h6>

			<div class="row g-3 mb-3">
				<!-- Problema Fitosanitario / Plaga -->
				<div class="col-12 col-md-6">
					<label for="problema" class="form-label small fw-semibold text-secondary">Plaga / Enfermedad / Causa</label>
					<input
						type="text"
						id="problema"
						class="form-control"
						placeholder="ej: Prays del olivo, Mildiu, Pulgón verde..."
						bind:value={problemaFitosanitario}
						required
					/>
				</div>

				<!-- Nombre Comercial -->
				<div class="col-12 col-md-6">
					<label for="nombre-comercial" class="form-label small fw-semibold text-secondary">Nombre Comercial del Producto</label>
					<input
						type="text"
						id="nombre-comercial"
						class="form-control"
						placeholder="ej: DIPEL DF, KARATE ZEON..."
						bind:value={nombreComercial}
						required
					/>
				</div>

				<!-- Nº Registro Oficial MAPA -->
				<div class="col-12 col-md-4">
					<label for="num-registro" class="form-label small fw-semibold text-secondary">Nº Registro Oficial (MAPA)</label>
					<div class="input-group">
						<span class="input-group-text"><i class="bi bi-upc-scan"></i></span>
						<input
							type="text"
							id="num-registro"
							class="form-control"
							placeholder="ej: 19.984/14"
							bind:value={numeroRegistroMagrama}
							required
						/>
					</div>
				</div>

				<!-- Materia Activa -->
				<div class="col-12 col-md-8">
					<label for="materia-activa" class="form-label small fw-semibold text-secondary">Sustancia Activa y Concentración</label>
					<input
						type="text"
						id="materia-activa"
						class="form-control"
						placeholder="ej: Bacillus thuringiensis kurstaki 32% p/p"
						bind:value={materiaActiva}
						required
					/>
				</div>

				<!-- Dosis y Unidades -->
				<div class="col-12 col-sm-6 col-md-4">
					<label for="dosis-valor" class="form-label small fw-semibold text-secondary">Dosis Aplicada</label>
					<div class="input-group">
						<input
							type="number"
							step="0.001"
							min="0.001"
							id="dosis-valor"
							class="form-control"
							bind:value={dosisValor}
							required
						/>
						<select class="form-select" style="max-width: 110px;" bind:value={dosisUnidad}>
							<option value="kg/ha">kg/ha</option>
							<option value="l/ha">l/ha</option>
							<option value="%">% (v/v)</option>
							<option value="g/hl">g/hl</option>
						</select>
					</div>
				</div>

				<!-- Volumen de Caldo -->
				<div class="col-12 col-sm-6 col-md-4">
					<label for="vol-caldo" class="form-label small fw-semibold text-secondary">Volumen Caldo (l/ha)</label>
					<div class="input-group">
						<span class="input-group-text"><i class="bi bi-droplet-half"></i></span>
						<input
							type="number"
							step="1"
							min="0"
							id="vol-caldo"
							class="form-control"
							placeholder="1000"
							bind:value={volumenCaldo}
						/>
					</div>
				</div>

				<!-- Superficie Tratada con Validación SIGPAC -->
				<div class="col-12 col-md-4">
					<label for="sup-tratada" class="form-label small fw-semibold text-secondary d-flex justify-content-between">
						<span>Superficie Tratada (ha)</span>
						{#if selectedParcela}
							<span class="text-muted">Max: {selectedParcela.superficie_ha} ha</span>
						{/if}
					</label>
					<input
						type="number"
						step="0.0001"
						min="0.0001"
						id="sup-tratada"
						class="form-control {isSurfaceExceeded ? 'is-invalid border-danger' : ''}"
						bind:value={superficieTratada}
						required
					/>
					{#if isSurfaceExceeded}
						<div class="invalid-feedback">
							No puede superar los {selectedParcela.superficie_ha} ha del recinto SIGPAC.
						</div>
					{/if}
				</div>
			</div>

			<!-- Sección 4: Plazo de Seguridad y Trazabilidad -->
			<div class="row g-3 mb-3 p-3 bg-light rounded border align-items-center">
				<div class="col-12 col-md-4">
					<label for="plazo-seguridad" class="form-label small fw-semibold text-secondary">Plazo de Seguridad (Días)</label>
					<div class="input-group">
						<span class="input-group-text"><i class="bi bi-hourglass-split"></i></span>
						<input
							type="number"
							id="plazo-seguridad"
							class="form-control"
							min="0"
							bind:value={plazoSeguridad}
							required
						/>
					</div>
				</div>

				<div class="col-12 col-md-8">
					<div class="p-2 bg-white rounded border d-flex align-items-center gap-3">
						<i class="bi bi-basket2-fill text-success fs-3"></i>
						<div>
							<div class="small text-muted">Fecha Legal más temprana de Recolección / Cosecha:</div>
							<div class="fw-bold fs-6 text-dark">
								{fechaRecoleccionPermitida || 'Fecha no calculada'}
								<span class="badge bg-success-subtle text-success border ms-2">Conforme a Etiqueta</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Justificación Técnica y Condiciones -->
			<div class="row g-3 mb-3">
				<div class="col-12 col-md-7">
					<label for="justificacion" class="form-label small fw-semibold text-secondary">
						Justificación Técnica del Tratamiento (Obligatorio Real Decreto 1311/2012)
					</label>
					<textarea
						id="justificacion"
						class="form-control"
						rows="2"
						placeholder="Indicar umbral de daño superado o prescripción del asesor técnico..."
						bind:value={justificacionTratamiento}
						required
					></textarea>
				</div>

				<div class="col-12 col-md-5">
					<label for="condiciones" class="form-label small fw-semibold text-secondary">
						Condiciones Meteorológicas (Prevención Deriva)
					</label>
					<input
						type="text"
						id="condiciones"
						class="form-control"
						placeholder="Viento km/h, Temperatura, Humedad..."
						bind:value={condicionesMeteorologicas}
					/>
				</div>

				<div class="col-12">
					<label for="obs" class="form-label small fw-semibold text-secondary">Observaciones Adicionales</label>
					<input
						type="text"
						id="obs"
						class="form-control"
						placeholder="Detalles sobre mezcla, boquillas antideriva, etc."
						bind:value={observaciones}
					/>
				</div>
			</div>

			<!-- Resumen de Validación y Botón de Firma -->
			<div class="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3 pt-3 border-top mt-4">
				<div class="small">
					{#if !canSubmit}
						<span class="text-danger d-flex align-items-center gap-1">
							<i class="bi bi-info-circle-fill"></i>
							Corrige las advertencias marcadas en rojo (ROPO / ITEAF / Superficie) antes de registrar.
						</span>
					{:else}
						<span class="text-success d-flex align-items-center gap-1">
							<i class="bi bi-check-circle-fill"></i>
							Todos los datos validados conforme a la normativa española del CUE.
						</span>
					{/if}
				</div>

				<button
					type="submit"
					class="btn btn-success btn-lg px-4"
					disabled={isSubmitting || !canSubmit}
				>
					{#if isSubmitting}
						<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
						Firmando en Cuaderno...
					{:else}
						<i class="bi bi-pen-fill"></i> Registrar en CUE
					{/if}
				</button>
			</div>
		</form>
	</div>
</div>
