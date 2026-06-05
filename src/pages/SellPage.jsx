import { useState, useCallback } from 'react'
import { Form, Input, InputNumber, Select, Button, Alert, Steps } from 'antd'
import { FiCamera, FiPackage, FiCheck } from 'react-icons/fi'
import { FOOD_CATEGORIES } from '../constants'
import FoodCameraScanner from '../components/scanner/FoodCameraScanner'
import ScanResultCard from '../components/scanner/ScanResultCard'
import { analyzeFood, mockAnalyzeFood } from '../services/gemini'

const { TextArea } = Input

export default function SellPage() {
  const [form] = Form.useForm()
  const [scanResult, setScanResult] = useState(null)
  const [scanError, setScanError] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const isDev = !import.meta.env.VITE_GEMINI_API_KEY

  // รับ frame จาก FoodCameraScanner แล้วส่ง Gemini วิเคราะห์
  const handleFrame = useCallback(async (base64) => {
    setIsAnalyzing(true)
    setScanError(null)
    try {
      const res = isDev ? await mockAnalyzeFood() : await analyzeFood(base64)
      if (res.error) {
        setScanError(res.error)
        return
      }
      setScanResult(res)
      // Auto-fill form
      form.setFieldsValue({
        name: res.food_name,
        category: res.category,
        price: res.recommended_price,
        description: `${res.food_name} — ความสด ${res.freshness_score}/100\n${res.analysis_notes || ''}`.trim(),
        risk_level: res.risk_level,
        freshness_score: res.freshness_score,
        expires_in_hours: res.expires_in_hours,
      })
      setStep(1)
    } catch (err) {
      setScanError(err.message || 'วิเคราะห์ไม่สำเร็จ')
    } finally {
      setIsAnalyzing(false)
    }
  }, [isDev, form])

  const handleSubmit = async () => {
    setSubmitting(true)
    await new Promise((r) => setTimeout(r, 1500))
    setSubmitting(false)
    setSuccess(true)
    setStep(2)
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <FiCheck className="text-green-500 text-4xl" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">ลงขายสำเร็จ!</h2>
        <p className="text-gray-500 mb-8">สินค้าของคุณถูกโพสต์ในตลาดแล้ว</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => { setSuccess(false); setStep(0); setScanResult(null); form.resetFields() }}>
            ลงขายอีกรายการ
          </Button>
          <Button type="primary" style={{ backgroundColor: '#22c55e' }} href="/marketplace">
            ดูตลาด
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
            <FiPackage className="text-white text-xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ลงขายสินค้า</h1>
        </div>
        <p className="text-gray-500 text-sm">สแกนอาหารด้วย AI เพื่อกรอกข้อมูลอัตโนมัติ</p>
      </div>

      <div className="mb-8">
        <Steps
          current={step}
          items={[
            { title: 'สแกนอาหาร', icon: <FiCamera /> },
            { title: 'กรอกรายละเอียด', icon: <FiPackage /> },
            { title: 'เสร็จสิ้น', icon: <FiCheck /> },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Scanner */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-100">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FiCamera className="text-green-500" />
              สแกนอาหาร — กรอกข้อมูลอัตโนมัติ
            </h3>
            <FoodCameraScanner
              onFrameCaptured={handleFrame}
              isAnalyzing={isAnalyzing}
              scanInterval={3000}
              onError={setScanError}
            />
            {scanError && (
              <Alert type="warning" description={scanError} className="mt-3 rounded-xl" closable afterClose={() => setScanError(null)} />
            )}
          </div>

          {scanResult && <ScanResultCard result={scanResult} compact />}
        </div>

        {/* Right: Form */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-100">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FiPackage className="text-green-500" /> รายละเอียดสินค้า
          </h3>

          {step === 0 && !scanResult && (
            <div className="flex items-center justify-center h-36 border-2 border-dashed border-green-200 rounded-xl mb-4">
              <p className="text-gray-400 text-sm text-center">
                สแกนอาหาร → กรอกข้อมูลอัตโนมัติ<br />
                <span className="text-xs text-green-500">หรือกรอกด้วยตนเอง</span>
              </p>
            </div>
          )}

          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item name="name" label="ชื่ออาหาร" rules={[{ required: true }]}>
              <Input placeholder="เช่น มะเขือเทศ, นมสด..." />
            </Form.Item>

            <div className="grid grid-cols-2 gap-3">
              <Form.Item name="category" label="หมวดหมู่" rules={[{ required: true }]}>
                <Select placeholder="เลือก" options={FOOD_CATEGORIES.map((c) => ({ value: c, label: c }))} />
              </Form.Item>
              <Form.Item name="price" label="ราคา (฿)" rules={[{ required: true }]}>
                <InputNumber min={1} className="w-full" placeholder="0" />
              </Form.Item>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Form.Item name="freshness_score" label="คะแนนความสด">
                <InputNumber min={0} max={100} className="w-full" />
              </Form.Item>
              <Form.Item name="risk_level" label="ระดับความเสี่ยง">
                <Select options={[
                  { value: 'LOW', label: '🟢 ต่ำ' },
                  { value: 'MEDIUM', label: '🟡 ปานกลาง' },
                  { value: 'HIGH', label: '🔴 สูง' },
                ]} />
              </Form.Item>
            </div>

            <Form.Item name="expires_in_hours" label="หมดอายุใน (ชั่วโมง)">
              <InputNumber min={1} className="w-full" placeholder="48" />
            </Form.Item>

            <Form.Item name="description" label="รายละเอียดเพิ่มเติม">
              <TextArea rows={3} placeholder="ข้อมูลเพิ่มเติม..." />
            </Form.Item>

            <Form.Item name="location" label="พื้นที่จัดส่ง">
              <Input placeholder="เช่น กรุงเทพ, เชียงใหม่..." />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              block
              size="large"
              style={{ backgroundColor: '#22c55e', borderColor: '#22c55e', marginTop: 8 }}
            >
              โพสต์ขายเลย
            </Button>
          </Form>
        </div>
      </div>
    </div>
  )
}
