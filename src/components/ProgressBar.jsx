// 進捗率・負荷を表す横棒（value：％、100％を超えた分は棒を満タンにして警告色にする）
// warnOver100：true のとき、100％超えを警告色にする（指定しなければ false）
export default function ProgressBar({ value, warnOver100 = false }) {
  // 警告色にするかどうか（警告ありの指定で、かつ100％を超えているとき）
  const over = warnOver100 && value > 100
  // 画面に表示する内容
  return (
    // 棒の土台（灰色の部分）
    <div className="progress">
      {/* 棒の中身：幅を value％にする（0未満は0、100超は100に収める）。警告時は over クラスで赤くする */}
      <div className={'progress-fill' + (over ? ' over' : '')} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}
