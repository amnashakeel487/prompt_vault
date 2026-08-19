import SEO from '../components/SEO'

export default function Privacy() {
  return (
    <section className="section-pad py-16 max-w-3xl mx-auto">
      <SEO title="Privacy Policy" description="PromptVault privacy policy." />
      <h1 className="font-display text-3xl font-semibold text-ink">Privacy Policy</h1>
      <div className="mt-6 space-y-5 text-sm leading-relaxed text-ink-muted">
        <p>PromptVault does not require an account to browse or copy prompts. We collect minimal analytics
          (page views and copy counts) to understand which prompts are useful.</p>
        <p>We do not sell personal data. Any values you type into a prompt's variable form stay in your
          browser and are never stored on our servers.</p>
        <p>If you contact us through the contact form, we use your email only to respond to your message.</p>
        <p>This policy may be updated periodically. Continued use of PromptVault after changes means you
          accept the revised policy.</p>
      </div>
    </section>
  )
}
