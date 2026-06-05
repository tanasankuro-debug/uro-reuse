import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Form, Input, Button, Alert } from 'antd'
import { FiMail, FiLock, FiUser, FiUserPlus } from 'react-icons/fi'
import { FaLeaf } from 'react-icons/fa'
import { useAuth } from '../hooks/useAuth'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async ({ email, password, full_name }) => {
    setLoading(true)
    setError(null)
    try {
      await signUp(email, password, { full_name })
      navigate('/')
    } catch (err) {
      setError(err.message || 'สมัครสมาชิกไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <FaLeaf className="text-white text-3xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">สมัครสมาชิก</h1>
          <p className="text-gray-500 text-sm mt-1">เข้าร่วมชุมชนลดขยะอาหาร</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-8">
          {error && <Alert type="error" message={error} className="mb-4 rounded-xl" closable />}

          <Form layout="vertical" onFinish={handleSubmit}>
            <Form.Item
              name="full_name"
              label="ชื่อ-นามสกุล"
              rules={[{ required: true, message: 'กรุณาใส่ชื่อ' }]}
            >
              <Input
                prefix={<FiUser className="text-gray-400" />}
                placeholder="ชื่อของคุณ"
                size="large"
              />
            </Form.Item>

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
              rules={[{ required: true, min: 6, message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' }]}
            >
              <Input.Password
                prefix={<FiLock className="text-gray-400" />}
                placeholder="รหัสผ่าน (อย่างน้อย 6 ตัว)"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="confirm"
              label="ยืนยันรหัสผ่าน"
              dependencies={['password']}
              rules={[
                { required: true },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) return Promise.resolve()
                    return Promise.reject('รหัสผ่านไม่ตรงกัน')
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<FiLock className="text-gray-400" />}
                placeholder="ยืนยันรหัสผ่าน"
                size="large"
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              icon={<FiUserPlus />}
              style={{ backgroundColor: '#22c55e', borderColor: '#22c55e' }}
            >
              สมัครสมาชิก
            </Button>
          </Form>

          <p className="text-center text-sm text-gray-500 mt-4">
            มีบัญชีแล้ว?{' '}
            <Link to="/login" className="text-green-600 font-semibold hover:text-green-700">
              เข้าสู่ระบบ
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
