import { getMayaKinReading } from '../../lib/mayaKinReadings';

export default function MayaKinBasicReading({ kin }: { kin: number }) {
  const reading = getMayaKinReading(kin);
  return <section className="rounded-2xl border border-cyan-400/25 bg-slate-950/60 p-5 sm:p-6" aria-labelledby="maya-kin-basic-heading">
    <h4 id="maya-kin-basic-heading" className="text-xl font-semibold text-cyan-100">KIN {kin} 基本解盤</h4>
    <dl className="mt-4 grid gap-4 sm:grid-cols-2">
      <div><dt className="text-sm text-slate-300">核心圖騰</dt><dd className="mt-1 text-lg font-medium text-white">{reading.coreTotem}</dd></div>
      <div><dt className="text-sm text-slate-300">銀河音調</dt><dd className="mt-1 text-lg font-medium text-white">第 {reading.toneNumber} 調・{reading.galacticTone}</dd></div>
    </dl>
    <h5 className="mt-5 font-semibold text-cyan-100">基本特質總結</h5>
    <p className="mt-2 max-w-prose text-base leading-8 text-slate-100">{reading.summary}</p>
    <p className="mt-4 text-sm leading-6 text-slate-300">字數統計：{reading.characterCount} 字（總結正文，不含標點與空白；規範 120～150 字）</p>
    <p className="mt-2 text-sm leading-6 text-slate-300">以 Dreamspell 圖騰與音調作為自我探索提示，不代表固定人格或必然命運。</p>
  </section>;
}
