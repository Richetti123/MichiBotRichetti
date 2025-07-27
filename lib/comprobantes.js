// lib/comprobantes.js (PARA DEPURACIÓN)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isPaymentProof } from './keywords.js'; 

const ADMIN_NUMBER_FOR_FORWARDING = '5217771303481@c.us'; // ¡TU NÚMERO DE WHATSAPP AQUÍ!

const __filenameLib = fileURLToPath(import.meta.url);
const __dirnameLib = path.dirname(__filenameLib);
const paymentsFilePathLib = path.join(__dirnameLib, '..', 'src', 'pagos.json'); 

export async function handleIncomingMedia(m, conn) {
    if (!m.message || m.sender === conn.user.jid || !m.sender) { 
        return false;
    }

    // --- INICIO DE LOGS DE DEPURACIÓN ---
    console.log('\n--- DEBUGGING: INICIO COMPROBANTES.JS ---');
    console.log('Mensaje entrante del remitente:', m.sender);
    console.log('Tipo de mensaje (m.mtype):', m.mtype);
    // --- FIN DE LOGS DE DEPURACIÓN ---

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

    // --- INICIO DE LOGS DE DEPURACIÓN ---
    console.log('¿Es un mensaje de medios (isMedia)?', isMedia);
    console.log('Texto de la leyenda detectado (captionText):', captionText);
    console.log('¿La leyenda contiene palabras clave de comprobante (isPaymentProof)?', isPaymentProof(captionText));
    // --- FIN DE LOGS DE DEPURACIÓN ---

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
            
            m.reply(`✅ Recibí tu comprobante de pago. Lo estoy verificando. ¡Gracias!`);
            return true; 
        } catch (e) {
            console.error('Error al reenviar comprobante al admin desde comprobantes.js:', e);
            m.reply(`❌ Ocurrió un error al procesar tu comprobante. Por favor, intenta de nuevo o contacta al soporte.`);
            return true; 
        }
    } else {
        console.log('Condiciones de comprobante NO CUMPLIDAS. El mensaje no se reenviará.'); 
    }
    console.log('--- DEBUGGING: FIN COMPROBANTES.JS ---\n');
    return false; 
}
