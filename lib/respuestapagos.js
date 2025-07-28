// lib/respuestapagos.js

import fs from 'fs';
import path from 'path';

export async function manejarRespuestaPago(m, conn) {
  const sender = m.sender || m.key?.participant || m.key?.remoteJid;
  if (!sender) return false;

  const user = global.db?.data?.users?.[sender];
  if (!user) return false;

  console.log('🚀 manejarRespuestaPago llamado para:', sender);

  if (
    user.awaitingPaymentResponse &&
    !m.key.fromMe
  ) {
    const texto =
      m.text?.toString() ||
      m.message?.conversation?.toString() ||
      m.message?.extendedTextMessage?.text?.toString() ||
      '';

    const respuesta = texto.trim();
    console.log('Respuesta recibida:', respuesta);

    // Leer pagos.json
    const pagosPath = path.join(process.cwd(), 'src', 'pagos.json');
    let pagosData = {};
    try {
      if (fs.existsSync(pagosPath)) {
        pagosData = JSON.parse(fs.readFileSync(pagosPath, 'utf8'));
      }
    } catch (e) {
      console.error('Error leyendo pagos.json:', e);
    }

    const cliente = pagosData[user.paymentClientNumber] || {};
    const nombre = cliente.nombre || user.paymentClientName || "cliente";
    const numero = cliente.numero || user.paymentClientNumber || sender;

    // Obtener chatId para responder
    const chatId = m.chat || sender;

    if (respuesta === "1") {
      console.log('Enviando confirmación de pago al usuario');
      await conn.sendMessage(chatId, {
        text: `✅ *Si ya ha realizado su pago, por favor enviar foto o documento de su pago con el siguiente texto:*\n\n*"Aquí está mi comprobante de pago"* 📸`
      });
    } else if (respuesta === "2") {
      await conn.sendMessage(chatId, {
        text: `⚠️ En un momento se comunicará mi creador contigo.`
      });
      console.log('Intentando avisar al admin...');

      const adminJid = "5217771303481@s.whatsapp.net";
      const adminMessage = `👋 Hola creador, *${nombre}* (${numero}) tiene problemas con su pago. Por favor comunícate con él/ella.`;
      try {
        await conn.sendMessage(adminJid, { text: adminMessage });
        console.log('Mensaje enviado al admin con éxito');
      } catch (error) {
        console.error('Error enviando mensaje al admin:', error);
      }
      // Tampoco eliminar la bandera aquí
    } else {
      await conn.sendMessage(chatId, {
        text: `Por favor, responde solo con:\n1️⃣ He realizado el pago\n2️⃣ Necesito ayuda con mi pago`
      });
      return true;
    }

    return true;
  }

  // No se trata de una respuesta a un recordatorio de pago
  return false;
}
