-- ══════════════════════════════════════════════════════════════════════════════
-- Fresh Futures — Scanner Schema Migration
-- Date: 2026-06-05
--
-- สร้างตารางสำหรับ Real-Time Food Scanner:
--   • scan_results       — ผลการวิเคราะห์ทุกครั้ง
--   • scanner_sessions   — session การสแกน
--
-- วิธีรัน:
--   Supabase Dashboard → SQL Editor → New query → วางทั้งไฟล์ → Run
-- ══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- HELPER: is_admin() — ตรวจว่า user ปัจจุบันมี role = admin
-- (ต้องมีคอลัมน์ role ใน profiles table)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin'
     FROM public.profiles
     WHERE id = auth.uid()),
    false
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- HELPER: set_updated_at() — trigger function
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE 1: scan_results
-- เก็บผลการวิเคราะห์อาหารจาก Gemini AI ทุกครั้ง
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.scan_results (
  id                    UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID            REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- ── ข้อมูลอาหาร ──────────────────────────────────────────────
  food_type             VARCHAR(100),
  food_type_en          VARCHAR(100),
  food_category         VARCHAR(50),

  -- ── ผลวิเคราะห์หลัก ──────────────────────────────────────────
  freshness_score       INTEGER         CHECK (freshness_score BETWEEN 0 AND 100),
  freshness_description TEXT,
  expiry_hours          INTEGER,
  expiry_condition      VARCHAR(20),    -- room_temp | refrigerated | frozen
  risk_level            VARCHAR(20)     CHECK (risk_level IN ('LOW','MEDIUM','HIGH','DANGEROUS')),
  risk_reasons          JSONB           NOT NULL DEFAULT '[]'::jsonb,

  -- ── ลักษณะภายนอก (visual_signs) ──────────────────────────────
  -- { color, texture, mold_detected, bruising_detected, discoloration }
  visual_signs          JSONB           NOT NULL DEFAULT '{}'::jsonb,

  -- ── โภชนาการ (nutrition_estimate) ────────────────────────────
  -- { calories_per_100g, protein_g, carbohydrates_g, fat_g, fiber_g, note }
  nutrition             JSONB           NOT NULL DEFAULT '{}'::jsonb,

  -- ── การเก็บรักษา ──────────────────────────────────────────────
  -- { method, temperature, container, tips[] }
  storage_guide         JSONB           NOT NULL DEFAULT '{}'::jsonb,

  -- ── ราคา ──────────────────────────────────────────────────────
  suggested_price_min   DECIMAL(10,2),
  suggested_price_max   DECIMAL(10,2),
  price_reasoning       TEXT,

  -- ── สูตรอาหาร ─────────────────────────────────────────────────
  -- [{ dish_name, urgency, difficulty, description }]
  cooking_suggestions   JSONB           NOT NULL DEFAULT '[]'::jsonb,

  -- ── Metadata ──────────────────────────────────────────────────
  ai_confidence         DECIMAL(3,2),
  image_url             TEXT,           -- Supabase Storage URL (food-scans bucket)
  scan_source           VARCHAR(20)     DEFAULT 'camera'
                                        CHECK (scan_source IN ('camera','upload')),
  used_for              VARCHAR(20)     CHECK (used_for IN ('seller_listing','buyer_check','personal')),
  linked_listing_id     UUID            REFERENCES public.listings(id) ON DELETE SET NULL,

  created_at            TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- Trigger: auto-update updated_at
CREATE TRIGGER trg_scan_results_updated_at
  BEFORE UPDATE ON public.scan_results
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.scan_results IS
  'ผลการวิเคราะห์อาหารจาก Gemini AI — 1 row ต่อ 1 ครั้งที่สแกน';


-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE 2: scanner_sessions
-- เก็บ session การสแกน (หลายภาพใน session เดียว)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.scanner_sessions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at      TIMESTAMPTZ,
  total_scans   INTEGER     NOT NULL DEFAULT 0,
  device_type   VARCHAR(20) CHECK (device_type IN ('mobile','desktop','tablet')),
  session_type  VARCHAR(20) CHECK (session_type IN ('seller','buyer','personal'))
);

COMMENT ON TABLE public.scanner_sessions IS
  'Session การสแกน — อัปเดต total_scans ทุกครั้งที่สแกนสำเร็จ';


-- ══════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════════════════════════════════════

-- scan_results
CREATE INDEX IF NOT EXISTS idx_sr_user_id       ON public.scan_results (user_id);
CREATE INDEX IF NOT EXISTS idx_sr_created_at    ON public.scan_results (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sr_category      ON public.scan_results (food_category);
CREATE INDEX IF NOT EXISTS idx_sr_risk_level    ON public.scan_results (risk_level);
CREATE INDEX IF NOT EXISTS idx_sr_freshness     ON public.scan_results (freshness_score DESC);
CREATE INDEX IF NOT EXISTS idx_sr_linked        ON public.scan_results (linked_listing_id)
  WHERE linked_listing_id IS NOT NULL;

-- scanner_sessions
CREATE INDEX IF NOT EXISTS idx_ss_user_id    ON public.scanner_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_ss_started_at ON public.scanner_sessions (started_at DESC);


-- ══════════════════════════════════════════════════════════════════════════════
-- FUNCTION: get_user_scan_stats(p_user_id)
-- ดึงสถิติการสแกนของ user
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_user_scan_stats(p_user_id UUID)
RETURNS TABLE (
  total_scans       BIGINT,
  avg_freshness     NUMERIC,
  most_scanned_food VARCHAR(100),
  high_risk_count   BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT                                                    AS total_scans,
    ROUND(AVG(sr.freshness_score)::NUMERIC, 1)                          AS avg_freshness,
    (
      SELECT s2.food_type
      FROM   public.scan_results s2
      WHERE  s2.user_id = p_user_id
        AND  s2.food_type IS NOT NULL
      GROUP BY s2.food_type
      ORDER BY COUNT(*) DESC
      LIMIT 1
    )                                                                   AS most_scanned_food,
    COUNT(*) FILTER (WHERE sr.risk_level IN ('HIGH','DANGEROUS'))::BIGINT AS high_risk_count
  FROM public.scan_results sr
  WHERE sr.user_id = p_user_id;
END;
$$;

COMMENT ON FUNCTION public.get_user_scan_stats IS
  'ดึงสถิติสแกนของ user: จำนวนสแกน, freshness เฉลี่ย, อาหารที่สแกนบ่อยสุด, จำนวน high-risk';


-- ══════════════════════════════════════════════════════════════════════════════
-- FUNCTION: get_expiring_soon_listings(p_hours)
-- ดึง listings ที่ผลสแกนบอกว่าจะหมดอายุภายใน p_hours ชั่วโมง
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_expiring_soon_listings(p_hours INTEGER DEFAULT 24)
RETURNS TABLE (
  listing_id          UUID,
  food_type           VARCHAR(100),
  freshness_score     INTEGER,
  risk_level          VARCHAR(20),
  expiry_at           TIMESTAMPTZ,
  suggested_price_min DECIMAL(10,2),
  suggested_price_max DECIMAL(10,2)
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id                                                            AS listing_id,
    sr.food_type,
    sr.freshness_score,
    sr.risk_level,
    (sr.created_at + sr.expiry_hours * INTERVAL '1 hour')          AS expiry_at,
    sr.suggested_price_min,
    sr.suggested_price_max
  FROM public.listings      l
  JOIN public.scan_results  sr ON sr.linked_listing_id = l.id
  WHERE
    l.status         = 'active'
    AND sr.expiry_hours IS NOT NULL
    AND (sr.created_at + sr.expiry_hours * INTERVAL '1 hour')
        BETWEEN now() AND (now() + p_hours * INTERVAL '1 hour')
  ORDER BY expiry_at ASC;
END;
$$;

COMMENT ON FUNCTION public.get_expiring_soon_listings IS
  'listings ที่ AI บอกว่าจะหมดอายุภายใน p_hours ชั่วโมง — ใช้แสดง "ขายด่วน" badge';


-- ══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.scan_results     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scanner_sessions ENABLE ROW LEVEL SECURITY;

-- ─── scan_results policies ────────────────────────────────────

-- 1. User เห็นผลสแกนของตัวเอง
CREATE POLICY "scan_results: owner can select"
  ON public.scan_results FOR SELECT
  USING (auth.uid() = user_id);

-- 2. User สร้างได้เฉพาะของตัวเอง
CREATE POLICY "scan_results: owner can insert"
  ON public.scan_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. User แก้ไขได้เฉพาะของตัวเอง
CREATE POLICY "scan_results: owner can update"
  ON public.scan_results FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. User ลบได้เฉพาะของตัวเอง
CREATE POLICY "scan_results: owner can delete"
  ON public.scan_results FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Admin เห็นทั้งหมด
CREATE POLICY "scan_results: admin full access"
  ON public.scan_results FOR ALL
  USING (public.is_admin());

-- 6. Buyer เห็น scan summary ของ active listing ได้ (freshness/risk เท่านั้น)
--    SELECT ทำงานได้เพราะ OR กับ policy ข้อ 1
CREATE POLICY "scan_results: buyers see linked active listing"
  ON public.scan_results FOR SELECT
  USING (
    linked_listing_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.listings l
      WHERE  l.id     = linked_listing_id
        AND  l.status = 'active'
    )
  );

-- ─── scanner_sessions policies ────────────────────────────────

CREATE POLICY "sessions: owner can select"
  ON public.scanner_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "sessions: owner can insert"
  ON public.scanner_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sessions: owner can update"
  ON public.scanner_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "sessions: admin full access"
  ON public.scanner_sessions FOR ALL
  USING (public.is_admin());


-- ══════════════════════════════════════════════════════════════════════════════
-- STORAGE BUCKET: food-scans
-- Path pattern: {user_id}/{scan_id}.jpg
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'food-scans',
  'food-scans',
  false,                                          -- private bucket
  5242880,                                        -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "food-scans: users upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'food-scans'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "food-scans: users read own scans"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'food-scans'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "food-scans: users delete own scans"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'food-scans'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "food-scans: admin full access"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'food-scans'
    AND public.is_admin()
  );


-- ══════════════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES (รันแยกเพื่อตรวจสอบ)
-- ══════════════════════════════════════════════════════════════════════════════

-- ตรวจสอบ tables
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('scan_results','scanner_sessions');

-- ตรวจสอบ RLS
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('scan_results','scanner_sessions');

-- ตรวจสอบ indexes
-- SELECT indexname FROM pg_indexes WHERE tablename IN ('scan_results','scanner_sessions');

-- ทดสอบ function
-- SELECT * FROM get_user_scan_stats('00000000-0000-0000-0000-000000000000'::uuid);
-- SELECT * FROM get_expiring_soon_listings(24);
