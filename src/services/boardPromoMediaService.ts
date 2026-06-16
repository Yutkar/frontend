import { mediaService, type MediaFile } from './mediaService'

export type BoardPromoMedia = {
  imageId?: number
  imageName?: string
  imageUrl?: string
  updatedAt?: string
  videoId?: number
  videoName?: string
  videoUrl?: string
}

export type BoardVideoUrlValidation = {
  error?: string
  normalizedUrl: string
  valid: boolean
}

const boardPromoMediaStorageKey = 'smartq_board_promo_media'
const defaultProfileId = 'general'
export const invalidBoardVideoUrlMessage = 'Введите корректную ссылку на видео'
export const directBoardVideoUrlMessage = 'Для табло нужна прямая ссылка на видеофайл mp4/webm/ogg'

type PromoMediaStorage = Record<string, BoardPromoMedia>

export function getBoardPromoUrlInputValue(url?: string): string {
  const normalizedUrl = String(url ?? '').trim()

  return normalizedUrl && !normalizedUrl.toLowerCase().startsWith('data:')
    ? normalizedUrl
    : ''
}

function isYouTubeUrl(url: URL): boolean {
  const hostname = url.hostname.toLowerCase()

  return hostname === 'youtu.be'
    || hostname.endsWith('.youtu.be')
    || hostname === 'youtube.com'
    || hostname.endsWith('.youtube.com')
}

export function validateBoardVideoUrl(videoUrl: string): BoardVideoUrlValidation {
  const normalizedUrl = videoUrl.trim()

  if (!normalizedUrl) {
    return { normalizedUrl: '', valid: true }
  }

  let parsedUrl: URL

  try {
    parsedUrl = new URL(normalizedUrl)
  } catch {
    return {
      error: invalidBoardVideoUrlMessage,
      normalizedUrl,
      valid: false,
    }
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return {
      error: invalidBoardVideoUrlMessage,
      normalizedUrl,
      valid: false,
    }
  }

  if (isYouTubeUrl(parsedUrl) || !/\.(mp4|webm|ogg)$/i.test(parsedUrl.pathname)) {
    return {
      error: directBoardVideoUrlMessage,
      normalizedUrl,
      valid: false,
    }
  }

  return { normalizedUrl, valid: true }
}

function normalizeProfileId(profileId?: string | null): string {
  const normalizedProfileId = String(profileId ?? '').trim()

  return normalizedProfileId || defaultProfileId
}

function normalizeMedia(value: unknown): BoardPromoMedia {
  if (!value || typeof value !== 'object') {
    return {}
  }

  const record = value as Partial<BoardPromoMedia>

  return {
    imageName: typeof record.imageName === 'string' ? record.imageName : undefined,
    imageId: typeof record.imageId === 'number' ? record.imageId : undefined,
    imageUrl: typeof record.imageUrl === 'string' ? record.imageUrl : undefined,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : undefined,
    videoId: typeof record.videoId === 'number' ? record.videoId : undefined,
    videoName: typeof record.videoName === 'string' ? record.videoName : undefined,
    videoUrl: typeof record.videoUrl === 'string' ? record.videoUrl : undefined,
  }
}

function readStorage(): PromoMediaStorage {
  try {
    const saved = window.localStorage.getItem(boardPromoMediaStorageKey)
    const parsed = saved ? JSON.parse(saved) : {}

    if (!parsed || typeof parsed !== 'object') {
      return {}
    }

    return Object.fromEntries(
      Object.entries(parsed as PromoMediaStorage).map(([profileId, media]) => [
        profileId,
        normalizeMedia(media),
      ]),
    )
  } catch {
    return {}
  }
}

function writeStorage(storage: PromoMediaStorage): PromoMediaStorage {
  window.localStorage.setItem(boardPromoMediaStorageKey, JSON.stringify(storage))

  return storage
}

function saveMedia(profileId: string | undefined | null, media: BoardPromoMedia): BoardPromoMedia {
  const normalizedProfileId = normalizeProfileId(profileId)
  const storage = readStorage()
  const normalizedMedia = normalizeMedia({
    ...media,
    updatedAt: new Date().toISOString(),
  })

  writeStorage({
    ...storage,
    [normalizedProfileId]: normalizedMedia,
  })

  return normalizedMedia
}

function toBoardMediaUrl(mediaFile: MediaFile): string {
  return mediaService.getMediaFullUrl(mediaFile.url)
}

export const boardPromoMediaService = {
  getMedia(profileId?: string | null): BoardPromoMedia {
    return readStorage()[normalizeProfileId(profileId)] ?? {}
  },

  removeImage(profileId?: string | null): BoardPromoMedia {
    const currentMedia = this.getMedia(profileId)

    return saveMedia(profileId, {
      ...currentMedia,
      imageId: undefined,
      imageName: undefined,
      imageUrl: undefined,
    })
  },

  removeVideo(profileId?: string | null): BoardPromoMedia {
    const currentMedia = this.getMedia(profileId)

    return saveMedia(profileId, {
      ...currentMedia,
      videoId: undefined,
      videoName: undefined,
      videoUrl: undefined,
    })
  },

  removeMediaById(mediaId: number): PromoMediaStorage {
    const storage = readStorage()
    const nextStorage = Object.fromEntries(
      Object.entries(storage).map(([profileId, media]) => {
        const nextMedia = { ...media }

        if (nextMedia.imageId === mediaId) {
          nextMedia.imageId = undefined
          nextMedia.imageName = undefined
          nextMedia.imageUrl = undefined
        }

        if (nextMedia.videoId === mediaId) {
          nextMedia.videoId = undefined
          nextMedia.videoName = undefined
          nextMedia.videoUrl = undefined
        }

        return [profileId, normalizeMedia(nextMedia)]
      }),
    )

    return writeStorage(nextStorage)
  },

  saveImageUrl(profileId: string | undefined | null, imageUrl: string): BoardPromoMedia {
    const currentMedia = this.getMedia(profileId)
    const normalizedImageUrl = imageUrl.trim()

    return saveMedia(profileId, {
      ...currentMedia,
      imageId: undefined,
      imageName: normalizedImageUrl ? 'URL' : undefined,
      imageUrl: normalizedImageUrl || undefined,
    })
  },

  saveVideoUrl(profileId: string | undefined | null, videoUrl: string): BoardPromoMedia {
    const currentMedia = this.getMedia(profileId)
    const validation = validateBoardVideoUrl(videoUrl)

    if (!validation.valid) {
      throw new Error(validation.error)
    }

    return saveMedia(profileId, {
      ...currentMedia,
      videoId: undefined,
      videoName: validation.normalizedUrl ? 'URL' : undefined,
      videoUrl: validation.normalizedUrl || undefined,
    })
  },

  saveMediaFile(profileId: string | undefined | null, mediaFile: MediaFile): BoardPromoMedia {
    const currentMedia = this.getMedia(profileId)
    const mediaUrl = toBoardMediaUrl(mediaFile)

    if (mediaFile.type === 'video') {
      return saveMedia(profileId, {
        ...currentMedia,
        videoId: mediaFile.id,
        videoName: mediaFile.filename,
        videoUrl: mediaUrl,
      })
    }

    return saveMedia(profileId, {
      ...currentMedia,
      imageId: mediaFile.id,
      imageName: mediaFile.filename,
      imageUrl: mediaUrl,
    })
  },

  async uploadImageFile(profileId: string | undefined | null, file: File): Promise<BoardPromoMedia> {
    if (!file.type.startsWith('image/')) {
      throw new Error('Выберите изображение')
    }

    const mediaFile = await mediaService.uploadMedia(file)

    return this.saveMediaFile(profileId, { ...mediaFile, type: 'image' })
  },

  async uploadVideoFile(profileId: string | undefined | null, file: File): Promise<BoardPromoMedia> {
    const supportedVideoTypes = new Set(['video/mp4', 'video/webm', 'video/quicktime'])

    if (file.type && !supportedVideoTypes.has(file.type)) {
      throw new Error('Выберите видеофайл mp4/webm/mov')
    }

    if (!file.type && !/\.(mp4|webm|mov)$/i.test(file.name)) {
      throw new Error('Выберите видеофайл mp4/webm/mov')
    }

    const mediaFile = await mediaService.uploadMedia(file)

    return this.saveMediaFile(profileId, { ...mediaFile, type: 'video' })
  },
}
