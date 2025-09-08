import React from "react";
import "./CheckOutPage.css";
import "./checkout-header.css";
import { Link } from "react-router";
import axios from "axios";
import OrderSummary from "./OrderSummary"
import {PaymentSummaryS} from './PaymentSummary'


const CheckoutPages = ({ cart, LoadCart }) => {
  const [deliveryoptions, setDeliveryOptions] = React.useState([]);
  const [PaymentSummary, setPaymentSummary] = React.useState([null]);

  React.useEffect(() => {
    const FetchDeliveryData = async () => {
      let response = await axios
      .get("api/delivery-options?expand=estimatedDeliveryTime")
      
        setDeliveryOptions(response.data);
 
   }
    FetchDeliveryData();
   
  }, []);
  React.useEffect( () => {
    const FetchPaymentSummary = async () => {
      const response = await axios.get('/api/payment-summary')
    setPaymentSummary(response.data)

    }
    FetchPaymentSummary()
    
  }, [cart])

  return (
    <>
      <div className="checkout-header">
        <div className="header-content">
          <div className="checkout-header-left-section">
            <Link to="/">
              <img className="logo" src="/images/logo.png" />
              <img className="mobile-logo" src="images/mobile-logo.png" />
            </Link>
          </div>

          <div className="checkout-header-middle-section">
            Checkout (
            <Link className="return-to-home-link" to="/">
            WELCOME
        
            
            </Link>
            )
          </div>

          <div className="checkout-header-right-section">
            <img src="images/icons/checkout-lock-icon.png" />
          </div>
        </div>
      </div>

      <div className="checkout-page">
        <div className="page-title">Review your order</div>

        <div className="checkout-grid">
          <OrderSummary cart={cart} deliveryoptions={deliveryoptions} LoadCart={LoadCart} />
          <PaymentSummaryS PaymentSummary={PaymentSummary} LoadCart={LoadCart} />
         
         
        </div>
      </div>
    </>
  );
};

export default CheckoutPages;
