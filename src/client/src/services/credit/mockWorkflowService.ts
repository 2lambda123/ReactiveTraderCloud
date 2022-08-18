import {
  AcceptQuoteRequest,
  AcceptQuoteResponse,
  ACK_ACCEPT_QUOTE_RESPONSE,
  ACK_CREATE_QUOTE_RESPONSE,
  ACK_CREATE_RFQ_RESPONSE,
  CancelRfqRequest,
  CreateQuoteRequest,
  CreateQuoteResponse,
  CreateRfqRequest,
  CreateRfqResponse,
  NACK_ACCEPT_QUOTE_RESPONSE,
  QuoteBody,
  QuoteState,
  QUOTE_ACCEPTED_RFQ_UPDATE,
  QUOTE_CREATED_RFQ_UPDATE,
  RfqBody,
  RfqState,
  RfqUpdate,
  RFQ_CLOSED_RFQ_UPDATE,
  RFQ_CREATED_RFQ_UPDATE,
  START_OF_STATE_OF_THE_WORLD_RFQ_UPDATE,
  WorkflowService,
} from "@/generated/TradingGateway"
import { concat, EMPTY, finalize, Observable, of, Subject } from "rxjs"

const getNewRfqId = (function () {
  let id = 0
  return () => id++
})()

const getNewQuoteId = (function () {
  let id = 0
  return () => id++
})()

type WorkflowServiceType = typeof WorkflowService

class MockWorkflowService implements WorkflowServiceType {
  #rfqs = new Map<number, RfqBody>()
  #quotesByRfqId = new Map<number, Set<QuoteBody>>()
  #quotes = new Map<number, QuoteBody>()
  #rfqUpdateListeners = new Set<Subject<RfqUpdate>>()
  #pendingRfqsToExpire = new Map<number, number>()

  async #pushUpdateToListeners(message: RfqUpdate) {
    // simulates notifying listeners asynchronously
    await Promise.resolve()
    this.#rfqUpdateListeners.forEach((sub) => sub.next(message))
  }

  #clearRfqTimeout(rfqId: number) {
    const idToClear = this.#pendingRfqsToExpire.get(rfqId)

    if (idToClear !== undefined) {
      clearTimeout(idToClear)
      this.#pendingRfqsToExpire.delete(rfqId)
    }
  }

  createRfq(request: CreateRfqRequest): Observable<CreateRfqResponse> {
    const newRfq: RfqBody = {
      id: getNewRfqId(),
      creationTimestamp: BigInt(Date.now()),
      ...request,
      state: RfqState.Open,
    }

    this.#rfqs.set(newRfq.id, newRfq)
    this.#pushUpdateToListeners({
      type: RFQ_CREATED_RFQ_UPDATE,
      payload: newRfq,
    })

    this.#pendingRfqsToExpire.set(
      newRfq.id,
      window.setTimeout(() => {
        const rfqToExpire = this.#rfqs.get(newRfq.id)

        if (rfqToExpire && rfqToExpire.state === RfqState.Open) {
          const newState = RfqState.Expired
          rfqToExpire.state = newState

          this.#pushUpdateToListeners({
            type: RFQ_CLOSED_RFQ_UPDATE,
            payload: { id: rfqToExpire.id, state: newState },
          })
        }
      }, request.expirySecs * 1000),
    )
    return of({ type: ACK_CREATE_RFQ_RESPONSE, payload: newRfq.id })
  }

  cancelRfq(request: CancelRfqRequest): Observable<void> {
    const existingRfq = this.#rfqs.get(request.rfqId)
    if (existingRfq) {
      const newState = RfqState.Cancelled
      existingRfq.state = newState
      this.#clearRfqTimeout(existingRfq.id)
      this.#pushUpdateToListeners({
        type: RFQ_CLOSED_RFQ_UPDATE,
        payload: { id: existingRfq.id, state: newState },
      })
    }
    return EMPTY
  }

  createQuote(request: CreateQuoteRequest): Observable<CreateQuoteResponse> {
    const newQuote: QuoteBody = {
      id: getNewQuoteId(),
      state: QuoteState.Pending,
      ...request,
    }

    const existingQuotes = this.#quotesByRfqId.get(request.rfqId)
    if (existingQuotes) {
      existingQuotes.add(newQuote)
    } else {
      this.#quotesByRfqId.set(request.rfqId, new Set([newQuote]))
    }

    this.#quotes.set(newQuote.id, newQuote)
    this.#pushUpdateToListeners({
      type: QUOTE_CREATED_RFQ_UPDATE,
      payload: newQuote,
    })
    return of({ type: ACK_CREATE_QUOTE_RESPONSE, payload: newQuote.id })
  }

  acceptQuote(request: AcceptQuoteRequest): Observable<AcceptQuoteResponse> {
    const quoteToAccept = this.#quotes.get(request.quoteId)

    if (quoteToAccept) {
      const rfqForQuote = this.#rfqs.get(quoteToAccept.rfqId)

      if (rfqForQuote) {
        const rfqStillOpen = rfqForQuote.state === RfqState.Open
        if (rfqStillOpen) {
          // Update all quotes and notify
          const quotes = this.#quotesByRfqId.get(rfqForQuote.id)
          if (quotes) {
            quotes.forEach((quote) => {
              if (quote.id === quoteToAccept.id) {
                quote.state = QuoteState.Accepted
              } else {
                quote.state = QuoteState.Rejected
              }
            })
            this.#pushUpdateToListeners({
              type: QUOTE_ACCEPTED_RFQ_UPDATE,
              payload: quoteToAccept.id,
            })
          }

          // Update rfq and notify
          rfqForQuote.state = RfqState.Closed
          this.#pushUpdateToListeners({
            type: RFQ_CLOSED_RFQ_UPDATE,
            payload: { id: rfqForQuote.id, state: rfqForQuote.state },
          })
          this.#clearRfqTimeout(rfqForQuote.id)

          return of({ type: ACK_ACCEPT_QUOTE_RESPONSE })
        }
      }
    }

    return of({ type: NACK_ACCEPT_QUOTE_RESPONSE })
  }

  subscribe(): Observable<RfqUpdate> {
    const newSubject = new Subject<RfqUpdate>()
    this.#rfqUpdateListeners.add(newSubject)

    const stateOfTheWorld = new Observable<RfqUpdate>((subscriber) => {
      subscriber.next({ type: START_OF_STATE_OF_THE_WORLD_RFQ_UPDATE })

      this.#rfqs.forEach((rfq) => {
        subscriber.next({ type: RFQ_CREATED_RFQ_UPDATE, payload: rfq })
      })

      this.#quotes.forEach((quote) => {
        subscriber.next({ type: QUOTE_CREATED_RFQ_UPDATE, payload: quote })
      })

      subscriber.complete()
    })

    return concat(
      stateOfTheWorld,
      newSubject.asObservable().pipe(
        finalize(() => {
          this.#rfqUpdateListeners.delete(newSubject)
        }),
      ),
    )
  }
}

export const mockWorkflowService = new MockWorkflowService()
