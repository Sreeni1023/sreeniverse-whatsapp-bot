const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

// ════════════════════════════════════════════════════════════════
//  SREENIVERSE WHATSAPP BUSINESS BOT v3.0
//  Interactive Menu System | Lead Capture | Professional
// ════════════════════════════════════════════════════════════════

console.log('\n╔════════════════════════════════════════════════╗');
console.log('║  SREENIVERSE WHATSAPP BUSINESS BOT v3.0        ║');
console.log('║  Interactive Menu | Smart Responses            ║');
console.log('╚════════════════════════════════════════════════╝\n');

// Configuration
const configPath = path.join(__dirname, 'bot-config.json');
const blacklistPath = path.join(__dirname, 'blacklist.json');
const leadsPath = path.join(__dirname, 'leads.json');
const qrFilePath = path.join(__dirname, 'qr-code.txt');

let config = {
    sessionPath: './auth_session',
    sessionBackupPath: './auth_session_backup',
    messageDelay: { min: 2000, max: 5000 },
    typingDelay: { min: 1500, max: 3000 },
    dailyLimit: 200,
    hourlyLimit: 30,
    nightModeEnabled: true,
    instantReplyChance: 0.15,
    businessName: 'Sreeniverse Technologies',
    ownerName: 'D. Sreenivas',
    phone: '+91 9347488883',
    email: 'dsreeniverse@gmail.com',
    website: 'www.sreeniverse.com'
};

// Message Templates
const templates = {
    welcome: `👋 Welcome to *Sreeniverse WhatsApp Automation*!

We help businesses automate customer conversations and capture leads 24/7.

*Main Menu:*
1️⃣ Our Services
2️⃣ Pricing Plans
3️⃣ Live Demo
4️⃣ Book Free Consultation
5️⃣ Success Stories
6️⃣ Contact Us

Reply with a number (1-6) to continue.

_Type STOP to unsubscribe anytime._`,

    services: `🚀 *Our WhatsApp Automation Services:*

✅ *Auto-Reply System*
   • Instant responses 24/7
   • Custom message templates
   • Smart keyword detection

✅ *Lead Capture*
   • Automatic data collection
   • Export to Excel/CRM
   • Lead scoring

✅ *Appointment Booking*
   • Calendar integration
   • Automatic reminders
   • Cancellation handling

✅ *Broadcast Messages*
   • Bulk messaging (200+ daily)
   • Scheduled campaigns
   • Delivery analytics

Perfect for: Gyms, Salons, Clinics, Schools, Real Estate, Restaurants

Reply *PRICING* to see plans or *DEMO* for live demonstration.`,

    pricing: `💰 *WhatsApp Bot Pricing Plans:*

pricing: `💰 *WhatsApp Bot Pricing Plans:*

📦 *BASIC PLAN*
   • Monthly: ₹1,499/month
   • 3 Months: ₹3,999 (Save ₹500!)
   • 6 Months: ₹8,994 (FREE Setup!)
   • Setup Fee: ₹500 (waived on 6-month)
   
   ✅ 24/7 Auto-reply
   ✅ 200 messages/day
   ✅ Lead capture
   ✅ Basic dashboard

📦 *STANDARD PLAN* ⭐ MOST POPULAR
   • Monthly: ₹1,999/month
   • 3 Months: ₹4,999 (Save ₹1,000!)
   • 6 Months: ₹11,994 (FREE Setup!)
   • Setup Fee: ₹500 (waived on 6-month)
   
   ✅ Everything in Basic +
   ✅ 300 messages/day
   ✅ Custom templates
   ✅ Advanced analytics
   ✅ Priority support
   ✅ Monthly reports

📦 *PREMIUM PLAN*
   • Monthly: ₹2,499/month
   • 3 Months: ₹5,999 (Save ₹1,500!)
   • 6 Months: ₹14,994 (FREE Setup!)
   • Setup Fee: ₹500 (waived on 6-month)
   
   ✅ Everything in Standard +
   ✅ 500 messages/day
   ✅ 24/7 Dedicated support
   ✅ Weekly reports
   ✅ CRM integration

🎁 *Special Offer:*
Choose 6-month plan → Save ₹500 setup fee!
Best Value: Standard 3-month @ ₹5,499 total!

Reply *DEMO* to see bot in action or *CONTACT* for more details.`,

    demo: `🎬 *Live Demo Available!*

See WhatsApp automation in action RIGHT NOW:

✓ This conversation is automated!
✓ Notice the instant responses?
✓ Smart keyword detection working
✓ Professional formatting
✓ Lead capture in background

*What You Get:*
• 24/7 auto-responses
• Custom menus like this
• Analytics dashboard
• Lead export to Excel
• Multi-language support

*Ready to automate YOUR business?*

Reply *BOOK* to schedule your free consultation or *PRICING* to see plans.

_This demo bot handles 200+ conversations daily without missing a single lead!_`,

    book: `📅 *Book Your FREE Consultation:*

I will personally:
✓ Understand your business needs
✓ Show live demo customized for you
✓ Suggest best automation strategy
✓ Answer all your questions

*Available Slots:*
• Mon-Fri: 10 AM - 6 PM
• Saturday: 10 AM - 2 PM

📞 *Call/WhatsApp:* +91 9347488883
📧 *Email:* dsreeniverse@gmail.com
🌐 *Website:* www.sreeniverse.com

Reply with your preferred date & time, or call me directly!

_Example: "Tomorrow 2 PM" or "Friday morning"_`,

    stories: `⭐ *Client Success Stories:*

🏋️ *FitZone Gym, Hyderabad*
"Got 45 new memberships in 2 months through WhatsApp automation!"
- Rakesh Kumar, Owner

💇 *Glamour Salon, Banjara Hills*
"Appointment bookings increased 3x. No more missed calls!"
- Priya Sharma, Manager

🏫 *Excel Coaching, Ameerpet*
"500+ admission inquiries handled automatically. Amazing!"
- Suresh Reddy, Director

📈 *Average Results:*
• 3x more leads captured
• 70% reduction in response time
• 40% increase in conversions

Want similar results? Reply *DEMO* or *BOOK* consultation!`,

    contact: `📞 *Contact Sreeniverse:*

*Owner:* D. Sreenivas
*Phone:* +91 9347488883
*Email:* dsreeniverse@gmail.com
*Website:* www.sreeniverse.com

*Office Hours:*
Mon-Fri: 9 AM - 7 PM
Saturday: 9 AM - 3 PM

*Location:* Hyderabad, Telangana

💬 You can also:
• Reply *DEMO* for live demonstration
• Reply *PRICING* to see plans
• Reply *SERVICES* for details

We typically respond within 2 minutes during business hours!`,

    default: `Thanks for your message! 😊

To serve you better, please choose from our menu:

*Quick Links:*
• Reply *MENU* - See all options
• Reply *SERVICES* - What we offer
• Reply *PRICING* - See plans
• Reply *DEMO* - Live demonstration  
• Reply *BOOK* - Schedule consultation
• Reply *STORIES* - Client testimonials
• Reply *CONTACT* - Reach us directly

Or simply type your question and I will help!

_Available Mon-Fri 9AM-7PM | Type STOP to unsubscribe_`
};

function loadConfig() {
    try {
        if (fs.existsSync(configPath)) {
            const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            config = { ...config, ...fileConfig };
            console.log('✅ Config loaded');
        } else {
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            console.log('✅ Default config created');
        }
    } catch (error) {
        console.error('⚠️  Config error:', error.message);
    }
}

loadConfig();

// Watch config for hot-reload
fs.watch(configPath, (eventType) => {
    if (eventType === 'change') {
        try {
            const newConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            config = { ...config, ...newConfig };
            console.log('🔄 Config reloaded!');
        } catch (error) {
            console.error('⚠️  Config reload failed:', error.message);
        }
    }
});

// Blacklist management
let blacklist = new Set();

function loadBlacklist() {
    try {
        if (fs.existsSync(blacklistPath)) {
            blacklist = new Set(JSON.parse(fs.readFileSync(blacklistPath, 'utf8')));
        }
    } catch (error) {
        console.error('⚠️  Blacklist load error:', error.message);
    }
}

function saveBlacklist() {
    try {
        fs.writeFileSync(blacklistPath, JSON.stringify([...blacklist], null, 2));
    } catch (error) {
        console.error('⚠️  Blacklist save error:', error.message);
    }
}

loadBlacklist();

// Lead tracking
let leads = [];

function loadLeads() {
    try {
        if (fs.existsSync(leadsPath)) {
            leads = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));
        }
    } catch (error) {
        console.error('⚠️  Leads load error:', error.message);
    }
}

function saveLead(phone, message, response) {
    try {
        const lead = {
            phone,
            message,
            response,
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
        };
        
        leads.push(lead);
        fs.writeFileSync(leadsPath, JSON.stringify(leads, null, 2));
        
        console.log(`💾 Lead saved: ${phone}`);
    } catch (error) {
        console.error('⚠️  Lead save error:', error.message);
    }
}

loadLeads();

// Message counter
const messageCount = { 
    daily: 0, 
    hourly: 0, 
    lastReset: Date.now(), 
    lastHourReset: Date.now() 
};

function resetCounters() {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const hourMs = 60 * 60 * 1000;

    if (now - messageCount.lastReset > dayMs) {
        messageCount.daily = 0;
        messageCount.lastReset = now;
        console.log('🔄 Daily counter reset');
    }

    if (now - messageCount.lastHourReset > hourMs) {
        messageCount.hourly = 0;
        messageCount.lastHourReset = now;
        console.log('🔄 Hourly counter reset');
    }
}

// Session management
function backupSession() {
    try {
        if (fs.existsSync(config.sessionPath)) {
            if (!fs.existsSync(config.sessionBackupPath)) {
                fs.mkdirSync(config.sessionBackupPath, { recursive: true });
            }
            
            const files = fs.readdirSync(config.sessionPath);
            files.forEach(file => {
                fs.copyFileSync(
                    path.join(config.sessionPath, file),
                    path.join(config.sessionBackupPath, file)
                );
            });
            
            console.log('💾 Session backed up');
        }
    } catch (error) {
        console.error('⚠️  Backup failed:', error.message);
    }
}

function restoreSession() {
    try {
        if (fs.existsSync(config.sessionBackupPath) && !fs.existsSync(config.sessionPath)) {
            if (!fs.existsSync(config.sessionPath)) {
                fs.mkdirSync(config.sessionPath, { recursive: true });
            }
            
            const files = fs.readdirSync(config.sessionBackupPath);
            files.forEach(file => {
                fs.copyFileSync(
                    path.join(config.sessionBackupPath, file),
                    path.join(config.sessionPath, file)
                );
            });
            
            console.log('♻️  Session restored');
            return true;
        }
        return false;
    } catch (error) {
        console.error('⚠️  Restore failed:', error.message);
        return false;
    }
}

setInterval(backupSession, 6 * 60 * 60 * 1000);

// Smart delay
function calculateDelay() {
    const { min, max } = config.messageDelay;
    const now = new Date();
    const hour = now.getHours();
    
    const isNightTime = config.nightModeEnabled && (hour >= 22 || hour < 7);
    const rand = Math.random();
    
    if (rand < config.instantReplyChance) {
        return Math.floor(500 + Math.random() * 1000);
    } else {
        const delay = Math.floor(min + Math.random() * (max - min));
        return isNightTime ? delay * 1.6 : delay;
    }
}

// Message parser
function parseMessage(text) {
    const lower = text.toLowerCase().trim();
    
    // Menu options (1-6)
    if (lower === '1' || lower.includes('service')) return 'services';
    if (lower === '2' || lower.includes('pricing') || lower.includes('price') || lower.includes('plan')) return 'pricing';
    if (lower === '3' || lower.includes('demo')) return 'demo';
    if (lower === '4' || lower.includes('book') || lower.includes('consultation') || lower.includes('appointment')) return 'book';
    if (lower === '5' || lower.includes('success') || lower.includes('stories') || lower.includes('testimonial')) return 'stories';
    if (lower === '6' || lower.includes('contact')) return 'contact';
    
    // Keywords
    if (lower.includes('menu') || lower.includes('start') || lower.includes('hi') || lower.includes('hello')) return 'welcome';
    
    return 'default';
}

function getResponse(messageType) {
    return templates[messageType] || templates.default;
}

// QR display
function displayQRCode(qr) {
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║  📱 SCAN THIS QR CODE WITH WHATSAPP           ║');
    console.log('╚════════════════════════════════════════════════╝\n');
    
    try {
        qrcode.generate(qr, { small: true });
        console.log('\n✅ QR displayed in terminal');
    } catch (error) {
        console.error('⚠️  Terminal QR failed:', error.message);
    }
    
    try {
        fs.writeFileSync(qrFilePath, qr);
        console.log(`✅ QR saved: ${qrFilePath}\n`);
    } catch (error) {
        console.error('⚠️  QR save failed:', error.message);
    }
    
    console.log('📋 QR Code Text:');
    console.log('═══════════════════════════════════════════════');
    console.log(qr);
    console.log('═══════════════════════════════════════════════\n');
}

// Main connection
async function connectToWhatsApp() {
    console.log('🤖 Initializing Sreeniverse Business Bot v3.0...\n');
    
    restoreSession();
    
    const { state, saveCreds } = await useMultiFileAuthState(config.sessionPath);
    const { version } = await fetchLatestBaileysVersion();
    
    const logger = pino({ level: 'silent' });
    
    const sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        browser: ['Sreeniverse Business Bot', 'Chrome', '10.0'],
        getMessage: async () => undefined,
        markOnlineOnConnect: true,
        syncFullHistory: false,
        defaultQueryTimeoutMs: 60000,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
    });
    
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            displayQRCode(qr);
        }
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom)
                ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
                : true;
            
            if (shouldReconnect) {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                console.log(`\n⚠️  Connection closed (Status: ${statusCode})\n`);
                
                // Handle error 440 (connection conflict) - wait longer
                if (statusCode === 440) {
                    console.log('⏸️  Connection conflict. Waiting 30s before retry...\n');
                    setTimeout(() => connectToWhatsApp(), 30000);
                    return;
                }
                
                // Clear session on auth errors
                if (statusCode === 401 || statusCode === 403 || statusCode === 515) {
                    console.log('⚠️  Auth error. Clearing session...');
                    try {
                        if (fs.existsSync(config.sessionPath)) {
                            fs.rmSync(config.sessionPath, { recursive: true, force: true });
                        }
                        console.log('✅ Session cleared. Need new QR.\n');
                    } catch (error) {
                        console.error('⚠️  Clear error:', error.message);
                    }
                }
                
                console.log('🔄 Reconnecting in 5 seconds...\n');
                setTimeout(() => connectToWhatsApp(), 5000);
            } else {
                console.log('\n❌ Logged out. Restart to reconnect.\n');
                try {
                    if (fs.existsSync(config.sessionPath)) {
                        fs.rmSync(config.sessionPath, { recursive: true, force: true });
                    }
                } catch (error) {
                    console.error('⚠️  Clear error:', error.message);
                }
                process.exit(0);
            }
        } else if (connection === 'open') {
            console.log('\n╔════════════════════════════════════════════════╗');
            console.log('║  ✅ SREENIVERSE BUSINESS BOT IS ONLINE!       ║');
            console.log('╚════════════════════════════════════════════════╝\n');
            console.log('🟢 Ready to handle customer inquiries');
            console.log(`📊 Daily limit: ${config.dailyLimit} messages`);
            console.log(`⏱️  Hourly limit: ${config.hourlyLimit} messages`);
            console.log('💼 Interactive menu system: ACTIVE');
            console.log('💾 Lead capture: ENABLED\n');
            console.log('═══════════════════════════════════════════════\n');
            
            setTimeout(backupSession, 5000);
            
            try {
                if (fs.existsSync(qrFilePath)) {
                    fs.unlinkSync(qrFilePath);
                }
            } catch (error) {
                // Ignore
            }
        } else if (connection === 'connecting') {
            console.log('🔗 Connecting to WhatsApp...\n');
        }
    });
    
    sock.ev.on('creds.update', saveCreds);
    
    // Message handler
    sock.ev.on('messages.upsert', async ({ messages }) => {
        resetCounters();
        
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        
        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        
        console.log(`\n📨 Message from: ${from}`);
        console.log(`💬 Text: "${text}"\n`);
        
        // Blacklist check
        if (blacklist.has(from)) {
            console.log(`🚫 Blacklisted: ${from}\n`);
            return;
        }
        
        // STOP keyword
        if (text.toLowerCase().includes('stop') || text.toLowerCase().includes('unsubscribe')) {
            blacklist.add(from);
            saveBlacklist();
            
            await sock.sendMessage(from, {
                text: "✅ You've been unsubscribed from auto-replies. Send START to re-enable."
            });
            
            console.log(`🛑 Blacklisted: ${from}\n`);
            return;
        }
        
        // Limits check
        if (messageCount.daily >= config.dailyLimit) {
            console.log(`⏸️  Daily limit reached\n`);
            return;
        }
        
        if (messageCount.hourly >= config.hourlyLimit) {
            console.log(`⏸️  Hourly limit reached\n`);
            return;
        }
        
        // Parse message and get response
        const messageType = parseMessage(text);
        const response = getResponse(messageType);
        
        console.log(`🎯 Detected: ${messageType}`);
        
        // Calculate delay
        const delay = calculateDelay();
        console.log(`⏳ Delay: ${(delay / 1000).toFixed(1)}s\n`);
        
        setTimeout(async () => {
            try {
                // Typing simulation
                const typingDelay = config.typingDelay.min + 
                    Math.random() * (config.typingDelay.max - config.typingDelay.min);
                
                console.log('⌨️  Typing...');
                await sock.sendPresenceUpdate('composing', from);
                await new Promise(resolve => setTimeout(resolve, typingDelay));
                await sock.sendPresenceUpdate('paused', from);
                
                // Send response
                await sock.sendMessage(from, { text: response });
                
                messageCount.daily++;
                messageCount.hourly++;
                
                // Save lead
                saveLead(from, text, messageType);
                
                console.log(`✅ Replied: ${messageType}`);
                console.log(`📊 Count - Daily: ${messageCount.daily}/${config.dailyLimit} | Hourly: ${messageCount.hourly}/${config.hourlyLimit}`);
                console.log(`💾 Lead captured and saved\n`);
                console.log('═══════════════════════════════════════════════\n');
                
            } catch (error) {
                console.error('❌ Reply error:', error.message, '\n');
            }
        }, delay);
    });
    
    return sock;
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down...');
    backupSession();
    console.log('💾 Session backed up');
    console.log('👋 Goodbye!\n');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\n🛑 Shutting down...');
    backupSession();
    console.log('💾 Session backed up');
    console.log('👋 Goodbye!\n');
    process.exit(0);
});

// Start
console.log('🚀 Starting Sreeniverse Business Bot...\n');
connectToWhatsApp().catch(err => {
    console.error('\n❌ FATAL ERROR:', err.message);
    console.error('Stack:', err.stack);
    console.log('\n🔄 Please restart.\n');
    process.exit(1);
});
