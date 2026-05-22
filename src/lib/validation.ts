import { z } from 'zod';

// ============================================
// SECURITY: Centralized validation schemas
// All user inputs must be validated using these schemas
// ============================================

// Base text field schema with configurable length
export const textFieldSchema = (maxLength = 200, minLength = 1) =>
  z
    .string()
    .trim()
    .min(minLength, 'Campo obrigatório')
    .max(maxLength, `Máximo de ${maxLength} caracteres`);

// Optional text field schema
export const optionalTextFieldSchema = (maxLength = 200) =>
  z
    .string()
    .trim()
    .max(maxLength, `Máximo de ${maxLength} caracteres`)
    .optional()
    .or(z.literal(''));

// Money/amount schema with reasonable limits
export const moneySchema = z
  .number()
  .positive('Valor deve ser positivo')
  .max(999999999.99, 'Valor muito alto');

// Parse string to money (for form inputs)
export const parseMoneyString = (value: string): number | null => {
  const num = parseFloat(value);
  if (isNaN(num) || num <= 0) return null;
  return num;
};

// Integer schema for installments, quantities, etc.
export const positiveIntegerSchema = z
  .number()
  .int('Deve ser um número inteiro')
  .positive('Deve ser maior que zero')
  .max(9999, 'Valor muito alto');

// ============================================
// FORM SCHEMAS
// ============================================

// Expense form validation
export const expenseSchema = z.object({
  description: textFieldSchema(200),
  amount: moneySchema,
  category_id: z.string().uuid().optional().or(z.literal('')),
});

// Income form validation
export const incomeSchema = z.object({
  source: textFieldSchema(200),
  amount: moneySchema,
  category_id: z.string().uuid().optional().or(z.literal('')),
});

// Debt form validation
export const debtSchema = z.object({
  name: textFieldSchema(200),
  amount: moneySchema,
  due_date: z.date(),
  type: z.enum(['variable', 'fixed', 'installment']),
  category_id: z.string().uuid().optional().or(z.literal('')),
  installment_current: positiveIntegerSchema.optional(),
  installment_total: positiveIntegerSchema.optional(),
  notes: optionalTextFieldSchema(500),
});

// Project form validation
export const projectSchema = z.object({
  project: textFieldSchema(200),
  project_category_id: z.string().uuid().optional().or(z.literal('')),
  priority: z.number().int().min(1).max(5),
  status: z.enum(['todo', 'progress', 'blocked', 'done']),
  estimated_time: optionalTextFieldSchema(50),
});

// Prospect form validation
export const prospectSchema = z.object({
  client_name: textFieldSchema(200),
  company_name: optionalTextFieldSchema(200),
  prospection_date: z.string(),
  status: z.enum(['novo', 'em_negociacao', 'proposta_enviada', 'fechado', 'perdido']),
  project_id: z.string().uuid().optional().or(z.literal('none')).or(z.literal('')),
  project_type: optionalTextFieldSchema(100),
  estimated_value: z.number().min(0).max(999999999.99),
  notes: optionalTextFieldSchema(1000),
  payment_type: z.enum(['recorrente', 'pontual']).optional().or(z.literal('none')),
  contract_duration: positiveIntegerSchema.optional(),
  payment_installments: positiveIntegerSchema.optional(),
});

// ============================================
// VALIDATION HELPERS
// ============================================

export type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

// Validate and return first error message
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: (result.error as any).errors[0]?.message || 'Dados inválidos' };
}

// Quick validation for single field
export function validateField(
  value: string,
  maxLength: number = 200
): string | null {
  if (!value.trim()) return 'Campo obrigatório';
  if (value.length > maxLength) return `Máximo de ${maxLength} caracteres`;
  return null;
}

// Validate money input from string
export function validateMoneyInput(value: string): string | null {
  const num = parseFloat(value);
  if (isNaN(num)) return 'Valor inválido';
  if (num <= 0) return 'Valor deve ser positivo';
  if (num > 999999999.99) return 'Valor muito alto';
  return null;
}
