// 表示中の画面かどうかを判定できるリンクの部品
import { NavLink } from 'react-router-dom'
// Supabaseに接続するためのクライアント（ログアウトに使う）
import { supabase } from '../lib/supabase'
// ログイン中のユーザー情報を取り出すための関数
import { useAuth } from '../AuthContext'

// 画面切り替えボタンの一覧
const links = [
  // to：移動先のURL、label：ボタンに表示する文字
  { to: '/', label: 'ダッシュボード' },
  { to: '/members', label: 'メンバー登録/編集' },
  { to: '/projects', label: 'プロジェクト登録/編集' },
  { to: '/softwares', label: 'ソフト登録/編集' },
  { to: '/tasks', label: 'タスク登録/編集' },
  { to: '/help', label: 'ヘルプ' },
]

// 各画面の上部に表示する、ログイン中のユーザー・ログアウトボタン、タイトルと画面切り替えボタン
// title：呼び出し側から渡される画面のタイトル
export default function PageHeader({ title }) {
  // ログイン中のユーザー
  const { user } = useAuth()

  // ログアウト処理（セッション破棄後、ProtectedRouteが自動でログイン画面へ遷移）
  const handleLogout = async () => {
    // Supabaseのログイン状態を破棄する
    await supabase.auth.signOut()
  }

  // 画面に表示する内容
  return (
    // <> </> は、複数の要素を余計な枠なしでまとめるための書き方
    <>
      {/* 右上のログイン情報エリア */}
      <div className="user-bar">
        {/* ログイン中のメールアドレス（user が空なら何も表示しない） */}
        <span className="user-email">{user?.email}</span>
        {/* 押すとログアウトする */}
        <button className="secondary" onClick={handleLogout}>ログアウト</button>
      </div>
      {/* タイトルと画面切り替えボタンのエリア */}
      <header className="page-header">
        {/* 画面のタイトル */}
        <h1>{title}</h1>
        {/* 画面切り替えボタンを並べるエリア */}
        <nav className="nav">
          {/* links の数だけボタンを作る */}
          {links.map((l) => (
            // 表示中の画面のボタンは active クラスで強調する（end：「/」が他の画面で強調されないように完全一致で判定）
            <NavLink key={l.to} to={l.to} end className={({ isActive }) => 'nav-btn' + (isActive ? ' active' : '')}>
              {/* ボタンの文字 */}
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>
    </>
  )
}
