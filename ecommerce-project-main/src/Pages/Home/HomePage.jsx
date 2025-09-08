import React from "react";
import axios from "axios";
import { useEffect } from "react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import Header from "../../Component/Header";
import "./HomePage.css";
import ProductCard from "../../Component/ProductCard"; // Import the component

const HomePage = ({ cart, LoadCart }) => {
  const [products, setProducts] = useState([]);
  const [searchParams] = useSearchParams();

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

  return (
    <>
      <Header cart={cart} />
      <div className="p-4 bg-gray-100 min-h-screen">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          Products
        </h1>
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
    </>
  );
};
export default HomePage;
