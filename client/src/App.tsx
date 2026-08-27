import { Route, Switch } from "wouter";
import Admin from "./pages/Admin";
import Home from "./pages/Home";

function App() {
  return (
    <Switch>
      <Route path="/admin" component={Admin} />
      <Route path="/" component={Home} />
      <Route component={Home} />
    </Switch>
  );
}

export default App;
