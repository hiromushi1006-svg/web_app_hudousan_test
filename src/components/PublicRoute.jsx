// 指定のURLへ強制的に移動させるための部品
import { Navigate } from 'react-router-dom'
// ログイン情報を取り出すための関数
import { useAuth } from '../AuthContext'

// ログイン済みの場合はダッシュボードへリダイレクト
// children には、この門番で包まれた画面（例：ログイン画面・会員登録画面）が入る
export default function PublicRoute({ children }) {
  // ログインセッションと、確認中かどうかを取得
  const { session, loading } = useAuth()

  // ログイン確認中は、判定せずに「読み込み中」を表示
  if (loading) return <p className="center">読み込み中...</p>
  // ログイン済みならダッシュボード（/）へ移動（replace：履歴に残さない）
  if (session) return <Navigate to="/" replace />

  // 未ログインなら、包まれている画面をそのまま表示する
  return children
}
