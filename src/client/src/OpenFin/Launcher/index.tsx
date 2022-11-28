import { Route, useRouteMatch } from "react-router-dom"
import Launcher from "./MainRoute"

function LauncherRoutes() {
  const { path } = useRouteMatch()

  return <Route exact path={path} component={Launcher} />
}

export default LauncherRoutes
