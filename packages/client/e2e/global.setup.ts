// we need to start the runtime and know the devtools port
import { test as setup } from '@playwright/test'
import { launch } from 'openfin-adapter'

const openfinRootUrl = process.env.E2E_RTC_WEB_ROOT_URL ?? "http://localhost:1917"

setup('Launching application... not', async () => {

  // await launch({ manifestUrl: `${openfinRootUrl}/config/rt-fx.json`})
  // await launch({ manifestUrl: `${openfinRootUrl}/config/rt-credit.json`})
  // await launch({ manifestUrl: `${openfinRootUrl}/config/limit-checker.json`})
})
