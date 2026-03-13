import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const ROOT = process.cwd()
const ARTIFACTS_DIR = path.join(ROOT, 'artifacts')

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const runId = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)
  const loopDir = path.join(ARTIFACTS_DIR, 'feedback-loop', runId)
  await mkdir(loopDir, { recursive: true })

  const imagePath = args.image ? path.resolve(args.image) : await pickLatest(ARTIFACTS_DIR, 'test-product-', '.png')
  if (!imagePath) throw new Error('이미지 파일을 찾지 못했습니다. --image로 경로를 전달해주세요.')

  const intent = args.intent ?? '테스트 영상의 목적과 메시지를 명확히 전달한다.'
  const headline = args.headline ?? '1Dragon TEST AD'
  const cta = args.cta ?? '지금 상품 영상 만들기'
  const iterations = Number(args.iterations ?? 3)

  const drawtextAvailable = canUseDrawtext()
  const candidates = []

  for (let i = 1; i <= iterations; i += 1) {
    const videoPath = path.join(loopDir, `candidate-${String(i).padStart(2, '0')}.mp4`)
    const validatePath = path.join(loopDir, `validation-${String(i).padStart(2, '0')}.json`)

    renderVideo({ imagePath, videoPath, headline, intent, cta, variant: i, drawtextAvailable })
    runNode(['tooling/validate-media.mjs', '--image', imagePath, '--video', videoPath, '--out', validatePath])

    const validateReport = JSON.parse(await readFile(validatePath, 'utf8'))
    const intentResult = evaluateIntent(videoPath, { headline, intent, cta, drawtextAvailable })

    const score = scoreCandidate(validateReport, intentResult)
    candidates.push({
      index: i,
      videoPath,
      validatePath,
      validateReport,
      intentResult,
      score,
      passed: validateReport.passed && intentResult.passed,
    })
  }

  candidates.sort((a, b) => b.score.total - a.score.total)
  const best = candidates[0]

  const summary = {
    runId,
    timestamp: new Date().toISOString(),
    input: { imagePath, intent, headline, cta, iterations, drawtextAvailable },
    best: {
      index: best.index,
      videoPath: best.videoPath,
      score: best.score,
      passed: best.passed,
    },
    candidates: candidates.map((c) => ({
      index: c.index,
      videoPath: c.videoPath,
      passed: c.passed,
      score: c.score,
      validationPassed: c.validateReport.passed,
      intentPassed: c.intentResult.passed,
      intentResult: c.intentResult,
    })),
    recommendations: buildRecommendations(best),
  }

  const summaryJsonPath = path.join(loopDir, 'loop-summary.json')
  const summaryMdPath = path.join(loopDir, 'loop-summary.md')
  await writeFile(summaryJsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
  await writeFile(summaryMdPath, toMarkdown(summary), 'utf8')

  await appendHistory(path.join(ARTIFACTS_DIR, 'feedback-loop', 'history.jsonl'), {
    runId,
    timestamp: summary.timestamp,
    best: summary.best,
    recommendations: summary.recommendations,
  })

  console.log(`Feedback loop 완료 | run=${runId} | best=candidate-${String(best.index).padStart(2, '0')} | passed=${best.passed}`)
  console.log(`best video: ${best.videoPath}`)
  console.log(`summary: ${summaryJsonPath}`)
}

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i += 1) {
    const k = argv[i]
    if (!k.startsWith('--')) throw new Error(`Unknown argument: ${k}`)
    const key = k.slice(2)
    const val = argv[i + 1]
    if (!val || val.startsWith('--')) throw new Error(`Missing value for ${k}`)
    args[key] = val
    i += 1
  }
  return args
}

async function pickLatest(dir, prefix, suffix) {
  let entries = []
  try {
    entries = await readdir(dir)
  } catch {
    return null
  }
  const matches = []
  for (const e of entries) {
    if (!e.startsWith(prefix) || !e.endsWith(suffix)) continue
    const p = path.join(dir, e)
    const s = await stat(p)
    matches.push({ p, m: s.mtimeMs })
  }
  matches.sort((a, b) => b.m - a.m)
  return matches[0]?.p ?? null
}

function renderVideo({ imagePath, videoPath, headline, intent, cta, variant, drawtextAvailable }) {
  const zoomSpeed = (0.0005 + variant * 0.0002).toFixed(4)
  const boxAlpha = Math.min(0.35 + variant * 0.05, 0.55).toFixed(2)
  const hue = variant * 6
  const vfParts = [
    `scale=1080:1920`,
    `zoompan=z='min(zoom+${zoomSpeed},1.15)':d=375:s=1080x1920`,
    `eq=saturation=1.0:contrast=1.02`,
    `hue=h=${hue}`,
    `drawbox=x=50:y=1320:w=980:h=520:color=black@${boxAlpha}:t=fill`,
    `drawbox=x=80:y=1700:w=920:h=8:color=#fbbf24@0.95:t=fill`,
  ]

  if (drawtextAvailable) {
    vfParts.push(`drawtext=text='${escapeText(headline)}':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=1390`)
    vfParts.push(`drawtext=text='${escapeText(intent)}':fontcolor=white:fontsize=34:x=(w-text_w)/2:y=1490`)
    vfParts.push(`drawtext=text='${escapeText(cta)}':fontcolor=#fbbf24:fontsize=44:x=(w-text_w)/2:y=1600`)
  }

  const vf = vfParts.join(',')

  run('ffmpeg', [
    '-y',
    '-loop', '1',
    '-i', imagePath,
    '-t', '15',
    '-vf', vf,
    '-r', '25',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-metadata', `title=${headline}`,
    '-metadata', `comment=${intent} | CTA:${cta}`,
    videoPath,
  ])
}

function evaluateIntent(videoPath, { headline, intent, cta, drawtextAvailable }) {
  const tagsResult = runCapture('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format_tags=title,comment',
    '-of', 'json',
    videoPath,
  ])
  let tags = {}
  try { tags = JSON.parse(tagsResult).format?.tags ?? {} } catch { tags = {} }

  const titleOk = (tags.title ?? '').includes(headline)
  const comment = tags.comment ?? ''
  const commentOk = comment.includes(intent) && comment.includes(cta)

  const motionResult = runCapture('ffmpeg', [
    '-i', videoPath,
    '-vf', 'signalstats,metadata=print',
    '-f', 'null',
    '-',
  ])
  const ydif = [...motionResult.matchAll(/lavfi\.signalstats\.YDIF=([\d.]+)/g)].map((m) => Number(m[1]))
  const avgYdif = ydif.length ? ydif.reduce((a, b) => a + b, 0) / ydif.length : 0
  const motionOk = avgYdif > 0.005

  const checks = { metadataTitle: titleOk, metadataIntentAndCta: commentOk, frameMotion: motionOk }
  if (drawtextAvailable) {
    checks.drawtextAvailable = true
  }
  const passed = checks.metadataTitle && checks.metadataIntentAndCta && checks.frameMotion

  return {
    passed,
    checks,
    metrics: { avgYdif, drawtextAvailable },
    tags,
  }
}

function scoreCandidate(validateReport, intentResult) {
  const technical = validateReport.passed ? 60 : 30
  const totalChecks = Object.keys(intentResult.checks).length
  const intent = (Object.values(intentResult.checks).filter(Boolean).length / totalChecks) * 40
  return { technical, intent, total: Math.round((technical + intent) * 100) / 100 }
}

function buildRecommendations(best) {
  const rec = []
  if (!best.validateReport.passed) rec.push('기술 규격 실패: 해상도/길이/fps 조건 먼저 맞추세요.')
  if (!best.intentResult.checks.metadataTitle) rec.push('메타데이터 title에 핵심 헤드라인을 반드시 넣으세요.')
  if (!best.intentResult.checks.metadataIntentAndCta) rec.push('메타데이터 comment에 intent+CTA를 함께 저장하세요.')
  if (!best.intentResult.metrics.drawtextAvailable) rec.push('현재 ffmpeg 빌드에 drawtext 필터가 없습니다. 텍스트 오버레이가 필요하면 ffmpeg(freetype 포함)로 재설치하세요.')
  if (!best.intentResult.checks.frameMotion) rec.push('영상 변화량이 낮습니다. zoom/hue/transition 강도를 높이세요.')
  if (rec.length === 0) rec.push('현재 설정 양호. 다음은 실제 상품 카피 A/B 버전 3개로 확장하세요.')
  return rec
}

function toMarkdown(summary) {
  const lines = []
  lines.push(`# Media Feedback Loop Report (${summary.runId})`)
  lines.push('')
  lines.push(`- image: ${summary.input.imagePath}`)
  lines.push(`- intent: ${summary.input.intent}`)
  lines.push(`- headline: ${summary.input.headline}`)
  lines.push(`- cta: ${summary.input.cta}`)
  lines.push('')
  lines.push('## Best Candidate')
  lines.push(`- video: ${summary.best.videoPath}`)
  lines.push(`- passed: ${summary.best.passed}`)
  lines.push(`- score: ${summary.best.score.total}`)
  lines.push('')
  lines.push('## Candidates')
  for (const c of summary.candidates) {
    lines.push(`- #${c.index}: passed=${c.passed}, score=${c.score.total}, validation=${c.validationPassed}, intent=${c.intentPassed}`)
  }
  lines.push('')
  lines.push('## Recommendations')
  for (const r of summary.recommendations) lines.push(`- ${r}`)
  lines.push('')
  return `${lines.join('\n')}\n`
}

function canUseDrawtext() {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-filters'], { encoding: 'utf8' })
  if (result.status !== 0) return false
  return `${result.stdout}${result.stderr}`.includes('drawtext')
}

async function appendHistory(filePath, entry) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(entry)}\n`, { flag: 'a' })
}

function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`${cmd} failed with status ${result.status}`)
}

function runNode(args) {
  run('node', args)
}

function runCapture(cmd, args) {
  const result = spawnSync(cmd, args, { encoding: 'utf8' })
  if (result.status !== 0) {
    const err = result.stderr || result.stdout || `${cmd} failed`
    throw new Error(err)
  }
  return `${result.stdout}${result.stderr}`
}

function escapeText(value) {
  return String(value).replace(/[:\\']/g, '\\$&')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
