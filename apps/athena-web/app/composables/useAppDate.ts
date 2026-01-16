export const useAppDate = () => {
  const { locale } = useI18n()

  const formatDate = (date: string | Date | undefined | null, includeTime = true) => {
    if (!date) return '-'
    return formatDateRaw(date, locale.value, includeTime)
  }

  return {
    formatDate
  }
}
