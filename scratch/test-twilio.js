require('dotenv').config();
const fetch = require('node-fetch');

async function testTwilio() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  const to = process.env.DEFAULT_PHONE;

  console.log('Sending test message...');
  console.log('From:', from);
  console.log('To:', to);

  const body = new URLSearchParams({
    From: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
    To: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
    Body: "🚀 Teste StayAssist AI: Sua integração com WhatsApp está funcionando perfeitamente! 🏨✨",
  });

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      }
    );

    const data = await response.json();
    if (response.ok) {
      console.log('✅ Success! Message SID:', data.sid);
    } else {
      console.error('❌ Error from Twilio:', data.message);
    }
  } catch (error) {
    console.error('❌ Network/System Error:', error.message);
  }
}

testTwilio();
