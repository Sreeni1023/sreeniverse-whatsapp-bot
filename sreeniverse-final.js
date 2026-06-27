/**
 * SREENIVERSE WHATSAPP BOT v5.0
 * Clean English | Impressive UI | Hi Loop Protection
 * SreeniVerse Technologies, Hyderabad
 */

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs');
const qrcode = require('qrcode-terminal');

const CONFIG = {
    sessionPath: './auth_session',
    messageDelay: { min: 2000, max: 4000 },
    typingDelay: { min: 1000, max: 2000 },
    dailyLimit: 225,
    reconnectAttempts: 5,
    reconnectDelay: 8000,
    maxHiReplies: 3,
};

const logger = {
    info:  (msg) => console.log(`[INFO]  ${new Date().toLocaleString('en-IN')} » ${msg}`),
    warn:  (msg) => console.log(`[WARN]  ${new Date().toLocaleString('en-IN')} » ${msg}`),
    error: (msg) => console.log(`[ERROR] ${new Date().toLocaleString('en-IN')} » ${msg}`),
};

let messageCount = 0;
let lastResetDate = new Date().toDateString();

const blacklist = new Set();
const blacklistFile = './blacklist.json';
function loadBlacklist() {
    try { if (fs.existsSync(blacklistFile)) JSON.parse(fs.readFileSync(blacklistFile,'utf8')).forEach(n=>blacklist.add(n)); } catch(e) {}
}
function saveBlacklist() {
    try { fs.writeFileSync(blacklistFile, JSON.stringify([...blacklist],null,2)); } catch(e) {}
}

const hiCountFile = './hi_count.json';
let hiCountMap = {};
function loadHiCount() {
    try { if (fs.existsSync(hiCountFile)) hiCountMap = JSON.parse(fs.readFileSync(hiCountFile,'utf8')); } catch(e) {}
}
function saveHiCount() {
    try { fs.writeFileSync(hiCountFile, JSON.stringify(hiCountMap,null,2)); } catch(e) {}
}
function getHiCount(p) { return hiCountMap[p] || 0; }
function incrementHiCount(p) { hiCountMap[p]=(hiCountMap[p]||0)+1; saveHiCount(); }

const randomDelay = (min,max) => new Promise(r=>setTimeout(r,min+Math.random()*(max-min)));
function checkDailyReset() {
    const today = new Date().toDateString();
    if (today !== lastResetDate) { messageCount=0; lastResetDate=today; }
}
function isNight() { const h=new Date().getHours(); return h>=22||h<7; }

// ── ALL MESSAGES ──────────────────────────────────────────────────────────────

const WELCOME = `✨ *Hey there! Welcome!* 👋

🚀 *SreeniVerse Technologies*
_Hyderabad's Smart Digital Growth Partner_

We help local businesses get more customers,
more visibility & more revenue — online! 💡

━━━━━━━━━━━━━━━━━━━━━━
🎯 *HOW CAN WE HELP YOU?*
━━━━━━━━━━━━━━━━━━━━━━

1️⃣  📍 Google Business Profile
2️⃣  📣 Social Media Management
3️⃣  🌐 Website + Mobile App
4️⃣  🤖 AI WhatsApp Chatbot
5️⃣  🎁 Complete Digital Package
6️⃣  💰 View All Pricing
7️⃣  📞 Contact & Support

━━━━━━━━━━━━━━━━━━━━━━
💬 *Reply with a number to explore!*
🚫 _Type STOP to unsubscribe_`;

const MENU_RESPONSES = {

'MENU': `📋 *SreeniVerse — Main Menu*
_Choose a service to learn more:_

━━━━━━━━━━━━━━━━━━━━━━
1️⃣  📍 Google Business Profile
2️⃣  📣 Social Media Management
3️⃣  🌐 Website + Mobile App
4️⃣  🤖 AI WhatsApp Chatbot
5️⃣  🎁 Complete Digital Package
6️⃣  💰 View All Pricing
7️⃣  📞 Contact & Support
━━━━━━━━━━━━━━━━━━━━━━

💬 *Reply with a number!*`,

'GBP': `📍 *Google Business Profile (GBP)*

_Get your business on top of Google Maps
& Search — right when customers need you!_ 🗺️

━━━━━━━━━━━━━━━━━━━━━━
💰 *PRICING*
━━━━━━━━━━━━━━━━━━━━━━
▸ *Setup*        ➜  ₹2,000 _(One-Time)_
▸ *Maintenance* ➜  ₹1,000 _/month_

━━━━━━━━━━━━━━━━━━━━━━
✅ *WHAT'S INCLUDED*
━━━━━━━━━━━━━━━━━━━━━━
📌 Full Profile Optimization
📌 Google Maps Ranking Boost
📌 Weekly Business Posts
📌 Review Management & Replies
📌 Photos & Business Info Updates
📌 Category & Keyword Optimization

━━━━━━━━━━━━━━━━━━━━━━
🏆 *Result:* Your business shows up
when local customers search on Google!

👉 Type *BOOK* — FREE Consultation
👉 Type *0* — Back to Menu`,

'SOCIAL': `📣 *Social Media Management*

_Build a powerful brand presence on
Facebook & Instagram — consistently!_ ✨

━━━━━━━━━━━━━━━━━━━━━━
💰 *PRICING*
━━━━━━━━━━━━━━━━━━━━━━
▸ *Monthly Plan* ➜  ₹5,000 _/month_

━━━━━━━━━━━━━━━━━━━━━━
✅ *WHAT'S INCLUDED*
━━━━━━━━━━━━━━━━━━━━━━
🎨 Creative Posts & Professional Designs
✍️ Engaging Captions & Hashtags
📢 Festival & Promotional Posts
🎯 Business Offer Announcements
💬 Audience Engagement Support
📊 Monthly Performance Report

━━━━━━━━━━━━━━━━━━━━━━
🏆 *Result:* More followers, more trust
& more customers walking through your door!

👉 Type *BOOK* — FREE Consultation
👉 Type *PACKAGE* — Bundle & Save More
👉 Type *0* — Back to Menu`,

'WEBSITE': `🌐 *Website + PWA Mobile App*

_A professional website your customers
can install as an app — no Play Store needed!_ 📱

━━━━━━━━━━━━━━━━━━━━━━
💰 *PRICING*
━━━━━━━━━━━━━━━━━━━━━━
▸ *Starting at* ➜  ₹7,999 _(One-Time)_

━━━━━━━━━━━━━━━━━━━━━━
✅ *WHAT'S INCLUDED*
━━━━━━━━━━━━━━━━━━━━━━
🖥️ Modern Professional Website
📱 100% Mobile-Friendly Design
⚡ PWA — Installs as Mobile App
🏠 Home Screen Icon (No Play Store!)
💬 WhatsApp Chat Integration
📝 Contact Forms & Lead Collection
🗺️ Google Maps Integration
🔗 Social Media Links

━━━━━━━━━━━━━━━━━━━━━━
🏆 *Result:* Your own website + app
at a fraction of the cost!

👉 Type *BOOK* — FREE Demo
👉 Type *CHATBOT* — Add AI Bot
👉 Type *0* — Back to Menu`,

'CHATBOT': `🤖 *AI WhatsApp Chatbot*

_Your business answers customers
24/7 — even while you sleep!_ 😴⚡

━━━━━━━━━━━━━━━━━━━━━━
💰 *PRICING*
━━━━━━━━━━━━━━━━━━━━━━
▸ *Setup* ➜  Starting ₹4,999

━━━━━━━━━━━━━━━━━━━━━━
✅ *WHAT'S INCLUDED*
━━━━━━━━━━━━━━━━━━━━━━
💬 24/7 Automated Customer Replies
📋 Services & Pricing Info Sharing
🎯 Smart Lead Capture System
📅 Appointment Booking Automation
🔔 Owner Alerts on New Leads
📊 Monthly Analytics Report

━━━━━━━━━━━━━━━━━━━━━━
🏆 *Result:* Zero missed customers —
even at 2 AM on a Sunday!

👉 Type *BOOK* — FREE Demo
👉 Type *PACKAGE* — Bundle & Save More
👉 Type *0* — Back to Menu`,

'PACKAGE': `🎁 *Complete Digital Growth Package*

_Everything your business needs
in one powerful bundle!_ 💥

━━━━━━━━━━━━━━━━━━━━━━
💰 *PRICING*
━━━━━━━━━━━━━━━━━━━━━━
▸ *Monthly Plan* ➜  ₹9,999 _/month_
⭐ _(Individual value: ₹15,000+)_

━━━━━━━━━━━━━━━━━━━━━━
✅ *EVERYTHING INCLUDED*
━━━━━━━━━━━━━━━━━━━━━━
📍 Google Business Profile Management
📣 Facebook + Instagram Management
🌐 Website + Mobile App Maintenance
🤖 WhatsApp Automation Support
📊 Monthly Growth Report & Review

🔥 *BONUS FEATURES*
━━━━━━━━━━━━━━━━━━━━━━
▸ Local SEO & Maps Ranking
▸ Appointment Booking System
▸ Cloud Data Storage
▸ Smart Notification System

━━━━━━━━━━━━━━━━━━━━━━
💡 *Save ₹5,000+ every month!*

👉 Type *BOOK* — FREE Consultation
👉 Type *0* — Back to Menu`,

'PRICING': `💰 *SreeniVerse — Full Pricing Guide*

━━━━━━━━━━━━━━━━━━━━━━
📍 *Google Business Profile*
   ▸ Setup: ₹2,000 _(One-Time)_
   ▸ Monthly: ₹1,000/month

📣 *Social Media Management*
   ▸ ₹5,000/month

🌐 *Website + PWA Mobile App*
   ▸ Starting ₹7,999 _(One-Time)_

🤖 *AI WhatsApp Chatbot*
   ▸ Starting ₹4,999 _(Setup)_

🎁 *Complete Digital Package*
   ▸ ₹9,999/month ⭐ *BEST VALUE*
━━━━━━━━━━━━━━━━━━━━━━

🎯 *Every plan includes a*
*FREE 30-min strategy call!*

👉 Type *BOOK* — Get Started Today
👉 Type *0* — Back to Menu`,

'BOOK': `📅 *Book Your FREE Strategy Call!*

_Let's talk about growing your business
the smart way!_ 🤝

━━━━━━━━━━━━━━━━━━━━━━
⏰ *30-Minute FREE Consultation*
📆 Monday – Saturday | 9 AM – 7 PM IST
━━━━━━━━━━━━━━━━━━━━━━

🕙 *Morning*   ➜  9 AM – 12 PM
🕑 *Afternoon* ➜  12 PM – 4 PM
🕔 *Evening*   ➜  4 PM – 7 PM

━━━━━━━━━━━━━━━━━━━━━━
✅ Reply with your *preferred time slot*
and we'll confirm within *2 hours!*

👉 Type *0* — Back to Menu`,

'CONTACT': `📞 *SreeniVerse Technologies*
_Your Digital Growth Partner_ 🌟

━━━━━━━━━━━━━━━━━━━━━━
🌐 *Website*
    www.sreeniverse.com

📧 *Email*
    dsreeniverse@gmail.com

📱 *WhatsApp / Call*
    +91 93474 88883

📍 *Location*
    Hyderabad, Telangana, India
━━━━━━━━━━━━━━━━━━━━━━

🕐 *Business Hours*
    Mon – Sat | 9 AM – 7 PM IST

⚡ _Average reply time: under 2 hours!_

👉 Type *BOOK* — Schedule a Call
👉 Type *0* — Back to Menu`,
};

const NUMBER_MAP = {
    '1':'GBP','2':'SOCIAL','3':'WEBSITE',
    '4':'CHATBOT','5':'PACKAGE','6':'PRICING','7':'CONTACT','0':'MENU',
};

const KEYWORD_MAP = {
    'HELLO':'GREETING','HI':'GREETING','HAI':'GREETING','HEY':'GREETING',
    'NAMASTE':'GREETING','START':'GREETING','HELP':'GREETING','YO':'GREETING','HYE':'GREETING',
    'MENU':'MENU','SERVICES':'MENU','SERVICE':'MENU','OPTIONS':'MENU','WHAT':'MENU',
    'GBP':'GBP','GOOGLE':'GBP','MAPS':'GBP','PROFILE':'GBP','GOOGLE BUSINESS':'GBP',
    'SOCIAL':'SOCIAL','FACEBOOK':'SOCIAL','INSTAGRAM':'SOCIAL','FB':'SOCIAL','SMM':'SOCIAL','INSTA':'SOCIAL',
    'WEBSITE':'WEBSITE','SITE':'WEBSITE','WEB':'WEBSITE','PWA':'WEBSITE','APP':'WEBSITE','MOBILE APP':'WEBSITE',
    'CHATBOT':'CHATBOT','BOT':'CHATBOT','AUTOMATION':'CHATBOT','AI':'CHATBOT','WHATSAPP BOT':'CHATBOT','AUTO':'CHATBOT',
    'PACKAGE':'PACKAGE','COMBO':'PACKAGE','BUNDLE':'PACKAGE','ALL':'PACKAGE','EVERYTHING':'PACKAGE',
    'PRICING':'PRICING','PRICE':'PRICING','COST':'PRICING','RATE':'PRICING',
    'CHARGES':'PRICING','PLAN':'PRICING','PLANS':'PRICING','FEES':'PRICING','HOW MUCH':'PRICING','BUDGET':'PRICING',
    'BOOK':'BOOK','CALL':'BOOK','DEMO':'BOOK','APPOINTMENT':'BOOK','CONSULT':'BOOK','SCHEDULE':'BOOK','TALK':'BOOK',
    'CONTACT':'CONTACT','REACH':'CONTACT','EMAIL':'CONTACT','PHONE':'CONTACT','ADDRESS':'CONTACT','WHERE':'CONTACT',
};

function getMenuResponse(text) {
    const t = text.trim().toUpperCase();
    if (MENU_RESPONSES[t]) return { key: t, text: MENU_RESPONSES[t] };
    if (NUMBER_MAP[t]) return { key: NUMBER_MAP[t], text: MENU_RESPONSES[NUMBER_MAP[t]] };
    if (KEYWORD_MAP[t]) {
        const key = KEYWORD_MAP[t];
        if (key === 'GREETING') return { key: 'GREETING', text: null };
        if (MENU_RESPONSES[key]) return { key, text: MENU_RESPONSES[key] };
    }
    for (const [kw, key] of Object.entries(KEYWORD_MAP)) {
        if (t.includes(kw)) {
            if (key === 'GREETING') return { key: 'GREETING', text: null };
            if (MENU_RESPONSES[key]) return { key, text: MENU_RESPONSES[key] };
        }
    }
    return null;
}

async function startBot() {
    let reconnectAttempts = 0;
    try {
        logger.info('🤖 SreeniVerse Bot v5.0 Starting...');
        loadBlacklist(); loadHiCount();
        if (!fs.existsSync(CONFIG.sessionPath)) fs.mkdirSync(CONFIG.sessionPath, { recursive: true });

        const { state, saveCreds } = await useMultiFileAuthState(CONFIG.sessionPath);
        const { version } = await fetchLatestBaileysVersion();
        logger.info(`📦 Baileys v${version.join('.')}`);

        const sock = makeWASocket({
            version, auth: state,
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }),
            browser: ['SreeniVerse','Chrome','10.0'],
            markOnlineOnConnect: false,
            syncFullHistory: false,
            getMessage: async () => undefined,
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            if (qr) { logger.info('📱 Scan QR:'); qrcode.generate(qr, { small: true }); }
            if (connection === 'open') { reconnectAttempts=0; logger.info('✅ SreeniVerse Bot Connected!'); }
            if (connection === 'close') {
                const code = lastDisconnect?.error instanceof Boom ? lastDisconnect.error.output.statusCode : 500;
                logger.warn(`⚠️ Disconnected — code: ${code}`);
                if (code === DisconnectReason.loggedOut || code === 401) {
                    fs.rmSync(CONFIG.sessionPath, { recursive: true, force: true });
                    setTimeout(startBot, 3000); return;
                }
                if (code === DisconnectReason.restartRequired) { startBot(); return; }
                if (reconnectAttempts < CONFIG.reconnectAttempts) {
                    reconnectAttempts++;
                    setTimeout(startBot, CONFIG.reconnectDelay * reconnectAttempts);
                } else { setTimeout(startBot, 30000); }
            }
        });

        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            try {
                if (type !== 'notify') return;
                const msg = messages[0];
                if (!msg?.message || msg.key.fromMe) return;
                const from = msg.key.remoteJid;
                if (from.endsWith('@g.us') || from === 'status@broadcast') return;

                const phone = from.split('@')[0];
                const messageText = (
                    msg.message.conversation
                    || msg.message.extendedTextMessage?.text
                    || msg.message.imageMessage?.caption
                    || ''
                ).trim();
                if (!messageText) return;

                logger.info(`📨 ${phone}: "${messageText.substring(0,60)}"`);
                if (blacklist.has(phone)) return;

                if (/\b(stop|unsubscribe|optout|opt out|remove)\b/i.test(messageText)) {
                    blacklist.add(phone); saveBlacklist();
                    await sock.sendMessage(from, { text: "✅ *Unsubscribed successfully.*\nWe won't message you again.\nSorry for any inconvenience! 🙏" });
                    return;
                }

                checkDailyReset();
                if (messageCount >= CONFIG.dailyLimit) return;
                if (isNight() && Math.random() < 0.6) return;

                let replyText = null;
                const match = getMenuResponse(messageText);

                if (match && match.key === 'GREETING') {
                    const count = getHiCount(phone);
                    if (count < CONFIG.maxHiReplies) {
                        replyText = WELCOME;
                        incrementHiCount(phone);
                        logger.info(`👋 Welcome sent (${count+1}/${CONFIG.maxHiReplies})`);
                    } else {
                        replyText = `✨ *Hey there!* 👋\n\nWelcome to *SreeniVerse Technologies* 🚀\n━━━━━━━━━━━━━━━━━━━━━━\n🏆 Hyderabad's Smart Digital Partner\nHelping local businesses grow online — fast!\n━━━━━━━━━━━━━━━━━━━━━━\n🎯 *What can we do for you?*\n\n1️⃣  📍 Google Business (GBP)\n2️⃣  📣 Social Media Management\n3️⃣  🌐 Website + Mobile App\n4️⃣  🤖 AI WhatsApp Chatbot\n5️⃣  🎁 Complete Digital Package\n6️⃣  💰 View Pricing\n7️⃣  📞 Contact Us\n━━━━━━━━━━━━━━━━━━━━━━\n💬 Just reply with a *number* to explore!`;
                    }
                } else if (match && match.text) {
                    replyText = match.text;
                    logger.info(`📋 ${match.key} → ${phone}`);
                } else {
                    replyText = `🤔 *Hmm, I didn't catch that!*\n\nHere's what I can help with:\n\n1️⃣ GBP  2️⃣ Social Media\n3️⃣ Website  4️⃣ AI Chatbot\n5️⃣ Package  6️⃣ Pricing  7️⃣ Contact\n\n_Type a number or keyword_ 👆`;
                }

                await randomDelay(CONFIG.messageDelay.min, CONFIG.messageDelay.max);
                await sock.sendPresenceUpdate('composing', from);
                await randomDelay(CONFIG.typingDelay.min, CONFIG.typingDelay.max);
                await sock.sendPresenceUpdate('paused', from);
                await sock.sendMessage(from, { text: replyText });
                messageCount++;
                logger.info(`✅ Replied (${messageCount}/${CONFIG.dailyLimit})`);

            } catch(err) { logger.error('Handler: '+err.message); }
        });

    } catch(err) {
        logger.error('startBot: '+err.message);
        setTimeout(startBot, 15000);
    }
}

process.on('SIGINT',  () => { saveBlacklist(); saveHiCount(); process.exit(0); });
process.on('SIGTERM', () => { saveBlacklist(); saveHiCount(); process.exit(0); });

loadBlacklist(); loadHiCount();
startBot();
