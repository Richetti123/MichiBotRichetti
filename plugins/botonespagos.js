// plugins/manejar_botones_pago.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta al archivo de pagos.json
const PAYMENTS_FILE_PATH = path.join(__dirname, '..', 'src', 'pagos.json');

// --- CONFIGURACIÓN: NÚMERO DEL ADMINISTRADOR PARA LAS ALERTAS ---
// ¡ASEGÚRATE DE QUE ESTE ES EL NÚMERO JID CORRECTO DE TU ADMINISTRADOR!
// Debe ser tu número con el formato '@c.us' o '@s.whatsapp.net' al final.
const ADMIN_NUMBER_FOR_ALERTS = '5217771303481@c.us'; 
// ------------------------------------------------------------------

let handler = async (m, { conn, usedPrefix }) => {
    // Verificamos si el mensaje es una respuesta a un botón de plantilla
    if (m.message?.templateButtonReplyMessage?.selectedId) {
        const selectedId = m.message.templateButtonReplyMessage.selectedId;
        const senderJid = m.key.remoteJid; // JID del usuario que presionó el botón
        const senderNumber = senderJid.split('@')[0]; // Número puro del usuario
        const formattedSenderNumber = `+${senderNumber}`; // Número con formato '+' para buscar en pagos.json

        let clientName = 'un cliente desconocido';
        let clientContactNumber = formattedSenderNumber; // Por defecto, usamos el número de remitente

        try {
            // Intentamos leer el archivo pagos.json para obtener el nombre del cliente
            if (fs.existsSync(PAYMENTS_FILE_PATH)) {
                const clientsData = JSON.parse(fs.readFileSync(PAYMENTS_FILE_PATH, 'utf8'));
                if (clientsData[formattedSenderNumber]) {
                    clientName = clientsData[formattedSenderNumber].nombre;
                }
            }
        } catch (e) {
            console.error('Error al leer pagos.json en manejar_botones_pago.js:', e);
            // No hacemos m.reply aquí para no interrumpir la respuesta del botón
        }

        switch (selectedId) {
            case 'pago_realizado':
                // Respuesta al usuario cuando presiona "He realizado el pago"
                await conn.sendMessage(senderJid, { 
                    text: 'Si ya ha realizado su pago por favor enviar foto o documento de su pago con el siguiente texto "Aqui esta mi comprobante de pago"' 
                });
                break;

            case 'ayuda_pago':
                // Respuesta al usuario cuando presiona "Necesito ayuda"
                await conn.sendMessage(senderJid, { 
                    text: 'En breves se comunicará un asesor contigo.' 
                });

                // Mensaje de alerta para el administrador
                const adminAlertMessage = `Hola creador, *${clientName}* (${clientContactNumber}) tiene problemas con su pago. Por favor comunícate con él/ella.`;
                
                // Asegurarse de que el JID del administrador es correcto (ej. 'numero@c.us' o 'numero@s.whatsapp.net')
                await conn.sendMessage(ADMIN_NUMBER_FOR_ALERTS, { text: adminAlertMessage });
                break;

            default:
                // Opcional: Para depuración, puedes registrar si se presiona un botón no reconocido
                console.log(`[BOTONES] ID de botón no reconocido: ${selectedId} de ${senderJid}`);
                break;
        }
    }
};

// Este handler "escucha" todos los mensajes para detectar respuestas de botones.
// No necesita un comando específico, ya que reacciona a los IDs de los botones.
handler.customPrefix = '(?id)' // Esto es un placeholder; la lógica principal está en el if(m.message?.templateButtonReplyMessage)
handler.command = new RegExp() // No necesita un comando de texto para ser invocado
handler.exp = 0 // No expira
handler.limit = false; // No consume límite de comandos

export default handler;