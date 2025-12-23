import { useState, useCallback } from 'react'
import type { FormFieldError, ValidationResult } from '@/types'

interface ValidationRules {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  email?: boolean
  phone?: boolean
  custom?: (value: string) => string | null
}

interface FieldConfig {
  [fieldName: string]: ValidationRules
}

interface UseFormValidationReturn<T> {
  values: T
  errors: Record<string, string>
  touched: Record<string, boolean>
  isValid: boolean
  handleChange: (field: keyof T, value: string) => void
  handleBlur: (field: keyof T) => void
  validateField: (field: keyof T) => string | null
  validateAll: () => ValidationResult
  reset: () => void
  setValues: (values: Partial<T>) => void
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/

function getValidationMessage(rule: string, params?: Record<string, unknown>): string {
  const messages: Record<string, string> = {
    required: '필수 입력 항목입니다.',
    minLength: `최소 ${params?.minLength}자 이상 입력해주세요.`,
    maxLength: `최대 ${params?.maxLength}자까지 입력 가능합니다.`,
    email: '올바른 이메일 형식이 아닙니다.',
    phone: '올바른 전화번호 형식이 아닙니다. (예: 010-1234-5678)',
    pattern: '올바른 형식이 아닙니다.',
  }
  return messages[rule] || '유효하지 않은 값입니다.'
}

export function useFormValidation<T extends Record<string, string>>(
  initialValues: T,
  fieldConfig: FieldConfig
): UseFormValidationReturn<T> {
  const [values, setValuesState] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const validateField = useCallback(
    (field: keyof T): string | null => {
      const value = values[field]
      const rules = fieldConfig[field as string]

      if (!rules) return null

      // Required check
      if (rules.required && (!value || value.trim() === '')) {
        return getValidationMessage('required')
      }

      // Skip other validations if value is empty and not required
      if (!value || value.trim() === '') return null

      // Min length
      if (rules.minLength && value.length < rules.minLength) {
        return getValidationMessage('minLength', { minLength: rules.minLength })
      }

      // Max length
      if (rules.maxLength && value.length > rules.maxLength) {
        return getValidationMessage('maxLength', { maxLength: rules.maxLength })
      }

      // Email
      if (rules.email && !EMAIL_REGEX.test(value)) {
        return getValidationMessage('email')
      }

      // Phone
      if (rules.phone && !PHONE_REGEX.test(value)) {
        return getValidationMessage('phone')
      }

      // Pattern
      if (rules.pattern && !rules.pattern.test(value)) {
        return getValidationMessage('pattern')
      }

      // Custom validation
      if (rules.custom) {
        const customError = rules.custom(value)
        if (customError) return customError
      }

      return null
    },
    [values, fieldConfig]
  )

  const handleChange = useCallback((field: keyof T, value: string) => {
    setValuesState((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[field as string]
      return newErrors
    })
  }, [])

  const handleBlur = useCallback(
    (field: keyof T) => {
      setTouched((prev) => ({ ...prev, [field]: true }))
      const error = validateField(field)
      if (error) {
        setErrors((prev) => ({ ...prev, [field]: error }))
      }
    },
    [validateField]
  )

  const validateAll = useCallback((): ValidationResult => {
    const newErrors: Record<string, string> = {}
    const fieldErrors: FormFieldError[] = []

    Object.keys(fieldConfig).forEach((field) => {
      const error = validateField(field as keyof T)
      if (error) {
        newErrors[field] = error
        fieldErrors.push({ field, message: error })
      }
    })

    setErrors(newErrors)
    setTouched(
      Object.keys(fieldConfig).reduce(
        (acc, field) => ({ ...acc, [field]: true }),
        {}
      )
    )

    return {
      isValid: fieldErrors.length === 0,
      errors: fieldErrors,
    }
  }, [fieldConfig, validateField])

  const reset = useCallback(() => {
    setValuesState(initialValues)
    setErrors({})
    setTouched({})
  }, [initialValues])

  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState((prev) => ({ ...prev, ...newValues }))
  }, [])

  const isValid = Object.keys(errors).length === 0

  return {
    values,
    errors,
    touched,
    isValid,
    handleChange,
    handleBlur,
    validateField,
    validateAll,
    reset,
    setValues,
  }
}

export default useFormValidation
