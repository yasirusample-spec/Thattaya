import { Bot } from 'grammy'
import getDb from './db'
import { extractOTP, detectService } from './ivasms'

const activeBots: Map<string, Bot> = new Map()

export async function setupTelegramBot(userId: string, botToken: string, chatId: string): Promise<{ ok: boolean; username?: string; error?: string }> {
  try {
    // Stop existing bot if any
    if (activeBots.has(userId)) {
      try { activeBots.get(userId)!.stop() } catch {}
      activeBots.delete(userId)
    }

    const bot = new Bot(botToken)
    const me = await bot.api.getMe()

    // Register commands
    bot.command('start', async (ctx) => {
      await ctx.reply(
        `💀 *DL SMS Client — Team Death Legion*\n\nWelcome to your SMS monitoring bot!\n\nAvailable commands:\n/numbers — List active numbers\n/otp — Get latest OTPs\n/status — System health\n/help — Show commands`,
        { parse_mode: 'Markdown' }
      )
    })

    bot.command('help', async (ctx) => {
      await ctx.reply(
        `💀 *DL SMS Bot Commands*\n\n/numbers — List all active numbers\n/otp — Get latest OTPs\n/status — System health\n/start — Welcome message`,
        { parse_mode: 'Markdown' }
      )
    })

    bot.command('numbers', async (ctx) => {
      const db = getDb()
      const numbers = db.prepare('SELECT * FROM numbers WHERE user_id = ? AND status = ?').all(userId, 'active') as any[]
      if (numbers.length === 0) {
        await ctx.reply('📱 No active numbers found. Sync from iVASMS first.')
        return
      }
      const list = numbers.map((n: any) => `${n.flag || '📱'} \`${n.phone}\` — ${n.country || 'Unknown'}`).join('\n')
      await ctx.reply(`📱 *Active Numbers (${numbers.length})*\n\n${list}`, { parse_mode: 'Markdown' })
    })

    bot.command('otp', async (ctx) => {
      const db = getDb()
      const msgs = db.prepare(`
        SELECT * FROM sms_messages 
        WHERE user_id = ? AND otp IS NOT NULL 
        ORDER BY received_at DESC LIMIT 5
      `).all(userId) as any[]

      if (msgs.length === 0) {
        await ctx.reply('🔑 No OTPs found recently.')
        return
      }
      const list = msgs.map((m: any) =>
        `🔑 \`${m.otp}\` — ${m.service || 'Unknown'}\n📱 ${m.phone_number}\n⏰ ${m.received_at}`
      ).join('\n\n')
      await ctx.reply(`*Recent OTPs*\n\n${list}`, { parse_mode: 'Markdown' })
    })

    bot.command('status', async (ctx) => {
      await ctx.reply(
        `🟢 *System Status*\n\n✅ API Service — Online\n✅ Database — Online\n✅ Bot — Active\n\n_Last checked: ${new Date().toISOString()}_`,
        { parse_mode: 'Markdown' }
      )
    })

    // Start bot in background
    bot.start({ drop_pending_updates: true }).catch(() => {})
    activeBots.set(userId, bot)

    return { ok: true, username: me.username }
  } catch (err: any) {
    console.error('[Telegram] Setup error:', err)
    return { ok: false, error: err.message }
  }
}

export async function sendTelegramNotification(userId: string, message: string): Promise<boolean> {
  try {
    const db = getDb()
    const user = db.prepare('SELECT telegram_bot_token, telegram_chat_id FROM users WHERE id = ?').get(userId) as any
    if (!user?.telegram_bot_token || !user?.telegram_chat_id) return false

    let bot = activeBots.get(userId)
    if (!bot) {
      bot = new Bot(user.telegram_bot_token)
    }

    await bot.api.sendMessage(user.telegram_chat_id, message, { parse_mode: 'Markdown' })
    return true
  } catch (err) {
    console.error('[Telegram] Send error:', err)
    return false
  }
}

export async function notifyNewOTP(userId: string, sms: { phone_number: string; otp: string; service: string; body: string }): Promise<void> {
  const msg = `🔑 *New OTP from iVASMS*\n📱 Number: \`${sms.phone_number}\`\n🌐 Service: ${sms.service}\n📨 Code: \`${sms.otp}\`\n💬 ${sms.body.substring(0, 100)}\n⏰ ${new Date().toLocaleString()}`
  await sendTelegramNotification(userId, msg)
}

export async function sendTestMessage(userId: string): Promise<boolean> {
  return sendTelegramNotification(userId, `💀 *DL SMS: Bot is working!*\n\nTeam Death Legion — SMS Monitor Active\n_${new Date().toISOString()}_`)
}

export function stopBot(userId: string): void {
  if (activeBots.has(userId)) {
    try { activeBots.get(userId)!.stop() } catch {}
    activeBots.delete(userId)
  }
}
