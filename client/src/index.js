import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import API_URL from './config';

const nativeFetch = window.fetch.bind(window)

// Keep existing API calls working while ensuring every request to the backend
// carries the authenticated user's bearer token. Non-API requests are left
// untouched, including external links and asset requests.
window.fetch = (input, init = {}) => {
  const url = typeof input === 'string' || input instanceof URL ? String(input) : input.url
  const token = localStorage.getItem('accessToken')

  if (!token || !url.startsWith(API_URL)) {
    return nativeFetch(input, init)
  }

  const headers = new Headers(
    init.headers || (input instanceof Request ? input.headers : undefined)
  )
  headers.set('Authorization', `Bearer ${token}`)

  return nativeFetch(input, { ...init, headers })
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
