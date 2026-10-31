// 1日分の列の幅と、今日の日付を求める関数
import { DAY_WIDTH, today } from '../lib/gantt'

// ガントチャートの見出し（目印の行と日付の行）：縦スクロールしても上部に固定
// days：表示する全日付、marks：日付（ミリ秒の数値）ごとの目印の文字（例：{ 開始日の数値: '★開始日' }）
export function GanttHeader({ days, marks = {} }) {
  // 今日の日付を数値（ミリ秒）にする（今日のマスを強調するため）
  const todayTime = today().getTime()
  // 画面に表示する内容
  return (
    // 見出し全体（CSSで上部に固定）
    <div className="g-head">
      {/* 1行目：開始日・納入日などの目印 */}
      <div className="g-row">
        {/* 左側のラベル列の上の空白 */}
        <div className="g-label-head" />
        {/* 日付ごとの目印を横に並べる */}
        <div className="g-days">
          {/* 表示する日付の数だけマスを作る */}
          {days.map((d) => (
            <div key={d.getTime()} className="g-mark" style={{ width: DAY_WIDTH }}>
              {/* この日に目印があれば表示する（なければ何も表示しない） */}
              {marks[d.getTime()] && <span>{marks[d.getTime()]}</span>}
            </div>
          ))}
        </div>
      </div>
      {/* 2行目：日付 */}
      <div className="g-row">
        {/* 左側のラベル列の上の空白 */}
        <div className="g-label-head" />
        {/* 日付を横に並べる */}
        <div className="g-days">
          {/* 表示する日付の数だけマスを作る（今日のマスは today クラスで強調） */}
          {days.map((d) => (
            <div key={d.getTime()} className={'g-day' + (d.getTime() === todayTime ? ' today' : '')} style={{ width: DAY_WIDTH }}>
              {/* 「10/24」の形式で表示（月は0から数えるため ＋1） */}
              {d.getMonth() + 1}/{d.getDate()}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// 予定・実績の1行分（ラベルとバー）。工程・フェーズの「予定行」「実績行」に使う
// label：「予定」「実績」の文字、style：バーの位置と幅、kind：バーの種類（plan：黄色、actual：オレンジ）、dayCount：表示する日数
export function PlanActualRow({ label, style, kind, dayCount }) {
  // 画面に表示する内容
  return (
    // 1行分の外枠（横並び）
    <div className="g-row">
      {/* 「予定」「実績」の文字 */}
      <div className="g-kind">{label}</div>
      {/* バーを描く行（幅は 日数 × 1日の幅） */}
      <div className="g-track" style={{ width: dayCount * DAY_WIDTH }}>
        {/* 位置が計算できたときだけバーを描く */}
        {style && <div className={'g-bar ' + kind} style={style} />}
      </div>
    </div>
  )
}

// 日付の列の背景（土日などの色分け）：行の後ろに敷く
// days：表示する全日付、columnClass：日付を受け取り、列に付けるクラス名（色分け用）を返す関数
export function GanttColumns({ days, columnClass }) {
  // 画面に表示する内容
  return (
    // 列を横に並べるエリア（CSSで、左のラベル列の右から敷く）
    <div className="g-columns">
      {/* 表示する日付の数だけ、縦長の列を作る */}
      {days.map((d) => (
        <div key={d.getTime()} className={'g-col ' + columnClass(d)} style={{ width: DAY_WIDTH }} />
      ))}
    </div>
  )
}
