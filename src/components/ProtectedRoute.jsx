// 指定のURLへ強制的に移動させるための部品
import { Navigate } from 'react-router-dom'
// ログイン情報を取り出すための関数
import { useAuth } from '../AuthContext'

// 未ログインの場合はログイン画面へリダイレクト
// children には、この門番で包まれた画面（例：ダッシュボード）が入る
export default function ProtectedRoute({ children }) {
  // ログインセッションと、確認中かどうかを取得
  const { session, loading } = useAuth()

  // ログイン確認中は、判定せずに「読み込み中」を表示（再読み込み直後に誤ってログイン画面へ飛ばないようにする）
  if (loading) return <p className="center">読み込み中...</p>
  // 未ログインならログイン画面へ移動（replace：履歴に残さないので、戻るボタンで戻ってこない）
  if (!session) return <Navigate to="/login" replace />

  // ログイン済みなら、包まれている画面をそのまま表示する
  return children
}
