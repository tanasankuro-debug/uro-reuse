# Scanner Manual Test Checklist

> ทดสอบ Real-Time AI Food Scanner บน `/scanner` — ทำเครื่องหมาย ✅ / ❌ ในแต่ละรายการ

---

## 1. Camera Access

| # | Test case | Expected | Result |
|---|-----------|----------|--------|
| 1.1 | เปิดหน้า /scanner ครั้งแรก | browser ขอ permission กล้อง | |
| 1.2 | กด "อนุญาต" | กล้องเปิด live preview แสดงบน canvas | |
| 1.3 | กด "บล็อก/ปฏิเสธ" | แสดง CameraError component พร้อมขั้นตอนแก้ไขตาม browser | |
| 1.4 | ปิดกล้องแอปอื่นแล้วกด "ลองใหม่" | กล้องเปิดใหม่ได้ | |
| 1.5 | เปิดในเบราเซอร์ที่ไม่รองรับ (IE) | แสดงข้อความ "เบราเซอร์ไม่รองรับ" + รายชื่อ browser ที่รองรับ | |
| 1.6 | เปิดผ่าน http:// (ไม่ใช่ https://) | แสดง HTTPS required error + ปุ่ม redirect | |

---

## 2. Image Upload Fallback

| # | Test case | Expected | Result |
|---|-----------|----------|--------|
| 2.1 | กดปุ่ม "อัปโหลดรูป" | file picker เปิด | |
| 2.2 | เลือกไฟล์ภาพ .jpg/.png | ภาพแสดงใน preview และเริ่มวิเคราะห์ | |
| 2.3 | เลือกไฟล์ที่ไม่ใช่ภาพ | แสดง error หรือ ignore | |
| 2.4 | อัปโหลดภาพขนาดใหญ่ (>4MB) | แสดง GeminiSizeError | |

---

## 3. AI Scan — Happy Path

| # | Test case | Expected | Result |
|---|-----------|----------|--------|
| 3.1 | ส่องกล้องที่อาหารสด (เช่น ผลไม้) | ScanResultDashboard แสดงผลภายใน 5 วินาที | |
| 3.2 | ผลลัพธ์แสดง freshness_score | แถบสีแสดง 0-100 ถูกต้อง | |
| 3.3 | ผลลัพธ์แสดง risk_level | badge สี: LOW=เขียว, MEDIUM=เหลือง, HIGH=ส้ม, DANGEROUS=แดง | |
| 3.4 | ผลลัพธ์แสดง cooking_suggestions | มี 2-3 เมนูแนะนำ | |
| 3.5 | ผลลัพธ์แสดง suggested_price_thb | มี min-max ราคา (บาท) | |
| 3.6 | ส่องอาหารที่มีราคา | MarketComparison แสดงสินค้าเปรียบเทียบ (เฉพาะผู้ล็อกอิน) | |

---

## 4. AI Scan — Edge Cases

| # | Test case | Expected | Result |
|---|-----------|----------|--------|
| 4.1 | ส่องกล้องที่วัตถุที่ไม่ใช่อาหาร | แสดง AIError type "no_food" พร้อมเคล็ดลับ | |
| 4.2 | ส่องกล้องในที่มืด/ภาพเบลอ | ai_confidence ต่ำ → แสดง "ความมั่นใจต่ำ" warning | |
| 4.3 | พบเชื้อรา (ภาพ/อาหารเน่า) | risk_level = DANGEROUS, mold_detected = true, badge แดง | |

---

## 5. Rate Limiting

| # | Test case | Expected | Result |
|---|-----------|----------|--------|
| 5.1 | สแกน 20+ ครั้ง | แสดง rate limit warning bar เปลี่ยนเป็นสีส้ม | |
| 5.2 | สแกนจนครบ quota (30 ครั้ง/นาที) | แสดง AIError "rate_limit" พร้อม countdown | |
| 5.3 | รอครบ 1 นาที | quota reset อัตโนมัติ, สแกนได้อีก | |

---

## 6. Guest vs Logged-in

| # | Test case | Expected | Result |
|---|-----------|----------|--------|
| 6.1 | เปิด /scanner โดยไม่ล็อกอิน | แสดง guest banner + ลิงก์ไป /login และ /register | |
| 6.2 | กด "บันทึกผล" (guest) | redirect ไป /login | |
| 6.3 | ล็อกอินแล้วเปิด /scanner | ไม่มี guest banner, แสดง ScanHistory | |
| 6.4 | กด "บันทึกผล" (logged-in) | บันทึกสำเร็จ, แสดงข้อความยืนยัน | |
| 6.5 | Logged-in: MarketComparison แสดง | ตารางราคาเปรียบเทียบ (จาก Supabase หรือ mock) | |

---

## 7. Offline / Network Error

| # | Test case | Expected | Result |
|---|-----------|----------|--------|
| 7.1 | ปิด network แล้วสแกน | แสดง NetworkError component | |
| 7.2 | NetworkError มี cached result | แสดงผลสแกนครั้งล่าสุด | |
| 7.3 | เชื่อม network กลับ | สแกนต่อได้อัตโนมัติ | |
| 7.4 | บันทึกขณะ offline | ผลสแกนถูกบันทึกไว้ใน localStorage pending | |
| 7.5 | เชื่อม network กลับ + ล็อกอิน | pending results sync ไป Supabase | |

---

## 8. Scan History (Logged-in only)

| # | Test case | Expected | Result |
|---|-----------|----------|--------|
| 8.1 | สแกนหลายครั้ง | ประวัติแสดงในส่วน ScanHistory | |
| 8.2 | กรอง "วันนี้" | แสดงเฉพาะสแกนวันนี้ | |
| 8.3 | กรอง "สัปดาห์" | แสดงเฉพาะ 7 วันล่าสุด | |
| 8.4 | กรอง risk "DANGEROUS" | แสดงเฉพาะผลอันตราย | |
| 8.5 | ประวัติมากกว่า 30 รายการ | แสดงสูงสุด 30 รายการล่าสุด | |

---

## 9. Performance

| # | Test case | Expected | Result |
|---|-----------|----------|--------|
| 9.1 | สแกนภาพเดิมซ้ำ (ไม่ขยับกล้อง) | SmartDebouncer block → ไม่ส่ง API ซ้ำ | |
| 9.2 | ขยับกล้องมาก | ส่ง API ใหม่เมื่อภาพเปลี่ยนพอ | |
| 9.3 | อัปโหลดภาพขนาดใหญ่ | ImageCompressor resize ก่อนส่ง Gemini | |
| 9.4 | สแกนภาพเดิมซ้ำภายใน 30s | ResultCache ตอบกลับทันที (ไม่มี network call) | |

---

## 10. ErrorBoundary

| # | Test case | Expected | Result |
|---|-----------|----------|--------|
| 10.1 | เกิด runtime error ในส่วน Scanner | ScannerErrorBoundary แสดง fallback UI | |
| 10.2 | กด "ลองใหม่" บน ErrorBoundary | reset state และ render scanner ใหม่ | |
| 10.3 | กด "กลับหน้าหลัก" | navigate ไป "/" | |

---

## 11. Mobile / Responsive

| # | Test case | Expected | Result |
|---|-----------|----------|--------|
| 11.1 | เปิดบน iPhone Safari | UI ไม่แตก, กล้องทำงาน | |
| 11.2 | เปิดบน Android Chrome | กล้อง + scan ทำงานปกติ | |
| 11.3 | หมุนหน้าจอ (portrait ↔ landscape) | layout ปรับตัวได้ | |

---

> **หมายเหตุ:** ทดสอบในเบราเซอร์ Chrome และ Firefox อย่างน้อย  
> สแกนด้วยภาพจริง ไม่ใช่ภาพถ่ายหน้าจอ เพื่อให้ Gemini Vision วิเคราะห์ได้แม่นยำ
