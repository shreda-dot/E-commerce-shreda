import React, { useState } from 'react';
import { FormatMoney } from '../utility/money';
import axios from 'axios';
const ProductCard = ({ product, LoadCart }) => {
  const [quantity, setQuatity] = React.useState(1)
  const [showPopUp, setShowPopUp] = React.useState(false)

// THE FUNCTION THAT CONTROL THE INPUT TEXT
  const handleTextChange = (event) => {
    const quantitySelected = Number(event.target.value)
        setQuatity(quantitySelected)
       
    };
    
    // THE FUNCTION THAT CONTROLS THE BUTTON ADD TO CART
    const AddToCart = async ()=>{
            await axios.post('/api/cart-items',{
            productId: product.id,
            quantity

          
          })
          setQuatity('')
          setShowPopUp(true)
          setTimeout(()=>{
            setShowPopUp(false)
          }, 1000); //the pop-up will disappear after 3 seconds

         await LoadCart()
         setQuatity ('')
        
        }

  
  // State to store the selected quantity
  
  return (
    <>
    <div className="flex flex-col  border border-gray-300 rounded-xl p-4 shadow-sm w-full">
      {showPopUp && (
        <div className="absolute top-4 right-4 z-50 p-4 rounded-md shadow-lg bg-green-500 text-white transition-opacity duration-300 opacity-100 animate-fadeIn">
          <div className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <p className="font-semibold">{product.name} has been added</p>
          </div>
        </div>
       
      )}
     
      <div 
      data-testid = 'PRODUCT-CONTAINER'
      className="flex justify-center items-center h-48 mb-4">
        <img className="max-h-full max-w-full object-contain"
        data-testid ='product-image'
          src={product.image}
          alt={product.name} />
      </div>

      <div className="text-lg font-semibold text-gray-800 mb-2 truncate">
        {product.name}
      </div>

      <div className="flex items-center mb-2">
        <img className="h-4"
        data-testid ='product-rating-stars-image'
          src={`images/ratings/rating-${product.rating.stars * 10}.png`}
          alt={`Rating: ${product.rating.stars} stars`} />
        <div className="text-sm text-blue-500 font-medium ml-1 cursor-pointer hover:underline">
          
          {product.rating.count}
        </div>
      </div>

      <div className="text-md font-bold text-gray-700 mb-4">
       {FormatMoney(product.priceCents)}
      </div>

      <select 
        className="w-full p-2 border border-gray-300 rounded-md mb-4"
        onChange= {handleTextChange}



        
        value={quantity}
       
      >
        {[...Array(10).keys()].map(i => (
          <option key={i + 1} value={i + 1}>{i + 1}</option>
         
        ))}
      </select>
      
      {/* The onClick handler sends both the product ID and the selected quantity */}
      <button 
      data-testid = 'add-to-cart-id'
        className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors"
        onClick={AddToCart}>
        Add to Cart
      </button>
     
    </div>
</>

  );
};

export default ProductCard;
