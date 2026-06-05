import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── Auth helpers ──────────────────────────────────────────────
export const authService = {
  signUp: (email, password, metadata) =>
    supabase.auth.signUp({ email, password, options: { data: metadata } }),

  signIn: (email, password) =>
    supabase.auth.signInWithPassword({ email, password }),

  signOut: () => supabase.auth.signOut(),

  getSession: () => supabase.auth.getSession(),

  onAuthChange: (cb) => supabase.auth.onAuthStateChange(cb),
}

// ── Product helpers ───────────────────────────────────────────
export const productService = {
  getAll: (filters = {}) => {
    let query = supabase
      .from('products')
      .select('*, profiles(full_name, avatar_url)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (filters.category) query = query.eq('category', filters.category)
    if (filters.maxPrice) query = query.lte('price', filters.maxPrice)
    if (filters.riskLevel) query = query.eq('risk_level', filters.riskLevel)
    return query
  },

  getById: (id) =>
    supabase
      .from('products')
      .select('*, profiles(full_name, avatar_url, phone)')
      .eq('id', id)
      .single(),

  create: (data) => supabase.from('products').insert(data).select().single(),

  update: (id, data) =>
    supabase.from('products').update(data).eq('id', id).select().single(),

  delete: (id) => supabase.from('products').delete().eq('id', id),

  uploadImage: async (file, userId) => {
    const ext = file.name.split('.').pop()
    const path = `${userId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('product-images').upload(path, file)
    if (error) throw error
    const { data } = supabase.storage.from('product-images').getPublicUrl(path)
    return data.publicUrl
  },

  uploadBase64: async (base64, userId) => {
    const blob = await fetch(base64).then((r) => r.blob())
    const path = `${userId}/scan_${Date.now()}.jpg`
    const { error } = await supabase.storage.from('product-images').upload(path, blob, {
      contentType: 'image/jpeg',
    })
    if (error) throw error
    const { data } = supabase.storage.from('product-images').getPublicUrl(path)
    return data.publicUrl
  },
}

// ── Scan history helpers ──────────────────────────────────────
export const scanService = {
  save: (scanData) => supabase.from('scan_history').insert(scanData),

  getHistory: (userId) =>
    supabase
      .from('scan_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
}

// ── Order helpers ─────────────────────────────────────────────
export const orderService = {
  create: (data) => supabase.from('orders').insert(data).select().single(),

  getByBuyer: (userId) =>
    supabase
      .from('orders')
      .select('*, products(*)')
      .eq('buyer_id', userId)
      .order('created_at', { ascending: false }),

  getBySeller: (userId) =>
    supabase
      .from('orders')
      .select('*, products(*), profiles!buyer_id(full_name)')
      .eq('seller_id', userId)
      .order('created_at', { ascending: false }),
}
