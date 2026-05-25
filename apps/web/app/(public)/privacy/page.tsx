import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — ECHO',
  description: 'How ECHO collects, uses, and protects your personal data.',
}

const LAST_UPDATED = 'May 25, 2026'
const CONTACT_EMAIL = 'privacy@echo-self.app'
const APP_NAME = 'ECHO'
const COMPANY = 'ECHO//SELF'

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#0A0B0F] text-[#F0F0F5]">
      <div className="max-w-2xl mx-auto px-6 py-16 space-y-10">

        {/* Header */}
        <header className="space-y-3">
          <a href="/" className="text-sm text-[#7B6CF6] hover:opacity-80 transition-opacity">
            ← {APP_NAME}
          </a>
          <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-[#8B8FA8]">Last updated: {LAST_UPDATED}</p>
        </header>

        <Section title="1. Overview">
          <p>
            {COMPANY} (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the {APP_NAME} mobile application and website (collectively, the &quot;Service&quot;). This Privacy Policy explains what information we collect, how we use it, and your rights regarding that information.
          </p>
          <p>
            By using {APP_NAME}, you agree to the collection and use of information as described in this policy. If you do not agree, please do not use the Service.
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <SubHeading>2.1 Information you provide</SubHeading>
          <ul>
            <li><strong>Account information:</strong> Email address used to create your account.</li>
            <li><strong>Journal entries:</strong> Text, voice recordings, and any content you write in {APP_NAME}.</li>
            <li><strong>Profile information:</strong> Display name, timezone, and preferences you set during onboarding.</li>
            <li><strong>Payment information:</strong> Processed by Stripe. We do not store credit card numbers.</li>
          </ul>

          <SubHeading>2.2 Information collected automatically</SubHeading>
          <ul>
            <li><strong>Usage data:</strong> Which features you use, session length, and interaction patterns (via PostHog).</li>
            <li><strong>Device information:</strong> Device type, operating system version, and app version.</li>
            <li><strong>Error reports:</strong> Crash logs and error traces (via Sentry). These do not contain your journal content.</li>
          </ul>

          <SubHeading>2.3 AI-processed data</SubHeading>
          <p>
            Your journal entries are processed by third-party AI services (Anthropic Claude and OpenAI) to generate responses, detect emotional patterns, and build your identity graph. We send only the minimum necessary content for each AI operation.
          </p>
        </Section>

        <Section title="3. How We Use Your Information">
          <ul>
            <li>To provide and improve the {APP_NAME} Service</li>
            <li>To generate AI-powered insights, responses, and your Future Self simulation</li>
            <li>To detect emotional patterns and behavioral signals in your entries</li>
            <li>To send you daily reminders and weekly digest notifications (if enabled)</li>
            <li>To process subscription payments and manage your account</li>
            <li>To monitor for and fix errors and bugs in the Service</li>
            <li>To comply with legal obligations</li>
          </ul>
          <p>
            <strong>We do not sell your personal data to third parties.</strong> We do not use your journal entries for advertising.
          </p>
        </Section>

        <Section title="4. AI Data Processing">
          <p>
            {APP_NAME} uses the following AI providers to process your data:
          </p>
          <ul>
            <li><strong>Anthropic (Claude):</strong> Memory compression, emotional analysis, behavioral tagging, Future Self generation. <a href="https://www.anthropic.com/privacy" className="text-[#7B6CF6] hover:opacity-80">Anthropic Privacy Policy →</a></li>
            <li><strong>OpenAI:</strong> Text embeddings for semantic memory search, voice transcription (Whisper). <a href="https://openai.com/privacy" className="text-[#7B6CF6] hover:opacity-80">OpenAI Privacy Policy →</a></li>
          </ul>
          <p>
            Your data is sent to these providers solely to deliver {APP_NAME} features. We have data processing agreements with these providers. Your content is <strong>not used to train their models</strong> under our agreements.
          </p>
        </Section>

        <Section title="5. Data Storage and Security">
          <p>
            Your data is stored on Supabase (PostgreSQL) hosted on AWS. All data is:
          </p>
          <ul>
            <li>Encrypted in transit (TLS 1.3)</li>
            <li>Encrypted at rest (AES-256)</li>
            <li>Isolated per user via Row Level Security — no user can access another user&apos;s data</li>
            <li>Backed up daily with 30-day retention</li>
          </ul>
        </Section>

        <Section title="6. Data Retention">
          <p>
            We retain your data for as long as your account is active. When you delete your account:
          </p>
          <ul>
            <li>All journal entries are permanently deleted within 30 days</li>
            <li>All identity data, emotional logs, and behavioral patterns are deleted</li>
            <li>Anonymized, aggregated analytics data may be retained</li>
            <li>Payment records are retained for 7 years as required by law</li>
          </ul>
        </Section>

        <Section title="7. Your Rights (GDPR / CCPA)">
          <p>You have the right to:</p>
          <ul>
            <li><strong>Access:</strong> Request a copy of all data we hold about you</li>
            <li><strong>Correction:</strong> Update inaccurate personal information</li>
            <li><strong>Deletion:</strong> Delete your account and all associated data via Settings → Delete Account</li>
            <li><strong>Portability:</strong> Export your data in JSON format (Settings → Export)</li>
            <li><strong>Objection:</strong> Object to processing of your data for certain purposes</li>
            <li><strong>Restriction:</strong> Request restriction of processing in certain circumstances</li>
          </ul>
          <p>
            To exercise these rights, contact us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#7B6CF6]">{CONTACT_EMAIL}</a> or use the in-app Settings menu.
          </p>
        </Section>

        <Section title="8. Children's Privacy">
          <p>
            {APP_NAME} is not intended for users under 17 years of age. We do not knowingly collect personal information from children under 17. If you believe a child under 17 has provided us with personal information, please contact us immediately at <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#7B6CF6]">{CONTACT_EMAIL}</a>.
          </p>
        </Section>

        <Section title="9. Third-Party Services">
          <p>We use the following third-party services:</p>
          <ul>
            <li><strong>Supabase</strong> — Database, authentication, storage</li>
            <li><strong>Stripe</strong> — Payment processing</li>
            <li><strong>PostHog</strong> — Product analytics (anonymized)</li>
            <li><strong>Sentry</strong> — Error monitoring (no journal content)</li>
            <li><strong>Anthropic</strong> — AI processing</li>
            <li><strong>OpenAI</strong> — Embeddings and transcription</li>
            <li><strong>Vercel</strong> — Web hosting</li>
            <li><strong>Expo / EAS</strong> — Mobile app delivery</li>
          </ul>
        </Section>

        <Section title="10. Cookies and Tracking">
          <p>
            The {APP_NAME} web app uses essential cookies for authentication (session management). We use PostHog for analytics, which may set cookies. You can opt out of analytics tracking in your browser settings.
          </p>
          <p>
            The {APP_NAME} mobile app does not use cookies. Analytics identifiers are anonymized.
          </p>
        </Section>

        <Section title="11. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. We will notify you of significant changes by email or via an in-app notification. Continued use of {APP_NAME} after changes constitutes acceptance of the updated policy.
          </p>
        </Section>

        <Section title="12. Contact Us">
          <p>
            For privacy-related questions, data requests, or concerns:
          </p>
          <p>
            <strong>{COMPANY}</strong><br />
            Email: <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#7B6CF6] hover:opacity-80">{CONTACT_EMAIL}</a>
          </p>
        </Section>

        <footer className="border-t border-white/5 pt-8 flex gap-6 text-sm text-[#8B8FA8]">
          <a href="/terms" className="hover:text-[#F0F0F5] transition-colors">Terms of Service</a>
          <a href="/" className="hover:text-[#F0F0F5] transition-colors">← Back to ECHO</a>
        </footer>
      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-[#F0F0F5]">{title}</h2>
      <div className="text-[#8B8FA8] leading-relaxed space-y-3 text-sm [&_a]:underline [&_a]:underline-offset-2 [&_ul]:space-y-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:text-[#F0F0F5]">
        {children}
      </div>
    </section>
  )
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-[#F0F0F5] mt-4 mb-1">{children}</h3>
}
