const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(express.json());

// 🎯 BOT CONFIGURATION
const token = '8672725665:AAG-XveCMNup-IgWYXsDPAN1kZHwVh4mOzs';
const adminGroupId = '-1002302830381';
const bot = new TelegramBot(token, { polling: false });

// 🎯 ၁။ GET ROUTE (ဆာဗာ အလုပ်လုပ်မလုပ် Browser မှာ စမ်းသပ်ရန်)
app.get('/api/bot', (req, res) => {
  res.status(200).json({ status: "Hello Taxi Bot Server is Running Smoothly!" });
});

// 🎯 ၂။ TELEGRAM WEBHOOK ENDPOINT (Telegram ဘက်က Data တွေ ဝင်လာမည့်နေရာ)
app.post('/api/bot', (req, res) => {
  const update = req.body;

  // အကယ်၍ စာသားမက်ဆေ့ခ်ျ ဝင်လာလျှင်
  if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text || "";

    // /start ရိုက်လျှင် Web App ခလုတ်ကို ပြပေးမည်
    if (text === '/start') {
      bot.sendMessage(chatId, "မင်္ဂလာပါ Hello Taxi Bot မှ ကြိုဆိုပါတယ်ဗျာ။ အောက်ကခလုတ်ကိုနှိပ်ပြီး App ကို သုံးနိုင်ပါပြီ။", {
        reply_markup: {
          keyboard: [[
            { 
              text: "🚖 ဖွင့်မည် (Open App)", 
              web_app: { url: "https://hellotaxi-clean.vercel.app" } 
            }
          ]],
          resize_keyboard: true
        }
      });
    }
    
    // Web App (Form) ထဲကနေ Data တွေ ပို့လိုက်လျှင် ဖတ်မည့်အပိုင်း
    if (update.message.web_app_data) {
      handleWebAppData(chatId, update.message.web_app_data.data || "");
    }
  }

  // Inline Button (လက်ခံသည်) ကို ယာဉ်မောင်းက နှိပ်လျှင်
  if (update.callback_query) {
    const query = update.callback_query;
    if (query.data.startsWith('accept_')) {
      const passengerChatId = query.data.split('_').pop();
      
      bot.answerCallbackQuery(query.id, { text: "✅ သင် ခရီးစဉ်ကို လက်ခံလိုက်ပါပြီ။" });
      
      bot.editMessageText(`🚖 **ခရီးစဉ်ကို ယာဉ်မောင်းတစ်ဦးမှ လက်ခံသွားပါပြီ။**`, {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id
      });
      
      bot.sendMessage(passengerChatId, "🎉 သတင်းကောင်း! သင့်ခရီးစဉ်ကို ယာဉ်မောင်းမှ လက်ခံလိုက်ပါပြီ။ မကြာမီ ယာဉ်မောင်းမှ ဖုန်းဆက်ပါလိမ့်မည်။");
    }
  }

  res.sendStatus(200);
});

// 🎯 ၃။ WEB APP DATA များကို ကွဲပြားစွာ စီမံခွဲခွဲသည့် FUNCTION
function handleWebAppData(chatId, text) {
  
  // (က) ယာဉ်မောင်း KYC မှတ်ပုံတင်ခြင်း ဖြစ်လျှင်
  if (text.startsWith('driver_register_kyc:')) {
    try {
      const data = JSON.parse(text.replace('driver_register_kyc:', ''));
      const msg = `ℹ️ **ယာဉ်မောင်းအသစ် Register လွှာ**\n\n👤 အမည်: ${data.name}\n📞 ဖုန်း: ${data.phone}\n🚗 ကား: ${data.carType}\n🔢 နံပါတ်: ${data.carNumber}\n📍 မြို့နယ်: ${data.township}`;
      
      bot.sendMessage(adminGroupId, msg);
      bot.sendMessage(chatId, "✅ အချက်အလက်များကို ပို့သပြီးပါပြီ။ လူကြီးမင်းအကောင့်ကို မကြာမီ အတည်ပြုပေးပါမည်။");
    } catch (e) { 
      bot.sendMessage(chatId, "❌ အချက်အလက်ဖတ်ရသည်မှာ အဆင်မပြေပါ။"); 
    }
  }
  
  // (ခ) ခရီးသည်က ကား/ကုန်တင်ယာဉ် တောင်းဆိုခြင်း ဖြစ်လျှင်
  if (text.startsWith('ride_request:')) {
    try {
      const data = JSON.parse(text.replace('ride_request:', ''));
      let msg = `🚨 **ခရီးစဉ်အသစ် တောင်းဆိုမှု (${data.type})**\n\n`;
      
      if (data.type === "Instant Ride") {
        msg += `📍 ကြိုရမည့်နေရာ: ${data.pickup}\n🏁 သွားမည့်နေရာ: ${data.drop}\n💰 ပေးမည့်ဈေး: ${data.price} ကျပ်`;
      } else if (data.type === "Hourly Rental") {
        msg += `🕒 ကြာချိန်: ${data.hours}\n📅 နေ့ရက်/အချိန်: ${data.datetime}\n📍 ကြိုရမည့်နေရာ: ${data.pickup}`;
      } else if (data.type === "Out of Town (Daily)") {
        msg += `⛰️ သွားမည့်မြို့: ${data.destination}\n📅 စမည့်ရက်: ${data.startDate}\n⏳ ငှားမည့်ရက်: ${data.days}`;
      } else if (data.type === "Truck Service") {
        msg += `🚚 ယာဉ်အမျိုးအစား: ${data.truckType}\n📍 တင်မည့်နေရာ: ${data.pickup}\n🏁 ချမည့်နေရာ: ${data.drop}\n📦 ပစ္စည်းအမျိုးအစား: ${data.details}`;
      }

      // Group ထဲသို့ ခရီးစဉ်ပို့ပေးပြီး Driver လက်ခံရန် ခလုတ်ပါထည့်ပေးမည်
      bot.sendMessage(adminGroupId, msg, {
        reply_markup: {
          inline_keyboard: [[
            { text: "🚖 ခရီးစဉ်လက်ခံမည်", callback_data: `accept_${chatId}` }
          ]]
        }
      });

      bot.sendMessage(chatId, "✅ သင့်ခရီးစဉ်ကို အဖွဲ့ဝင်ယာဉ်မောင်းများဆီသို့ ပို့ဆောင်လိုက်ပါပြီ။ ယာဉ်မောင်းတစ်ဦးဦးမှ လက်ခံလျှင် အကြောင်းကြားပေးပါမည်ဗျာ။");
    } catch (e) {
      bot.sendMessage(chatId, "❌ ခရီးစဉ်အချက်အလက် မှားယွင်းနေပါသည်။");
    }
  }
}

module.exports = app;
