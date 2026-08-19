import { useForm } from 'react-hook-form'
import { Wand2 } from 'lucide-react'

// Splits a camel/Pascal-case variable name into a human label, e.g. "BusinessName" -> "Business Name"
function toLabel(name) {
  return name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ')
}

export default function VariableForm({ variables, onGenerate }) {
  const { register, handleSubmit } = useForm()

  if (variables.length === 0) {
    return (
      <div className="glass-card p-5 text-sm text-ink-muted">
        This prompt has no variables — it's ready to copy as-is.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onGenerate)} className="glass-card p-5 space-y-4">
      <h3 className="font-display font-semibold text-ink">Fill in the variables</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {variables.map((name) => (
          <div key={name} className="flex flex-col gap-1.5">
            <label htmlFor={name} className="text-xs font-medium text-ink-muted">
              {toLabel(name)}
            </label>
            <input
              id={name}
              {...register(name)}
              placeholder={`e.g. ${toLabel(name)}`}
              className="rounded-lg border border-line bg-white/[0.03] px-3 py-2 text-sm text-ink placeholder:text-ink-faint outline-none transition focus:border-violet/50 focus:bg-white/[0.06]"
            />
          </div>
        ))}
      </div>
      <button type="submit" className="btn-primary">
        <Wand2 size={16} /> Generate prompt
      </button>
    </form>
  )
}
