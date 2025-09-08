import React from "react";
import axios from "axios";
import "./Orders.css";
import Header from "../../Component/Header";
import OrderDetailsGrid from "./OrderDetailsGrid";
import OrderLeftSection from "./OrderLeftSection";
import OrderHeaderRightSection from "./OrderHeaderRightSection";

const OrderPage = ({ cart, LoadCart }) => {
  const [Orders, setOrders] = React.useState([]);
  React.useEffect(() => {
    const FetchOrderData = async (params) => {
      const response = await axios.get("/api/orders?expand=products")
    
      setOrders(response.data);
  
    }
    FetchOrderData();
    
  }, []);

  return (
    <>
      <Header cart={cart} />
      <div className="orders-page">
        <div className="page-title">Your Orders</div>
        <div className="orders-grid">
          {Orders.map((order) => {
            return (
              <div key={order.id} className="order-container">
                <div className="order-header">
                 <OrderLeftSection order={order} />
                 <OrderHeaderRightSection order={order} cart={cart} />
                </div>
               <OrderDetailsGrid order={order} cart={cart} LoadCart={LoadCart} />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default OrderPage;
