import React, { useEffect } from 'react'
import dayjs from 'dayjs'
import './CheckOutPage.css'
import './CheckOut-header.css'
import { Link } from 'react-router'
import {FormatMoney } from '../utility/money'
import axios from 'axios'

const CheckoutPages = ({cart}) => {
  const [deliveryoptions, setDeliveryOptions] = React.useState([]);
  
  React.useEffect(()=>{
    axios.get('api/delivery-options?expand=estimatedDeliveryTime')
    .then((response) =>{
      setDeliveryOptions(response.data)
    })

  },[])


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
          Checkout (<Link className="return-to-home-link"
            to="/">3 itLms</Link>)
        </div>

        <div className="checkout-header-right-section">
          <img src="images/icons/checkout-lock-icon.png" />
        </div>
      </div>
    </div>

    <div className="checkout-page">
      <div className="page-title">Review your order</div>

      <div className="checkout-grid">
        <div className="order-summary">
          {deliveryoptions.length > 0 && cart.map((cartItem)=>{
            const selectedDeliveryOption = deliveryoptions
              .find((deliveryOption) => { 
                return deliveryOption.id === cartItem.deliveryOptionId

              })
            return(
               <div key={cartItem.productId} className="cart-item-container">
            <div className="delivery-date">
            Delivery Date : {dayjs(selectedDeliveryOption.estimatedDeliveryTimeMs).format('dddd, MMMM D')}
            </div>

            <div className="cart-item-details-grid">
              <img className="product-image"
                src={cartItem.product.image} />

              <div className="cart-item-details">
                <div className="product-name">
                {cartItem.product.name}
                </div>
                <div className="product-price">
                 {FormatMoney(cartItem.product.priceCents)}
                </div>
                <div className="product-quantity">
                  <span>
                    Quantity: <span className="quantity-label">{cartItem.quantity}</span>
                  </span>
                  <span className="update-quantity-link link-primary">
                    Update
                  </span>
                  <span className="delete-quantity-link link-primary">
                    Delete
                  </span>
                </div>
              </div>

              <div className="delivery-options">
                <div className="delivery-options-title">
                  Choose a delivery option:
                </div>
                {deliveryoptions.map((deliveryoption)=>{
                  let priceString ='FREE Shipping'
                  if (deliveryoption.priceCents > 0) {
                    priceString = `${FormatMoney (deliveryoption.priceCents)} - Shipping`

                  }
                  return(
                    <div key={deliveryoption.id} className="delivery-option">
                  <input type="radio" 
                  checked ={deliveryoption.id === cartItem.deliveryoptionId}
                    className="delivery-option-input"
                    name={`delivery-option-1-${cartItem.productId}`} />
                  <div>
                    <div className="delivery-option-date">
                      {dayjs(deliveryoption.estimatedDeliveryTimeMs).format('dddd,MMMM, D')}
                    </div>
                    <div className="delivery-option-price">
                     {priceString}
                    </div>
                  </div>
                </div>

                  )
                })}
               
              </div>
            </div>
          </div>
            )
              
              
            

          })}
        </div>

        <div className="payment-summary">
            <div className="payment-summary-title">
              Payment Summary
            </div>

            <div className="payment-summary-row">
              <div>Items (3):</div>
              <div className="payment-summary-money">$42.75</div>
            </div>

            <div className="payment-summary-row">
              <div>Shipping &amp; handling:</div>
              <div className="payment-summary-money">$4.99</div>
            </div>

            <div className="payment-summary-row subtotal-row">
              <div>Total before tax:</div>
              <div className="payment-summary-money">$47.74</div>
            </div>

            <div className="payment-summary-row">
              <div>Estimated tax (10%):</div>
              <div className="payment-summary-money">$4.77</div>
            </div>

            <div className="payment-summary-row total-row">
              <div>Order total:</div>
              <div className="payment-summary-money">$52.51</div>
            </div>

            <button className="place-order-button button-primary">
              Place your order
            </button>
        </div>
      </div>
    </div>
    </>
  )
}

export default CheckoutPages
