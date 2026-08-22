import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Menu from "./pages/Menu";
import Product from "./pages/Product";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import Profile from "./pages/Profile";
import StaticInfo from "./pages/StaticInfo";
import Admin from "./pages/Admin";
import Rider from "./pages/Rider";
import Addresses from "./pages/Addresses";
import CashfreeReturn from "./pages/CashfreeReturn";
import AccountAuth from "./pages/AccountAuth";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/menu/:category"} component={Menu} />
      <Route path={"/menu"} component={Menu} />
      <Route path={"/product/:slug"} component={Product} />
      <Route path={"/cart"} component={Cart} />
      <Route path={"/checkout"} component={Checkout} />
      <Route path={"/login"} component={AccountAuth} />
      <Route path={"/payment/cashfree/return"} component={CashfreeReturn} />
      <Route path={"/order-success/:orderId"} component={OrderDetail} />
      <Route path={"/orders/:orderId"} component={OrderDetail} />
      <Route path={"/orders"} component={Orders} />
      <Route path={"/profile"} component={Profile} />
      <Route path={"/profile/addresses"} component={Addresses} />
      <Route path={"/about"} component={StaticInfo} />
      <Route path={"/contact"} component={StaticInfo} />
      <Route path={"/privacy-policy"} component={StaticInfo} />
      <Route path={"/terms"} component={StaticInfo} />
      <Route path={"/refund-policy"} component={StaticInfo} />
      <Route path={"/shipping-delivery-policy"} component={StaticInfo} />
      <Route path={"/admin/:section"} component={Admin} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/rider/:section"} component={Rider} />
      <Route path={"/rider"} component={Rider} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
