// lib/comprobantes.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isPaymentProof } from './keywords.js';
import { downloadContentFromMessage } from '@whiskeysockets/baileys'; // <-- AÑADIDO: Importa la función de descarga de Baileys

// <--- CONFIGURACIÓN: NÚMERO DEL ADMINISTRADOR PARA EL REENVÍO --->
const ADMIN_NUMBER_FOR_FORWARDING = '5217771303481@s.whatsapp.net'; // ¡Asegúrate de que este es el número correcto!
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

    console.log('DEBUG COMPROBANTES: Valor de m.chat:', m.chat);
    console.log('DEBUG COMPROBANTES: Valor de conn.user.jid:', conn.user.jid);

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

        let captionForAdmin = `✅ Comprobante recibido de *${clientName}* (${formattedSenderNumber}).`;

        try {
            console.log('DEBUG COMPROBANTES: Intentando enviar un mensaje de texto de prueba al admin para verificar conectividad.');
            await conn.sendMessage(ADMIN_NUMBER_FOR_FORWARDING, { text: 'TEST: Este es un mensaje de prueba de tu bot para el reenvío de comprobantes.' });
            console.log('DEBUG COMPROBANTES: Mensaje de texto de prueba enviado al admin.');

            let messageOptions = {
                caption: captionForAdmin
            };
            let originalMediaCaption = m.message.imageMessage?.caption || m.message.documentMessage?.caption || '';

            if (originalMediaCaption) {
                messageOptions.caption += `\n\n_Leyenda original: ${originalMediaCaption}_`;
            }

            let mediaBuffer;
            try {
                // Descargar el contenido del medio en un buffer usando downloadContentFromMessage
                let msgContent;
                let msgTypeForDownload;

                if (m.message.imageMessage) {
                    msgContent = m.message.imageMessage;
                    msgTypeForDownload = 'image';
                } else if (m.message.documentMessage) {
                    msgContent = m.message.documentMessage;
                    msgTypeForDownload = 'document';
                } else if (m.message.videoMessage) {
                    msgContent = m.message.videoMessage;
                    msgTypeForDownload = 'video';
                } else {
                    throw new Error('Tipo de medio no soportado para descarga.');
                }

                const stream = await downloadContentFromMessage(msgContent, msgTypeForDownload);
                const bufferArray = [];
                for await (const chunk of stream) {
                    bufferArray.push(chunk);
                }
                mediaBuffer = Buffer.concat(bufferArray); // Concatena los chunks en un solo buffer

                console.log(`DEBUG COMPROBANTES: Media descargada. Tamaño del buffer: ${mediaBuffer ? mediaBuffer.length : 'N/A'} bytes.`);
                if (!mediaBuffer || mediaBuffer.length === 0) {
                    throw new Error('Buffer de medios vacío o nulo después de la descarga.');
                }
            } catch (downloadError) {
                console.error('DEBUG COMPROBANTES: Error al descargar media a buffer:', downloadError);
                await conn.sendMessage(senderJid, { text: `❌ Ocurrió un error al descargar tu comprobante. Por favor, intenta de nuevo o contacta al soporte.` }, { quoted: m });
                console.log('--- DEBUGGING: FIN COMPROBANTES.JS ---\n');
                return true; // Detener el procesamiento si la descarga falla
            }

            if (m.message.imageMessage) {
                messageOptions.image = mediaBuffer; // Enviar buffer para imagen
                messageOptions.mimetype = m.message.imageMessage.mimetype; // Asegurar que el mimetype se pasa para imágenes
                console.log(`DEBUG COMPROBANTES: Reenviando el comprobante como IMAGEN (desde buffer) con mimetype ${messageOptions.mimetype} a ${ADMIN_NUMBER_FOR_FORWARDING} usando sendMessage.`);
            } else if (m.message.documentMessage) {
                messageOptions.document = mediaBuffer; // Enviar buffer para documento
                messageOptions.mimetype = m.message.documentMessage.mimetype;
                messageOptions.fileName = m.message.documentMessage.fileName || 'documento_comprobante.pdf'; // Añadir extensión por defecto si no tiene
                console.log(`DEBUG COMPROBANTES: Reenviando el comprobante como DOCUMENTO (desde buffer) con mimetype ${messageOptions.mimetype} a ${ADMIN_NUMBER_FOR_FORWARDING} usando sendMessage.`);
            } else {
                console.error('DEBUG COMPROBANTES: Tipo de medio no soportado para reenvío directo vía buffer:', messageType);
                await conn.sendMessage(senderJid, { text: `❌ Tu comprobante es de un tipo de archivo no soportado para reenvío.` }, { quoted: m });
                console.log('--- DEBUGGING: FIN COMPROBANTES.JS ---\n');
                return true;
            }
            // Asegurarse de que se ha establecido un tipo de medio válido (image o document)
            if (messageOptions.image || messageOptions.document) {
                await conn.sendMessage(ADMIN_NUMBER_FOR_FORWARDING, messageOptions);
                console.log(`Comprobante de ${clientName} (${formattedSenderNumber}) reenviado al admin usando sendMessage directo (via buffer).`);
            } else {
                console.error('DEBUG COMPROBANTES: No se pudo construir el mensaje de medios para reenvío directo.');
                await conn.sendMessage(senderJid, { text: `❌ Ocurrió un error interno al preparar el comprobante para reenvío.` }, { quoted: m });
            }
            // ---------------------------------------------------------------------------------

            await conn.sendMessage(senderJid, { text: `✅ Recibí tu comprobante de pago. Lo estoy verificando. ¡Gracias!` }, { quoted: m });

            console.log('--- DEBUGGING: FIN COMPROBANTES.JS ---\n');
            return true;
        } catch (e) {
            console.error('Error al reenviar comprobante al admin desde comprobantes.js:', e);

            await conn.sendMessage(senderJid, { text: `❌ Ocurrió un error al procesar tu comprobante. Por favor, intenta de nuevo o contacta al soporte.` }, { quoted: m });

            console.log('--- DEBUGGING: FIN COMPROBANTES.JS ---\n');
            return true;
        }
    } else {
        console.log('Condiciones de comprobante NO CUMPLIDAS. El mensaje no se reenviará.');
    }
    console.log('--- DEBUGGING: FIN COMPROBANTES.JS ---\n');
    return false;
}
