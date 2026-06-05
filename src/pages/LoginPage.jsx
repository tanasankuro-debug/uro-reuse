import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Form, Input, Button, Alert, Divider } from 'antd'
import { FiMail, FiLock, FiLogIn } from 'react-icons/fi'
import { FaLeaf } from 'react-icons/fa'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async ({ email, password }) => {
    setLoading(true)
    setError(null)
    try {
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      setError(err.message || 'เข้าสู่ระบบไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <FaLeaf className="text-white text-3xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">เข้าสู่ระบบ</h1>
          <p className="text-gray-500 text-sm mt-1">Fresh Futures · FoodRescue</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-8">
          {error && <Alert type="error" message={error} className="mb-4 rounded-xl" closable />}

          <Form layout="vertical" onFinish={handleSubmit}>
            <Form.Item
              name="email"
              label="อีเมล"
              rules={[{ required: true, type: 'email', message: 'กรุณาใส่อีเมลที่ถูกต้อง' }]}
            >
              <Input
                prefix={<FiMail className="text-gray-400" />}
                placeholder="your@email.com"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="รหัสผ่าน"
              rules={[{ required: true, message: 'กรุณาใส่รหัสผ่าน' }]}
            >
              <Input.Password
                prefix={<FiLock className="text-gray-400" />}
                placeholder="รหัสผ่าน"
                size="large"
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              icon={<FiLogIn />}
              style={{ backgroundColor: '#22c55e', borderColor: '#22c55e' }}
            >
              เข้าสู่ระบบ
            </Button>
          </Form>

          <Divider className="my-4" />

          <p className="text-center text-sm text-gray-500">
            ยังไม่มีบัญชี?{' '}
            <Link to="/register" className="text-green-600 font-semibold hover:text-green-700">
              สมัครสมาชิก
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
