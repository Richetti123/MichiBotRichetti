// lib/recordatorios.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// <--- NÚMERO DEL ADMINISTRADOR: Puedes mover esto a config.js si lo deseas --->
const ADMIN_NUMBER_CONFIRMATION = '5217771303481@c.us'; // Tu número sin el '+' y con '@c.us' al final
// <-------------------------------------------------------------------------->

// <--- NUEVA CONFIGURACIÓN: Retraso entre mensajes automáticos (en milisegundos) --->
// 30 minutos = 30 * 60 * 1000 = 1,800,000 milisegundos
const DELAY_BETWEEN_MESSAGES_MS = 1800000; // 30 minutos
// <--------------------------------------------------------------------------------->

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Función de utilidad para crear un retraso
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendAutomaticPaymentReminders(client) {
    const today = new Date();
    const currentDayOfMonth = today.getDate(); // Current day of the month

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1); // Calculate tomorrow's date
    const tomorrowDayOfMonth = tomorrow.getDate(); // Tomorrow's day of the month

    try {
        const paymentsFilePath = path.join(__dirname, '..', 'src', 'pagos.json');

        let clientsData = {};
        if (fs.existsSync(paymentsFilePath)) {
            clientsData = JSON.parse(fs.readFileSync(paymentsFilePath, 'utf8'));
        } else {
            fs.writeFileSync(paymentsFilePath, JSON.stringify({}, null, 2), 'utf8');
        }

        const clientsToSendReminders = [];

        // Primero, recopilamos todos los clientes a los que se les debe enviar un recordatorio
        for (const phoneNumberKey in clientsData) {
            const clientInfo = clientsData[phoneNumberKey];
            const numero = phoneNumberKey;
            const { diaPago, monto, bandera, nombre } = clientInfo;

            let mainReminderMessage = ''; // Contendrá el texto principal del mensaje
            let paymentDetailsFooter = ''; // Contendrá los detalles de pago para el footer
            let shouldSend = false;

            if (diaPago === currentDayOfMonth) {
                mainReminderMessage = `¡Hola ${nombre}! 👋 Es tu día de pago. Recuerda que tu monto es de ${monto}.`;
                shouldSend = true;
            } else if (diaPago === tomorrowDayOfMonth) {
                mainReminderMessage = `¡Hola ${nombre}! 👋 Tu pago de ${monto} vence mañana. ¡No lo olvides!`;
                shouldSend = true;
            }

            if (shouldSend) {
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
                
                const formattedNumber = numero.replace(/\+/g, '') + '@c.us';
                clientsToSendReminders.push({ formattedNumber, mainReminderMessage, paymentDetailsFooter, nombre, numero });
            }
        }

        // Luego, enviamos los recordatorios con un retraso entre cada uno
        for (let i = 0; i < clientsToSendReminders.length; i++) {
            const { formattedNumber, mainReminderMessage, paymentDetailsFooter, nombre, numero } = clientsToSendReminders[i];
            
            // Definir los botones
            const buttons = [
                {
                    quickReplyButton: {
                        displayText: '✅ He realizado el pago',
                        id: 'pago_realizado' // Este ID se envía al bot si se presiona el botón
                    }
                },
                {
                    quickReplyButton: {
                        displayText: '💬 Necesito ayuda',
                        id: 'ayuda_pago' // Este ID se envía al bot si se presiona el botón
                    }
                }
            ];

            // Crear el contenido del mensaje con botones
            const messageContent = {
                text: mainReminderMessage,
                footer: paymentDetailsFooter, // El footer contiene los detalles de pago
                templateButtons: buttons,
                // Puedes añadir headerType: 1 si solo quieres un encabezado de texto sin imagen/video
                // headerType: 1 
            };

            try {
                await client.sendMessage(formattedNumber, messageContent);
                
                const confirmationText = `✅ Recordatorio automático enviado a *${nombre}* (${numero}).`;
                await client.sendMessage(ADMIN_NUMBER_CONFIRMATION, { text: confirmationText });

            } catch (sendError) {
                console.error(`Error sending automatic reminder to ${nombre} (${numero}):`, sendError); 
                try {
                    await client.sendMessage(ADMIN_NUMBER_CONFIRMATION, { text: `❌ Falló el recordatorio automático a *${nombre}* (${numero}). Error: ${sendError.message || sendError}` });
                } catch (adminError) {
                    console.error('Error sending failure notification to admin:', adminError); 
                }
            }

            // <-- FUNCIONALIDAD: Añadir retraso después de enviar cada mensaje -->
            if (i < clientsToSendReminders.length - 1) { // No esperar después del último mensaje
                await sleep(DELAY_BETWEEN_MESSAGES_MS);
            }
            // <-------------------------------------------------------------------->
        }

    } catch (error) {
        console.error('Error in sendAutomaticPaymentReminders function:', error); 
    }
}

export default sendAutomaticPaymentReminders;
