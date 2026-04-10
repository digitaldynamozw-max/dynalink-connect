export const STORE_TIME_ZONE = process.env.NEXT_PUBLIC_STORE_TIME_ZONE?.trim() || 'Africa/Harare'

export const DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

export type DayKey = (typeof DAY_KEYS)[number]

export type DayHours = {
  isOpen: boolean
  open: string
  close: string
}

export type WeeklyHours = Record<DayKey, DayHours>

const DEFAULT_DAY_HOURS: DayHours = {
  isOpen: true,
  open: '08:00',
  close: '18:00',
}

export function getDefaultWeeklyHours(): WeeklyHours {
  return {
    monday: { ...DEFAULT_DAY_HOURS },
    tuesday: { ...DEFAULT_DAY_HOURS },
    wednesday: { ...DEFAULT_DAY_HOURS },
    thursday: { ...DEFAULT_DAY_HOURS },
    friday: { ...DEFAULT_DAY_HOURS },
    saturday: { isOpen: true, open: '09:00', close: '16:00' },
    sunday: { isOpen: false, open: '09:00', close: '15:00' },
  }
}

export function parseWeeklyHours(raw: string | null | undefined): WeeklyHours {
  const defaults = getDefaultWeeklyHours()

  if (!raw) {
    return defaults
  }

  try {
    const parsed = JSON.parse(raw) as Partial<WeeklyHours>

    return DAY_KEYS.reduce((acc, day) => {
      const value = parsed?.[day]
      acc[day] = {
        isOpen: typeof value?.isOpen === 'boolean' ? value.isOpen : defaults[day].isOpen,
        open: typeof value?.open === 'string' ? value.open : defaults[day].open,
        close: typeof value?.close === 'string' ? value.close : defaults[day].close,
      }
      return acc
    }, {} as WeeklyHours)
  } catch {
    return defaults
  }
}

export function serializeWeeklyHours(hours: WeeklyHours) {
  return JSON.stringify(hours)
}

function getZonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(date)
  const weekday = parts.find((part) => part.type === 'weekday')?.value?.toLowerCase() as DayKey
  const hour = Number.parseInt(parts.find((part) => part.type === 'hour')?.value || '0', 10)
  const minute = Number.parseInt(parts.find((part) => part.type === 'minute')?.value || '0', 10)

  return {
    weekday,
    minutes: hour * 60 + minute,
  }
}

function timeToMinutes(value: string) {
  const [hourText, minuteText] = value.split(':')
  const hour = Number.parseInt(hourText || '0', 10)
  const minute = Number.parseInt(minuteText || '0', 10)
  return hour * 60 + minute
}

export function formatHoursLabel(value: string) {
  const [hourText, minuteText] = value.split(':')
  const hour = Number.parseInt(hourText || '0', 10)
  const minute = Number.parseInt(minuteText || '0', 10)

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(Date.UTC(2020, 0, 1, hour, minute)))
}

function formatDayLabel(day: DayKey) {
  return `${day.charAt(0).toUpperCase()}${day.slice(1)}`
}

function getRelativeDayLabel(offset: number, day: DayKey) {
  if (offset === 0) {
    return 'today'
  }

  if (offset === 1) {
    return 'tomorrow'
  }

  return formatDayLabel(day)
}

function getNextOpening(hours: WeeklyHours, currentDayIndex: number, currentMinutes: number) {
  for (let offset = 0; offset < DAY_KEYS.length; offset += 1) {
    const dayIndex = (currentDayIndex + offset) % DAY_KEYS.length
    const day = DAY_KEYS[dayIndex]
    const schedule = hours[day]

    if (!schedule.isOpen) {
      continue
    }

    const openMinutes = timeToMinutes(schedule.open)

    if (offset === 0 && openMinutes <= currentMinutes) {
      continue
    }

    return {
      day,
      label: `${getRelativeDayLabel(offset, day)} at ${formatHoursLabel(schedule.open)}`,
    }
  }

  return null
}

export function getStoreAvailability(
  rawHours: string | null | undefined,
  temporarilyClosed: boolean | null | undefined,
  now = new Date(),
  timeZone = STORE_TIME_ZONE
) {
  const hours = parseWeeklyHours(rawHours)

  if (temporarilyClosed) {
    return {
      isOpenNow: false,
      temporarilyClosed: true,
      hours,
      currentDay: null as DayKey | null,
      nextOpenLabel: null as string | null,
      message: 'Temporarily closed. Delivery is unavailable until the store reopens.',
    }
  }

  const { weekday, minutes } = getZonedParts(now, timeZone)
  const currentDayIndex = DAY_KEYS.indexOf(weekday)
  const currentHours = hours[weekday]

  if (!currentHours) {
    return {
      isOpenNow: false,
      temporarilyClosed: false,
      hours,
      currentDay: null as DayKey | null,
      nextOpenLabel: null as string | null,
      message: 'Store hours are unavailable right now.',
    }
  }

  const openMinutes = timeToMinutes(currentHours.open)
  const closeMinutes = timeToMinutes(currentHours.close)
  const isOpenNow = currentHours.isOpen && minutes >= openMinutes && minutes < closeMinutes

  if (isOpenNow) {
    return {
      isOpenNow: true,
      temporarilyClosed: false,
      hours,
      currentDay: weekday,
      nextOpenLabel: null as string | null,
      message: `Open now until ${formatHoursLabel(currentHours.close)}.`,
    }
  }

  const nextOpening = getNextOpening(hours, currentDayIndex, minutes)

  return {
    isOpenNow: false,
    temporarilyClosed: false,
    hours,
    currentDay: weekday,
    nextOpenLabel: nextOpening?.label || null,
    message: nextOpening
      ? `Closed now. Delivery unavailable until ${nextOpening.label}.`
      : 'Closed now. Delivery is currently unavailable.',
  }
}
