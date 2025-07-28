// plugins/respuestaspago.js

console.log("[DEBUG - Carga] respuestaspago.js se esta intentando cargar."); // Este sale al iniciar el bot

let handler = async (m, { conn, text }) => {
    // *** ESTA ES LA LÍNEA MÁS CRÍTICA DE DEPURACIÓN AHORA MISMO ***
    console.log(`[DEBUG - ManejarRespuesta - INICIO HANDLER] Función handler activada para: ${m.sender}, Tipo de mensaje: ${m.type}, Contenido (m.text): "${m.text}", esGrupo: ${m.isGroup}`);

    // Asegúrate de que el mensaje es de un usuario y no un comando, y no es un grupo
    // Ya confirmaste que handler.private = true y que pruebas en privado, así que !m.isGroup debería ser TRUE
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
        // [DEBUG] Mensaje NO CUMPLE las condiciones básicas.
        // Esta línea nos dirá exactamente por qué no se procesa.
        console.log(`[DEBUG - ManejarRespuesta] Mensaje NO CUMPLE condiciones basicas. Detalles: m.isGroup: ${m.isGroup}, m.text (existe): ${!!m.text}, m.text (valor): "${m.text}", startsWith('.'): ${m.text?.startsWith('.')}, handler.private: ${handler.private}`);
    }
};

handler.noLimit = true;
handler.private = false; // Mantenerlo en true si pruebas en chat privado.

export default handler;
