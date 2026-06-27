/**
 * SREENIVERSE PRODUCTION WHATSAPP BOT
 * Version: 3.1 - Smart Menu | Emoji Rich | Image Support | Welcome-Once
 * Fixed: QR display, reconnect loop, group filter
 */

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');

// ── CONFIG ────────────────────────────────────────────────────────────────────
const CONFIG = {
    sessionPath:       './auth_session',
    messageDelay:      { min: 2000, max: 4000 },
    typingDelay:       { min: 1000, max: 2000 },
    dailyLimit:        225,
    reconnectAttempts: 5,
    reconnectDelay:    8000,
};

// ── PM2-SAFE LOGGER (no pino-pretty) ─────────────────────────────────────────
const logger = {
    info:  (msg) => console.log(`[INFO]  ${new Date().toLocaleString('en-IN')} » ${msg}`),
    warn:  (msg) => console.log(`[WARN]  ${new Date().toLocaleString('en-IN')} » ${msg}`),
    error: (msg) => console.log(`[ERROR] ${new Date().toLocaleString('en-IN')} » ${msg}`),
};

// ── COUNTERS ──────────────────────────────────────────────────────────────────
let messageCount  = 0;
let lastResetDate = new Date().toDateString();

// ── BLACKLIST ─────────────────────────────────────────────────────────────────
const blacklist     = new Set();
const blacklistFile = './blacklist.json';

function loadBlacklist() {
    try {
        if (fs.existsSync(blacklistFile)) {
            JSON.parse(fs.readFileSync(blacklistFile, 'utf8')).forEach(n => blacklist.add(n));
            logger.info(`Blacklist loaded: ${blacklist.size} numbers`);
        }
    } catch (e) { logger.error('Blacklist load failed: ' + e.message); }
}
function saveBlacklist() {
    try { fs.writeFileSync(blacklistFile, JSON.stringify([...blacklist], null, 2)); }
    catch (e) { logger.error('Blacklist save failed: ' + e.message); }
}

// ── GREETED USERS (welcome sent only ONCE per number) ─────────────────────────
const greetedUsers = new Set();
const greetedFile  = './greeted_users.json';

function loadGreeted() {
    try {
        if (fs.existsSync(greetedFile)) {
            JSON.parse(fs.readFileSync(greetedFile, 'utf8')).forEach(n => greetedUsers.add(n));
            logger.info(`Greeted users loaded: ${greetedUsers.size} numbers`);
        }
    } catch (e) { logger.error('Greeted load failed: ' + e.message); }
}
function saveGreeted() {
    try { fs.writeFileSync(greetedFile, JSON.stringify([...greetedUsers], null, 2)); }
    catch (e) { logger.error('Greeted save failed: ' + e.message); }
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
const randomDelay = (min, max) =>
    new Promise(r => setTimeout(r, min + Math.random() * (max - min)));

function checkDailyReset() {
    const today = new Date().toDateString();
    if (today !== lastResetDate) { messageCount = 0; lastResetDate = today; logger.info('Daily counter reset'); }
}

function isNight() {
    const h = new Date().getHours();
    return h >= 22 || h < 7;
}

// ── MESSAGES ──────────────────────────────────────────────────────────────────

const WELCOME = `🙏 *నమస్కారం! Welcome to Sreeniverse!* 🚀

థాంక్యూ for reaching out! మేము మీకు help చేయడానికి ready గా ఉన్నాం 😊

━━━━━━━━━━━━━━━━━━━━━━
📋 *మన Menu చూడండి:*
━━━━━━━━━━━━━━━━━━━━━━

1️⃣  *SERVICES*  — What We Offer
2️⃣  *PRICING*   — Plans & Charges
3️⃣  *DEMO*      — Live Demonstration
4️⃣  *BOOK*      — Call Schedule
5️⃣  *STORIES*   — Client Results
6️⃣  *CONTACT*   — Reach Us Directly

💬 _Number లేదా keyword type చేయి_
🚫 _Unsubscribe చేయాలంటే_ *STOP* _type చేయి_`;

const MENU_RESPONSES = {

'MENU': `📋 *Sreeniverse — Full Menu*

1️⃣  *SERVICES*  — మేమేం చేస్తాం
2️⃣  *PRICING*   — Plans & Charges
3️⃣  *DEMO*      — Live చూపిస్తాం
4️⃣  *BOOK*      — Call Schedule చేయి
5️⃣  *STORIES*   — Client Results
6️⃣  *CONTACT*   — Direct గా మాట్లాడు

_Number లేదా keyword type చేయి_ 👆`,

'SERVICES': `🛠️ *Sreeniverse Services*

మేము మీ business ని digitally grow చేస్తాం:

📱 *WhatsApp Automation & Bots*
   └ Smart bots, auto-replies, lead capture

📣 *Social Media Management*
   └ Content, posting, engagement

🎯 *Lead Generation Campaigns*
   └ Targeted ads, real leads, real results

🎨 *Business Branding & Design*
   └ Logo, creatives, brand identity

🌐 *Website Development*
   └ Modern, fast, mobile-friendly sites

📈 *Digital Marketing Strategy*
   └ Full-funnel growth planning

📍 *Google Business Profile (GBP)*
   └ Optimization, reviews, local SEO

📒 *Just Dial & IndiaMart Updates*
   └ Profile setup, listing optimization

💼 *LinkedIn Profile Building*
   └ Professional presence, B2B leads

━━━━━━━━━━━━━━━━━━━━━━
Reply *PRICING* to see plans 💰
Reply *BOOK* to schedule a FREE call 📅`,

'PRICING': `💰 *Sreeniverse Pricing Plans*

━━━━━━━━━━━━━━━━━━━━━━
🟢 *STARTER — ₹3,999/month*
━━━━━━━━━━━━━━━━━━━━━━
✅ WhatsApp Bot Setup
✅ GBP Optimization (1-time setup)
✅ Just Dial / IndiaMart Listing Update
✅ Social Media Management (2 platforms)
✅ 1 Lead Generation Campaign/month
✅ Basic Monthly Report

━━━━━━━━━━━━━━━━━━━━━━
🚀 *GROWTH — ₹6,999/month*
━━━━━━━━━━━━━━━━━━━━━━
✅ Everything in Starter +
✅ Advanced WhatsApp Automation
✅ LinkedIn Profile Building
✅ 3 Lead Generation Campaigns/month
✅ Branding & Design (8 creatives/month)
✅ Website Basic Maintenance
✅ Priority Support + Detailed Analytics

━━━━━━━━━━━━━━━━━━━━━━
🎁 *Both plans లో FREE onboarding call!*

👉 Reply *BOOK* to get started today!`,

'DEMO': `🎬 *Live Demo — Sreeniverse లో ఏం చేస్తాం చూడు!*

మేము exactly మీ business కి ఎలా work చేస్తాం అని చూపిస్తాం:

✨ WhatsApp bot live demo
✨ Lead capture system
✨ Social media samples
✨ GBP optimization results

📲 *Demo చూడాలంటే:*
👉 Reply *BOOK* — మేము Zoom/Meet call lo live చూపిస్తాం!

_మీ business type చెప్పండి — customized demo చేస్తాం_ 🎯`,

'BOOK': `📅 *Free Consultation Book చేయి!*

మీతో మాట్లాడడానికి మేము excited గా ఉన్నాం! 🤝

⏰ *30-minute FREE strategy call*
🗓️ Mon–Fri | 9AM – 7PM IST

━━━━━━━━━━━━━━━━━━━━━━
మీకు convenient అయిన time చెప్పండి:

🕙 Morning (9AM–12PM)
🕑 Afternoon (12PM–4PM)
🕔 Evening (4PM–7PM)
━━━━━━━━━━━━━━━━━━━━━━

మీ preferred time reply చేయండి — మేము 2 గంటల్లో confirm చేస్తాం! ✅`,

'STORIES': `⭐ *Client Success Stories*

మా clients results చూడు! 👇

━━━━━━━━━━━━━━━━━━━━━━
🏠 *Real Estate Client — Hyderabad*
_"60 రోజుల్లో leads 3x అయ్యాయి!"_
📈 Result: 45 → 140 leads/month

━━━━━━━━━━━━━━━━━━━━━━
🛒 *E-Commerce Brand — Vijayawada*
_"WhatsApp bot వల్ల రోజు 4 గంటలు save అవుతున్నాయి"_
📈 Result: 60% response rate increase

━━━━━━━━━━━━━━━━━━━━━━
🎓 *Ed-Tech Startup — Bangalore*
_"Best investment for our business growth"_
📈 Result: 2x student enrollments in 90 days

━━━━━━━━━━━━━━━━━━━━━━
మీరు కూడా ఇలాంటి results కావాలా? 🚀
👉 Reply *BOOK* for a FREE strategy call!`,

'CONTACT': `📞 *Sreeniverse — Contact Us*

మాతో directly మాట్లాడు! 👇

━━━━━━━━━━━━━━━━━━━━━━
🌐 Website:  https://sreeniverse.com
📧 Email:    dsreeniverse@gmail.com
📱 WhatsApp: +91 9347488883
📍 Location: Hyderabad, Telangana
━━━━━━━━━━━━━━━━━━━━━━

🕐 *Business Hours:*
Mon – Fri | 9AM – 7PM IST

⚡ మేము సాధారణంగా *2 గంటల్లో* reply చేస్తాం!

_Quick call కావాలంటే_ *BOOK* _type చేయి_ 📅`

};

const NUMBER_MAP = {
    '1': 'SERVICES', '2': 'PRICING', '3': 'DEMO',
    '4': 'BOOK',     '5': 'STORIES', '6': 'CONTACT',
    '0': 'MENU',     '7': 'CONTACT'
};

function getMenuResponse(text) {
    const t = text.trim().toUpperCase();
    if (MENU_RESPONSES[t])          return MENU_RESPONSES[t];
    if (NUMBER_MAP[t])              return MENU_RESPONSES[NUMBER_MAP[t]];
    return null;
}

// ── MAIN BOT ──────────────────────────────────────────────────────────────────
async function startBot() {
    // FIX 1: reconnectAttempts is now LOCAL to each startBot() call
    // Old code had it global — so after 5 failures it never reset properly
    let reconnectAttempts = 0;

    try {
        logger.info('🤖 Initializing Sreeniverse WhatsApp Bot v3.1...');
        loadBlacklist();
        loadGreeted();

        // FIX 2: Ensure auth_session folder exists before useMultiFileAuthState
        if (!fs.existsSync(CONFIG.sessionPath)) {
            fs.mkdirSync(CONFIG.sessionPath, { recursive: true });
            logger.info('📁 Created fresh auth_session folder');
        }

        const { state, saveCreds } = await useMultiFileAuthState(CONFIG.sessionPath);

        // FIX 3: fetch latest Baileys version for compatibility
        const { version } = await fetchLatestBaileysVersion();
        logger.info(`📦 Using Baileys v${version.join('.')}`);

        const sock = makeWASocket({
            version,
            auth:                state,
            printQRInTerminal:   false,       // we handle QR ourselves below
            logger:              pino({ level: 'silent' }),
            browser:             ['Sreeniverse', 'Chrome', '10.0'],
            markOnlineOnConnect: false,
            syncFullHistory:     false,
            getMessage:          async () => undefined,
        });

        sock.ev.on('creds.update', saveCreds);

        // ── CONNECTION HANDLER ────────────────────────────────────────────────
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            // FIX 4: Manually print QR using qrcode-terminal (reliable)
            if (qr) {
                logger.info('📱 Scan this QR code with WhatsApp:');
                qrcode.generate(qr, { small: true });
            }

            if (connection === 'open') {
                reconnectAttempts = 0;
                logger.info('✅ Connected to WhatsApp!');
                logger.info(`📊 Daily limit: ${CONFIG.dailyLimit} | Smart menu: ACTIVE`);
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error instanceof Boom
                    ? lastDisconnect.error.output.statusCode
                    : 500;

                logger.warn(`⚠️ Connection closed — code: ${statusCode}`);

                // FIX 5: Handle all disconnect reasons properly
                if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                    logger.error('🚫 Logged out — deleting session, re-scan QR');
                    fs.rmSync(CONFIG.sessionPath, { recursive: true, force: true });
                    setTimeout(startBot, 3000);
                    return;
                }

                if (statusCode === DisconnectReason.restartRequired) {
                    logger.info('🔁 Restart required — restarting now...');
                    startBot();
                    return;
                }

                if (reconnectAttempts < CONFIG.reconnectAttempts) {
                    reconnectAttempts++;
                    const wait = CONFIG.reconnectDelay * reconnectAttempts;
                    logger.warn(`🔄 Reconnecting ${reconnectAttempts}/${CONFIG.reconnectAttempts} in ${wait/1000}s...`);
                    await randomDelay(wait, wait + 2000);
                    startBot();
                } else {
                    logger.error('❌ All reconnect attempts failed — restarting fresh in 30s...');
                    await randomDelay(30000, 35000);
                    startBot();
                }
            }
        });

        // ── MESSAGE HANDLER ───────────────────────────────────────────────────
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            try {
                // FIX 6: Only process 'notify' type (real incoming messages)
                if (type !== 'notify') return;

                const msg = messages[0];
                if (!msg || !msg.message || msg.key.fromMe) return;

                const from = msg.key.remoteJid;

                // FIX 7: Skip group messages — only reply to individual chats
                if (from.endsWith('@g.us')) {
                    logger.info(`👥 Group message skipped: ${from}`);
                    return;
                }

                // FIX 8: Skip status messages
                if (from === 'status@broadcast') return;

                const phoneNumber = from.split('@')[0];
                const messageText = (
                    msg.message.conversation
                    || msg.message.extendedTextMessage?.text
                    || msg.message.imageMessage?.caption
                    || ''
                ).trim();

                logger.info(`📨 ${phoneNumber}: "${messageText.substring(0, 60)}"`);

                // Blacklist check
                if (blacklist.has(phoneNumber)) {
                    logger.info(`🚫 Blocked: ${phoneNumber}`);
                    return;
                }

                // STOP / unsubscribe
                if (/\b(stop|unsubscribe|optout|opt out|remove)\b/i.test(messageText)) {
                    blacklist.add(phoneNumber);
                    saveBlacklist();
                    await sock.sendMessage(from, {
                        text: "✅ మీరు unsubscribe చేయబడ్డారు. మేము మీకు మళ్ళీ message చేయము. Sorry for any inconvenience! 🙏"
                    });
                    logger.info(`⛔ Unsubscribed: ${phoneNumber}`);
                    return;
                }

                // Daily limit
                checkDailyReset();
                if (messageCount >= CONFIG.dailyLimit) {
                    logger.warn(`⏸️ Daily limit reached`);
                    return;
                }

                // Night throttle
                if (isNight() && Math.random() < 0.6) {
                    logger.info(`🌙 Night mode — skipping`);
                    return;
                }

                // ── DECIDE REPLY ──────────────────────────────────────────────
                let replyText = null;
                const isFirst = !greetedUsers.has(phoneNumber);

                if (isFirst) {
                    replyText = WELCOME;
                    greetedUsers.add(phoneNumber);
                    saveGreeted();
                    logger.info(`👋 First-time welcome sent to ${phoneNumber}`);
                } else {
                    const menuReply = getMenuResponse(messageText);
                    if (menuReply) {
                        replyText = menuReply;
                        logger.info(`📋 Menu reply: "${messageText}" → sent to ${phoneNumber}`);
                    } else {
                        logger.info(`💬 No keyword match — silent for ${phoneNumber}`);
                        return;
                    }
                }
                // ─────────────────────────────────────────────────────────────

                // Human-like delay + typing
                await randomDelay(CONFIG.messageDelay.min, CONFIG.messageDelay.max);
                await sock.sendPresenceUpdate('composing', from);
                await randomDelay(CONFIG.typingDelay.min, CONFIG.typingDelay.max);
                await sock.sendPresenceUpdate('paused', from);

                await sock.sendMessage(from, { text: replyText });
                messageCount++;
                logger.info(`✅ Replied to ${phoneNumber} (${messageCount}/${CONFIG.dailyLimit} today)`);

            } catch (err) {
                logger.error('Message handler error: ' + err.message);
            }
        });

    } catch (err) {
        logger.error('startBot error: ' + err.message);
        logger.info('Retrying in 15s...');
        setTimeout(startBot, 15000);
    }
}

// ── GRACEFUL SHUTDOWN ─────────────────────────────────────────────────────────
process.on('SIGINT',  () => { saveBlacklist(); saveGreeted(); process.exit(0); });
process.on('SIGTERM', () => { saveBlacklist(); saveGreeted(); process.exit(0); });

// ── START ─────────────────────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════════');
console.log('  SREENIVERSE WHATSAPP BOT v3.1');
console.log('  Smart Menu | Welcome-Once | PM2 Ready');
console.log('═══════════════════════════════════════════════');
startBot();
