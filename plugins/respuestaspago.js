// plugins/manejar_respuesta_pago.js

let handler = async (m, { conn, text }) => {
    // [DEBUG] Mensaje recibido
    console.log(`[DEBUG - ManejarRespuesta] Mensaje recibido de: ${m.sender}, Texto: "${m.text}"`);

    // Asegúrate de que el mensaje es de un usuario y no un comando, y no es un grupo
    // IMPORTANTE: Si estás probando en un GRUPO, elimina o comenta '&& !m.isGroup'
    if (!m.isGroup && m.text && !m.text.startsWith('.')) {
        // [DEBUG] Cumple las condiciones básicas
        console.log(`[DEBUG - ManejarRespuesta] Cumple condiciones basicas (no grupo, es texto, no comando).`);
        const userJid = m.sender; // El ID del usuario que envió el mensaje
        
        // Verifica si estamos esperando una respuesta de pago de este usuario
        // [DEBUG] Verificando estado en DB
        console.log(`[DEBUG - ManejarRespuesta] Intentando acceder a global.db.data.users[${userJid}]:`, global.db?.data?.users?.[userJid]?.awaitingPaymentResponse);

        if (global.db && global.db.data && global.db.data.users && global.db.data.users[userJid] && global.db.data.users[userJid].awaitingPaymentResponse) {
            // [DEBUG] Estado 'awaitingPaymentResponse' es TRUE
            console.log(`[DEBUG - ManejarRespuesta] Awaiting response TRUE para ${userJid}.`);
            const response = text.trim(); // La respuesta del usuario
            
            // Recuperar el nombre y número de contacto del cliente de la base de datos
            const clientName = global.db.data.users[userJid].paymentClientName || 'cliente desconocido';
            const clientContactNumber = global.db.data.users[userJid].paymentClientNumber || userJid.split('@')[0];

            console.log(`[DEBUG - ManejarRespuesta] Respuesta recibida: "${response}", Nombre Cliente: "${clientName}", Numero Cliente: "${clientContactNumber}"`);

            // Reiniciar el estado para este usuario inmediatamente para evitar bucles
            global.db.data.users[userJid].awaitingPaymentResponse = false;
            delete global.db.data.users[userJid].paymentClientName; // Limpiar datos opcionales
            delete global.db.data.users[userJid].paymentClientNumber; // Limpiar datos opcionales

            try { // Añadimos un try/catch dentro por si falla el envío de mensajes
                switch (response) {
                    case '1':
                        // [DEBUG] Procesando Opción 1
                        console.log(`[DEBUG - ManejarRespuesta] Procesando Opción 1: "${response}".`);
                        await conn.reply(m.chat, `Si ya ha realizado su pago por favor enviar foto o documento de su pago con el siguiente texto "Aqui esta mi comprobante de pago"`, m);
                        break;
                    case '2':
                        // [DEBUG] Procesando Opción 2
                        console.log(`[DEBUG - ManejarRespuesta] Procesando Opción 2: "${response}".`);
                        await conn.reply(m.chat, `En un momento se comunicará mi creador contigo.`, m);
                        
                        const adminNotificationText = `👋 Hola creador, *${clientName}* (${clientContactNumber}) tiene problemas con su pago. Por favor comunícate con él/ella.`;
                        // [DEBUG] Enviando notificación a admin
                        console.log(`[DEBUG - ManejarRespuesta] Enviando notificación a admin: ${adminNotificationText}`);
                        await conn.sendMessage('5217771303481@c.us', { text: adminNotificationText });
                        break;
                    default:
                        // [DEBUG] Opción no reconocida
                        console.log(`[DEBUG - ManejarRespuesta] Opción no reconocida: "${response}". Manteniendo awaitingPaymentResponse en true.`);
                        await conn.reply(m.chat, `Por favor, ${clientName}, responde con '1' si ya realizaste el pago o '2' si necesitas ayuda.`, m);
                        global.db.data.users[userJid].awaitingPaymentResponse = true; 
                        global.db.data.users[userJid].paymentClientName = clientName;
                        global.db.data.users[userJid].paymentClientNumber = clientContactNumber;
                        break;
                }
            } catch (replyError) {
                console.error(`[DEBUG - ManejarRespuesta] Error al responder o notificar:`, replyError);
            }
        } else {
            // [DEBUG] Estado 'awaitingPaymentResponse' es FALSE o no hay entrada en DB
            console.log(`[DEBUG - ManejarRespuesta] Awaiting response FALSE o no existe global.db.data.users para ${userJid}.`);
        }
    } else {
        // [DEBUG] Mensaje no cumple condiciones básicas
        console.log(`[DEBUG - ManejarRespuesta] Mensaje no cumple condiciones basicas (es grupo o es comando). m.isGroup: ${m.isGroup}, m.text: "${m.text}", startsWith('.'): ${m.text?.startsWith('.')}`);
    }
};

handler.noLimit = true;

export default handler;
