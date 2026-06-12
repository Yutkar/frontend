export type BoardPromoMedia = {
  imageName?: string
  imageUrl?: string
  updatedAt?: string
  videoName?: string
  videoUrl?: string
}

const boardPromoMediaStorageKey = 'smartq_board_promo_media'
const defaultProfileId = 'general'

type PromoMediaStorage = Record<string, BoardPromoMedia>

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
    imageUrl: typeof record.imageUrl === 'string' ? record.imageUrl : undefined,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : undefined,
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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(new Error('Не удалось прочитать файл'))
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error('Не удалось прочитать файл'))
    }
    reader.readAsDataURL(file)
  })
}

export const boardPromoMediaService = {
  getMedia(profileId?: string | null): BoardPromoMedia {
    return readStorage()[normalizeProfileId(profileId)] ?? {}
  },

  removeImage(profileId?: string | null): BoardPromoMedia {
    const currentMedia = this.getMedia(profileId)

    return saveMedia(profileId, {
      ...currentMedia,
      imageName: undefined,
      imageUrl: undefined,
    })
  },

  removeVideo(profileId?: string | null): BoardPromoMedia {
    const currentMedia = this.getMedia(profileId)

    return saveMedia(profileId, {
      ...currentMedia,
      videoName: undefined,
      videoUrl: undefined,
    })
  },

  saveImageUrl(profileId: string | undefined | null, imageUrl: string): BoardPromoMedia {
    const currentMedia = this.getMedia(profileId)
    const normalizedImageUrl = imageUrl.trim()

    return saveMedia(profileId, {
      ...currentMedia,
      imageName: normalizedImageUrl ? 'URL' : undefined,
      imageUrl: normalizedImageUrl || undefined,
    })
  },

  saveVideoUrl(profileId: string | undefined | null, videoUrl: string): BoardPromoMedia {
    const currentMedia = this.getMedia(profileId)
    const normalizedVideoUrl = videoUrl.trim()

    return saveMedia(profileId, {
      ...currentMedia,
      videoName: normalizedVideoUrl ? 'URL' : undefined,
      videoUrl: normalizedVideoUrl || undefined,
    })
  },

  async uploadImageFile(profileId: string | undefined | null, file: File): Promise<BoardPromoMedia> {
    if (!file.type.startsWith('image/')) {
      throw new Error('Выберите изображение')
    }

    const imageUrl = await readFileAsDataUrl(file)
    const currentMedia = this.getMedia(profileId)

    return saveMedia(profileId, {
      ...currentMedia,
      imageName: file.name,
      imageUrl,
    })
  },

  async uploadVideoFile(profileId: string | undefined | null, file: File): Promise<BoardPromoMedia> {
    if (file.type && file.type !== 'video/mp4') {
      throw new Error('Выберите mp4-файл')
    }

    const videoUrl = await readFileAsDataUrl(file)
    const currentMedia = this.getMedia(profileId)

    return saveMedia(profileId, {
      ...currentMedia,
      videoName: file.name,
      videoUrl,
    })
  },
}
