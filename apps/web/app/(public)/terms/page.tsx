import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — ECHO',
  description: 'Terms and conditions for using the ECHO app and service.',
}

const LAST_UPDATED = 'May 25, 2026'
const CONTACT_EMAIL = 'support@echo-self.app'
const APP_NAME = 'ECHO'
const COMPANY = 'ECHO//SELF'

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0A0B0F] text-[#F0F0F5]">
      <div className="max-w-2xl mx-auto px-6 py-16 space-y-10">

        <header className="space-y-3">
          <a href="/" className="text-sm text-[#7B6CF6] hover:opacity-80 transition-opacity">
            ← {APP_NAME}
          </a>
          <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
          <p className="text-sm text-[#8B8FA8]">Last updated: {LAST_UPDATED}</p>
        </header>

        <Section title="1. Acceptance of Terms">
          <p>
            By downloading, installing, or using the {APP_NAME} application or website (the &quot;Service&quot;), operated by {COMPANY} (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.
          </p>
          <p>
            You must be at least 17 years old to use {APP_NAME}. By using the Service, you represent that you meet this requirement.
          </p>
        </Section>

        <Section title="2. The Service">
          <p>
            {APP_NAME} is a personal AI memory layer that helps you journal, understand emotional patterns, build your identity graph, and explore simulations of your future self. The Service uses artificial intelligence to analyse your entries and generate personalised insights.
          </p>
          <p>
            <strong>Not a medical or mental health service.</strong> {APP_NAME} is not a substitute for professional medical advice, diagnosis, or treatment. If you are experiencing a mental health crisis, please contact emergency services or a crisis helpline immediately.
          </p>
        </Section>

        <Section title="3. Account Registration">
          <ul>
            <li>You must provide accurate information when creating an account.</li>
            <li>You are responsible for maintaining the security of your account credentials.</li>
            <li>You must notify us immediately of any unauthorised use of your account.</li>
            <li>One account per person. Do not create accounts on behalf of others without their consent.</li>
          </ul>
        </Section>

        <Section title="4. Subscription and Payment">
          <SubHeading>4.1 Free Plan</SubHeading>
          <p>
            The free plan allows up to 3 journal entries per day and provides basic features. No credit card is required.
          </p>

          <SubHeading>4.2 Pro Plan</SubHeading>
          <p>
            The Pro plan is available for $12/month or $99/year. Pro includes unlimited entries, AI responses, Memory Search, Identity Web, Behavioral Patterns, and Future Self simulation.
          </p>

          <SubHeading>4.3 Billing</SubHeading>
          <ul>
            <li>Subscriptions automatically renew unless cancelled before the renewal date.</li>
            <li>Payments are processed by Stripe. We do not store credit card information.</li>
            <li>Refunds are available within 7 days of purchase if you have not meaningfully used the Pro features.</li>
            <li>We may change pricing with 30 days&apos; notice to existing subscribers.</li>
          </ul>

          <SubHeading>4.4 In-App Purchases (iOS / Android)</SubHeading>
          <p>
            Subscriptions purchased through the Apple App Store or Google Play are subject to those platforms&apos; refund policies. To manage or cancel, use your device&apos;s subscription settings.
          </p>
        </Section>

        <Section title="5. Your Content">
          <SubHeading>5.1 Ownership</SubHeading>
          <p>
            You retain full ownership of all journal entries, voice recordings, and other content you create in {APP_NAME} (&quot;Your Content&quot;).
          </p>

          <SubHeading>5.2 Licence to us</SubHeading>
          <p>
            By using the Service, you grant us a limited, non-exclusive licence to process Your Content solely to provide the Service — including sending it to AI providers to generate responses, storing it in our database, and displaying it back to you. We do not use Your Content to train AI models.
          </p>

          <SubHeading>5.3 Prohibited content</SubHeading>
          <p>You must not submit content that:</p>
          <ul>
            <li>Violates any applicable law</li>
            <li>Contains child sexual abuse material</li>
            <li>Promotes violence or terrorism</li>
            <li>Infringes the intellectual property rights of others</li>
            <li>Is intended to harm, harass, or stalk another person</li>
          </ul>
        </Section>

        <Section title="6. Acceptable Use">
          <p>You agree not to:</p>
          <ul>
            <li>Attempt to reverse-engineer, scrape, or circumvent the Service</li>
            <li>Use automated tools to submit entries at scale</li>
            <li>Share your account with others</li>
            <li>Use the Service to generate content intended to deceive others</li>
            <li>Attempt to access other users&apos; data</li>
            <li>Interfere with the operation of the Service</li>
          </ul>
        </Section>

        <Section title="7. AI-Generated Content">
          <p>
            {APP_NAME} uses AI to generate responses to your entries, emotional analyses, behavioral pattern descriptions, and Future Self simulations. You acknowledge that:
          </p>
          <ul>
            <li>AI-generated content may be inaccurate, incomplete, or not reflect reality.</li>
            <li>AI responses are not professional advice (medical, psychological, financial, or legal).</li>
            <li>You should not make major life decisions based solely on AI-generated insights.</li>
            <li>We are not responsible for decisions you make based on AI-generated content.</li>
          </ul>
        </Section>

        <Section title="8. Account Termination">
          <SubHeading>8.1 By you</SubHeading>
          <p>
            You may delete your account at any time via Settings → Delete Account. All your data will be permanently deleted within 30 days.
          </p>

          <SubHeading>8.2 By us</SubHeading>
          <p>
            We may suspend or terminate your account if you violate these Terms. We will provide notice where reasonably possible. Upon termination, your right to use the Service ends immediately.
          </p>
        </Section>

        <Section title="9. Disclaimers and Limitation of Liability">
          <p>
            THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED.
          </p>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM ARISING FROM THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US IN THE 12 MONTHS BEFORE THE CLAIM OR (B) $100 USD.
          </p>
          <p>
            WE ARE NOT LIABLE FOR ANY LOSS OF DATA, LOSS OF PROFITS, OR INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES.
          </p>
        </Section>

        <Section title="10. Indemnification">
          <p>
            You agree to indemnify and hold harmless {COMPANY} from any claims, damages, or expenses (including legal fees) arising from your use of the Service, Your Content, or your violation of these Terms.
          </p>
        </Section>

        <Section title="11. Changes to Terms">
          <p>
            We may update these Terms from time to time. We will notify you of material changes by email or in-app notification at least 14 days before they take effect. Continued use of the Service after changes constitutes acceptance.
          </p>
        </Section>

        <Section title="12. Governing Law">
          <p>
            These Terms are governed by and construed in accordance with applicable law. Any disputes shall be resolved through binding arbitration, except where prohibited by law. You waive the right to participate in class action lawsuits.
          </p>
        </Section>

        <Section title="13. Contact">
          <p>
            Questions about these Terms? Contact us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#7B6CF6] hover:opacity-80">
              {CONTACT_EMAIL}
            </a>
          </p>
        </Section>

        <footer className="border-t border-white/5 pt-8 flex gap-6 text-sm text-[#8B8FA8]">
          <a href="/privacy" className="hover:text-[#F0F0F5] transition-colors">Privacy Policy</a>
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
