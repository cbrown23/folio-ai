import { Resend } from 'resend'
import config from '../../folio.config'

// Lazy — Resend throws at construction if the key is missing,
// which would break the build. Instantiate only when actually sending.
function getResend(): Resend {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not set')
  return new Resend(key)
}

// FROM must be a verified Resend domain. Set RESEND_FROM_EMAIL in env vars
// after verifying creativecloudnative.com in the Resend dashboard.
// Visitor's email goes into reply-to so the owner can reply directly.
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? `assistant@${config.owner.domain}`

export type NoteEmailParams = {
  visitorName: string
  visitorEmail: string
  subject: string
  message: string
}

export async function sendNoteToOwner(params: NoteEmailParams): Promise<void> {
  const { visitorName, visitorEmail, subject, message } = params

  const { error } = await getResend().emails.send({
    from: `${config.agent.assistantName} <${FROM_EMAIL}>`,
    replyTo: visitorEmail,
    to: process.env.OWNER_EMAIL ?? config.owner.email,
    subject: `Note from ${visitorName}: ${subject}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <p style="color: #6366f1; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">
          Message via ${config.site.url}
        </p>
        <h2 style="margin: 4px 0 16px;">${subject}</h2>
        <p style="white-space: pre-wrap; line-height: 1.6; color: #374151;">${message}</p>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
        <p style="font-size: 13px; color: #6b7280;">
          Sent by <strong>${visitorName}</strong> (${visitorEmail}) via the portfolio chat.<br/>
          Reply to this email to respond directly.
        </p>
      </div>
    `,
  })

  if (error) throw new Error(error.message)
}
