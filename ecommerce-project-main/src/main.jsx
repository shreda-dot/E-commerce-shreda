import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

console.log('SHREDA: main.jsx loaded');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
       <App />
    </BrowserRouter>
   
  </StrictMode>,
)
