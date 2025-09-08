import React from "react";
import { FormatMoney } from "../../utility/money";

const CartItemsDetails = ({ cartItem, DeleteCartData, UpdateCartData }) => {
  const [quantity, setQuantity] = React.useState(cartItem.quantity);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [UpdatePopUp, setUpdatePopUp] = React.useState(false);
  const handleUpdateClick = () => {
    // Pass the new quantity to the update function
    UpdateCartData(cartItem.productId, quantity);

    setIsUpdating(false);
    setUpdatePopUp(true);
    setTimeout(() => {
      setUpdatePopUp(false);
    }, 3000);
  };
  // to use the onkeydown features
  const handleKeydown = (event) => {
    // Check for the 'Enter' key
    if (event.key === 'Enter') {
      // This is the crucial line that stops the page from reloading.
      event.preventDefault(); 
      handleUpdateClick();
   
    } 
    // Check for the 'Escape' key
    else if (event.key === 'Escape') {
      setQuantity('');
    }
  };

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

            {isUpdating && (
          <div className="update-container ">
            <input
              type="number"
              value={quantity}
              onKeyDown={handleKeydown}
              onChange={(e) => setQuantity(Number(e.target.value))}
              min="1"
              className="quantity-input"
            />
            </div>
            )}
            

          </span>
          
        </div>
        <span
            onClick={() => setIsUpdating(true)}
            
            className="link-primary update-quantity-link mr-5"
          >
            Update
          </span>
          <span
            onClick={DeleteCartData}
            className="delete-quantity-link link-primary mr-5"
          >
            Delete
          </span>
          <span
              onClick={handleUpdateClick}
              className="link-primary save-link"
            >
              Save
            </span>
        
         {/* rendering the updating popup */}
            {UpdatePopUp && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 p-4 rounded-md shadow-lg bg-green-500 text-white transition-opacity duration-300 opacity-100 animate-fadeIn">
          <div className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <p className="font-semibold">{cartItem.product.name} has been Updated</p>
          </div>
        </div>
      )}
      
          
      </div> 
    </>
  );
};

export default CartItemsDetails;
