// lib/comprobantes.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isPaymentProof } from './keywords.js'; // Importa la función desde el nuevo archivo keywords.js

// <--- CONFIGURACIÓN: NÚMERO DEL ADMINISTRADOR PARA EL REENVÍO --->
const ADMIN_NUMBER_FOR_FORWARDING = '5217771303481@c.us'; // ¡TU NÚMERO DE WHATSAPP AQUÍ!
// <-------------------------------------------------------------->

// Rutas relativas para este archivo en la carpeta lib
const __filenameLib = fileURLToPath(import.meta.url);
const __dirnameLib = path.dirname(__filenameLib);
const paymentsFilePathLib = path.join(__dirnameLib, '..', 'src', 'pagos.json'); // Ruta a tu pagos.json

/**
 * Handles incoming media messages, checks for payment proof keywords, and forwards to admin.
 * @param {object} m - El objeto del mensaje entrante.
 * @param {object} conn - El objeto de conexión de WhatsApp.
 * @returns {boolean} True si el mensaje fue un comprobante y fue manejado (reenviado/intentado reenviar), false si no.
 */
export async function handleIncomingMedia(m, conn) {
    // Solo procesar si hay un mensaje y no es un mensaje del propio bot (para evitar bucles)
    if (!m.message || m.sender === conn.user.jid) {
        return false;
    }

    const senderJid = m.sender;
    const senderNumber = senderJid.split('@')[0]; // Extrae solo el número
    const formattedSenderNumber = `+${senderNumber}`; // Formato con '+' para buscar en pagos.json

    // Determina si el mensaje es de tipo media (imagen, video, documento)
    const isMedia = m.mtype === 'imageMessage' || 
                    m.mtype === 'videoMessage' || 
                    m.mtype === 'documentMessage';
    
    // Obtiene la leyenda/caption del mensaje media
    const captionText = m.message.imageMessage?.caption || 
                        m.message.videoMessage?.caption || 
                        m.message.documentMessage?.caption || 
                        '';

    // Si es un mensaje media Y contiene las palabras clave de comprobante
    if (isMedia && isPaymentProof(captionText)) {
        let clientName = 'Un cliente desconocido';
        try {
            // Carga los datos de pagos.json para buscar el nombre del cliente
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
            // Reenvía el mensaje original (media + leyenda) al número del administrador
            await conn.copyNForward(ADMIN_NUMBER_FOR_FORWARDING, m, true, { caption: captionForAdmin });
            console.log(`Comprobante de ${clientName} (${formattedSenderNumber}) reenviado al admin.`);
            
            // Envía una confirmación al cliente
            m.reply(`✅ Recibí tu comprobante de pago. Lo estoy verificando. ¡Gracias!`);
            return true; // Indica que el mensaje fue manejado
        } catch (e) {
            console.error('Error al reenviar comprobante al admin desde comprobantes.js:', e);
            m.reply(`❌ Ocurrió un error al procesar tu comprobante. Por favor, intenta de nuevo o contacta al soporte.`);
            return true; // Indica que se intentó manejar, aunque hubo un error
        }
    }
    return false; // El mensaje no fue un comprobante de pago
}