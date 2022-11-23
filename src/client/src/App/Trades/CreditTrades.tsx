import styled from "styled-components"
import TradesCore from "./CoreCreditTrades"

const TradesWrapper = styled.article`
  height: 100%;
  padding: 0.5rem 1rem;
  user-select: none;
  background: ${({ theme }) => theme.core.darkBackground};
`

export const CreditTrades: React.FC = () => (
  <TradesWrapper>
    <TradesCore />
  </TradesWrapper>
)
