import { CreateRfqRequest } from "@/generated/TradingGateway"

export interface CreatedCreditRfq {
  request: CreateRfqRequest
  rfqId: number
}
