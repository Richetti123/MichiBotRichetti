// lib/recordatorios.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ADMIN_NUMBER_CONFIRMATION = '5217771303481@c.us'; // Tu número sin el '+' y con '@c.us' al final
const DELAY_BETWEEN_MESSAGES_MS = 1800000; // 30 minutos

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendAutomaticPaymentReminders(client) {
    console.log('[DEBUG - AutoRecordatorio] Iniciando sendAutomaticPaymentReminders.');
    const today = new Date();
    const currentDayOfMonth = today.getDate();

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowDayOfMonth = tomorrow.getDate();

    try {
        const paymentsFilePath = path.join(__dirname, '..', 'src', 'pagos.json');

        let clientsData = {};
        if (fs.existsSync(paymentsFilePath)) {
            clientsData = JSON.parse(fs.readFileSync(paymentsFilePath, 'utf8'));
            console.log('[DEBUG - AutoRecordatorio] pagos.json cargado exitosamente.');
        } else {
            fs.writeFileSync(paymentsFilePath, JSON.stringify({}, null, 2), 'utf8');
            console.log('[DEBUG - AutoRecordatorio] pagos.json no encontrado, creando archivo vacío.');
        }

        const clientsToSendReminders = [];

        for (const phoneNumberKey in clientsData) {
            const clientInfo = clientsData[phoneNumberKey];
            const numero = phoneNumberKey;
            const { diaPago, monto, bandera, nombre } = clientInfo;

            let mainReminderMessage = '';
            let paymentDetails = '';
            let shouldSend = false;

            console.log(`[DEBUG - AutoRecordatorio] Procesando cliente: ${nombre} (Día de Pago: ${diaPago}, Hoy: ${currentDayOfMonth}, Mañana: ${tomorrowDayOfMonth}).`);

            if (diaPago === currentDayOfMonth) {
                mainReminderMessage = `¡Hola ${nombre}! 👋 Es tu día de pago. Recuerda que tu monto es de ${monto}.`;
                shouldSend = true;
            } else if (diaPago === tomorrowDayOfMonth) {
                mainReminderMessage = `¡Hola ${nombre}! 👋 Tu pago de ${monto} vence mañana. ¡No lo olvides!`;
                shouldSend = true;
            }

            if (shouldSend) {
                console.log(`[DEBUG - AutoRecordatorio] Cliente ${nombre} cumple condición de envío.`);
                switch (bandera) {
                    case '🇲🇽': 
                        paymentDetails = `\n\nPara pagar en México, usa:
CLABE: 706969168872764411
Nombre: Gaston Juarez
Banco: Arcus Fi`;
                        break;
                    case '🇵🇪': 
                        paymentDetails = `\n\nPara pagar en Perú, usa:
Nombre: Marcelo Gonzales R.
Yape: 967699188
Plin: 955095498`;
                        break;
                    case '🇨🇱': 
                        paymentDetails = `\n\nPara pagar en Chile, usa:
Nombre: BARINIA VALESKA ZENTENO MERINO
RUT: 17053067-5
BANCO ELEGIR: TEMPO
Tipo de cuenta: Cuenta Vista
Numero de cuenta: 111117053067
Correo: estraxer2002@gmail.com`;
                        break;
                    case '🇦🇷': 
                        paymentDetails = `\n\nPara pagar en Argentina, usa:
Nombre: Gaston Juarez
CBU: 4530000800011127480736`;
                        break;
                    default:
                        paymentDetails = '\n\nPor favor, contacta para coordinar tu pago. No se encontraron métodos de pago específicos para tu país.';
                }

                const formattedNumber = numero.replace(/\+/g, '') + '@s.whatsapp.net';

                // Construcción del mensaje con botones
                const buttons = [
                    { buttonId: 'payment_done', buttonText: { displayText: 'He realizado el pago' }, type: 1 },
                    { buttonId: 'need_help', buttonText: { displayText: 'Necesito ayuda con mi pago' }, type: 1 }
                ];

                const buttonMessage = {
                    text: mainReminderMessage + paymentDetails + '\n\n*Escoge una de las opciones:*',
                    buttons: buttons,
                    headerType: 1
                };

                clientsToSendReminders.push({ formattedNumber, buttonMessage, nombre, numero });
            }
        }

        console.log(`[DEBUG - AutoRecordatorio] Clientes a enviar recordatorio: ${clientsToSendReminders.length}`);

        for (let i = 0; i < clientsToSendReminders.length; i++) {
            const { formattedNumber, buttonMessage, nombre, numero } = clientsToSendReminders[i];

            console.log(`[DEBUG - AutoRecordatorio] Preparando envío a ${nombre} (${formattedNumber}).`);
            console.log(`[DEBUG - AutoRecordatorio] Mensaje con botones a enviar:\n---INICIO_MENSAJE---\n${buttonMessage.text}\n---FIN_MENSAJE---`);

            try {
                // Enviar mensaje con botones
                await client.sendMessage(formattedNumber, buttonMessage);

                console.log(`[DEBUG - AutoRecordatorio] Mensaje enviado exitosamente a ${formattedNumber}.`);

                if (global.db && global.db.data && global.db.data.users) {
                    global.db.data.users[formattedNumber] = global.db.data.users[formattedNumber] || {};
                    global.db.data.users[formattedNumber].awaitingPaymentResponse = true;
                    global.db.data.users[formattedNumber].paymentClientName = nombre;
                    global.db.data.users[formattedNumber].paymentClientNumber = numero;
                    console.log(`[DEBUG - AutoRecordatorio] Estado 'awaitingPaymentResponse' establecido para ${formattedNumber}.`);
                } else {
                    console.warn(`[DEBUG - AutoRecordatorio] ADVERTENCIA: global.db.data.users no está disponible para ${formattedNumber}.`);
                }

                const confirmationText = `✅ Recordatorio automático enviado a *${nombre}* (${numero}).`;
                await client.sendMessage(ADMIN_NUMBER_CONFIRMATION, { text: confirmationText });
                console.log(`[DEBUG - AutoRecordatorio] Confirmación enviada a admin para ${nombre}.`);

            } catch (sendError) {
                console.error(`[DEBUG - AutoRecordatorio] Error al enviar recordatorio automático a ${nombre} (${numero}):`, sendError);
                try {
                    await client.sendMessage(ADMIN_NUMBER_CONFIRMATION, { text: `❌ Falló el recordatorio automático a *${nombre}* (${numero}). Error: ${sendError.message || sendError}` });
                    console.log(`[DEBUG - AutoRecordatorio] Notificación de fallo enviada a admin para ${nombre}.`);
                } catch (adminError) {
                    console.error('[DEBUG - AutoRecordatorio] Error al enviar notificación de fallo al admin:', adminError);
                }
            }

            if (i < clientsToSendReminders.length - 1) {
                console.log(`[DEBUG - AutoRecordatorio] Esperando ${DELAY_BETWEEN_MESSAGES_MS}ms antes del siguiente recordatorio.`);
                await sleep(DELAY_BETWEEN_MESSAGES_MS);
            }
        }

        console.log('[DEBUG - AutoRecordatorio] sendAutomaticPaymentReminders finalizado.');

    } catch (error) {
        console.error('[DEBUG - AutoRecordatorio] Error CRÍTICO en la función sendAutomaticPaymentReminders:', error);
    }
}

export default sendAutomaticPaymentReminders;
