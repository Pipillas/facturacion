import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import { io } from 'socket.io-client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Nav from './components/Nav.jsx';
import App from './routes/App.jsx'
import Practicas from './routes/Practicas.jsx';
import Comprobantes from './routes/Comprobantes.jsx';

export const socket = io('http://192.168.0.26:3000');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <Nav />
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/practicas" element={<Practicas />} />
        <Route path="/comprobantes" element={<Comprobantes />} />
      </Routes>
    </Router>
  </StrictMode>,
);