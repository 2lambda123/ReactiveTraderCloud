// import {
//   DealerBody,
//   END_OF_STATE_OF_THE_WORLD_RFQ_UPDATE,
//   InstrumentBody,
//   QuoteCreatedRfqUpdate,
//   QuoteState,
//   QUOTE_ACCEPTED_RFQ_UPDATE,
//   QUOTE_CREATED_RFQ_UPDATE,
//   RfqState,
//   RfqUpdate,
//   RFQ_CLOSED_RFQ_UPDATE,
//   RFQ_CREATED_RFQ_UPDATE,
//   START_OF_STATE_OF_THE_WORLD_RFQ_UPDATE,
//   WorkflowService,
// } from "@/generated/TradingGateway"
import {
  DealerBody,
  END_OF_STATE_OF_THE_WORLD_RFQ_UPDATE,
  InstrumentBody,
  QuoteState,
  QUOTE_ACCEPTED_RFQ_UPDATE,
  RfqState,
  RfqUpdate,
  RFQ_CLOSED_RFQ_UPDATE,
  RFQ_CREATED_RFQ_UPDATE,
  QUOTE_UPDATED_RFQ_UPDATE,
  START_OF_STATE_OF_THE_WORLD_RFQ_UPDATE,
  WorkflowService,
  QuoteUpdatedRfqUpdate,
  ACCEPTED_QUOTE_STATE,
  REJECTED_WITHOUT_PRICE_QUOTE_STATE,
  QUOTE_PASSED_RFQ_UPDATE,
} from "@/generated/NewTradingGateway"
import { bind, shareLatest } from "@react-rxjs/core"
import { createSignal } from "@react-rxjs/utils"
import { combineLatest, Observable, tap } from "rxjs"
import { filter, map, scan, startWith, withLatestFrom } from "rxjs/operators"
import { withConnection } from "../../withConnection"
import { creditDealers$ } from "../creditDealers"
import { creditInstruments$ } from "../creditInstruments"

//Mocks
import { QuoteDetails, RfqDetails } from "./types"
import { mockCreditRFQS, Dealers } from "./mockNewRfqs"

// const creditRfqUpdates$ = WorkflowService.subscribe().pipe(
//   tap(console.log),
//   withConnection(),
//   shareLatest(),
// )

// Mock
const creditRfqUpdates$ = mockCreditRFQS.pipe(
  tap(console.log),
  withConnection(),
  shareLatest(),
)

export const creditRfqsById$ = creditRfqUpdates$.pipe(
  withLatestFrom(creditInstruments$, creditDealers$),
  scan<
    [RfqUpdate, InstrumentBody[], DealerBody[]],
    [boolean, Record<number, RfqDetails>]
  >(
    (acc, [update, instruments, dealers]) => {
      const rec = acc[1]
      console.log({ rec })
      switch (update.type) {
        case START_OF_STATE_OF_THE_WORLD_RFQ_UPDATE: {
          return [false, {}]
        }
        case RFQ_CREATED_RFQ_UPDATE:
          return [
            acc[0],
            {
              ...rec,
              [update.payload.id]: {
                ...rec[update.payload.id],
                ...update.payload,
                instrument:
                  instruments.find(
                    (instrument) =>
                      instrument.id === update.payload.instrumentId,
                  ) ?? null,
                dealers: Dealers.map(
                  (dealerId) =>
                    dealers.find(
                      (dealer) => dealer.id === dealerId.payload.id,
                    ) ?? {
                      id: dealerId,
                      name: "Unknown Dealer",
                    },
                ),
                quotes: [],
              },
            },
          ]
        case RFQ_CLOSED_RFQ_UPDATE:
          return [
            acc[0],
            {
              ...rec,
              [update.payload.id]: {
                ...rec[update.payload.id],
                ...update.payload,
              },
            },
          ]
        case QUOTE_UPDATED_RFQ_UPDATE: {
          const previousRfq = rec[update.payload.rfqId]
          return [
            acc[0],
            {
              ...rec,
              [update.payload.rfqId]: {
                ...previousRfq,
                quotes: previousRfq?.quotes
                  ? previousRfq.quotes.concat([update.payload])
                  : [update.payload],
              },
            },
          ]
        }
        case QUOTE_PASSED_RFQ_UPDATE: {
          const previousRfq = rec[update.payload.rfqId]
          return [
            acc[0],
            {
              ...rec,
              [update.payload.rfqId]: {
                ...previousRfq,
                quotes: previousRfq.quotes.map((quote) => ({
                  ...quote,
                  state:
                    quote.id === update.payload.id
                      ? update.payload.state
                      : quote.state,
                })),
              },
            },
          ]
        }
        // Currently the server sets the state of all the other quotes to
        // Rejected if one quote is accepted
        case QUOTE_ACCEPTED_RFQ_UPDATE: {
          const previousRfq = Object.values(rec).find((rfqDetails) =>
            rfqDetails.quotes.some((quote) => quote.id === update.payload.id),
          )
          if (previousRfq) {
            return [
              acc[0],
              {
                ...rec,
                [previousRfq.id]: {
                  ...previousRfq,
                  quotes: previousRfq.quotes.map((quote) => ({
                    ...quote,
                    state:
                      quote.id === update.payload.id
                        ? ACCEPTED_QUOTE_STATE
                        : REJECTED_WITHOUT_PRICE_QUOTE_STATE,
                  })),
                },
              },
            ]
          }
          return [acc[0], rec]
        }
        case END_OF_STATE_OF_THE_WORLD_RFQ_UPDATE: {
          return [true, rec]
        }
        default:
          return acc
      }
    },
    [false, {}],
  ),
  filter(([isEndStateOftheWorld]) => isEndStateOftheWorld),
  map(([, rfqDetailsRec]) => rfqDetailsRec),
  shareLatest(),
)

export const [useCreditRfqDetails, getCreditRfqDetails$] = bind<
  [number],
  RfqDetails | undefined
>((rfqId: number) =>
  creditRfqsById$.pipe(
    map((creditRfqsById) => {
      console.log({ test: creditRfqsById[rfqId] })

      return creditRfqsById[rfqId]
    }),
  ),
)

export const [removedRfqIds$, removeRfqs] = createSignal<number[]>()
export const clearedRfqIds$ = removedRfqIds$.pipe(
  scan<number[], number[]>((acc, rfqIds) => [...acc, ...rfqIds], []),
  startWith<number[]>([]),
)

export const [useExecutedRfqIds] = bind(
  combineLatest([creditRfqsById$, clearedRfqIds$]).pipe(
    map(([creditRfqsById, clearedRfqIds]) =>
      Object.values(creditRfqsById)
        .filter((creditRfq) => creditRfq.state !== RfqState.Open)
        .map((creditRfq) => creditRfq.id)
        .filter((creditRfqId) => !clearedRfqIds.includes(creditRfqId)),
    ),
  ),
  [],
)

export const creditQuotes$ = creditRfqsById$.pipe(
  map((creditRfqsById) =>
    Object.values(creditRfqsById).flatMap((creditRfq) => creditRfq.quotes),
  ),
)

const endOfRfqStateOfWorld$ = creditRfqUpdates$.pipe(
  filter(
    (update) =>
      update.type === START_OF_STATE_OF_THE_WORLD_RFQ_UPDATE ||
      update.type === END_OF_STATE_OF_THE_WORLD_RFQ_UPDATE,
  ),
  map((update) => update.type === END_OF_STATE_OF_THE_WORLD_RFQ_UPDATE),
  startWith(false),
)

export const lastQuoteReceived$: Observable<QuoteDetails> =
  creditRfqUpdates$.pipe(
    withLatestFrom(endOfRfqStateOfWorld$),
    filter(([, endOfRfqStateOfWorld]) => endOfRfqStateOfWorld),
    map(([update]) => update),
    filter(
      (update): update is QuoteUpdatedRfqUpdate =>
        update.type === QUOTE_UPDATED_RFQ_UPDATE,
    ),
    withLatestFrom(creditRfqsById$),
    map(([update, creditRfqsById]) => {
      const rfq = creditRfqsById[update.payload.rfqId]
      return {
        ...update.payload,
        instrument: rfq.instrument,
        dealer:
          rfq.dealers.find((dealer) => dealer.id === update.payload.dealerId) ??
          null,
        direction: rfq.direction,
        quantity: rfq.quantity,
      }
    }),
    shareLatest(),
  )
