/**
 * @file seeder.js
 * Script de utilidades para inicializar o restablecer la base de datos SQL con los datos de demo.
 */

import { seedDatabase, getDb } from './sqlite.js';

export function runSeed(force = true) {
	return seedDatabase(getDb(), force);
}
