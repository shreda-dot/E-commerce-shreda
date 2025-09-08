import {it, expect, describe, vi, beforeEach} from 'vitest'
import { render, screen, within } from '@testing-library/react';
import axios from 'axios';
import HomePage from './HomePage';
import { MemoryRouter } from 'react-router';
vi.mock('axios')

describe('HomePage component', () => {
    let LoadCart
    beforeEach(()=>{
        LoadCart = vi.fn ()
        axios.get.mockImplementation(async(urlPath)=>{
            if (urlPath === '/api/products'){
                return {
                    data: [{
    id: 'e43638ce-6aa0-4b85-b27f-e1d07eb678c6',
    image: 'images/products/athletic-cotton-socks-6-pairs.jpg',
    name: 'Black and Gray Athletic Cotton Socks - 6 Pairs',
    rating: {
      stars: 4.5,
      count: 87
    },
    priceCents: 1090
  },
 {
    id: '15b6fc6b-327a-4ec4-896f-486349e85a3d',
    image: 'images/products/intermediate-composite-basketball.jpg',
    name: 'Intermediate Size Basketball',
    rating: {
      stars: 4.0,
      count: 127
    },
    priceCents: 2095
  },
],
  
                }
            }
        })
    })
  it ('display the product correct', async () =>{
    render (
    <MemoryRouter>
        <HomePage cart={[]} LoadCart={LoadCart}   />
    </MemoryRouter>
    )
     
   const productContainer = await screen.findAllByTestId('PRODUCT-CONTAINER')
   expect(productContainer.length).toBe(2)

   expect(
    within(productContainer[0])
   .getByAltText('Black and Gray Athletic Cotton Socks - 6 Pairs')
   ).toBeInTheDocument()
   expect(
    within(productContainer[1])
   .getByAltText('Intermediate Size Basketball')
   ).toBeInTheDocument()
   
  })
})
