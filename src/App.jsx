import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './store/useAppStore'
import AppLayout from './components/layout/AppLayout'
import HomePage from './pages/HomePage'
import MarketplacePage from './pages/MarketplacePage'
import BuyerScannerPage from './routes/scanner'
import SellPage from './pages/SellPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import { ROUTES } from './constants'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Auth pages — no layout */}
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.REGISTER} element={<RegisterPage />} />

          {/* Main app with Navbar + Footer */}
          <Route element={<AppLayout />}>
            <Route path={ROUTES.HOME} element={<HomePage />} />
            <Route path={ROUTES.MARKETPLACE} element={<MarketplacePage />} />
            <Route path={ROUTES.SCANNER} element={<BuyerScannerPage />} />
            <Route path={ROUTES.SELL} element={<SellPage />} />
            <Route path={ROUTES.PROFILE} element={<div className="p-8 text-center text-gray-500">โปรไฟล์ (Prompt #3)</div>} />
            <Route path={ROUTES.ORDERS} element={<div className="p-8 text-center text-gray-500">คำสั่งซื้อ (Prompt #4)</div>} />
            <Route path="/cart" element={<div className="p-8 text-center text-gray-500">ตะกร้า (Prompt #5)</div>} />
            <Route path="*" element={<div className="p-8 text-center text-gray-500">404 — ไม่พบหน้านี้</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
