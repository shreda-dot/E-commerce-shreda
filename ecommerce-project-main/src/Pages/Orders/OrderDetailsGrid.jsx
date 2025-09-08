import React from 'react'
import dayjs from 'dayjs';
import { Link } from 'react-router';
import { Fragment } from 'react';
import { useNavigate } from 'react-router'
import axios from 'axios';


const OrderDetailsGrid = ({order, LoadCart}) => {
const navigate = useNavigate()


  return (
    <>
       <div className="order-details-grid">
                  {order.products.map((orderproduct) => {
                    const AddCartData = async ({}) => {
                      await axios.post('/api/cart-items',{
                        productId: orderproduct.product.id,
                        quantity: 1
                      })
                      
                      navigate('/checkout') 
                      await LoadCart();
                    }
               
                   

                    return (
                      <Fragment key={orderproduct.product.id}>
                        <div className="product-image-container">
                          <img src={orderproduct.product.image} />
                        </div>

                        <div className="product-details">
                          <div className="product-name">
                            {orderproduct.product.name}
                          </div>
                          <div className="product-delivery-date">
                            Arriving on:{" "}
                            {dayjs(orderproduct.estimatedDeliveryTimeMs).format(
                              "MMMM, D"
                            )}
                          </div>
                          <div className="product-quantity">
                            {orderproduct.quantity}
                          </div>
                          <button 
                          onClick={AddCartData}
                          className="buy-again-button button-primary">
                            <img
                              className="buy-again-icon"
                              src="images/icons/buy-again.png"
                            />
                            <span className="buy-again-message">
                              Add to Cart
                            </span>
                          </button>
                        </div>

                        <div className="product-actions">
                          <Link to="/trackings ">
                            <button  className="track-package-button button-secondary">
                              Track package
                            </button>
                          </Link>
                        </div>
                      </Fragment>
                    );
                  })}
                </div>
    </>
  )
}

export default OrderDetailsGrid
