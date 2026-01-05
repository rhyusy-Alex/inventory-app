import { createClient } from '@supabase/supabase-js'

// .env.local에 있는 주소와 키를 가져옵니다.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Supabase와 연결된 '클라이언트'를 만들어서 내보냅니다.
export const supabase = createClient(supabaseUrl, supabaseKey)