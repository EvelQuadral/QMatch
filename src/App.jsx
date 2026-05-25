import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import './styles/tokens.css';
import './styles/reset.css';

const Admin = lazy(() => import('./pages/Admin'));
const Me = lazy(() => import('./pages/Me'));

const Loading = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100dvh',
      color: 'white',
      fontFamily: 'var(--font-serif)',
      fontStyle: 'italic',
      opacity: 0.6,
    }}
  >
    Chargement…
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/admin"
          element={
            <Suspense fallback={<Loading />}>
              <Admin />
            </Suspense>
          }
        />
        <Route
          path="/me/:token"
          element={
            <Suspense fallback={<Loading />}>
              <Me />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
