import { ArrowRight, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Role } from '@shared/types'
import { t } from '@shared/locales/useLocale'
import { Button } from '@shared/ui/components'
import { useGlobalStore } from '@store/global'

const loginRoles: Array<{
  role: Role
  title: string
  description: string
}> = [
  {
    role: 'manager',
    title: t.login.managerTitle,
    description: t.login.managerDescription,
  },
  {
    role: 'specialist',
    title: t.login.specialistTitle,
    description: t.login.specialistDescription,
  },
  {
    role: 'admin',
    title: t.login.adminTitle,
    description: t.login.adminDescription,
  },
]

export function LoginPage() {
  const loginAsRole = useGlobalStore((state) => state.loginAsRole)
  const navigate = useNavigate()

  async function handleLogin(role: Role) {
    await loginAsRole(role)
    navigate('/dashboard')
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-brand">
          <div className="brand-mark">SQ</div>
          <div>
            <span className="eyebrow">
              <ShieldCheck size={14} />
              {t.login.mockAuth}
            </span>
            <h1>{t.system.smartq}</h1>
            <p>{t.login.subtitle}</p>
          </div>
        </div>

        <div className="login-role-grid">
          {loginRoles.map((item) => (
            <article className="login-role-card" key={item.role}>
              <div>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </div>
              <Button
                icon={<ArrowRight size={17} />}
                onClick={() => void handleLogin(item.role)}
                variant="primary"
              >
                {t.login.continue}
              </Button>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
