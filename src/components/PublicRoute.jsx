import { Navigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

// ログイン済みの場合は物件一覧へリダイレクト
export default function PublicRoute({ children }) {
  const { session, loading } = useAuth()

  if (loading) return <p className="center">読み込み中...</p>
  if (session) return <Navigate to="/" replace />

  return children
}
