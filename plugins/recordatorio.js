// plugins/recordatorio.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// <--- NÚMERO DEL ADMINISTRADOR: Puedes mover esto a config.js si lo deseas --->
const ADMIN_NUMBER_CONFIRMATION = '5217771303481@c.us'; // Tu número sin el '+' y con '@c.us' al final
// <-------------------------------------------------------------------------->

let handler = async (m, { conn, text, command, usedPrefix }) => {
    const paymentsFilePath = path.join(__dirname, '..', 'src', 'pagos.json');
    const clientNameInput = text.trim();

    if (!clientNameInput) {
        return m.reply(`*Uso incorrecto del comando:*\nPor favor, proporciona el nombre del cliente.\nEjemplo: \`\`\`${usedPrefix}${command} Victoria\`\`\``);
    }

    try {
        const clientsData = JSON.parse(fs.readFileSync(paymentsFilePath, 'utf8'));
        let clientFound = false;
        let foundClientInfo = null;
        let foundPhoneNumberKey = null;

        for (const phoneNumberKey in clientsData) {
            const clientInfo = clientsData[phoneNumberKey];
            if (clientInfo.nombre && clientInfo.nombre.toLowerCase() === clientNameInput.toLowerCase()) {
                clientFound = true;
                foundClientInfo = clientInfo;
                foundPhoneNumberKey = phoneNumberKey;
                break;
            }
        }

        if (clientFound && foundClientInfo && foundPhoneNumberKey) {
            const { monto, bandera, nombre } = foundClientInfo;
            const numero = foundPhoneNumberKey;

            const targetNumberWhatsApp = numero.replace(/\+/g, '') + '@c.us';

            // Separar el mensaje principal de los detalles de pago
            let mainReminderMessage = `¡Hola ${nombre}! 👋 Este es un recordatorio de tu pago pendiente de ${monto}.`;
            let paymentDetailsFooter = ''; // Aquí irán los detalles para el footer

            switch (bandera) {
                case '🇲🇽': // Mexico
                    paymentDetailsFooter = `Para pagar en México, usa:\nCLABE: 706969168872764411\nNombre: Gaston Juarez\nBanco: Arcus Fi`;
                    break;
                case '🇵🇪': // Peru
                    paymentDetailsFooter = `Para pagar en Perú, usa:\nNombre: Marcelo Gonzales R.\nYape: 967699188\nPlin: 955095498`;
                    break;
                case '🇨🇱': // Chile
                    paymentDetailsFooter = `Para pagar en Chile, usa:\nNombre: BARINIA VALESKA ZENTENO MERINO\nRUT: 17053067-5\nBANCO ELEGIR: TEMPO\nTipo de cuenta: Cuenta Vista\nNumero de cuenta: 111117053067\nCorreo: estraxer2002@gmail.com`;
                    break;
                case '🇦🇷': // Argentina
                    paymentDetailsFooter = `Para pagar en Argentina, usa:\nNombre: Gaston Juarez\nCBU: 4530000800011127480736`;
                    break;
                default:
                    paymentDetailsFooter = 'Por favor, contacta para coordinar tu pago. No se encontraron métodos de pago específicos para tu país.';
            }

            // Definir los botones, usando los mismos IDs para que manejar_botones_pago.js los capte
            const buttons = [
                {
                    quickReplyButton: {
                        displayText: '✅ He realizado el pago',
                        id: 'pago_realizado' 
                    }
                },
                {
                    quickReplyButton: {
                        displayText: '💬 Necesito ayuda',
                        id: 'ayuda_pago' 
                    }
                }
            ];

            // Objeto del mensaje con botones
            const messageContent = {
                text: mainReminderMessage,
                footer: paymentDetailsFooter,
                templateButtons: buttons,
                // optional: headerType: 1 // Si quieres solo texto en el encabezado
            };

            try {
                // Enviar el mensaje con botones al cliente
                await conn.sendMessage(targetNumberWhatsApp, messageContent);
                m.reply(`✅ Recordatorio enviado exitosamente a *${nombre}* (${numero}).`);

                // Notificar al administrador del envío manual
                const confirmationText = `✅ Se ha enviado un recordatorio de pago manual a *${nombre}* (${numero}).`;
                await conn.sendMessage(ADMIN_NUMBER_CONFIRMATION, { text: confirmationText });

            } catch (sendError) {
                console.error(`Error sending message to ${nombre} (${numero}):`, sendError);
                m.reply(`❌ Falló el envío del recordatorio a *${nombre}* (${numero}). Posiblemente el número no es válido en WhatsApp o hay un problema de conexión: ${sendError.message || sendError}`);
            }
        } else {
            m.reply(`❌ No se encontró ningún cliente con el nombre \`\`\`${clientNameInput}\`\`\` en la base de datos de pagos. Asegúrate de escribirlo correctamente.`);
        }

    } catch (e) {
        console.error('Error processing .recordatorio command:', e);
        m.reply(`❌ Ocurrió un error interno al intentar enviar el recordatorio. Por favor, reporta este error.`);
    }
};

handler.help = ['recordatorio <nombre_cliente>'];
handler.tags = ['pagos'];
handler.command = /^(recordatorio)$/i;
handler.owner = true;

export default handler;
