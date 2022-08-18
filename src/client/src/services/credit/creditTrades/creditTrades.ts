import { Direction, QuoteState } from "@/generated/TradingGateway"
import { CreditTrade } from "@/services/trades"
import { bind } from "@react-rxjs/core"
import { map } from "rxjs/operators"
import { creditRfqsById$ } from "../creditRfqs"

export const [useCreditTrades, creditTrades$] = bind(
  creditRfqsById$.pipe(
    map((update, idx) => {
      const acceptedRfqs = Object.values(update)
        .filter((rfq) => {
          return rfq.quotes?.find(
            (quote) => quote.state === QuoteState.Accepted,
          )
        })
        .map((rfq) => ({ ...rfq, status: rfq.state }))
      return acceptedRfqs
        .map((rfq) => {
          const acceptedQuote = rfq.quotes[0]
          return {
            tradeId: rfq.id.toString(),
            status: QuoteState.Accepted,
            tradeDate: new Date(Date.now()),
            direction: Direction.Buy,
            counterParty: rfq.dealers.find(
              (dealer) => dealer.id === acceptedQuote?.dealerId,
            )?.name,
            cusip: rfq.instrument?.cusip,
            security: rfq.instrument?.ticker,
            quantity: rfq.quantity,
            orderType: "AON",
            unitPrice: acceptedQuote?.price,
          }
        })
        .reverse() as CreditTrade[]
    }),
  ),
  [],
)
