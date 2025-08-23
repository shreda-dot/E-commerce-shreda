import React from "react";
import { FormatMoney } from "../../utility/money";

const CartItemsDetails = ({cartItem,}) => {
  return (
    <>
      <div className="cart-item-details">
        <div className="product-name">{cartItem.product.name}</div>
        <div className="product-price">
          {FormatMoney(cartItem.product.priceCents)}
        </div>
        <div className="product-quantity">
          <span>
            Quantity:{" "}
            <span className="quantity-label">{cartItem.quantity}</span>
          </span>
          <span className="update-quantity-link link-primary">Update</span>
          <span className="delete-quantity-link link-primary">Delete</span>
        </div>
      </div>
    </>
  );
};

export default CartItemsDetails;
