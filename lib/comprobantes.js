import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isPaymentProof } from './keywords.js'; 

// <--- CONFIGURACIÓN: NÚMERO DEL ADMINISTRADOR PARA EL REENVÍO --->
const ADMIN_NUMBER_FOR_FORWARDING = '5217771303481@c.us'; // ¡VERIFICA QUE ESTE ES TU NÚMERO DE WHATSAPP!
// <-------------------------------------------------------------->

// Rutas relativas para este archivo en la carpeta lib
const __filenameLib = fileURLToPath(import.meta.url);
const __dirnameLib = path.dirname(__filenameLib);
const paymentsFilePathLib = path.join(__dirnameLib, '..', 'src', 'pagos.json'); 

/**
 * Handles incoming media messages, checks for payment proof keywords, and forwards to admin.
 * @param {object} m - El objeto del mensaje entrante.
 * @param {object} conn - El objeto de conexión de WhatsApp.
 * @returns {boolean} True si el mensaje fue un comprobante y fue manejado (reenviado/intentado reenviar), false si no.
 */
export async function handleIncomingMedia(m, conn) {
    // <--- ¡LOG MOVIDO AQUÍ, DEBE SER LO PRIMERO! --->
    console.log('\n--- DEBUGGING: INICIO COMPROBANTES.JS ---'); 

    // Solo procesar si hay un mensaje, si no es del propio bot, Y SI TIENE UN REMITENTE VÁLIDO
    if (!m.message || m.sender === conn.user.jid || !m.sender) { 
        console.log('DEBUG COMPROBANTES: Condición de salida temprana cumplida. m.message, m.sender, o bot self-message.'); // NUEVO LOG
        console.log('--- DEBUGGING: FIN COMPROBANTES.JS ---\n'); // Cerrar log al salir temprano
        return false;
    }
    
    // --- CONTINUACIÓN DE LOG
