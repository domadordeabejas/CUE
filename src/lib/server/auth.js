/**
 * @file auth.js
 * Módulo de autenticación segura, hashing de contraseñas y gestión de sesiones para CUE SaaS.
 * Utiliza el módulo criptográfico nativo de Node.js (scrypt + timingSafeEqual) sin dependencias externas.
 */

import crypto from 'node:crypto';
import { getUserByEmail, getUserById } from './db.js';

// Almacén en memoria de sesiones activas (persistente en el ciclo de vida del servidor)
const sessions = new Map();

// Duración de la sesión: 7 días
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Hashea una contraseña en texto plano utilizando scrypt y una sal aleatoria
 * @param {string} password
 * @returns {string} Formato 'salt:hash'
 */
export function hashPassword(password) {
	const salt = crypto.randomBytes(16).toString('hex');
	const derivedKey = crypto.scryptSync(password, salt, 64);
	return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verifica una contraseña frente a un hash almacenado
 * @param {string} password
 * @param {string} storedHash Formato 'salt:hash'
 * @returns {boolean}
 */
export function verifyPassword(password, storedHash) {
	if (!storedHash || !storedHash.includes(':')) {
		return false;
	}

	const [salt, key] = storedHash.split(':');
	const keyBuffer = Buffer.from(key, 'hex');
	const derivedKey = crypto.scryptSync(password, salt, 64);

	return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

/**
 * Crea una sesión para un usuario autenticado
 * @param {string} userId
 * @returns {string} sessionId
 */
export function createSession(userId) {
	const sessionId = crypto.randomBytes(32).toString('hex');
	const expiresAt = Date.now() + SESSION_TTL_MS;

	sessions.set(sessionId, {
		userId,
		createdAt: new Date().toISOString(),
		expiresAt
	});

	return sessionId;
}

/**
 * Recupera y valida una sesión activa
 * @param {string} sessionId
 * @returns {Object|null} Usuario autenticado o null si expiró o no existe
 */
export function getSession(sessionId) {
	if (!sessionId) return null;

	const session = sessions.get(sessionId);
	if (!session) return null;

	// Comprobar expiración
	if (Date.now() > session.expiresAt) {
		sessions.delete(sessionId);
		return null;
	}

	// Obtener usuario completo
	const user = getUserById(session.userId);
	if (!user || !user.is_active) {
		sessions.delete(sessionId);
		return null;
	}

	return {
		sessionId,
		user
	};
}

/**
 * Destruye una sesión activa (Logout)
 * @param {string} sessionId
 */
export function destroySession(sessionId) {
	if (sessionId) {
		sessions.delete(sessionId);
	}
}

/**
 * Valida credenciales de login (email y contraseña)
 * @param {string} email
 * @param {string} password
 * @returns {Object} Usuario si es válido
 * @throws {Error} Si las credenciales son incorrectas
 */
export function authenticateUser(email, password) {
	if (!email || !password) {
		throw new Error('Debes indicar tu correo electrónico y tu contraseña.');
	}

	const cleanEmail = email.toLowerCase().trim();
	const user = getUserByEmail(cleanEmail);

	if (!user) {
		throw new Error('Credenciales incorrectas o usuario no registrado.');
	}

	if (!user.is_active) {
		throw new Error('Esta cuenta ha sido desactivada. Contacta con soporte.');
	}

	const isValid = verifyPassword(password, user.password_hash);
	if (!isValid) {
		throw new Error('Credenciales incorrectas o usuario no registrado.');
	}

	return user;
}
