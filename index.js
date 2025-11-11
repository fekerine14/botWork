require('dotenv').config();
const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = process.env.ADMIN_ID;

// قوالب جاهزة (Shadcn UI) مع صور + روابط
const TEMPLATES = {
  temp1: {
    name: "قالب الأناقة (ملابس)",
    image: "https://images.unsplash.com/photo-1441986300917-64672809604f?w=800",
    link: "https://ecom-fashion.vercel.app",
    price: 0
  },
  temp2: {
    name: "قالب التكنولوجيا (إلكترونيات)",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800",
    link: "https://ecom-tech.vercel.app",
    price: 0
  },
  temp3: {
    name: "قالب السوبر ماركت (غذائي)",
    image: "https://images.unsplash.com/photo-1542838132-92c328c728e9?w=800",
    link: "https://ecom-market.vercel.app",
    price: 0
  }
};

// الأسعار
const PRICES = {
  '5': { name: '5 منتجات', price: 3000 },
  '20': { name: '20 منتج', price: 15000 },
  '50': { name: '50+ منتج', price: 40000 },
  '80': { name: 'كل شيء + تطبيق', price: 80000 }
};

let user = {};

// إشعار آمن للأدمن
async function notifyAdmin(msg) {
  try {
    await bot.telegram.sendMessage(ADMIN_ID, msg, { parse_mode: 'Markdown' });
  } catch (err) {
    console.log('Admin not reachable (send "hi" once):', err.message);
  }
}

// تجاهل الأخطاء القديمة
bot.catch((err, ctx) => {
  if (err.description?.includes('query is too old') || err.description?.includes('timeout')) {
    console.log('Ignored: old or expired callback');
    return;
  }
  console.error('Bot error:', err);
});

// بداية البوت
bot.start((ctx) => {
  user = { id: ctx.from.id, name: ctx.from.first_name, username: ctx.from.username || 'غير معروف' };
  
  ctx.replyWithMarkdown(`*مرحبا ${user.name}!* 😊  
أي نوع متجر تبغاه؟`, {
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

// معالجة الاختيارات
bot.on('callback_query', async (ctx) => {
  try {
    await ctx.answerCbQuery();
  } catch (err) {
    console.log('Ignored expired callback:', err.message);
    return;
  }

  const data = ctx.callbackQuery.data;

  if (['clothes', 'electronics', 'food', 'other'].includes(data)) {
    user.type = data;
    const typeText = { clothes: 'ملابس', electronics: 'إلكترونيات', food: 'مواد غذائية', other: 'أخرى' }[data];
    
    ctx.replyWithMarkdown(`*نوع المتجر:* ${typeText}\n\nكم منتج تبغى؟`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: `5 (${PRICES['5'].price.toLocaleString()} دج)`, callback_data: '5' }],
          [{ text: `20 (${PRICES['20'].price.toLocaleString()} دج)`, callback_data: '20' }],
          [{ text: `50+ (${PRICES['50'].price.toLocaleString()} دج)`, callback_data: '50' }],
          [{ text: `كل شيء + تطبيق (${PRICES['80'].price.toLocaleString()} دج)`, callback_data: '80' }]
        ]
      }
    });
  }

  if (Object.keys(PRICES).includes(data)) {
    user.package = PRICES[data];
    user.price = user.package.price;

    ctx.replyWithMarkdown(`*الباقة:* ${user.package.name} (${user.price.toLocaleString()} دج)\n\nدفع عند الاستلام؟`, {
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

    const keyboard = Object.entries(TEMPLATES).map(([key, temp]) => 
      [{ text: temp.name, callback_data: key }]
    );

    ctx.replyWithMarkdown(`*السعر النهائي:* ${user.price.toLocaleString()} دج\n\nاختر القالب اللي يعجبك:`, {
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  if (Object.keys(TEMPLATES).includes(data)) {
    user.template = TEMPLATES[data];
    
    await ctx.replyWithPhoto(
      { url: user.template.image },
      { 
        caption: `*القالب:* ${user.template.name}\n🔗 [شاهد القالب مباشرة](${user.template.link})\n\nأرسل رقم واتسابك (مثل: 0550123456)`,
        parse_mode: 'Markdown'
      }
    );

    // انتظار الرقم
    bot.on('text', async (msgCtx) => {
      if (!user.phone && msgCtx.message.text.match(/^\d{10}$/)) {
        user.phone = msgCtx.message.text;

        await msgCtx.replyWithMarkdown(`*تم الطلب!*\nالسعر: *${user.price.toLocaleString()} دج*\nسنتصل بك خلال ساعة 📞`);

        const adminMsg = `
*طلب جديد!*

العميل: @${user.username}
الاسم: ${user.name}
نوع المتجر: ${user.type}
الباقة: ${user.package.name}
السعر: *${user.price.toLocaleString()} دج*
دفع عند الاستلام: ${user.cod}
القالب: ${user.template.name}
رقم الواتساب: ${user.phone}
رابط القالب: ${user.template.link}
        `.trim();

        await notifyAdmin(adminMsg);
        user = {};
      } else if (!user.phone) {
        msgCtx.reply('⚠️ أرسل رقم واتساب صحيح (10 أرقام)');
      }
    });
  }
});

// إشعار عند بدء التشغيل
setTimeout(() => {
  notifyAdmin('🟢 *البوت الاحترافي شغال الآن!* جاهز لاستقبال الطلبات.');
}, 5000);

bot.launch();
console.log('البوت الاحترافي شغال! 🚀');
