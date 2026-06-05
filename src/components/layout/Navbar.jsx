import { Link, useLocation } from 'react-router-dom'
import { Badge, Button, Dropdown, Avatar } from 'antd'
import {
  FiShoppingCart,
  FiUser,
  FiLogOut,
  FiPackage,
  FiCamera,
  FiShoppingBag,
  FiHome,
  FiMenu,
} from 'react-icons/fi'
import { FaLeaf } from 'react-icons/fa'
import { useState } from 'react'
import { useApp } from '../../store/useAppStore'
import { useAuth } from '../../hooks/useAuth'
import { ROUTES } from '../../constants'

export default function Navbar() {
  const location = useLocation()
  const { state } = useApp()
  const { user, signOut, isAuthenticated } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const cartCount = state.cart.length

  const navLinks = [
    { path: ROUTES.HOME, label: 'หน้าแรก', icon: <FiHome /> },
    { path: ROUTES.MARKETPLACE, label: 'ตลาด', icon: <FiShoppingBag /> },
    { path: ROUTES.SCANNER, label: 'สแกนอาหาร', icon: <FiCamera /> },
  ]

  const userMenuItems = [
    { key: 'profile', label: <Link to={ROUTES.PROFILE}>โปรไฟล์</Link>, icon: <FiUser /> },
    { key: 'orders', label: <Link to={ROUTES.ORDERS}>คำสั่งซื้อ</Link>, icon: <FiPackage /> },
    { type: 'divider' },
    {
      key: 'logout',
      label: 'ออกจากระบบ',
      icon: <FiLogOut />,
      danger: true,
      onClick: signOut,
    },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-green-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to={ROUTES.HOME} className="flex items-center gap-2 no-underline">
            <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center shadow-md">
              <FaLeaf className="text-white text-xl" />
            </div>
            <div className="hidden sm:block">
              <p className="text-green-700 font-bold text-lg leading-none">Fresh Futures</p>
              <p className="text-green-400 text-xs leading-none">FoodRescue</p>
            </div>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all no-underline ${
                  isActive(link.path)
                    ? 'bg-green-50 text-green-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-green-600'
                }`}
              >
                <span className="text-base">{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Sell button */}
            {isAuthenticated && (
              <Link to={ROUTES.SELL}>
                <Button
                  type="primary"
                  size="small"
                  className="hidden sm:flex items-center gap-1 !bg-green-500 !border-green-500 hover:!bg-green-600"
                  icon={<FiPackage />}
                >
                  ลงขาย
                </Button>
              </Link>
            )}

            {/* Cart */}
            <Link to="/cart" className="relative">
              <Badge count={cartCount} size="small" color="#22c55e">
                <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-green-50 transition-colors text-gray-600 hover:text-green-600">
                  <FiShoppingCart className="text-xl" />
                </button>
              </Badge>
            </Link>

            {/* User menu / login */}
            {isAuthenticated ? (
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
                <button className="flex items-center gap-2 hover:bg-green-50 rounded-lg px-2 py-1 transition-colors">
                  <Avatar
                    size={32}
                    src={user?.user_metadata?.avatar_url}
                    className="bg-green-500 text-white"
                  >
                    {user?.email?.[0]?.toUpperCase()}
                  </Avatar>
                  <span className="hidden sm:block text-sm text-gray-700 max-w-[100px] truncate">
                    {user?.user_metadata?.full_name || user?.email}
                  </span>
                </button>
              </Dropdown>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link to={ROUTES.LOGIN}>
                  <Button size="small" variant="outlined">เข้าสู่ระบบ</Button>
                </Link>
                <Link to={ROUTES.REGISTER}>
                  <Button
                    type="primary"
                    size="small"
                    className="!bg-green-500 !border-green-500"
                  >
                    สมัครสมาชิก
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-green-50 text-gray-600"
              onClick={() => setMobileOpen((v) => !v)}
            >
              <FiMenu className="text-xl" />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden pb-3 border-t border-green-50 pt-2 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium no-underline ${
                  isActive(link.path)
                    ? 'bg-green-50 text-green-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="text-base">{link.icon}</span>
                {link.label}
              </Link>
            ))}
            {!isAuthenticated && (
              <div className="flex gap-2 px-4 pt-2">
                <Link to={ROUTES.LOGIN} className="flex-1">
                  <Button block size="small">เข้าสู่ระบบ</Button>
                </Link>
                <Link to={ROUTES.REGISTER} className="flex-1">
                  <Button block type="primary" size="small" className="!bg-green-500 !border-green-500">
                    สมัคร
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
