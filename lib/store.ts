// In-memory store for real-time data sharing between API routes
// Used for WhatsApp creation status, verification sessions, etc.

interface WACreationStatus {
  step: number
  stepName: string
  status: 'pending' | 'in_progress' | 'done' | 'error'
  error?: string
  token?: string
  qrData?: string
}

interface VerificationPoll {
  userId: string
  phoneNumber: string
  service: string
  sessionId: string
  startedAt: number
  timer?: any
}

const waStatus = new Map<string, WACreationStatus>()
const verificationPolls = new Map<string, VerificationPoll>()
const ivasmsClients = new Map<string, any>()

export const store = {
  // WhatsApp creation
  setWAStatus(userId: string, status: WACreationStatus) {
    waStatus.set(userId, status)
  },
  getWAStatus(userId: string): WACreationStatus | undefined {
    return waStatus.get(userId)
  },
  clearWAStatus(userId: string) {
    waStatus.delete(userId)
  },

  // Verification polls
  setVerificationPoll(sessionId: string, poll: VerificationPoll) {
    verificationPolls.set(sessionId, poll)
  },
  getVerificationPoll(sessionId: string): VerificationPoll | undefined {
    return verificationPolls.get(sessionId)
  },
  clearVerificationPoll(sessionId: string) {
    const poll = verificationPolls.get(sessionId)
    if (poll?.timer) clearInterval(poll.timer)
    verificationPolls.delete(sessionId)
  },

  // iVASMS client cache
  setIVASMSClient(userId: string, client: any) {
    ivasmsClients.set(userId, client)
  },
  getIVASMSClient(userId: string) {
    return ivasmsClients.get(userId)
  },
}

export default store
