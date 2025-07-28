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

    if (respuesta === "1") {
      await conn.sendMessage(m.chat, {
        text: `✅ *Si ya ha realizado su pago, por favor enviar foto o documento de su pago con el siguiente texto:*\n\n*"Aquí está mi comprobante de pago"* 📸`
      });

      await conn.sendMessage("5217771303481@s.whatsapp.net", {
        text: `🟢 *${nombre}* (${numero}) confirmó que ha realizado su pago.`
      });

    } else if (respuesta === "2") {
      await conn.sendMessage(m.chat, {
        text: `⚠️ En un momento se comunicará mi creador contigo.`
      });

      await conn.sendMessage("5217771303481@s.whatsapp.net", {
        text: `🔴 *${nombre}* (${numero}) necesita ayuda con su pago.`
      });

    } else {
      await conn.sendMessage(m.chat, {
        text: `❗ Por favor, responde solo con:\n1️⃣ He realizado el pago\n2️⃣ Necesito ayuda con mi pago`
      });
      return true;
    }

    delete user.awaitingPaymentResponse;
    delete user.paymentClientName;
    delete user.paymentClientNumber;

    return true;
  }

  return false;
}
