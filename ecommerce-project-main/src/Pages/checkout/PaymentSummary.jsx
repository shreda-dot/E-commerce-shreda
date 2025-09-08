import React from 'react'
import { FormatMoney } from '../../utility/money'
import axios from 'axios'
import { useNavigate } from 'react-router'

 export const PaymentSummaryS = ({PaymentSummary, LoadCart}) => {
  const navigate =  useNavigate()
  const CreateOrder = async () => {
    await axios.post('/api/orders')
    await LoadCart()
    navigate('/orders')

  }
  return (
       <div className="payment-summary">
            <div className="payment-summary-title">Payment Summary</div>
            {PaymentSummary && (
              <>
                <div className="payment-summary-row">
                  <div>Items ({PaymentSummary.totalItems}):</div>
                  <div className="payment-summary-money">
                    {FormatMoney(PaymentSummary.productCostCents)}
                  </div>
                </div>

                <div className="payment-summary-row">
                  <div>Shipping &amp; handling:</div>
                  <div className="payment-summary-money">
                    {FormatMoney(PaymentSummary.shippingCostCents)}
                  </div>
                </div>

                <div className="payment-summary-row subtotal-row">
                  <div>Total before tax:</div>
                  <div className="payment-summary-money">
                    {FormatMoney(PaymentSummary.totalCostBeforeTaxCents)}
                  </div>
                </div>

                <div className="payment-summary-row">
                  <div>Estimated tax (10%):</div>
                  <div className="payment-summary-money">
                    {FormatMoney(PaymentSummary.taxCents)}
                  </div>
                </div>

                <div className="payment-summary-row total-row">
                  <div>Order total:</div>
                  <div className="payment-summary-money">
                    {FormatMoney(PaymentSummary.totalCostCents)}
                  </div>
                </div>

                <button onClick={CreateOrder} className="place-order-button button-primary">
                  Place your order
                </button>
              </>
            )}
          </div>
    
  )
}

