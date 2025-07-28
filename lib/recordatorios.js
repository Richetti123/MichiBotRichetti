// lib/recordatorios.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from '@whiskeysockets/baileys';
const { proto, generateWAMessageFromContent } = pkg;

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
                
                const formattedNumber = numero.replace(/\+/g, '') + '@c.us'; // <-- formattedNumber se define aquí
                clientsToSendReminders.push({ formattedNumber, mainReminderMessage, paymentDetailsFooter, nombre, numero });
            }
        }

        // Luego, enviamos los recordatorios con un retraso entre cada uno
        for (let i = 0; i < clientsToSendReminders.length; i++) {
            const { formattedNumber, mainReminderMessage, paymentDetailsFooter, nombre, numero } = clientsToSendReminders[i];
            
            // Definir las secciones y filas para el botón de lista
            const sections = [
                {
                    title: "Opciones de Pago", // Título de la sección
                    rows: [
                        {
                            header: "✅",
                            title: "He realizado el pago",
                            description: "Haz clic si ya pagaste.",
                            id: "pago_realizado"
                        },
                        {
                            header: "💬",
                            title: "Necesito ayuda",
                            description: "Presiona para contactar soporte.",
                            id: "ayuda_pago"
                        }
                    ]
                }
            ];

            // Crear el botón de lista
            const listButton = {
                name: "single_select",
                buttonParamsJson: JSON.stringify({
                    title: "Selecciona una opción", // Título del botón que se muestra en el mensaje
                    sections: sections
                })
            };

            // Crear el mensaje interactivo con el botón de lista
            const interactiveMessage = proto.Message.InteractiveMessage.create({
                body: proto.Message.InteractiveMessage.Body.create({
                    text: mainReminderMessage // Cuerpo del mensaje
                }),
                footer: proto.Message.InteractiveMessage.Footer.create({
                    text: paymentDetailsFooter // Pie de página con detalles de pago
                }),
                header: proto.Message.InteractiveMessage.Header.create({
                    title: "Recordatorio de Pago", // Título principal
                    subtitle: "¡No olvides tu pago!", // Subtítulo
                    hasMediaAttachment: false // No hay imagen/video en el encabezado
                }),
                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                    buttons: [listButton], // Aquí va el botón de lista
                })
            });

            // Generar el mensaje completo para enviar
            const msg = await generateWAMessageFromContent(formattedNumber, { // <-- Aquí ya no hay viewOnceMessage
                "messageContextInfo": {
                    "deviceListMetadata": {},
                    "deviceListMetadataVersion": 2
                },
                interactiveMessage: interactiveMessage
            }, { userJid: formattedNumber, quoted: null }); // <-- CORRECCIÓN AQUÍ: userJid debe ser formattedNumber (ya está definido)

            try {
                // Enviar el mensaje interactivo usando client.relayMessage
                await client.relayMessage(formattedNumber, msg.message, { messageId: msg.key.id });
                
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
