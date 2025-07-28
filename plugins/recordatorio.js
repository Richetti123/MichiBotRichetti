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

            let reminderMessage = `¡Hola ${nombre}! 👋 Este es un recordatorio de tu pago pendiente de ${monto}.`;
            let paymentDetails = '';

            switch (bandera) {
                case '🇲🇽': // Mexico
                    paymentDetails = `\n\nPara pagar en México, usa:
CLABE: 706969168872764411
Nombre: Gaston Juarez
Banco: Arcus Fi`;
                    break;
                case '🇵🇪': // Peru
                    paymentDetails = `\n\nPara pagar en Perú, usa:
Nombre: Marcelo Gonzales R.
Yape: 967699188
Plin: 955095498`;
                    break;
                case '🇨🇱': // Chile
                    paymentDetails = `\n\nPara pagar en Chile, usa:
Nombre: BARINIA VALESKA ZENTENO MERINO
RUT: 17053067-5
BANCO ELEGIR: TEMPO
Tipo de cuenta: Cuenta Vista
Numero de cuenta: 111117053067
Correo: estraxer2002@gmail.com`;
                    break;
                case '🇦🇷': // Argentina
                    paymentDetails = `\n\nPara pagar en Argentina, usa:
Nombre: Gaston Juarez
CBU: 4530000800011127480736`;
                    break;
                default:
                    paymentDetails = '\n\nPor favor, contacta para coordinar tu pago. No se encontraron métodos de pago específicos para tu país.';
            }

            reminderMessage += paymentDetails;
            reminderMessage += `\n\n*Escoge una de las opciones:*\n1. He realizado el pago\n2. Necesito ayuda con mi pago`; // Nueva línea con las opciones

            try {
                await conn.sendMessage(targetNumberWhatsApp, { text: reminderMessage });
                m.reply(`✅ Recordatorio enviado exitosamente a *${nombre}* (${numero}).`);

                // IMPORTANTE: Aquí es donde "preparamos" al bot para esperar una respuesta del cliente.
                // Guardamos en la base de datos (global.db.data.users) que estamos esperando una respuesta
                // para el número al que se le envió el recordatorio.
                if (global.db && global.db.data && global.db.data.users) {
                    global.db.data.users[targetNumberWhatsApp] = global.db.data.users[targetNumberWhatsApp] || {};
                    global.db.data.users[targetNumberWhatsApp].awaitingPaymentResponse = true;
                    global.db.data.users[targetNumberWhatsApp].paymentClientName = nombre; // Opcional: guardar el nombre del cliente
                    global.db.data.users[targetNumberWhatsApp].paymentClientNumber = numero; // Opcional: guardar el número original
                    console.log(`DEBUG: Establecido awaitingPaymentResponse para ${targetNumberWhatsApp}`);
                }


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
