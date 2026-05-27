import { AlertTriangle, Info, Siren } from 'lucide-react'
import type { QueueRecommendation } from '@shared/types'
import { t } from '@shared/locales/useLocale'

type RecommendationsWidgetProps = {
  recommendations: QueueRecommendation[]
}

function severityIcon(severity: QueueRecommendation['severity']) {
  if (severity === 'critical') {
    return <Siren size={18} />
  }

  if (severity === 'warning') {
    return <AlertTriangle size={18} />
  }

  return <Info size={18} />
}

export function RecommendationsWidget({ recommendations }: RecommendationsWidgetProps) {
  return (
    <section className="widget-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">{t.dashboard.recommendationsEyebrow}</span>
          <h2>{t.dashboard.recommendationsTitle}</h2>
        </div>
      </div>

      <div className="recommendation-mini-list">
        {recommendations.slice(0, 4).map((recommendation) => (
          <article
            className={`recommendation-mini recommendation-${recommendation.severity}`}
            key={recommendation.id}
          >
            <span>{severityIcon(recommendation.severity)}</span>
            <div>
              <strong>{recommendation.message}</strong>
              <p>{recommendation.action}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
