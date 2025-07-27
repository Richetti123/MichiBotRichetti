// lib/comprobantes.js

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
    console.log('\n--- DEBUGGING: INICIO COMPROBANTES.JS ---'); 

    console.log('DEBUG COMPROBANTES: Valor de m.message:', m.message);
    console.log('DEBUG COMPROBANTES: Valor de m.sender (Original):', m.sender);

    const extractedSenderJid = m.key.fromMe ? conn.user.jid : m.key.participant || m.key.remoteJid;
    console.log('DEBUG COMPROBANTES: Sender JID extraído (extractedSenderJid):', extractedSenderJid);

    let messageType = 'unknown';
    if (m.message) {
        if (m.message.imageMessage) messageType = 'imageMessage';
        else if (m.message.videoMessage) messageType = 'videoMessage';
        else if (m.message.documentMessage) messageType = 'documentMessage';
        else if (m.message.conversation) messageType = 'conversation'; 
        else if (m.message.extendedTextMessage) messageType = 'extendedTextMessage'; 
    }
    console.log('DEBUG COMPROBANTES: Tipo de mensaje (messageType) robusto:', messageType);

    if (!m.message || !extractedSenderJid || m.key.fromMe) { 
        console.log('DEBUG COMPROBANTES: Condición de salida temprana cumplida. Causas: !m.message, !extractedSenderJid, o m.key.fromMe.');
        console.log('--- DEBUGGING: FIN COMPROBANTES.JS ---\n'); 
        return false;
    }
    
    const senderJid = extractedSenderJid; 
    const senderNumber = senderJid.split('@')[0]; 
    const formattedSenderNumber = `+${senderNumber}`; 

    console.log('Mensaje entrante del remitente:', senderJid);
    console.log('Tipo de mensaje (m.mtype original):', m.mtype); 
    
    const isMedia = messageType === 'imageMessage' || 
                    messageType === 'videoMessage' || 
                    messageType === 'documentMessage';
    
    const captionText = m.message.imageMessage?.caption || 
                        m.message.videoMessage?.caption || 
                        m.message.documentMessage?.caption || 
                        m.message.extendedTextMessage?.text || 
                        m.message.conversation || 
                        '';

    console.log('¿Es un mensaje de medios (isMedia)?', isMedia);
    console.log('Texto de la leyenda detectado (captionText):', captionText);
    console.log('¿La leyenda contiene palabras clave de comprobante (isPaymentProof)?', isPaymentProof(captionText));

    if (isMedia && isPaymentProof(captionText)) {
        console.log('Condiciones de comprobante CUMPLIDAS. Procediendo a reenviar...'); 
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
            
            // --- ¡CORRECCIÓN AQUÍ! m.reply CAMBIADO POR conn.sendMessage ---
            await conn.sendMessage(m.chat, { text: `✅ Recibí tu comprobante de pago. Lo estoy verificando. ¡Gracias!` }, { quoted: m });
            // -------------------------------------------------------------

            console.log('--- DEBUGGING: FIN COMPROBANTES.JS ---\n');
            return true; 
        } catch (e) {
            console.error('Error al reenviar comprobante al admin desde comprobantes.js:', e);
            
            // --- ¡CORRECCIÓN AQUÍ! m.reply CAMBIADO POR conn.sendMessage ---
            await conn.sendMessage(m.chat, { text: `❌ Ocurrió un error al procesar tu comprobante. Por favor, intenta de nuevo o contacta al soporte.` }, { quoted: m });
            // -------------------------------------------------------------
            
            console.log('--- DEBUGGING: FIN COMPROBANTES.JS ---\n');
            return true; 
        }
    } else {
        console.log('Condiciones de comprobante NO CUMPLIDAS. El mensaje no se reenviará.'); 
    }
    console.log('--- DEBUGGING: FIN COMPROBANTES.JS ---\n');
    return false; 
}
