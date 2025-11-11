const { Telegraf } = require('telegraf');
const bot = new Telegraf('7498263491:AAH2k3d9i3z8fXj5KpLmNqRtYvBcDeFgHiJ'); // غيّر هذا بتوكنك

const ADMIN_ID = 123456789; // غيّر هذا بـ ID تيليجرامك
let user = {};

bot.start((ctx) => {
  user = { id: ctx.from.id, name: ctx.from.first_name };
  ctx.reply('مرحبا! 😊 أي نوع متجر تبغاه؟', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '👗 ملابس', callback_data: 'clothes' }],
        [{ text: '📱 إلكترونيات', callback_data: 'electronics' }],
        [{ text: '🛒 مواد غذائية', callback_data: 'food' }],
        [{ text: '🔧 أخرى', callback_data: 'other' }]
      ]
    }
  });
});

bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  
  if (['clothes', 'electronics', 'food', 'other'].includes(data)) {
    user.type = data;
    ctx.reply('كم منتج تبغى؟', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '5 (3,000 دج)', callback_data: '5' }],
          [{ text: '20 (15,000 دج)', callback_data: '20' }],
          [{ text: '50+ (40,000 دج)', callback_data: '50' }],
          [{ text: 'كل شيء + تطبيق (80,000 دج)', callback_data: '80' }]
        ]
      }
    });
  }

  if (['5', '20', '50', '80'].includes(data)) {
    user.products = data;
    const prices = { '5': 3000, '20': 15000, '50': 40000, '80': 80000 };
    user.price = prices[data];

    ctx.reply('دفع عند الاستلام؟', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ نعم', callback_data: 'cod_yes' }],
          [{ text: '❌ لا', callback_data: 'cod_no' }]
        ]
      }
    });
  }

  if (data === 'cod_yes' || data === 'cod_no') {
    user.cod = data === 'cod_yes' ? 'نعم' : 'لا';

    // عرض القوالب (يمكنك إضافة صور لاحقًا)
    ctx.reply(`السعر: *${user.price.toLocaleString()} دج*\nاختر قالبك:`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'قالب 1', callback_data: 'temp1' }],
          [{ text: 'قالب 2', callback_data: 'temp2' }],
          [{ text: 'قالب 3', callback_data: 'temp3' }]
        ]
      }
    });
  }

  if (['temp1', 'temp2', 'temp3'].includes(data)) {
    user.template = data;

    // طلب الرقم
    ctx.reply('أرسل لي رقم واتسابك (مثل: 0550123456)');

    bot.on('text', async (ctx) => {
      if (!user.phone && ctx.message.text.match(/^\d{10}$/)) {
        user.phone = ctx.message.text;

        // إرسال للعميل
        ctx.reply(`تم! ✅\nالسعر: *${user.price.toLocaleString()} دج*\nسنتصل بك خلال ساعة.`);

        // إرسال للأدمن
        const msg = `
🔔 طلب جديد!
العميل: @${ctx.from.username || 'غير معروف'}
الاسم: ${user.name}
نوع: ${user.type}
منتجات: ${user.products}
السعر: ${user.price.toLocaleString()} دج
COD: ${user.cod}
القالب: ${user.template}
الرقم: ${user.phone}
        `.trim();

        await bot.telegram.sendMessage(ADMIN_ID, msg);
        user = {};
      }
    });
  }
});

bot.launch();
console.log('البوت شغال! 🚀');
