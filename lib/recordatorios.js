// lib/recordatorios.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// Asegúrate de que pkg está importado si client.sendMessage lo necesita internamente.
// En caso de que Baileys tenga cambios, a veces es necesario.
// Si tu bot funciona sin él, puedes comentar o eliminar la siguiente línea.
// import pkg from '@whiskeysockets/baileys'; 

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
    const currentDayOfMonth = today.getDate(); // Día actual del mes

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1); // Calcula la fecha de mañana
    const tomorrowDayOfMonth = tomorrow.getDate(); // Día de mañana del mes

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
            let paymentDetails = ''; // Contendrá los detalles de pago (ya no 'Footer' ya que es texto plano)
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
                
                const formattedNumber = numero.replace(/\+/g, '') + '@c.us';
                // Combina el mensaje principal, los detalles de pago y las opciones de respuesta
                const fullMessage = mainReminderMessage + paymentDetails + `\n\n*Escoge una de las opciones:*\n1. He realizado el pago\n2. Necesito ayuda con mi pago`;

                clientsToSendReminders.push({ formattedNumber, fullMessage, nombre, numero });
            }
        }

        // Luego, enviamos los recordatorios con un retraso entre cada uno
        for (let i = 0; i < clientsToSendReminders.length; i++) {
            const { formattedNumber, fullMessage, nombre, numero } = clientsToSendReminders[i];
            
            try {
                // Enviar el mensaje de texto plano
                await client.sendMessage(formattedNumber, { text: fullMessage });
                
                // IMPORTANTE: Aquí es donde "preparamos" al bot para esperar una respuesta del cliente.
                // Guardamos en la base de datos que estamos esperando una respuesta
                // para el número al que se le envió el recordatorio.
                if (global.db && global.db.data && global.db.data.users) {
                    global.db.data.users[formattedNumber] = global.db.data.users[formattedNumber] || {};
                    global.db.data.users[formattedNumber].awaitingPaymentResponse = true;
                    global.db.data.users[formattedNumber].paymentClientName = nombre; // Guardar el nombre del cliente
                    global.db.data.users[formattedNumber].paymentClientNumber = numero; // Guardar el número original (+ prefijo)
                    console.log(`DEBUG: Establecido awaitingPaymentResponse para ${formattedNumber} (automático)`);
                }

                const confirmationText = `✅ Recordatorio automático enviado a *${nombre}* (${numero}).`;
                await client.sendMessage(ADMIN_NUMBER_CONFIRMATION, { text: confirmationText });

            } catch (sendError) {
                console.error(`Error al enviar el recordatorio automático a ${nombre} (${numero}):`, sendError); 
                try {
                    await client.sendMessage(ADMIN_NUMBER_CONFIRMATION, { text: `❌ Falló el recordatorio automático a *${nombre}* (${numero}). Error: ${sendError.message || sendError}` });
                } catch (adminError) {
                    console.error('Error al enviar la notificación de fallo al administrador:', adminError); 
                }
            }

            // <-- FUNCIONALIDAD: Añadir retraso después de enviar cada mensaje -->
            if (i < clientsToSendReminders.length - 1) { // No esperar después del último mensaje
                await sleep(DELAY_BETWEEN_MESSAGES_MS);
            }
            // <-------------------------------------------------------------------->
        }

    } catch (error) {
        console.error('Error en la función sendAutomaticPaymentReminders:', error); 
    }
}

export default sendAutomaticPaymentReminders;
