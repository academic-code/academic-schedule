/**
 * Convert "HH:mm:ss" or "HH:mm" → "h:mm AM/PM"
 */
export function to12Hour(time: string): string {
  if (!time) return ''

  const parts = time.split(':')
  if (parts.length < 2) return time

  const hour24 = Number(parts[0])
  const minute = Number(parts[1])

  if (Number.isNaN(hour24) || Number.isNaN(minute)) {
    return time
  }

  const period = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12

  return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`
}

/**
 * Convert "h:mm AM/PM" → "HH:mm:ss"
 */
export function to24Hour(time: string): string {
  if (!time) return ''

  const match = time.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i)
  if (!match) return time

  let hour = Number(match[1])
  const minute = Number(match[2])
  const period = match[3]!.toUpperCase()

  if (period === 'PM' && hour !== 12) hour += 12
  if (period === 'AM' && hour === 12) hour = 0

  return `${hour.toString().padStart(2, '0')}:${minute
    .toString()
    .padStart(2, '0')}:00`
}
