import { useEffect } from 'react'
import { useQueueStore } from '@store/queue'

export function useQueueBootstrap() {
  const hydrated = useQueueStore((state) => state.hydrated)
  const loadQueue = useQueueStore((state) => state.loadQueue)

  useEffect(() => {
    if (!hydrated) {
      void loadQueue()
    }
  }, [hydrated, loadQueue])
}
