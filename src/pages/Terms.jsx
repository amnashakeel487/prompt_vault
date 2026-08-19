import SEO from '../components/SEO'

export default function Terms() {
  return (
    <section className="section-pad py-16 max-w-3xl mx-auto">
      <SEO title="Terms of Service" description="PromptVault terms of service." />
      <h1 className="font-display text-3xl font-semibold text-ink">Terms of Service</h1>
      <div className="mt-6 space-y-5 text-sm leading-relaxed text-ink-muted">
        <p>By using PromptVault you agree to use the prompts responsibly and in accordance with the terms
          of the AI platforms you paste them into.</p>
        <p>Prompts are provided as-is. We do not guarantee any particular output quality from third-party
          AI tools you use these prompts with.</p>
        <p>Content on this site may not be scraped or redistributed in bulk without permission.</p>
        <p>We reserve the right to update, remove, or unpublish prompts at any time.</p>
      </div>
    </section>
  )
}
