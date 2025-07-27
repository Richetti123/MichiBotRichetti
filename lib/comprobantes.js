// lib/comprobantes.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isPaymentProof } from './keywords.js'; 

// <--- CONFIGURACIÓN: NÚMERO DEL ADMINISTRADOR PARA EL REENVÍO --->
const ADMIN_NUMBER_FOR_FORWARDING = '5217771303481@c.us'; // ¡TU NÚMERO DE WHATSAPP AQUÍ!
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
    // <--- LÍNEA CORREGIDA: AÑADIDO '|| !m.sender' para evitar el error 'split' --->
    // Solo procesar si hay un mensaje, si no es del propio bot, Y SI TIENE UN REMITENTE VÁLIDO
    if (!m.message || m.sender === conn.user.jid || !m.sender) { 
        return false;
    }
    // ---------------------------------------------------------------------------------

    const senderJid = m.sender; 
    const senderNumber = senderJid.split('@')[0]; 
    const formattedSenderNumber = `+${senderNumber}`; 

    const isMedia = m.mtype === 'imageMessage' || 
                    m.mtype === 'videoMessage' || 
                    m.mtype === 'documentMessage';
    
    const captionText = m.message.imageMessage?.caption || 
                        m.message.videoMessage?.caption || 
                        m.message.documentMessage?.caption || 
                        '';

    if (isMedia && isPaymentProof(captionText)) {
        let clientName = 'Un cliente desconocido';
        try {
            let clientsData = {};
            if (fs.existsSync(paymentsFilePathLib)) {
                clientsData = JSON.parse(fs.readFileSync(paymentsFilePathLib, 'utf8'));
            }
            if (clientsData[formattedSenderNumber]) {
                clientName = clientsData[formattedSenderNumber].nombre;
            }
        } catch (e) {
            console.error("Error al leer pagos.json en comprobantes.js:", e);
        }

        const captionForAdmin = `✅ Comprobante recibido de *${clientName}* (${formattedSenderNumber}).`;

        try {
            await conn.copyNForward(ADMIN_NUMBER_FOR_FORWARDING, m, true, { caption: captionForAdmin });
            console.log(`Comprobante de ${clientName} (${formattedSenderNumber}) reenviado al admin.`);
            
            m.reply(`✅ Recibí tu comprobante de pago. Lo estoy verificando. ¡Gracias!`);
            return true; 
        } catch (e) {
            console.error('Error al reenviar comprobante al admin desde comprobantes.js:', e);
            m.reply(`❌ Ocurrió un error al procesar tu comprobante. Por favor, intenta de nuevo o contacta al soporte.`);
            return true; 
        }
    }
    return false; 
}
