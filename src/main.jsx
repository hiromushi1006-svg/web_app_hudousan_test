// 開発中の不具合を見つけやすくするための特別モード（StrictMode）
import { StrictMode } from 'react'
// ReactをHTMLの特定の場所に描画するための関数
import { createRoot } from 'react-dom/client'
// アプリ全体の土台となるコンポーネント
import App from './App'
// アプリ全体に適用するスタイル
import './index.css'

// index.htmlの <div id="root"> を探し、そこにReactアプリを描画する
createRoot(document.getElementById('root')).render(
  // 開発時のみ、副作用の二重実行などで問題を検出する（本番では何もしない）
  <StrictMode>
    {/* アプリ本体を表示する */}
    <App />
  </StrictMode>,
)
