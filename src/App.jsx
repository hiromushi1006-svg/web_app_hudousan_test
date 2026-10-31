// ルーティング用の部品：URL監視（BrowserRouter）、URLと画面の対応表（Routes/Route）、強制移動（Navigate）
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
// ログイン状態をアプリ全体で共有するための提供元
import { AuthProvider } from './AuthContext'
// 未ログインの人をログイン画面へ追い返す門番
import ProtectedRoute from './components/ProtectedRoute'
// ログイン済みの人をダッシュボードへ戻す門番（ログイン・会員登録画面用）
import PublicRoute from './components/PublicRoute'
// ログイン画面
import Login from './pages/Login'
// 会員登録画面
import Signup from './pages/Signup'
// ダッシュボード画面
import Dashboard from './pages/Dashboard'
// メンバー一覧画面
import Members from './pages/Members'
// プロジェクト一覧画面
import Projects from './pages/Projects'
// ソフト一覧画面
import Softwares from './pages/Softwares'
// タスク一覧画面
import Tasks from './pages/Tasks'
// ヘルプ画面
import Help from './pages/Help'

// URLと画面の対応（ログインが必要な画面と、ログイン前の画面に分ける。表示できるデータは自分が登録した分だけ）
export default function App() {
  // 画面に表示する内容
  return (
    // 配下のすべての画面でログイン状態を使えるようにする
    <AuthProvider>
      {/* URLの変化を監視して、表示する画面を切り替える */}
      <BrowserRouter>
        {/* URLに合う Route を1つだけ選んで表示する */}
        <Routes>
          {/* ログインが必要な画面（未ログインならログイン画面へ） */}
          {/* /：ダッシュボード */}
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          {/* /members：メンバー一覧 */}
          <Route path="/members" element={<ProtectedRoute><Members /></ProtectedRoute>} />
          {/* /projects：プロジェクト一覧 */}
          <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
          {/* /softwares：ソフト一覧 */}
          <Route path="/softwares" element={<ProtectedRoute><Softwares /></ProtectedRoute>} />
          {/* /tasks：タスク一覧 */}
          <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
          {/* /help：ヘルプ */}
          <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
          {/* ログイン前の画面（ログイン済みならダッシュボードへ） */}
          {/* /login：ログイン画面 */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          {/* /signup：会員登録画面 */}
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
          {/* 存在しないURLはダッシュボードへ */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
