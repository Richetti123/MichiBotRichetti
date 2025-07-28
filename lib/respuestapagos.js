// lib/respuestapagos.js

import fs from 'fs';
import path from 'path';

export async function manejarRespuestaPago(m, conn) {
  // Obtener el sender correcto según estructura del mensaje
  const sender = m.sender || m.key?.participant || m.key?.remoteJid;
  console.log('🚀 manejarRespuestaPago llamado para:', sender);

  const user = global.db?.data?.users?.[sender];

  if (
    user?.awaitingPaymentResponse &&
    !m.key.fromMe
  ) {
    // Extraer texto del mensaje
    const texto =
      (m.text && typeof m.text === 'string' && m.text) ||
      (m.message?.conversation && typeof m.message.conversation === 'string' && m.message.conversation) ||
      (m.message?.extendedTextMessage?.text && typeof m.message.extendedTextMessage.text === 'string' && m.message.extendedTextMessage.text) ||
      '';

    const respuesta = texto.trim();
    console.log('Respuesta recibida:', respuesta);

    // Leer pagos.json
    const pagosPath = path.join(process.cwd(), 'src', 'pagos.json');
    let pagosData = {};
    try {
      pagosData = JSON.parse(fs.readFileSync(pagosPath, 'utf8'));
    } catch (e) {
      console.error('Error leyendo pagos.json:', e);
    }

    const cliente = pagosData[user.paymentClientNumber] || {};

    const nombre = cliente.nombre || user.paymentClientName || "cliente";
    const numero = cliente.numero || user.paymentClientNumber || sender;

    if (respuesta === "1") {
      await conn.sendMessage(m.chat, {
        text: `✅ *Si ya ha realizado su pago, por favor enviar foto o documento de su pago con el siguiente texto:*\n\n*"Aquí está mi comprobante de pago"* 📸`
      });
    } else if (respuesta === "2") {
      await conn.sendMessage(m.chat, {
        text: `⚠️ En un momento se comunicará mi creador contigo.`
      });

      const adminMessage = `👋 Hola creador, *${nombre}* (${numero}) tiene problemas con su pago. Por favor comunícate con él/ella.`;
      await conn.sendMessage("5217771303481@c.us", { text: adminMessage });
    } else {
      await conn.sendMessage(m.chat, {
        text: `Por favor, responde solo con:\n1️⃣ He realizado el pago\n2️⃣ Necesito ayuda con mi pago`
      });
      return true;
    }

    // Limpiar el estado
    delete user.awaitingPaymentResponse;
    delete user.paymentClientName;
    delete user.paymentClientNumber;

    return true;
  }

  console.log('No es mensaje esperado para manejo de pago');
  return false;
}
