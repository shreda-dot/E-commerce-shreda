import React from "react";
import "../Component/HomeHeader.css";
import { Link } from "react-router";
import { useNavigate, useSearchParams } from "react-router";

const Header = ({cart}) => {
  const navigate = useNavigate()
  const [SearchParms] = useSearchParams()
  const searchText = SearchParms.get('searchBar')
  
  const [SearchBar, setSearchBar] = React.useState(searchText || '')


  // SEARCHBUTTON FUNCTION
  const SearchButtonData = (()=>{

   
   
    
     navigate(`/?search=${SearchBar}`);
   
      setSearchBar('') 
      
  })

//  the key button function
  const HandleClickButton = (event) =>{
    if (event.key === "Enter") {
     event.preventDefault(); 
      SearchButtonData()
    

    }else if (event.key === 'Escape'){
      setSearchBar('')
    }
  }

  const totalQuantity = cart.reduce((total, cartItem) => {
    return total + cartItem.quantity;
  }, 0); // The '0' is the starting value for the total.
  
  return (
    <>
      <div className="header ">
        <div className="left-section">
         <Link to="/" className="header-link">
            <img className="logo" src="images/logo.png" />
            <img className="mobile-logo" src="images/mobile-logo.png" />
          </Link>
        </div>

        <div className="middle-section ">
          <input
          onKeyDown={HandleClickButton}
          value={SearchBar}
           onChange={(e) => setSearchBar(e.target.value)}
            className="search-bar bg-white text-dark flex-grow px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            type="text"
            placeholder="Search"
          />

          <button 
          onClick={SearchButtonData}
          className="search-button grid place-items-center sm-border-l-0">
            <img className="search-icon" src="images/icons/search-icon.png" />
          </button>
        </div>

        <div className="right-section">
         <Link className="orders-link header-link" to="/orders">
            <span className="orders-text">Orders</span>
          </Link>

         <Link className="cart-link header-link" to="/checkout">
            <img className="cart-icon" src="images/icons/cart-icon.png" />
            <div className="cart-quantity">{totalQuantity}</div>
            <div className="cart-text">Cart</div>
          </Link>
        </div>
      </div>
    </>
  );
};

export default Header;
