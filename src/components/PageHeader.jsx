import { NavLink } from 'react-router-dom'

// 画面切り替えボタンの一覧
const links = [
  { to: '/', label: 'ダッシュボード' },
  { to: '/members', label: 'メンバー登録/編集' },
  { to: '/projects', label: 'プロジェクト登録/編集' },
  { to: '/softwares', label: 'ソフト登録/編集' },
]

// 各画面の上部に表示する、タイトルと画面切り替えボタン
export default function PageHeader({ title }) {
  return (
    <header className="page-header">
      <h1>{title}</h1>
      <nav className="nav">
        {links.map((l) => (
          // 表示中の画面のボタンは active クラスで強調する（end：「/」が他の画面で強調されないように完全一致で判定）
          <NavLink key={l.to} to={l.to} end className={({ isActive }) => 'nav-btn' + (isActive ? ' active' : '')}>
            {l.label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
