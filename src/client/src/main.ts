import { AnalyticsCoreDeferred } from "@/App/Analytics"
import { LiveRatesCoreDeferred } from "@/App/LiveRates"
import { TradesCoreDeferred } from "@/App/Trades"
import { register } from "@/Web/serviceWorkerRegistration"
import { showCacheUpdateModal } from "@/Web/cacheUpdateModal"
import { WebApp } from "@/Web"

export const gaDimension = "browser"

export const getMainApp: () => React.FC = () => {
  if (import.meta.env.PROD) {
    console.warn(`SW: register`)
    register({
      onUpdate: (registration) => {
        // If the SW got updated, then we have to be careful. We can't immediately
        // skip the waiting phase, because if there are requests on the fly that
        // could be a disaster
        // Wait for our async chunks to be loaded, then skip waiting phase and show
        // the user a modal informing them that there are new updates available

        console.warn(`SW: onUpdate`)

        Promise.all([
          AnalyticsCoreDeferred,
          LiveRatesCoreDeferred,
          TradesCoreDeferred,
        ]).then(() => {
          console.warn(`SW: skip waiting`)

          registration.waiting?.postMessage({ type: "SKIP_WAITING" })
          showCacheUpdateModal()
        })
      },
    })
  }

  return WebApp
}
