import { Outlet } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import thTH from 'antd/locale/th_TH'
import Navbar from './Navbar'
import Footer from './Footer'

const antTheme = {
  token: {
    colorPrimary: '#22c55e',
    colorSuccess: '#22c55e',
    colorWarning: '#f97316',
    colorError: '#ef4444',
    colorInfo: '#3b82f6',
    borderRadius: 8,
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  },
}

export default function AppLayout() {
  return (
    <ConfigProvider theme={antTheme} locale={thTH}>
      <div className="min-h-screen flex flex-col bg-green-50">
        <Navbar />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
    </ConfigProvider>
  )
}
