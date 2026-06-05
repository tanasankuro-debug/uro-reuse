import type { FoodAnalysisResult } from '../lib/gemini-food-analyzer'

export interface AppUser {
  id: string
  email?: string
  [key: string]: unknown
}

export interface AppState {
  user: AppUser | null
  session: unknown | null
  scanResult: FoodAnalysisResult | null
  scanHistory: FoodAnalysisResult[]
  isScanning: boolean
  scanError: string | null
  lastScannedAt: number | null
  products: unknown[]
  productsLoading: boolean
  filters: {
    category: string | null
    maxPrice: number | null
    riskLevel: string | null
    searchQuery: string
  }
  cart: unknown[]
  notification: { message: string; type: string } | null
}

export interface AppActions {
  setUser: (user: AppUser, session: unknown) => void
  clearUser: () => void
  setScanResult: (result: FoodAnalysisResult) => void
  setScanning: (v: boolean) => void
  setScanError: (e: string | null) => void
  clearScan: () => void
  setProducts: (p: unknown[]) => void
  setProductsLoading: (v: boolean) => void
  setFilters: (f: Partial<AppState['filters']>) => void
  addToCart: (p: unknown) => void
  removeFromCart: (id: string) => void
  clearCart: () => void
  notify: (message: string, type?: string) => void
  clearNotification: () => void
}

export interface AppContextValue {
  state: AppState
  actions: AppActions
}

export declare function useApp(): AppContextValue
export declare function AppProvider(props: { children: React.ReactNode }): JSX.Element
