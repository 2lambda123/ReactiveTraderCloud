import { expect, Page } from "@playwright/test"

import { test } from "./fixtures"
import { OPENFIN_PROJECT_NAME, Timeout } from "./utils"

const currencyPairs = [
  "EURUSD",
  "USDJPY",
  "GBPUSD",
  "GBPJPY",
  "EURJPY",
  "AUDUSD",
  "NZDUSD",
  "EURCAD",
]

const currencies = ["NZD", "USD", "JPY", "GBP", "EUR", "CAD", "AUD"]

test.describe("Analytics", () => {
  let analyticsPage: Page

  test.beforeAll(async ({ context, fxPagesRec }, testInfo) => {
    if (testInfo.project.name === OPENFIN_PROJECT_NAME) {
      analyticsPage = fxPagesRec["fx-analytics"]
      analyticsPage.setViewportSize({ width: 1280, height: 1024 })
    } else {
      const pages = context.pages()
      const mainWindow = pages.length > 0 ? pages[0] : await context.newPage()

      await mainWindow.goto(`${process.env.E2E_RTC_WEB_ROOT_URL}`)

      analyticsPage = mainWindow
    }
  })

  test.describe("Profit & Loss section", () => {
    test("Last position amount is displayed in numerical format @smoke", async () => {
      const lastPositionAmount = await analyticsPage
        .locator("[data-testid='lastPosition']")
        .textContent()

      expect(lastPositionAmount).toMatch(/^[-+,.0-9]/g)
    })

    test("Last position amount is updated periodically", async () => {
      const refreshTimespan = 10000
      const lastpositionLocator = analyticsPage.locator(
        "[data-testid='lastPosition']",
      )
      const initiallastPositionAmount = await lastpositionLocator.textContent()

      if (initiallastPositionAmount)
        await expect(lastpositionLocator).not.toContainText(
          initiallastPositionAmount,
          { timeout: refreshTimespan },
        )
    })

    test("Correct text color is displayed based on position value", async () => {
      const initialpositionLocator = analyticsPage.locator(
        "[data-testid='lastPosition']",
      )
      const amount = Number(
        (await initialpositionLocator.textContent())?.replace(/[.,\s]/g, ""),
      )

      if (amount < 0) {
        expect(await initialpositionLocator.getAttribute("color")).toEqual(
          "negative",
        )
      } else
        expect(await initialpositionLocator.getAttribute("color")).toEqual(
          "positive",
        )
    })

    test.skip("Graph display coherent values", async () => {
      // more complex
      // May requires datatest-id to reliably assert graph content
    })
  })

  test.describe("Positions section", () => {
    test("Position nodes are showing tooltip information for each currencies", async () => {
      for (const currency of currencies) {
        const currencyCircle = analyticsPage
          .locator("g.node")
          .filter({ hasText: currency })
          .first()
        const currencyTooltip = analyticsPage
          .locator("[data-testid='tooltip']", { hasText: currency })
          .first()

        await currencyCircle.hover()
        await expect(currencyTooltip).toBeVisible({
          timeout: Timeout.AGGRESSIVE,
        })
        const regexp = RegExp(`${currency} [-+,.0-9]`, "g")
        expect(
          await currencyTooltip.textContent(),
          `tooltip for ${currency} doesn't match expected pattern`,
        ).toMatch(regexp)
      }
    })

    test.skip("Position nodes can be moved", async () => {
      // todo
    })
  })

  test.describe("PnL section", () => {
    test("PnL value is displayed for each currencies", async () => {
      const pnlSection = analyticsPage
        .locator("div:last-of-type")
        .filter({ hasText: "PnL" })
        .last()

      for (const currencypair of currencyPairs) {
        const amountString = await pnlSection
          .locator("div", {
            hasText: currencypair,
          })
          .first()
          .getByTestId("priceLabel")
          .textContent()
        expect(
          amountString,
          `amount for ${currencypair} doesn't match expected pattern`,
        ).toMatch(/^[-,.0-9km]+$/g)
      }
    })
  })
})
