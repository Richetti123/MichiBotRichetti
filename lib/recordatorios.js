import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ADMIN_NUMBER_CONFIRMATION = '5217771303481@c.us'; // 

const DELAY_BETWEEN_MESSAGES_MS = 1800000; // 30 minutos

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

            let message = '';
            let shouldSend = false;

            if (diaPago === currentDayOfMonth) {
                message = `¡Hola ${nombre}! 👋 Es tu día de pago. Recuerda que tu monto es de ${monto}.`;
                shouldSend = true;
            } else if (diaPago === tomorrowDayOfMonth) {
                message = `¡Hola ${nombre}! 👋 Tu pago de ${monto} vence mañana. ¡No lo olvides!`;
                shouldSend = true;
            }

            if (shouldSend) {
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
                message += paymentDetails;
                const formattedNumber = numero.replace(/\+/g, '') + '@c.us';
                clientsToSendReminders.push({ formattedNumber, message, nombre, numero });
            }
        }

        // Luego, enviamos los recordatorios con un retraso entre cada uno
        for (let i = 0; i < clientsToSendReminders.length; i++) {
            const { formattedNumber, message, nombre, numero } = clientsToSendReminders[i];
            // console.log(`Attempting to send automatic reminder to ${nombre} (${formattedNumber}): ${message}`); // Eliminado
            try {
                await client.sendMessage(formattedNumber, { text: message });
                // console.log(`Automatic reminder sent successfully to ${nombre}.`); // Eliminado

                const confirmationText = `✅ Recordatorio automático enviado a *${nombre}* (${numero}).`;
                await client.sendMessage(ADMIN_NUMBER_CONFIRMATION, { text: confirmationText });

            } catch (sendError) {
                console.error(`Error sending automatic reminder to ${nombre} (${numero}):`, sendError); // Mantenido para errores
                // Opcional: Notificar al admin si un recordatorio automático FALLA
                try {
                    await client.sendMessage(ADMIN_NUMBER_CONFIRMATION, { text: `❌ Falló el recordatorio automático a *${nombre}* (${numero}). Error: ${sendError.message || sendError}` });
                } catch (adminError) {
                    console.error('Error sending failure notification to admin:', adminError); // Mantenido para errores
                }
            }

            // <-- NUEVA FUNCIONALIDAD: Añadir retraso después de enviar cada mensaje -->
            if (i < clientsToSendReminders.length - 1) { // No esperar después del último mensaje
                // console.log(`Waiting for ${DELAY_BETWEEN_MESSAGES_MS / 1000 / 60} minutes before sending next reminder...`); // Eliminado
                await sleep(DELAY_BETWEEN_MESSAGES_MS);
            }
            // <-------------------------------------------------------------------->
        }

    } catch (error) {
        console.error('Error in sendAutomaticPaymentReminders function:', error); // Mantenido para errores
    }
}

export default sendAutomaticPaymentReminders;
