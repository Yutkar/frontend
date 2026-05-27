import { AlertTriangle, Info, Siren } from 'lucide-react'
import type { QueueRecommendation, Room } from '@shared/types'
import { t } from '@shared/locales/useLocale'
import { formatTime } from '@shared/utils'

type RecommendationPanelProps = {
  recommendations: QueueRecommendation[]
  rooms: Room[]
}

function iconForSeverity(severity: QueueRecommendation['severity']) {
  if (severity === 'critical') {
    return <Siren size={20} />
  }

  if (severity === 'warning') {
    return <AlertTriangle size={20} />
  }

  return <Info size={20} />
}

export function RecommendationPanel({ recommendations, rooms }: RecommendationPanelProps) {
  return (
    <div className="recommendation-list">
      {recommendations.map((recommendation) => {
        const room = rooms.find((item) => item.id === recommendation.relatedRoomId)

        return (
          <article
            className={`recommendation-card recommendation-${recommendation.severity}`}
            key={recommendation.id}
          >
            <div className="recommendation-icon">{iconForSeverity(recommendation.severity)}</div>
            <div>
              <header>
                <div>
                  <span className="eyebrow">
                    {room?.name ?? t.system.systemLabel} / {formatTime(recommendation.createdAt)}
                  </span>
                  <h2>{recommendation.title}</h2>
                </div>
              </header>
              <p>{recommendation.description}</p>
              <strong>{recommendation.action}</strong>
            </div>
          </article>
        )
      })}
    </div>
  )
}
