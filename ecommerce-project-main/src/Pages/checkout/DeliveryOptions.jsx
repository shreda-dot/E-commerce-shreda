import React from "react";
import dayjs from "dayjs";
import { FormatMoney } from "../../utility/money";
import axios from "axios";

const DeliveryOptions = ({ cartItem, deliveryoptions, LoadCart }) => {
  return (
    <div>
      <div className="delivery-options">
        <div className="delivery-options-title">Choose a delivery option:</div>
        {deliveryoptions.map((deliveryoption) => {
          let priceString = "FREE Shipping";
          if (deliveryoption.priceCents > 0) {
            priceString = `${FormatMoney(
              deliveryoption.priceCents
            )} - Shipping`;
          }

          // the function to control the delivery options
          const UpdateDeliveryOption = async () => {
            await axios.put(`/api/cart-items/${cartItem.productId}`, {
              deliveryOptionId: deliveryoption.id,
            });
            await LoadCart();
         
            
          
          };
          return (
            <div
              key={deliveryoption.id}
              className="delivery-option"
              onClick={UpdateDeliveryOption}
            >
              <input
                type="radio"
                onChange={()=>{}}
                checked={deliveryoption.id === cartItem.deliveryOptionId}
                className="delivery-option-input"
                name={`delivery-option-1-${cartItem.productId}`}
              />
              <div>
                <div className="delivery-option-date">
                  {dayjs(deliveryoption.estimatedDeliveryTimeMs).format(
                    "dddd,MMMM, D"
                  )}
                </div>
                <div className="delivery-option-price">{priceString}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DeliveryOptions;
