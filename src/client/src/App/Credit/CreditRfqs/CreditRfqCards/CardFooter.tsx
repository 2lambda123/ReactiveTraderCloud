import { FaCheckCircle, FaTrash } from "react-icons/fa"
import { exhaustMap } from "rxjs/operators"
import { createSignal } from "@react-rxjs/utils"
import { QuoteState, RfqState } from "@/generated/TradingGateway"
import {
  cancelCreditRfq$,
  removeRfqs,
  useCreditDealerById,
} from "@/services/credit"
import { RfqDetails } from "@/services/credit/types"
import { rfqStateToLabel, CreditRfqTimer } from "../../common"
import { handleViewTrade } from "./handleViewTrade"
import {
  AcceptedCardState,
  CancelQuoteButton,
  CardFooterWrapper,
  TerminatedCardState,
  ViewTrade,
} from "./styled"
import { ACCEPTED_QUOTE_STATE } from "@/generated/TradingGateway"

const [cancelRfq$, onCancelRfq] = createSignal<number>()

cancelRfq$.pipe(exhaustMap((rfqId) => cancelCreditRfq$({ rfqId }))).subscribe()

export const LiveFooterContent = ({
  rfqId,
  start,
  end,
}: {
  rfqId: number
  start: number
  end: number
}) => (
  <>
    <CreditRfqTimer start={start} end={end} isSellSideView={false} />
    <CancelQuoteButton onClick={() => onCancelRfq(rfqId)}>
      Cancel
    </CancelQuoteButton>
  </>
)

export const AcceptedFooterContent = ({
  rfqId,
  acceptedDealerId,
}: {
  rfqId: number
  acceptedDealerId?: number
}) => {
  const dealerName =
    (acceptedDealerId !== undefined
      ? useCreditDealerById(acceptedDealerId)
      : undefined
    )?.name ?? "Unknown Dealer"

  return (
    <>
      <AcceptedCardState>
        <FaCheckCircle size={16} />
        You traded with {dealerName}
      </AcceptedCardState>
      <ViewTrade
        onClick={() => {
          handleViewTrade(rfqId.toString())
        }}
        data-testid="view-trade"
      >
        View Trade {rfqId}
      </ViewTrade>
    </>
  )
}

export const TerminatedFooterContent = ({
  rfqId,
  state,
}: {
  rfqId: number
  state: RfqState
}) => (
  <TerminatedCardState onClick={() => removeRfqs([rfqId])}>
    <FaTrash size={12} />
    {rfqStateToLabel(state)}
  </TerminatedCardState>
)

export const CardFooter = ({
  rfqDetails: { id, quotes, state, creationTimestamp, expirySecs },
}: {
  rfqDetails: RfqDetails
}) => {
  const acceptedDealerId = quotes.find(
    (quote) => quote.state.type === ACCEPTED_QUOTE_STATE,
  )?.dealerId
  return (
    <CardFooterWrapper>
      {state === RfqState.Open ? (
        <LiveFooterContent
          rfqId={id}
          start={Number(creationTimestamp)}
          end={Number(creationTimestamp) + expirySecs * 1000}
        />
      ) : state === RfqState.Closed ? (
        <AcceptedFooterContent rfqId={id} acceptedDealerId={acceptedDealerId} />
      ) : (
        <TerminatedFooterContent rfqId={id} state={state} />
      )}
    </CardFooterWrapper>
  )
}
