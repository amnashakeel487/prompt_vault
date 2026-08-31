import { useState, useRef } from 'react'
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Tag,
  Code2,
} from 'lucide-react'
import { parseAndValidateExcel, generateImportTemplate } from '../utils/excelUtils'

export default function ExcelImportModal({
  isOpen,
  onClose,
  onImportConfirm,
  categoriesList = [],
  subcategoriesList = [],
  existingPrompts = [],
  isCategoryAdmin = false,
  assignedCategory = null,
}) {
  const [file, setFile] = useState(null)
  const [parsing, setParsing] = useState(false)
  const [parseResult, setParseResult] = useState(null)
  const [parseError, setParseError] = useState('')
  const [activeTab, setActiveTab] = useState('valid') // 'valid' | 'errors'
  const [isImporting, setIsImporting] = useState(false)

  const fileInputRef = useRef(null)

  if (!isOpen) return null

  const handleFileChange = async (selectedFile) => {
    if (!selectedFile) return
    setFile(selectedFile)
    setParsing(true)
    setParseError('')
    setParseResult(null)

    try {
      const result = await parseAndValidateExcel(selectedFile, {
        categoriesList,
        subcategoriesList,
        existingPrompts,
      })

      // If category admin, additionally verify that valid rows belong to their assigned category
      if (isCategoryAdmin && assignedCategory) {
        const assignedCatId = assignedCategory.id
        const filteredValid = []
        result.validRows.forEach((row) => {
          if (row.category_id === assignedCatId) {
            filteredValid.push(row)
          } else {
            result.errorRows.push({
              rowNumber: row.rowNumber,
              title: row.title,
              slug: row.slug,
              category: row.category_name,
              raw: row,
              errors: [
                `Unauthorized category "${row.category_name}". As a Category Admin, you can only import prompts for the "${assignedCategory.name}" category.`,
              ],
            })
          }
        })
        result.validRows = filteredValid
      }

      setParseResult(result)
      setActiveTab(result.validRows.length > 0 ? 'valid' : 'errors')
    } catch (err) {
      console.error('Error parsing Excel file:', err)
      setParseError(err.message || 'Failed to parse Excel file.')
    } finally {
      setParsing(false)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0])
    }
  }

  const handleConfirm = async () => {
    if (!parseResult || parseResult.validRows.length === 0) return
    setIsImporting(true)
    try {
      await onImportConfirm(parseResult.validRows, parseResult.errorRows)
      handleClose()
    } catch (err) {
      console.error('Import failed:', err)
      setParseError(err.message || 'Failed to import prompts.')
    } finally {
      setIsImporting(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setParseResult(null)
    setParseError('')
    setIsImporting(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-card w-full max-w-4xl max-h-[90vh] flex flex-col p-6 space-y-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet/10 border border-line text-violet-soft shadow-glow">
              <FileSpreadsheet size={20} />
            </span>
            <div>
              <h3 className="font-display font-semibold text-lg text-ink">
                Import Prompts from Excel
              </h3>
              <p className="text-xs text-ink-muted">
                Upload a <code className="text-violet-soft font-mono">.xlsx</code> file to bulk create prompt templates.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => generateImportTemplate()}
              className="btn-ghost !py-1.5 !px-3 text-xs flex items-center gap-1.5 hover:text-violet-soft"
              title="Download clean sample template"
            >
              <Download size={13} />
              <span>Download Template</span>
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg border border-line text-ink-muted hover:text-ink transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          {/* File Upload Dropzone */}
          {!parseResult && !parsing && (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-line hover:border-violet/60 rounded-2xl p-8 text-center cursor-pointer bg-surface/30 hover:bg-surface/50 transition-all flex flex-col items-center justify-center space-y-3 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
              />
              <span className="grid h-12 w-12 place-items-center rounded-full bg-violet/10 text-violet-soft group-hover:scale-110 transition-transform">
                <Upload size={22} />
              </span>
              <div>
                <p className="font-display font-semibold text-sm text-ink">
                  Click to upload or drag & drop Excel file
                </p>
                <p className="text-[11px] text-ink-muted mt-0.5">
                  Supported formats: Microsoft Excel (<code className="font-mono">.xlsx</code>, <code className="font-mono">.xls</code>)
                </p>
              </div>
              <span className="chip !text-[11px] !py-0.5 font-mono">
                Variables like &#123;&#123;Placeholder&#125;&#125; are auto-detected
              </span>
            </div>
          )}

          {/* Parsing Spinner */}
          {parsing && (
            <div className="p-12 text-center space-y-3">
              <Loader2 size={28} className="animate-spin text-violet-soft mx-auto" />
              <p className="font-display font-semibold text-sm text-ink">
                Reading & validating spreadsheet...
              </p>
              <p className="text-xs text-ink-muted">
                Checking categories, subcategories, slug uniqueness, and variable placeholders.
              </p>
            </div>
          )}

          {/* Global Parse Error */}
          {parseError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex items-start gap-3 text-red-300">
              <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-400" />
              <div className="space-y-1">
                <p className="font-semibold text-xs text-red-200">File Error</p>
                <p className="text-[11px] leading-relaxed">{parseError}</p>
                <button
                  onClick={() => {
                    setParseError('')
                    setParseResult(null)
                  }}
                  className="text-[11px] underline text-red-300 hover:text-white mt-1 block"
                >
                  Choose another file
                </button>
              </div>
            </div>
          )}

          {/* Parse Result Summary & Tables */}
          {parseResult && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="glass-card p-3 rounded-xl border border-line bg-surface/50 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-ink-faint">
                      Total Rows
                    </span>
                    <p className="font-display font-bold text-lg text-ink">
                      {parseResult.totalRows}
                    </p>
                  </div>
                  <FileText size={20} className="text-ink-faint" />
                </div>

                <div className="glass-card p-3 rounded-xl border border-green-500/30 bg-green-500/5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-green-400">
                      Ready to Import
                    </span>
                    <p className="font-display font-bold text-lg text-green-400">
                      {parseResult.validRows.length}
                    </p>
                  </div>
                  <CheckCircle2 size={20} className="text-green-400" />
                </div>

                <div className="glass-card p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400">
                      Rows with Errors
                    </span>
                    <p className="font-display font-bold text-lg text-amber-400">
                      {parseResult.errorRows.length}
                    </p>
                  </div>
                  <AlertTriangle size={20} className="text-amber-400" />
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center justify-between border-b border-line pb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('valid')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                      activeTab === 'valid'
                        ? 'bg-violet/15 text-violet-soft font-semibold'
                        : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    <CheckCircle2 size={13} className="text-green-400" />
                    <span>Valid Prompts ({parseResult.validRows.length})</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('errors')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                      activeTab === 'errors'
                        ? 'bg-amber-500/15 text-amber-400 font-semibold'
                        : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    <AlertTriangle size={13} className="text-amber-400" />
                    <span>Errors ({parseResult.errorRows.length})</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    setParseResult(null)
                    setFile(null)
                  }}
                  className="text-[11px] text-ink-muted hover:text-ink underline"
                >
                  Upload different file
                </button>
              </div>

              {/* TAB 1: VALID ROWS PREVIEW */}
              {activeTab === 'valid' && (
                <div className="space-y-2">
                  {parseResult.validRows.length === 0 ? (
                    <div className="p-8 text-center text-ink-muted border border-dashed border-line rounded-xl">
                      No valid rows found in this file. Please check the Errors tab to see what needs fixing.
                    </div>
                  ) : (
                    <div className="rounded-xl border border-line overflow-hidden">
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-surface/80 sticky top-0 border-b border-line text-ink-faint uppercase font-mono text-[9px] backdrop-blur-md">
                            <tr>
                              <th className="px-3 py-2">Row</th>
                              <th className="px-3 py-2">Title</th>
                              <th className="px-3 py-2">Category</th>
                              <th className="px-3 py-2">Subcategory</th>
                              <th className="px-3 py-2">Variables Detected</th>
                              <th className="px-3 py-2">Tags</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line/40">
                            {parseResult.validRows.map((row) => (
                              <tr key={row.rowNumber} className="hover:bg-white/[0.02]">
                                <td className="px-3 py-2 font-mono text-ink-faint">
                                  #{row.rowNumber}
                                </td>
                                <td className="px-3 py-2 font-semibold text-ink max-w-[180px] truncate" title={row.title}>
                                  {row.title}
                                </td>
                                <td className="px-3 py-2 text-ink">
                                  <span className="chip !py-0 !px-1.5 text-[10px]">
                                    {row.category_name}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-ink-muted">
                                  {row.subcategory_name || '—'}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {row.variables.length > 0 ? (
                                      row.variables.slice(0, 3).map((v) => (
                                        <span
                                          key={v}
                                          className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                        >
                                          &#123;&#123;{v}&#125;&#125;
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-ink-faint text-[10px]">None</span>
                                    )}
                                    {row.variables.length > 3 && (
                                      <span className="text-[9px] text-ink-faint">
                                        +{row.variables.length - 3} more
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-ink-faint max-w-[140px] truncate" title={row.tags.join(', ')}>
                                  {row.tags.length > 0 ? row.tags.join(', ') : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: ERROR ROWS INSPECTOR */}
              {activeTab === 'errors' && (
                <div className="space-y-2">
                  {parseResult.errorRows.length === 0 ? (
                    <div className="p-8 text-center text-green-400 border border-green-500/20 rounded-xl bg-green-500/5 space-y-1">
                      <CheckCircle2 size={24} className="mx-auto" />
                      <p className="font-semibold text-xs">All rows are valid!</p>
                      <p className="text-[11px] text-ink-muted">
                        No syntax errors, missing fields, or unmatched categories were found.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-amber-500/30 overflow-hidden">
                      <div className="max-h-64 overflow-y-auto divide-y divide-line/40">
                        {parseResult.errorRows.map((errRow) => (
                          <div
                            key={errRow.rowNumber}
                            className="p-3 bg-amber-500/5 hover:bg-amber-500/10 transition-colors flex items-start justify-between gap-3 text-xs"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">
                                  Row #{errRow.rowNumber}
                                </span>
                                <span className="font-semibold text-ink">
                                  {errRow.title}
                                </span>
                                <span className="text-ink-faint font-mono text-[10px]">
                                  (slug: {errRow.slug})
                                </span>
                              </div>
                              <ul className="space-y-0.5 list-disc list-inside text-[11px] text-red-300">
                                {errRow.errors.map((errMsg, i) => (
                                  <li key={i}>{errMsg}</li>
                                ))}
                              </ul>
                            </div>

                            <span className="chip !border-red-500/30 !bg-red-500/10 text-red-300 text-[10px] shrink-0">
                              Skipped
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-line pt-3 shrink-0">
          <div className="text-[11px] text-ink-muted">
            {parseResult && parseResult.validRows.length > 0 ? (
              <span>
                Ready to commit <strong>{parseResult.validRows.length}</strong> valid prompt{parseResult.validRows.length > 1 ? 's' : ''}.
              </span>
            ) : (
              <span>Upload an Excel file with prompt data to begin.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isImporting}
              className="btn-ghost !py-2 text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!parseResult || parseResult.validRows.length === 0 || isImporting}
              className="btn-primary !py-2 !px-4 text-xs shadow-glow flex items-center gap-1.5"
            >
              {isImporting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <Upload size={13} />
                  <span>
                    Import {parseResult?.validRows.length || 0} Valid Prompt{parseResult?.validRows.length === 1 ? '' : 's'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
