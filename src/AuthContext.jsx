// Reactの部品：共有の入れ物を作る(createContext)、共有値を取り出す(useContext)、画面表示時の処理(useEffect)、状態の保持(useState)
import { createContext, useContext, useEffect, useState } from 'react'
// Supabaseに接続するためのクライアント
import { supabase } from './lib/supabase'

// ログイン情報をアプリ全体で共有するための入れ物（初期値はnull）
const AuthContext = createContext(null)

// 配下の全画面にログイン情報を配る提供元（App.jsxで全体を包んで使う）
export function AuthProvider({ children }) {
  // ログインセッション（ログインしていなければnull）
  const [session, setSession] = useState(null)
  // セッションの確認中かどうか（確認が終わるまでtrue）
  const [loading, setLoading] = useState(true)

  // 画面が最初に表示されたときに1回だけ実行する
  useEffect(() => {
    // 初回表示時に現在のセッションを取得
    supabase.auth.getSession().then(({ data }) => {
      // 取得したセッション（未ログインならnull）を保存
      setSession(data.session)
      // 確認が終わったので「確認中」を解除
      setLoading(false)
    })

    // ログイン状態の変化を監視
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // ログイン・ログアウトのたびに、最新のセッションへ更新
      setSession(newSession)
    })

    // 画面が消えるときに、監視を解除する（後始末）
    return () => listener.subscription.unsubscribe()
  // [] は「最初の1回だけ実行する」という指定
  }, [])

  // 画面に表示する内容
  return (
    // セッション・ユーザー情報・確認中フラグを、配下の全画面に共有する（user は session の中のユーザー情報。なければnull）
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading }}>
      {/* 包まれている画面（App.jsxの中身）をそのまま表示する */}
      {children}
    </AuthContext.Provider>
  )
}

// 各画面からログイン情報を取り出すための便利関数（const { user } = useAuth() のように使う）
export const useAuth = () => useContext(AuthContext)
