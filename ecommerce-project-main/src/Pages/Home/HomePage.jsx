import React from "react";
import axios from "axios";
import { useEffect } from "react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import Header from "../../Component/Header";
import { RefreshCw, XCircle, CheckCircle} from 'lucide-react';
import "./HomePage.css";
import ProductCard from "../../Component/ProductCard"; // Import the component

const HomePage = ({ cart, LoadCart }) => {
  const [products, setProducts] = useState([]);
  const [searchParams] = useSearchParams();
  const [resetMessage, setResetMessage] = useState(null);
  const [showConfirm,setShowConfirm] = useState(false)

  //  TO LOAD THE SEARCH PARAMETER
  const [isLoading, setIsLoading] = useState(true);

  const search = searchParams.get("search");
  // useEffect(()=>{
  //    axios.get('/api/products')
  //   .then((response)=>{
  //     setProducts(response.data)
  //   })
  //   axios.get ('/api/cart-items')
  //   .then ((response)=>{
  //     SetCart(response.data)
  //   })

  // },[])

  useEffect(() => {
    const getHomeData = async () => {
      setIsLoading(true);
      const urlPath = search
        ? `/api/products?search=${search}`
        : "/api/products";
      const response = await axios.get(urlPath);
      setProducts(response.data);
      setIsLoading(false);
    };

    getHomeData();
  }, [search]);
  const handleReset = () => {
    setShowConfirm(true);
  };

  
  
   const confirmReset = async () => {
    setShowConfirm(false); // Close the confirmation modal
      const response = await axios.post("/api/reset");
      // After a successful reset, re-fetch products and cart data
      const urlPath = search
        ? `/api/products?search=${search}`
        : "/api/products";
      const productsResponse = await axios.get(urlPath);
      setProducts(productsResponse.data);
      // Assuming LoadCart is a function passed as a prop to re-fetch cart data
      LoadCart();
      setResetMessage({ type: "success", text: response.data.message || "Data reset successfully!" });
      setTimeout(()=>{
            setResetMessage(false)
          }, 1000); //the pop-up will disappear after 3 seconds

    } 
  
    
    
    

  const cancelReset = () => {
    setShowConfirm(false);
  };
  return (
    <>
      <Header cart={cart} />
      <div className="p-4 bg-gray-100 min-h-screen">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          Products
        </h1>

        
        {/* Success/Error message display */}
        {resetMessage && (
          <div className={`p-4 rounded-lg mb-4 text-center font-bold ${resetMessage.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {resetMessage.text}
          </div>
        )}
        {isLoading ? (
          <div className="text-center text-lg">
            <div className="flex justify-center items-center mt-8">
              <svg
                className="animate-spin-slow h-8 w-8 text-gray-500"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
            loading....
          </div>
        ) : (
          <>
            {products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                {/* Use the map method to render a ProductCard for each item in the array */}
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    LoadCart={LoadCart}
                    products={products}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center text-xl text-gray-600">
                oops, no products match your search, Try a different query
              </div>
            )}
          </>
        )}
      </div>
       {/* Floating Reset Button */}
        <button
          onClick={handleReset}
          className="fixed bottom-8 right-8 bg-pink-600 hover:bg-pink-700 text-white font-bold p-5 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-500 focus:ring-opacity-50 flex items-center justify-center gap-2 z-50"
          // className="fixed bottom-8 right-8 bg-pink-600 text-white p-r rounded-full font-bold hover:bg-pink-700"
        >
          <RefreshCw size={24} />
        </button>

         {/* Confirmation Modal */}
       {showConfirm && (
          <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-[100]">
            <div className="bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-700 max-w-md w-full text-center">
              <h3 className="text-3xl font-bold mb-4">Reset Data?</h3>
              <p className="text-slate-400 mb-6">
                Are you sure you want to reset all data? This will clear the products, Cart, and Orders.
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={confirmReset}
                  className="flex items-center gap-2 px-6 py-3 rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors duration-200"
                >
                  <CheckCircle size={20} /> Yes, Reset
                </button>
                <button
                  onClick={cancelReset}
                  className="flex items-center gap-2 px-6 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors duration-200"
                >
                  <XCircle size={20} /> No, Cancel
                </button>
              </div>
            </div>
          </div>
        )}
    </>
    

  );
   
};
export default HomePage;
