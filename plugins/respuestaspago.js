// plugins/manejar_respuesta_pago.js

let handler = async (m, { conn, text }) => {
    // Asegúrate de que el mensaje es de un usuario y no un comando
    if (!m.isGroup && m.text && !m.text.startsWith('.')) {
        const userJid = m.sender; // El ID del usuario que envió el mensaje (ej: 5217771234567@c.us)
        
        // Verifica si estamos esperando una respuesta de pago de este usuario
        if (global.db && global.db.data && global.db.data.users && global.db.data.users[userJid] && global.db.data.users[userJid].awaitingPaymentResponse) {
            const response = text.trim(); // La respuesta del usuario
            
            // Recuperar el nombre y número de contacto del cliente de la base de datos
            const clientName = global.db.data.users[userJid].paymentClientName || 'cliente desconocido';
            const clientContactNumber = global.db.data.users[userJid].paymentClientNumber || userJid.split('@')[0]; // Debería ser el número con + prefijo

            // Reiniciar el estado para este usuario inmediatamente para evitar bucles
            global.db.data.users[userJid].awaitingPaymentResponse = false;
            delete global.db.data.users[userJid].paymentClientName; // Limpiar datos opcionales
            delete global.db.data.users[userJid].paymentClientNumber; // Limpiar datos opcionales


            switch (response) {
                case '1':
                    // Respuesta para la Opción 1
                    await conn.reply(m.chat, `Si ya ha realizado su pago por favor enviar foto o documento de su pago con el siguiente texto "Aqui esta mi comprobante de pago"`, m);
                    // Opcional: Podrías notificar al administrador que el cliente va a enviar un comprobante
                    // await conn.sendMessage('5217771303481@c.us', { text: `🔔 *Comprobante Pendiente (Manual)*\nEl cliente *${clientName}* (${clientContactNumber}) ha respondido 'He realizado el pago' y está a la espera de enviar el comprobante.` });
                    break;
                case '2':
                    // Respuesta para la Opción 2
                    await conn.reply(m.chat, `En un momento se comunicará mi creador contigo.`, m);
                    
                    // Notificar al administrador con los detalles del cliente
                    const adminNotificationText = `👋 Hola creador, *${clientName}* (${clientContactNumber}) tiene problemas con su pago. Por favor comunícate con él/ella.`;
                    await conn.sendMessage('5217771303481@c.us', { text: adminNotificationText });
                    break;
                default:
                    // Si la respuesta no es 1 o 2, pero estábamos esperando una respuesta de pago
                    await conn.reply(m.chat, `Por favor, ${clientName}, responde con '1' si ya realizaste el pago o '2' si necesitas ayuda.`, m);
                    // Mantener esperando si la respuesta no es válida para que pueda volver a intentarlo
                    global.db.data.users[userJid].awaitingPaymentResponse = true; 
                    global.db.data.users[userJid].paymentClientName = clientName; // Re-establecer por si se borraron
                    global.db.data.users[userJid].paymentClientNumber = clientContactNumber; // Re-establecer por si se borraron
                    break;
            }
        }
    }
};

handler.noLimit = true; // No consumir límite de uso
handler.private = true; // Solo funciona en chats privados (si lo deseas, quítalo para grupos)

export default handler;
