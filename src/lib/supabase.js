// Supabaseに接続する「クライアント」を作るための関数を、ライブラリから読み込む
import { createClient } from '@supabase/supabase-js'

// 環境変数からSupabaseの接続情報を取得
// .env に書いた VITE_SUPABASE_URL（接続先のURL）を読み込む
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// .env に書いた VITE_SUPABASE_PUBLISHABLE_KEY（公開用のAPIキー）を読み込む
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// URLとキーでクライアントを作り、他のファイルから使えるように公開する（各画面はこれを通してデータを読み書きする）
export const supabase = createClient(supabaseUrl, supabaseKey)
