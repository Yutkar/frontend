import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useGlobalStore } from '@store/global'
import { Button } from '@shared/ui/components'
import { t } from '@shared/locales/useLocale'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const loginAsRole = useGlobalStore((state) => state.loginAsRole)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Пока имитируем вход (потом можно подключить настоящий API)
    await new Promise(resolve => setTimeout(resolve, 800))

    // По умолчанию входим как manager (можно изменить логику позже)
    await loginAsRole('manager')
    navigate('/dashboard')

    setIsLoading(false)
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-brand">
          <div className="brand-mark">SQ</div>
          <div>
            <span className="eyebrow">
              <ShieldCheck size={14} />
              {t.login.mockAuth || 'Авторизация'}
            </span>
            <h1>{t.system.smartq}</h1>
            <p>MVP системы управления медицинской очередью</p>
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-semibold text-center mb-8">Вход в систему</h2>

          <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-5 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Пароль
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-5 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full py-3.5 text-base font-medium"
              disabled={isLoading}
            >
              {isLoading ? 'Входим...' : 'Войти'}
            </Button>
          </form>

          {/* Ссылка на регистрацию */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Нет аккаунта?{' '}
              <Link 
                to="/register" 
                className="text-sky-600 hover:text-sky-700 font-medium hover:underline"
              >
                Зарегистрироваться
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}