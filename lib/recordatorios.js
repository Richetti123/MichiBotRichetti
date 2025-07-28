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
    console.log('[DEBUG - AutoRecordatorio] Iniciando sendAutomaticPaymentReminders.'); // Debug de inicio
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
            console.log('[DEBUG - AutoRecordatorio] pagos.json cargado exitosamente.'); // Debug de carga de datos
        } else {
            fs.writeFileSync(paymentsFilePath, JSON.stringify({}, null, 2), 'utf8');
            console.log('[DEBUG - AutoRecordatorio] pagos.json no encontrado, creando archivo vacío.'); // Debug de archivo no encontrado
        }

        const clientsToSendReminders = [];

        // Primero, recopilamos todos los clientes a los que se les debe enviar un recordatorio
        for (const phoneNumberKey in clientsData) {
            const clientInfo = clientsData[phoneNumberKey];
            const numero = phoneNumberKey; // Este es el número con el '+'
            const { diaPago, monto, bandera, nombre } = clientInfo;

            let mainReminderMessage = ''; // Contendrá el texto principal del mensaje
            let paymentDetails = ''; // Contendrá los detalles de pago
            let shouldSend = false;

            console.log(`[DEBUG - AutoRecordatorio] Procesando cliente: ${nombre} (Día de Pago: ${diaPago}, Hoy: ${currentDayOfMonth}, Mañana: ${tomorrowDayOfMonth}).`); // Debug de cliente

            if (diaPago === currentDayOfMonth) {
                mainReminderMessage = `¡Hola ${nombre}! 👋 Es tu día de pago. Recuerda que tu monto es de ${monto}.`;
                shouldSend = true;
            } else if (diaPago === tomorrowDayOfMonth) {
                mainReminderMessage = `¡Hola ${nombre}! 👋 Tu pago de ${monto} vence mañana. ¡No lo olvides!`;
                shouldSend = true;
            }

            if (shouldSend) {
                console.log(`[DEBUG - AutoRecordatorio] Cliente ${nombre} cumple condición de envío.`); // Debug si se enviará
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
                
                const formattedNumber = numero.replace(/\+/g, '') + '@c.us'; // Convierte +521... a 521...@c.us
                
                // --- La construcción del mensaje FINAL con las opciones ---
                const fullMessage = mainReminderMessage + paymentDetails + `\n\n*Escoge una de las opciones:*\n1. He realizado el pago\n2. Necesito ayuda con mi pago`;

                clientsToSendReminders.push({ formattedNumber, fullMessage, nombre, numero }); // 'numero' es el original con '+'
            }
        }
        console.log(`[DEBUG - AutoRecordatorio] Clientes a enviar recordatorio: ${clientsToSendReminders.length}`); // Debug cantidad de clientes

        // Luego, enviamos los recordatorios con un retraso entre cada uno
        for (let i = 0; i < clientsToSendReminders.length; i++) {
            const { formattedNumber, fullMessage, nombre, numero } = clientsToSendReminders[i]; // 'numero' es el original con '+'
            
            console.log(`[DEBUG - AutoRecordatorio] Preparando envío a ${nombre} (${formattedNumber}).`); // Debug pre-envío
            console.log(`[DEBUG - AutoRecordatorio] Mensaje completo a enviar: \n---INICIO_MENSAJE---\n${fullMessage}\n---FIN_MENSAJE---`); // DEBUG: Muestra el mensaje completo

            try {
                // Enviar el mensaje de texto plano
                await client.sendMessage(formattedNumber, { text: fullMessage });
                
                console.log(`[DEBUG - AutoRecordatorio] Mensaje enviado exitosamente a ${formattedNumber}.`); // Debug de envío exitoso

                // --- Establecer el estado 'awaitingPaymentResponse' ---
                if (global.db && global.db.data && global.db.data.users) {
                    global.db.data.users[formattedNumber] = global.db.data.users[formattedNumber] || {};
                    global.db.data.users[formattedNumber].awaitingPaymentResponse = true;
                    global.db.data.users[formattedNumber].paymentClientName = nombre; // Guarda el nombre
                    global.db.data.users[formattedNumber].paymentClientNumber = numero; // Guarda el número original con '+'
                    console.log(`[DEBUG - AutoRecordatorio] Estado 'awaitingPaymentResponse' establecido para ${formattedNumber}.`); // Debug de estado establecido
                } else {
                    console.warn(`[DEBUG - AutoRecordatorio] ADVERTENCIA: global.db.data.users no está disponible. No se pudo establecer 'awaitingPaymentResponse' para ${formattedNumber}.`); // Advertencia si DB no está lista
                }

                const confirmationText = `✅ Recordatorio automático enviado a *${nombre}* (${numero}).`;
                await client.sendMessage(ADMIN_NUMBER_CONFIRMATION, { text: confirmationText });
                console.log(`[DEBUG - AutoRecordatorio] Confirmación enviada a admin para ${nombre}.`); // Debug de confirmación a admin

            } catch (sendError) {
                console.error(`[DEBUG - AutoRecordatorio] Error al enviar recordatorio automático a ${nombre} (${numero}):`, sendError); 
                try {
                    await client.sendMessage(ADMIN_NUMBER_CONFIRMATION, { text: `❌ Falló el recordatorio automático a *${nombre}* (${numero}). Error: ${sendError.message || sendError}` });
                    console.log(`[DEBUG - AutoRecordatorio] Notificación de fallo enviada a admin para ${nombre}.`); // Debug de fallo a admin
                } catch (adminError) {
                    console.error('[DEBUG - AutoRecordatorio] Error al enviar la notificación de fallo al administrador:', adminError); 
                }
            }

            // <-- FUNCIONALIDAD: Añadir retraso después de enviar cada mensaje -->
            if (i < clientsToSendReminders.length - 1) { // No esperar después del último mensaje
                console.log(`[DEBUG - AutoRecordatorio] Esperando ${DELAY_BETWEEN_MESSAGES_MS}ms antes del siguiente recordatorio.`); // Debug de espera
                await sleep(DELAY_BETWEEN_MESSAGES_MS);
            }
            // <-------------------------------------------------------------------->
        }
        console.log('[DEBUG - AutoRecordatorio] sendAutomaticPaymentReminders finalizado.'); // Debug de finalización

    } catch (error) {
        console.error('[DEBUG - AutoRecordatorio] Error CRÍTICO en la función sendAutomaticPaymentReminders:', error); 
    }
}

export default sendAutomaticPaymentReminders;
