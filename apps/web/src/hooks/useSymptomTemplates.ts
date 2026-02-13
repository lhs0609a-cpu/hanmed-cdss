import { useState, useCallback, useEffect } from 'react'

const TEMPLATES_STORAGE_KEY = 'hanmed_symptom_templates'
const MAX_TEMPLATES = 20

export interface SymptomTemplate {
  id: string
  name: string
  chiefComplaint: string
  symptoms: string[]
  constitution?: string
  createdAt: string
}

export function useSymptomTemplates() {
  const [templates, setTemplates] = useState<SymptomTemplate[]>([])

  const loadTemplates = useCallback(() => {
    try {
      const data = JSON.parse(localStorage.getItem(TEMPLATES_STORAGE_KEY) || '[]')
      setTemplates(data)
    } catch {
      setTemplates([])
    }
  }, [])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  const saveTemplate = useCallback((name: string, data: { chiefComplaint: string; symptoms: string[]; constitution?: string }) => {
    const newTemplate: SymptomTemplate = {
      id: Date.now().toString(),
      name,
      chiefComplaint: data.chiefComplaint,
      symptoms: data.symptoms,
      constitution: data.constitution,
      createdAt: new Date().toISOString(),
    }
    const updated = [newTemplate, ...templates].slice(0, MAX_TEMPLATES)
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(updated))
    setTemplates(updated)
    return newTemplate
  }, [templates])

  const deleteTemplate = useCallback((id: string) => {
    const updated = templates.filter(t => t.id !== id)
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(updated))
    setTemplates(updated)
  }, [templates])

  return { templates, saveTemplate, deleteTemplate }
}
