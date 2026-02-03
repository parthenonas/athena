import type {
  CalendarDate,
  CalendarDateTime } from '@internationalized/date'
import {
  getLocalTimeZone,
  fromDate,
  toCalendarDate as _toCalendarDate,
  toCalendarDateTime as _toCalendarDateTime
} from '@internationalized/date'

export const toCalendarDate = (dateStr?: string | Date | null) => {
  if (!dateStr) return undefined
  const d = new Date(dateStr)
  return _toCalendarDate(fromDate(d, getLocalTimeZone()))
}

export const toCalendarDateTime = (dateStr?: string | Date | null) => {
  if (!dateStr) return undefined
  const d = new Date(dateStr)
  return _toCalendarDateTime(fromDate(d, getLocalTimeZone()))
}

export const toNativeDate = (cd?: CalendarDate | CalendarDateTime) => {
  if (!cd) return undefined
  return cd.toDate(getLocalTimeZone())
}

export const formatDateRaw = (date: string | Date, locale: string, includeTime = true) => {
  if (!date) return '-'
  try {
    const d = new Date(date)
    return d.toLocaleString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: includeTime ? '2-digit' : undefined,
      minute: includeTime ? '2-digit' : undefined,
      timeZone: getLocalTimeZone()
    })
  } catch {
    return '-'
  }
}
