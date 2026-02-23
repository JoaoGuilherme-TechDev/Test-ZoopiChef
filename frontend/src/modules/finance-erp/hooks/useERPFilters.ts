import { useState, useMemo } from 'react';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export interface ERPDateFilter {
  startDate: string;
  endDate: string;
}

export interface ERPFilters extends ERPDateFilter {
  operatorId?: string;
  paymentMethod?: string;
  costCenterId?: string;
  categoryId?: string;
}

export function useERPFilters(defaultPeriod: 'today' | 'week' | 'month' | 'custom' = 'month') {
  const today = new Date();
  
  const getDefaultDates = (): ERPDateFilter => {
    switch (defaultPeriod) {
      case 'today':
        return {
          startDate: format(today, 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd'),
        };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        return {
          startDate: format(weekStart, 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd'),
        };
      case 'month':
      default:
        return {
          startDate: format(startOfMonth(today), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(today), 'yyyy-MM-dd'),
        };
    }
  };

  const [filters, setFilters] = useState<ERPFilters>(getDefaultDates());

  const updateFilter = <K extends keyof ERPFilters>(key: K, value: ERPFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(getDefaultDates());
  };

  const setDateRange = (startDate: string, endDate: string) => {
    setFilters(prev => ({ ...prev, startDate, endDate }));
  };

  const setPresetPeriod = (period: 'today' | 'week' | 'month' | 'quarter' | 'year') => {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    switch (period) {
      case 'today':
        start = now;
        break;
      case 'week':
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'quarter':
        start = new Date(now);
        start.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
    }

    setFilters(prev => ({
      ...prev,
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    }));
  };

  return {
    filters,
    setFilters,
    updateFilter,
    resetFilters,
    setDateRange,
    setPresetPeriod,
  };
}
