import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatWhatsAppLink(phone: string, message?: string) {

  const numbers = phone.replace(/\D/g, '');

  const formattedNumber = numbers.length <= 11 ? `55${numbers}` : numbers;
  
  const baseUrl = `https://wa.me/${formattedNumber}`;
  
  if (message) {
    return `${baseUrl}?text=${encodeURIComponent(message)}`;
  }
  
  return baseUrl;
}


export function formatCurrency(value: number | string) {
  const amount = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount || 0);
}