import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { API_MODE } from '@services/api/apiProvider'
import { useGlobalStore } from '@store/global'
import { Button } from '@shared/ui/components'
import { t } from '@shared/locales/useLocale'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = useGlobalStore((state) => state.login)
  const navigate = useNavigate()
  const showMockAccounts = API_MODE === 'mock'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError('Неверный email или пароль. Попробуйте снова.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-brand">
          <div className="brand-mark">SQ</div>
          <div>
            <span className="eyebrow">
              <ShieldCheck size={14} />
              Авторизация
            </span>
            <h1>{t.system.smartq}</h1>
            <p>Система управления медицинской очередью</p>
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-semibold text-center mb-8">Вход в систему</h2>

          <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto">
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Электронная почта
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@smartq.test"
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

          {showMockAccounts ? (
            <div className="login-help mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold mb-2">Тестовые учётные записи</p>
              <ul className="space-y-2 list-disc list-inside">
                <li>admin@smartq.test / admin123</li>
                <li>manager@smartq.test / manager123</li>
                <li>specialist@smartq.test / specialist123</li>
              </ul>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  )
}
