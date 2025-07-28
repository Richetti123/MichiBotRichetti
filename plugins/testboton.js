// plugins/testboton.js

let handler = async (m, { conn, usedPrefix, command }) => {
    const testButtons = [
        {
            quickReplyButton: {
                displayText: '👋 Hola!',
                id: 'hola_test'
            }
        },
        {
            quickReplyButton: {
                displayText: '👍 Ok',
                id: 'ok_test'
            }
        }
    ];

    const testMessageContent = {
        text: "Este es un mensaje de prueba con botones.",
        footer: "Si ves los botones, ¡funciona!",
        templateButtons: testButtons,
    };

    try {
        await conn.sendMessage(m.chat, testMessageContent);
        m.reply('✅ Mensaje de prueba con botones enviado. Revisa tu chat.');
    } catch (e) {
        console.error('Error al enviar el mensaje de prueba con botones:', e);
        m.reply('❌ Falló el envío del mensaje de prueba con botones. Revisa la consola para más detalles.');
    }
};

handler.help = ['testboton'];
handler.tags = ['test'];
handler.command = /^(testboton)$/i;
handler.owner = true;

export default handler;
