import React from "react";
import { Routes, Route } from "react-router";
import HomePage from "./Pages/Home/HomePage.jsx";
import CheckoutPages from "./Pages/checkout/CheckoutPages.jsx";
import OrderPage from "./Pages/Orders/OrderPage.jsx";
import TrackingPage from "./Pages/TrackingPage.jsx";
import axios from "axios";

const App = () => {
  window.axios = axios;
  const [cart, SetCart] = React.useState([]);

   const LoadCart = async () => {
     const response = await axios
      .get("/api/cart-items?expand=product")
      
        SetCart(response.data);
    
    }
  React.useEffect(() => {
   
    
      LoadCart();
  }, []);

  return (
    <>
      <Routes>
        <Route index element={<HomePage cart={cart} LoadCart={LoadCart} />} />
        <Route path="checkout" element={<CheckoutPages cart={cart} LoadCart={LoadCart}/>} />
        <Route path="orders" element={<OrderPage cart={cart} LoadCart={LoadCart} />} />
        <Route path="trackings" element={<TrackingPage/>} />
      </Routes>
    </>
  );
};

export default App;
