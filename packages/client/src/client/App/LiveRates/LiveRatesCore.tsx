import { Subscribe } from "@react-rxjs/core"
import { merge } from "rxjs"

import { WithChildren } from "@/client/utils/utilityTypes"

import {
  registerFxNotifications,
  unregisterFxNotifications,
} from "@/client/notifications"
import { useEffect } from "react"
import { MainHeader, mainHeader$ } from "./MainHeader"
import { Tiles, tiles$ } from "./Tiles"

export const liveRates$ = merge(tiles$, mainHeader$)

const LiveRates = ({ children }: WithChildren) => {
  useEffect(() => {
    registerFxNotifications()
    return () => {
      unregisterFxNotifications()
    }
  }, [])

  return (
    <Subscribe source$={liveRates$} fallback={children}>
      <MainHeader />
      <Tiles />
    </Subscribe>
  )
}

export default LiveRates
