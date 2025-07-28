// lib/respuestapagos.js

import fs from 'fs';
import path from 'path';

export async function manejarRespuestaPago(m, conn) {
  if (
    global.db?.data?.users?.[m.sender]?.awaitingPaymentResponse &&
    !m.key.fromMe &&
    typeof (m.text || m.message?.conversation || m.message?.extendedTextMessage?.text) === 'string'
  ) {
    const respuesta = (m.text || m.message?.conversation || m.message?.extendedTextMessage?.text || '').trim();
    const userData = global.db.data.users[m.sender];

    // Leer pagos.json
    const pagosPath = path.join(process.cwd(), 'src', 'pagos.json');
    const pagosData = JSON.parse(fs.readFileSync(pagosPath, 'utf8'));
    const cliente = pagosData[userData.paymentClientNumber] || {};

    const nombre = cliente.nombre || userData.paymentClientName || "cliente";
    const numero = cliente.numero || userData.paymentClientNumber || m.sender;

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
    delete global.db.data.users[m.sender].awaitingPaymentResponse;
    delete global.db.data.users[m.sender].paymentClientName;
    delete global.db.data.users[m.sender].paymentClientNumber;

    return true;
  }

  return false;
}
