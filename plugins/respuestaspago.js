// plugins/respuestaspago.js

console.log("[DEBUG - Carga] respuestaspago.js se esta intentando cargar.");

let handler = async (m, { conn, text }) => {
    console.log(`[DEBUG - ManejarRespuesta - INICIO HANDLER] Función handler activada para: ${m.sender}, Tipo de mensaje: ${m.type}, Contenido (m.text): "${m.text}", esGrupo: ${m.isGroup}`);

    // La condición !m.isGroup ya está cubierta por handler.private = true
    // y la condición de !m.text.startsWith('.') ya está cubierta por el regex en handler.command
    // por lo que solo necesitamos asegurarnos de que m.text exista.
    if (m.text) { // Simplificamos la condición inicial aquí
        console.log(`[DEBUG - ManejarRespuesta] Mensaje detectado por RegEx command.`);
        const userJid = m.sender; 
        
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
        console.log(`[DEBUG - ManejarRespuesta] Mensaje NO CUMPLE condiciones basicas (por si acaso). Detalles: m.isGroup: ${m.isGroup}, m.text (existe): ${!!m.text}, m.text (valor): "${m.text}", startsWith('.'): ${m.text?.startsWith('.')}, handler.private: ${handler.private}`);
    }
};

handler.noLimit = true;
handler.private = true; 
// *** AQUÍ ESTÁ EL CAMBIO CLAVE para la Alternativa 1 ***
// Esto hará que el handler se dispare si el texto es exactamente '1' o '2' (ignorando mayúsculas/minúsculas)
handler.command = /^(1|2)$/i; 
// Si tu framework requiere un prefijo para comandos, esto podría no funcionar sin que el usuario lo escriba.

export default handler;
