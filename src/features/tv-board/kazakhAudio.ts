import type { VoiceSettings } from '@services/voiceSettingsService'
import type { Room, Ticket } from '@shared/types'
import {
  getRoomPlaceNumber,
  getRoomPlaceType,
} from '@shared/utils'

type TicketRoom = Room | {
  id?: string
  name?: string
  number?: string | number
  placeType?: string
}

const kazakhAudioBasePath = '/audio/kk'
const russianLetterAudioNames: Record<string, string> = {
  А: 'a_ru',
  Б: 'be_ru',
  В: 've_ru',
  Г: 'ge_ru',
  Д: 'de_ru',
  Е: 'e_ru',
  Ё: 'yo_ru',
  Ж: 'zhe_ru',
  З: 'ze_ru',
  И: 'i_ru',
  Й: 'short_i_ru',
  К: 'ka_ru',
  Л: 'el_ru',
  М: 'em_ru',
  Н: 'en_ru',
  О: 'o_ru',
  П: 'pe_ru',
  Р: 'er_ru',
  С: 'es_ru',
  Т: 'te_ru',
  У: 'u_ru',
  Ф: 'ef_ru',
  Х: 'ha_ru',
  Ц: 'tse_ru',
  Ч: 'che_ru',
  Ш: 'sha_ru',
  Щ: 'sha2_ru',
  Ъ: 'hard_ru',
  Ы: 'y_ru',
  Ь: 'soft_ru',
  Э: 'ae_ru',
  Ю: 'yu_ru',
  Я: 'ya_ru',
}

function warnAudioIssue(message: string, details?: unknown) {
  if (import.meta.env.DEV) {
    console.warn(message, details)
  }
}

async function playFallbackBeep(): Promise<void> {
  const AudioContextConstructor = window.AudioContext
    ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

  if (!AudioContextConstructor) {
    return
  }

  const audioContext = new AudioContextConstructor()

  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }

  const oscillator = audioContext.createOscillator()
  const gain = audioContext.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.value = 880
  gain.gain.setValueAtTime(0.001, audioContext.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.16, audioContext.currentTime + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.28)
  oscillator.connect(gain)
  gain.connect(audioContext.destination)
  oscillator.start()
  oscillator.stop(audioContext.currentTime + 0.3)

  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 320)
  })
  await audioContext.close().catch(() => undefined)
}

function playAudioFile(src: string): Promise<'played' | 'skipped' | 'blocked'> {
  return new Promise((resolve) => {
    const audio = new Audio(src)

    audio.preload = 'auto'
    audio.onended = () => resolve('played')
    audio.onerror = () => {
      warnAudioIssue(`Казахский аудиофайл не найден или не может быть прочитан: ${src}`)
      resolve('skipped')
    }

    audio.play().catch((error) => {
      warnAudioIssue(`Браузер заблокировал или не смог проиграть аудио: ${src}`, error)
      resolve('blocked')
    })
  })
}

function toAudioPath(kind: 'letters' | 'numbers' | 'phrases', name: string | number): string {
  return `${kazakhAudioBasePath}/${kind}/${name}.mp3`
}

function normalizeTicketNumber(value: string): string {
  return value.trim().replace(/\s+/g, '').replace(/-/g, '')
}

export function getKazakhRussianLetterAudio(letter: string): string | null {
  const upperLetter = letter.toLocaleUpperCase('ru-RU')
  const fileName = russianLetterAudioNames[upperLetter]

  if (!fileName) {
    warnAudioIssue(`Неизвестная русская буква для казахской озвучки талона: ${letter}`)
    return null
  }

  return toAudioPath('letters', fileName)
}

function getTicketLetterAudioPart(letter: string): string | null {
  if (/^[А-ЯЁа-яё]$/u.test(letter)) {
    return getKazakhRussianLetterAudio(letter)
  }

  if (/^[A-Za-z]$/.test(letter)) {
    return toAudioPath('letters', letter.toLowerCase())
  }

  warnAudioIssue(`Неизвестная буква для казахской озвучки талона: ${letter}`)
  return null
}

function getTicketNumberAudioParts(ticketNumber: string): string[] {
  const normalizedNumber = normalizeTicketNumber(ticketNumber)
  const match = normalizedNumber.match(/^([A-Za-zА-ЯЁа-яё]+)?(\d+)?/u)
  const letters = match?.[1] ?? ''
  const numericPart = match?.[2] ?? normalizedNumber.replace(/\D/g, '')
  const files = letters
    .split('')
    .filter(Boolean)
    .map(getTicketLetterAudioPart)
    .filter((file): file is string => Boolean(file))

  if (!numericPart) {
    return files
  }

  const leadingZeroMatch = numericPart.match(/^0+/)
  const leadingZeroCount = leadingZeroMatch?.[0].length ?? 0
  const rest = numericPart.slice(leadingZeroCount)

  for (let index = 0; index < leadingZeroCount; index += 1) {
    files.push(toAudioPath('numbers', 0))
  }

  if (rest) {
    const numberValue = Number(rest)

    if (Number.isInteger(numberValue) && numberValue >= 0 && numberValue <= 1000) {
      files.push(toAudioPath('numbers', numberValue))
    } else {
      rest.split('').forEach((digit) => files.push(toAudioPath('numbers', digit)))
    }
  }

  if (!rest && leadingZeroCount === 0) {
    files.push(toAudioPath('numbers', 0))
  }

  return files
}

function getPlaceNumberAudioPart(place?: TicketRoom): string | undefined {
  const placeNumber = getRoomPlaceNumber(place) || (place?.id ? String(place.id) : '')
  const numericPlaceNumber = placeNumber.replace(/\D/g, '')

  if (!numericPlaceNumber) {
    return undefined
  }

  const numberValue = Number(numericPlaceNumber)

  return Number.isInteger(numberValue) && numberValue >= 0 && numberValue <= 1000
    ? toAudioPath('numbers', numberValue)
    : undefined
}

function getPlacePhrase(place: TicketRoom | undefined, voiceSettings: VoiceSettings): string {
  const placeType = getRoomPlaceType(place)
  const actionPrefix = voiceSettings.action === 'enter' ? 'proceed' : 'come'

  if (placeType === 'window') return `${actionPrefix}_window`
  if (placeType === 'desk') return `${actionPrefix}_desk`

  return `${actionPrefix}_room`
}

export function buildKazakhCallAudioSequence(
  ticket: Ticket,
  place: TicketRoom | undefined,
  voiceSettings: VoiceSettings,
): string[] {
  const audiencePhrase = voiceSettings.audience === 'client' ? 'client' : 'patient'
  const placeNumber = getPlaceNumberAudioPart(place)

  return [
    toAudioPath('phrases', 'ticket_number'),
    ...getTicketNumberAudioParts(ticket.number),
    toAudioPath('phrases', audiencePhrase),
    ...(placeNumber ? [placeNumber] : []),
    toAudioPath('phrases', getPlacePhrase(place, voiceSettings)),
  ]
}

export async function playAudioSequence(files: string[]): Promise<void> {
  if (files.length === 0) {
    await playFallbackBeep()
    return
  }

  let playedAny = false
  let blocked = false

  for (const file of files) {
    const result = await playAudioFile(file)

    if (result === 'played') {
      playedAny = true
    }
    if (result === 'blocked') {
      blocked = true
    }
  }

  if (blocked || !playedAny) {
    await playFallbackBeep().catch((error) => {
      warnAudioIssue('Браузер заблокировал fallback-звук табло', error)
    })
  }
}
