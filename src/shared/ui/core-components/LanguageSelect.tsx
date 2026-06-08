import {
  languageOptions,
  setLanguage,
  useLanguage,
  useLocale,
  type SmartQLanguage,
} from '@shared/locales/useLocale'

type LanguageSelectProps = {
  className?: string
  variant?: 'compact' | 'large'
}

export function LanguageSelect({ className = '', variant = 'compact' }: LanguageSelectProps) {
  const language = useLanguage()
  const t = useLocale()

  return (
    <label className={`language-select language-select-${variant} ${className}`}>
      <span>{t.common.language}</span>
      <select
        aria-label={t.common.language}
        onChange={(event) => setLanguage(event.target.value as SmartQLanguage)}
        value={language}
      >
        {languageOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
