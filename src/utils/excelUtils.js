import * as XLSX from 'xlsx'
import { extractVariables } from './variableParser'

/**
 * Normalizes field keys from an Excel row object to standard keys.
 */
function normalizeRowKeys(rawRow) {
  const normalized = {}
  Object.keys(rawRow).forEach((key) => {
    const cleanKey = key.trim().toLowerCase().replace(/\s+/g, '_')
    normalized[cleanKey] = typeof rawRow[key] === 'string' ? rawRow[key].trim() : rawRow[key]
  })
  return normalized
}

/**
 * 1. EXPORT PROMPTS TO EXCEL (.xlsx)
 */
export function exportPromptsToExcel(prompts = [], filenamePrefix = 'promptvault-prompts') {
  if (!prompts || prompts.length === 0) {
    throw new Error('No prompts available to export.')
  }

  const rows = prompts.map((p) => {
    // Determine category and subcategory names
    const categoryName =
      p.categories?.name ||
      p.category_name ||
      (typeof p.category === 'object' ? p.category?.name : p.category) ||
      ''

    const subcategoryName =
      p.subcategories?.name ||
      p.subcategory_name ||
      (typeof p.subcategory === 'object' ? p.subcategory?.name : p.subcategory) ||
      ''

    // Format tags
    const tagsStr = Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || '')

    // Format variables (auto-derived or existing)
    const varsArray =
      Array.isArray(p.variables) && p.variables.length > 0
        ? p.variables
        : extractVariables(p.prompt || p.prompt_body || '')
    const varsStr = varsArray.join(', ')

    return {
      title: p.title || '',
      slug: p.slug || '',
      category: categoryName,
      subcategory: subcategoryName,
      description: p.description || '',
      prompt_body: p.prompt || p.prompt_body || '',
      tags: tagsStr,
      variables: varsStr,
      featured_image_url: p.featured_image || p.featured_image_url || '',
      output_image_url: p.output_image || p.output_image_url || '',
      seo_title: p.seo_title || p.title || '',
      seo_description: p.seo_description || p.description || '',
      status: p.status || 'published',
      views: p.views || 0,
      copies: p.copies || 0,
      created_at: p.created_at ? new Date(p.created_at).toISOString() : '',
      updated_at: p.updated_at ? new Date(p.updated_at).toISOString() : '',
    }
  })

  // Create workbook and worksheet
  const worksheet = XLSX.utils.json_to_sheet(rows)

  // Auto-adjust column widths
  const colWidths = [
    { wch: 30 }, // title
    { wch: 25 }, // slug
    { wch: 18 }, // category
    { wch: 18 }, // subcategory
    { wch: 40 }, // description
    { wch: 60 }, // prompt_body
    { wch: 25 }, // tags
    { wch: 25 }, // variables
    { wch: 35 }, // featured_image_url
    { wch: 35 }, // output_image_url
    { wch: 30 }, // seo_title
    { wch: 40 }, // seo_description
    { wch: 12 }, // status
    { wch: 8 },  // views
    { wch: 8 },  // copies
    { wch: 20 }, // created_at
    { wch: 20 }, // updated_at
  ]
  worksheet['!cols'] = colWidths

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Prompts')

  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `${filenamePrefix}-${dateStr}.xlsx`

  XLSX.writeFile(workbook, filename)
  return filename
}

/**
 * 2. DOWNLOAD IMPORT TEMPLATE (.xlsx)
 */
export function generateImportTemplate() {
  const sampleRows = [
    {
      title: 'High-Converting Facebook Ad Copywriter',
      slug: 'facebook-ad-copywriter-example',
      category: 'Marketing',
      subcategory: 'Ad Copy',
      description: 'Generate 3 high-converting Facebook ad copy variations with hooks, bullet points, and strong CTAs.',
      prompt_body: 'Write 3 high-converting Facebook ad variations for {{ProductName}} targeting {{TargetAudience}}. The core benefit is {{KeyBenefit}} and the current special offer is {{SpecialOffer}}. Include a compelling hook, 2-3 body bullet points, and a strong call to action: {{CallToAction}}.',
      tags: 'facebook, ads, marketing, copywriting',
      featured_image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
      output_image_url: '',
      seo_title: 'Facebook Ad Copy Generator Prompt',
      seo_description: 'Create high converting Facebook ad copy variations with custom placeholders.',
    },
    {
      title: 'Code Review & Bug Hunter Assistant',
      slug: 'code-review-bug-hunter-example',
      category: 'Coding',
      subcategory: 'Code Review',
      description: 'Analyze code snippets for logical bugs, runtime errors, and security vulnerabilities.',
      prompt_body: 'Act as a Senior {{ProgrammingLanguage}} Engineer. Review the following code snippet for potential runtime errors, security vulnerabilities, and performance bottlenecks:\n\n```{{ProgrammingLanguage}}\n{{CodeSnippet}}\n```\n\nProvide step-by-step refactoring recommendations and an optimized solution.',
      tags: 'coding, debugging, code-review, clean-code',
      featured_image_url: '',
      output_image_url: '',
      seo_title: 'Senior Code Review & Bug Hunting AI Prompt',
      seo_description: 'Automated code reviewer for performance, syntax, and security.',
    },
  ]

  const worksheet = XLSX.utils.json_to_sheet(sampleRows)

  worksheet['!cols'] = [
    { wch: 35 }, // title
    { wch: 30 }, // slug
    { wch: 18 }, // category
    { wch: 18 }, // subcategory
    { wch: 45 }, // description
    { wch: 70 }, // prompt_body
    { wch: 30 }, // tags
    { wch: 40 }, // featured_image_url
    { wch: 40 }, // output_image_url
    { wch: 35 }, // seo_title
    { wch: 45 }, // seo_description
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template')

  const filename = 'promptvault-import-template.xlsx'
  XLSX.writeFile(workbook, filename)
  return filename
}

/**
 * 3. PARSE AND VALIDATE EXCEL FILE CLIENT-SIDE
 */
export async function parseAndValidateExcel(
  file,
  { categoriesList = [], subcategoriesList = [], existingPrompts = [] } = {}
) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const buffer = e.target.result
        const workbook = XLSX.read(buffer, { type: 'array' })

        const sheetName = workbook.SheetNames[0]
        if (!sheetName) {
          throw new Error('The uploaded Excel file contains no worksheets.')
        }

        const worksheet = workbook.Sheets[sheetName]
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

        if (!rawJson || rawJson.length === 0) {
          throw new Error('The Excel sheet appears to be empty. Please add data rows.')
        }

        const validRows = []
        const errorRows = []
        const seenSlugsInFile = new Set()

        // Build existing database slug lookup (case-insensitive)
        const existingSlugMap = new Set(
          existingPrompts.map((p) => (p.slug || '').toLowerCase().trim()).filter(Boolean)
        )

        // Build category lookup (case-insensitive)
        const categoryLookup = {}
        categoriesList.forEach((c) => {
          categoryLookup[c.name.toLowerCase().trim()] = c
        })

        // Build subcategory lookup grouped by categoryId
        const subcategoryLookup = {}
        subcategoriesList.forEach((s) => {
          const catId = s.categoryId || s.category_id
          if (!subcategoryLookup[catId]) {
            subcategoryLookup[catId] = {}
          }
          subcategoryLookup[catId][s.name.toLowerCase().trim()] = s
        })

        rawJson.forEach((rawRow, index) => {
          const rowNumber = index + 2 // 1-based index (Header is row 1)
          const row = normalizeRowKeys(rawRow)
          const rowErrors = []

          // 1. Check title
          const title = (row.title || '').trim()
          if (!title) {
            rowErrors.push('Missing required field: "title"')
          }

          // 2. Check prompt body
          const promptBody = (row.prompt_body || row.prompt || '').trim()
          if (!promptBody) {
            rowErrors.push('Missing required field: "prompt_body"')
          }

          // 3. Check slug
          let slug = (row.slug || '').toLowerCase().trim()
          if (!slug) {
            rowErrors.push('Missing required field: "slug"')
          } else {
            // Check character validity
            const sanitizedSlug = slug.replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')
            if (sanitizedSlug !== slug) {
              rowErrors.push(`Invalid slug format: "${slug}". Slugs must contain only lowercase letters, numbers, and hyphens.`)
            }

            // Check duplicate in database
            if (existingSlugMap.has(slug)) {
              rowErrors.push(`Duplicate slug: "${slug}" already exists in PromptVault database.`)
            }

            // Check duplicate in file
            if (seenSlugsInFile.has(slug)) {
              rowErrors.push(`Duplicate slug within file: "${slug}" appears more than once in this sheet.`)
            } else {
              seenSlugsInFile.add(slug)
            }
          }

          // 4. Check category matching
          const categoryNameInput = (row.category || row.category_name || '').trim()
          let matchedCategory = null
          if (!categoryNameInput) {
            rowErrors.push('Missing required field: "category"')
          } else {
            matchedCategory = categoryLookup[categoryNameInput.toLowerCase()]
            if (!matchedCategory) {
              rowErrors.push(`Category "${categoryNameInput}" not found in PromptVault. Please create this category first.`)
            }
          }

          // 5. Check subcategory matching (if provided and category is valid)
          const subcategoryNameInput = (row.subcategory || row.subcategory_name || '').trim()
          let matchedSubcategory = null
          if (subcategoryNameInput && matchedCategory) {
            const subcatsForCategory = subcategoryLookup[matchedCategory.id] || {}
            matchedSubcategory = subcatsForCategory[subcategoryNameInput.toLowerCase()]
            if (!matchedSubcategory) {
              rowErrors.push(
                `Subcategory "${subcategoryNameInput}" not found under category "${matchedCategory.name}".`
              )
            }
          }

          // 6. Auto-extract variables from prompt_body
          const variables = extractVariables(promptBody)

          // 7. Parse tags
          let tags = []
          if (row.tags) {
            if (Array.isArray(row.tags)) {
              tags = row.tags
            } else if (typeof row.tags === 'string') {
              tags = row.tags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
            }
          }

          const formattedRow = {
            rowNumber,
            title,
            slug,
            description: (row.description || '').trim(),
            prompt: promptBody,
            category_id: matchedCategory ? matchedCategory.id : null,
            category_name: matchedCategory ? matchedCategory.name : categoryNameInput,
            subcategory_id: matchedSubcategory ? matchedSubcategory.id : null,
            subcategory_name: matchedSubcategory ? matchedSubcategory.name : subcategoryNameInput,
            tags,
            variables,
            featured_image: (row.featured_image_url || row.featured_image || '').trim() || null,
            output_image: (row.output_image_url || row.output_image || '').trim() || null,
            seo_title: (row.seo_title || title).trim(),
            seo_description: (row.seo_description || row.description || '').trim(),
          }

          if (rowErrors.length > 0) {
            errorRows.push({
              rowNumber,
              title: title || `Row ${rowNumber}`,
              slug: slug || 'N/A',
              category: categoryNameInput || 'N/A',
              raw: row,
              errors: rowErrors,
            })
          } else {
            validRows.push(formattedRow)
          }
        })

        resolve({
          validRows,
          errorRows,
          totalRows: rawJson.length,
        })
      } catch (err) {
        reject(err)
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read the file. Please check file permissions and try again.'))
    }

    reader.readAsArrayBuffer(file)
  })
}
