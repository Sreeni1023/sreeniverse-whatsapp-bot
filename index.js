// Conversation state store
const sessions = {}

async function handleMessage(sock, msg) {
  const from = msg.key.remoteJid
  const text = msg.message?.conversation?.toLowerCase().trim() ||
               msg.message?.extendedTextMessage?.text?.toLowerCase().trim() || ''

  if (!sessions[from]) sessions[from] = { step: 'start' }
  const session = sessions[from]

  // APPOINTMENT FLOW
  if (session.step === 'start') {
    if (text === 'hi' || text === 'hello' || text === 'appointment') {
      session.step = 'get_name'
      await sock.sendMessage(from, {
        text: `నమస్కారం! Sri Clinic కి స్వాగతం.\n\n1. Appointment book చేయి\n2. Timings తెలుసుకో\n3. Location చూడు\n\nఒక number పంపండి`
      })
    }
  }

  else if (session.step === 'get_name') {
    if (text === '1') {
      session.step = 'get_name'
      await sock.sendMessage(from, { text: 'మీ పూర్తి పేరు చెప్పండి:' })
    } else if (text === '2') {
      sessions[from] = { step: 'start' }
      await sock.sendMessage(from, { text: 'Timings: Mon–Sat 10am–8pm\nSunday: 10am–2pm' })
    } else if (text === '3') {
      sessions[from] = { step: 'start' }
      await sock.sendMessage(from, { text: 'Address: Plot 12, Dilsukhnagar\nGoogle Maps: [link]' })
    } else {
      // Name received
      session.name = text
      session.step = 'get_date'
      await sock.sendMessage(from, { text: `Thanks ${session.name}! ఏ date కి appointment కావాలి?\n(Example: April 10)` })
    }
  }

  else if (session.step === 'get_date') {
    session.date = text
    session.step = 'get_time'
    await sock.sendMessage(from, {
      text: `Preferred time:\n1. Morning (10am–12pm)\n2. Afternoon (12pm–4pm)\n3. Evening (4pm–8pm)`
    })
  }

  else if (session.step === 'get_time') {
    const times = { '1': 'Morning 10am–12pm', '2': 'Afternoon 12pm–4pm', '3': 'Evening 4pm–8pm' }
    session.time = times[text] || text
    session.step = 'get_issue'
    await sock.sendMessage(from, { text: 'Consultation reason briefly చెప్పండి:\n(Example: fever, checkup, skin issue)' })
  }

  else if (session.step === 'get_issue') {
    session.issue = text
    session.step = 'confirmed'

    // Save to Google Sheets via n8n webhook
    await fetch('http://localhost:5678/webhook/appointment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: session.name,
        phone: from.replace('@s.whatsapp.net', ''),
        date: session.date,
        time: session.time,
        issue: session.issue,
        timestamp: new Date().toISOString()
      })
    })

    await sock.sendMessage(from, {
      text: `Appointment confirmed!\n\nName: ${session.name}\nDate: ${session.date}\nTime: ${session.time}\nReason: ${session.issue}\n\nమా team 30 minutes లో confirm చేస్తుంది. Thank you!`
    })

    // Schedule feedback after 4 hours
    setTimeout(async () => {
      await sendFeedback(sock, from, session.name)
    }, 4 * 60 * 60 * 1000)

    sessions[from] = { step: 'start' }
  }
}

// FEEDBACK FLOW
async function sendFeedback(sock, from, name) {
  await sock.sendMessage(from, {
    text: `నమస్కారం ${name} గారు! మీ visit ఎలా ఉంది?\n\n1 - చాలా బాగుంది\n2 - బాగుంది\n3 - Average\n4 - Improve చేయాలి\n\nNumber పంపండి`
  })
  sessions[from] = { step: 'feedback' }
}
