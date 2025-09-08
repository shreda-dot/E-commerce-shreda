import {it, expect, describe, vi, beforeEach} from 'vitest'
import { render, screen } from '@testing-library/react';
import ProductCard from './ProductCard';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
vi.mock('axios')

describe('product component', () =>{
    let product 
  let LoadCart =vi.fn()
  beforeEach(()=>{
    product = {
    id: 'e43638ce-6aa0-4b85-b27f-e1d07eb678c6',
    image: 'images/products/athletic-cotton-socks-6-pairs.jpg',
    name: 'Black and Gray Athletic Cotton Socks - 6 Pairs',
    rating: {
      stars: 4.5,
      count: 87
    },
    priceCents: 1090
  }
  LoadCart =vi.fn()

  })
    it ('displays the product details correctly', () =>{
 
       render(<ProductCard product = {product} LoadCart={LoadCart}/>);
       expect(

       screen.getByText('Black and Gray Athletic Cotton Socks - 6 Pairs')
       ).toBeInTheDocument()
       expect(
        screen.getByText('$10.90')

       ).toBeInTheDocument();
       expect(
        screen.getByTestId('product-image')
       ).toHaveAttribute('src', 'images/products/athletic-cotton-socks-6-pairs.jpg')
       expect(
        screen.getByTestId('product-rating-stars-image')
       ).toHaveAttribute('src','images/ratings/rating-45.png' )
       expect(
        screen.getByText('87')
       ).toBeInTheDocument()
    });

    // USER INTERACTION
    it ('adds a product to the cart',async ()=> {
       render(<ProductCard product = {product} LoadCart={LoadCart}/>);
       const user = userEvent.setup();
      const addtocartbutton = screen.getByTestId('add-to-cart-id')
      await user.click(addtocartbutton);

      expect(axios.post).toHaveBeenCalledWith(
        '/api/cart-items',
        {
            productId: 'e43638ce-6aa0-4b85-b27f-e1d07eb678c6',
            quantity: 1
        }
      )
      expect(LoadCart).toHaveBeenCalled()
    })

});