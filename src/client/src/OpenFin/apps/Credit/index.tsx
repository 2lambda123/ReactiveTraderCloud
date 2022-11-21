import { CreditRfqForm, CreditRfqs, CreditSellSideTicket } from "@/App/Credit"
import { CreditTrades } from "@/App/Trades"
import { DisconnectionOverlay } from "@/components/DisconnectionOverlay"
import { DocTitle } from "@/components/DocTitle"
import { Route, useRouteMatch } from "react-router-dom"

function CreditRoutes() {
  const { path } = useRouteMatch()

  const ROUTES_CONFIG = {
    creditRfqs: `${path}/rfqs`,
    newRfq: `${path}/new-rfq`,
    sellSideTicket: `${path}/sellside/:rfqId/dealer/:dealerId`,
    creditBlotter: `${path}/blotter`,
  }

  return (
    <>
      <Route
        exact
        path={ROUTES_CONFIG.creditRfqs}
        render={() => (
          <DocTitle title="RFQs">
            <DisconnectionOverlay />
            <CreditRfqs />
          </DocTitle>
        )}
      />
      <Route
        exact
        path={ROUTES_CONFIG.creditBlotter}
        render={() => (
          <DocTitle title="Trades">
            <DisconnectionOverlay />
            <CreditTrades />
          </DocTitle>
        )}
      />
      <Route
        path={ROUTES_CONFIG.sellSideTicket}
        render={({
          match: {
            params: { rfqId, dealerId },
          },
        }) => (
          <>
            <DisconnectionOverlay />
            <CreditSellSideTicket
              rfqId={parseInt(rfqId!, 10)}
              dealerId={parseInt(dealerId!, 10)}
            />
          </>
        )}
      />
      <Route
        exact
        path={ROUTES_CONFIG.newRfq}
        render={() => (
          <DocTitle title="New RFQ">
            <DisconnectionOverlay />
            <CreditRfqForm />
          </DocTitle>
        )}
      />
    </>
  )
}

export default CreditRoutes
