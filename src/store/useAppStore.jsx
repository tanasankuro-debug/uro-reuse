// ── Global App Store — React Context + useReducer (zero extra deps) ──

import { createContext, useContext, useReducer, useCallback } from 'react'

// ─── State shape ─────────────────────────────────────────────────
const initialState = {
  // Auth
  user: null,
  session: null,

  // Scanner
  scanResult: null,
  scanHistory: [],
  isScanning: false,
  scanError: null,
  lastScannedAt: null,

  // Marketplace
  products: [],
  productsLoading: false,
  filters: {
    category: null,
    maxPrice: null,
    riskLevel: null,
    searchQuery: '',
  },

  // Cart
  cart: [],

  // UI
  notification: null,
}

// ─── Actions ─────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    // Auth
    case 'SET_USER':
      return { ...state, user: action.payload.user, session: action.payload.session }
    case 'CLEAR_USER':
      return { ...state, user: null, session: null }

    // Scanner
    case 'SET_SCAN_RESULT':
      return {
        ...state,
        scanResult: action.payload,
        lastScannedAt: Date.now(),
        scanError: null,
        scanHistory: [action.payload, ...state.scanHistory].slice(0, 20),
      }
    case 'SET_SCANNING':
      return { ...state, isScanning: action.payload }
    case 'SET_SCAN_ERROR':
      return { ...state, scanError: action.payload, isScanning: false }
    case 'CLEAR_SCAN':
      return { ...state, scanResult: null, scanError: null }

    // Products
    case 'SET_PRODUCTS':
      return { ...state, products: action.payload, productsLoading: false }
    case 'SET_PRODUCTS_LOADING':
      return { ...state, productsLoading: action.payload }
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } }

    // Cart
    case 'ADD_TO_CART': {
      const exists = state.cart.find((i) => i.id === action.payload.id)
      return {
        ...state,
        cart: exists ? state.cart : [...state.cart, { ...action.payload, qty: 1 }],
      }
    }
    case 'REMOVE_FROM_CART':
      return { ...state, cart: state.cart.filter((i) => i.id !== action.payload) }
    case 'CLEAR_CART':
      return { ...state, cart: [] }

    // UI
    case 'SET_NOTIFICATION':
      return { ...state, notification: action.payload }
    case 'CLEAR_NOTIFICATION':
      return { ...state, notification: null }

    default:
      return state
  }
}

// ─── Context ─────────────────────────────────────────────────────
export const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const actions = {
    setUser: useCallback((user, session) => dispatch({ type: 'SET_USER', payload: { user, session } }), []),
    clearUser: useCallback(() => dispatch({ type: 'CLEAR_USER' }), []),

    setScanResult: useCallback((result) => dispatch({ type: 'SET_SCAN_RESULT', payload: result }), []),
    setScanning: useCallback((v) => dispatch({ type: 'SET_SCANNING', payload: v }), []),
    setScanError: useCallback((e) => dispatch({ type: 'SET_SCAN_ERROR', payload: e }), []),
    clearScan: useCallback(() => dispatch({ type: 'CLEAR_SCAN' }), []),

    setProducts: useCallback((p) => dispatch({ type: 'SET_PRODUCTS', payload: p }), []),
    setProductsLoading: useCallback((v) => dispatch({ type: 'SET_PRODUCTS_LOADING', payload: v }), []),
    setFilters: useCallback((f) => dispatch({ type: 'SET_FILTERS', payload: f }), []),

    addToCart: useCallback((p) => dispatch({ type: 'ADD_TO_CART', payload: p }), []),
    removeFromCart: useCallback((id) => dispatch({ type: 'REMOVE_FROM_CART', payload: id }), []),
    clearCart: useCallback(() => dispatch({ type: 'CLEAR_CART' }), []),

    notify: useCallback(
      (message, type = 'info') => dispatch({ type: 'SET_NOTIFICATION', payload: { message, type } }),
      []
    ),
    clearNotification: useCallback(() => dispatch({ type: 'CLEAR_NOTIFICATION' }), []),
  }

  return <AppContext.Provider value={{ state, actions }}>{children}</AppContext.Provider>
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
