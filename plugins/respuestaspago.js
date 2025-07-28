// plugins/respuestaspago.js

console.log("[DEBUG - Carga] respuestaspago.js se esta intentando cargar.");

let handler = async (m, { conn, text }) => {
    // [DEBUG] Mensaje recibido (esta línea debería salir SIEMPRE que recibas un mensaje)
    console.log(`[DEBUG - ManejarRespuesta] Mensaje recibido de: ${m.sender}, Texto: "${m.text}"`);

    // La condición clave para que el handler se active
    if (!m.isGroup && m.text && !m.text.startsWith('.')) {
        // [DEBUG] Cumple las condiciones basicas
        console.log(`[DEBUG - ManejarRespuesta] Cumple condiciones basicas (no grupo, es texto, no comando).`);
        const userJid = m.sender; 
        
        // Verifica si estamos esperando una respuesta de pago de este usuario
        console.log(`[DEBUG - ManejarRespuesta] Intentando acceder a global.db.data.users[${userJid}]:`, global.db?.data?.users?.[userJid]?.awaitingPaymentResponse);

        if (global.db && global.db.data && global.db.data.users && global.db.data.users[userJid] && global.db.data.users[userJid].awaitingPaymentResponse) {
            console.log(`[DEBUG - ManejarRespuesta] Awaiting response TRUE para ${userJid}.`);
            const response = text.trim(); 
            
            const clientName = global.db.data.users[userJid].paymentClientName || 'cliente desconocido';
            const clientContactNumber = global.db.data.users[userJid].paymentClientNumber || userJid.split('@')[0];

            console.log(`[DEBUG - ManejarRespuesta] Respuesta recibida: "${response}", Nombre Cliente: "${clientName}", Numero Cliente: "${clientContactNumber}"`);

            global.db.data.users[userJid].awaitingPaymentResponse = false;
            delete global.db.data.users[userJid].paymentClientName;
            delete global.db.data.users[userJid].paymentClientNumber;

            try {
                switch (response) {
                    case '1':
                        console.log(`[DEBUG - ManejarRespuesta] Procesando Opción 1: "${response}".`);
                        await conn.reply(m.chat, `Si ya ha realizado su pago por favor enviar foto o documento de su pago con el siguiente texto "Aqui esta mi comprobante de pago"`, m);
                        break;
                    case '2':
                        console.log(`[DEBUG - ManejarRespuesta] Procesando Opción 2: "${response}".`);
                        await conn.reply(m.chat, `En un momento se comunicará mi creador contigo.`, m);
                        
                        const adminNotificationText = `👋 Hola creador, *${clientName}* (${clientContactNumber}) tiene problemas con su pago. Por favor comunícate con él/ella.`;
                        console.log(`[DEBUG - ManejarRespuesta] Enviando notificación a admin: ${adminNotificationText}`);
                        await conn.sendMessage('5217771303481@c.us', { text: adminNotificationText });
                        break;
                    default:
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
            console.log(`[DEBUG - ManejarRespuesta] Awaiting response FALSE o no existe global.db.data.users para ${userJid}.`);
        }
    } else {
        // [DEBUG] Esta es la línea CLAVE ahora mismo para ver por qué no entra al handler
        console.log(`[DEBUG - ManejarRespuesta] Mensaje NO CUMPLE condiciones basicas. Detalles: m.isGroup: ${m.isGroup}, m.text: "${m.text}", startsWith('.'): ${m.text?.startsWith('.')}, handler.private: ${handler.private}`);
    }
};

handler.noLimit = true;
handler.private = true; 

export default handler;
