import React from "react";
import dayjs from "dayjs";
import DeliveryOptions from "./DeliveryOptions";
import CartItemsDetails from "./CartItemsDetails";
import axios from "axios";

const OrderSummary = ({ cart, deliveryoptions, LoadCart }) => {
  return (
    <>
      <div className="order-summary">
        {deliveryoptions.length > 0 &&
          cart.map((cartItem) => {
            const selectedDeliveryOption = deliveryoptions.find(
              (deliveryOption) => {
                return deliveryOption.id === cartItem.deliveryOptionId;
              }
            );
            // function to delete ypur orders cart
            const DeleteCartData = async () => {
              await axios.delete(`/api/cart-items/${cartItem.productId}`);
              await LoadCart();
            };
            
            // function to update your orders
            const UpdateCartData = async (
              productId,
              newquantity,
              newDeliveryOptionId
            ) => {
              try {
                const response = await axios.put(
                  `/api/cart-items/${cartItem.productId}`,
                  {
                    productId: productId,
                    quantity: newquantity,
                    deliveryOptionId: newDeliveryOptionId,
                  }
                );
                console.log("Update successful:", response.data);
                // You might want to reload your cart data here
              } catch (error) {
                console.error("Failed to update cart:", error);
              }
              await LoadCart()
            };

            return (
              <div key={cartItem.productId} className="cart-item-container">
                <div className="delivery-date">
                  Delivery Date :{" "}
                  {dayjs(selectedDeliveryOption.estimatedDeliveryTimeMs).format(
                    "dddd, MMMM D"
                  )}
                </div>

                <div className="cart-item-details-grid">
                  <img className="product-image" src={cartItem.product.image} />
                  <CartItemsDetails
                    cartItem={cartItem}
                    DeleteCartData={DeleteCartData}
                    UpdateCartData={UpdateCartData}
                  />
                  <DeliveryOptions
                    cartItem={cartItem}
                    deliveryoptions={deliveryoptions}
                    LoadCart={LoadCart}
                  />
                </div>
              </div>
            );
          })}
      </div>
    </>
  );
};

export default OrderSummary;
