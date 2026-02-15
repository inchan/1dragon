import { createHash } from 'node:crypto'
import type { ComposeClipInput, ComposeClipOutput, ComposerPort } from '@/domain/media/ports.js'
import { createChildLogger } from '@/infrastructure/logging/logger.js'

const DEFAULT_RESOLUTION = {
	width: 1080,
	height: 1920,
}

export const WATERMARK_POSITION_EXPRESSION = 'x=W-tw-40:y=H-th-60'

function estimateDuration(input: ComposeClipInput): number {
	const clipCount = input.backgroundClipUrls.length
	if (clipCount <= 2) {
		return 15
	}

	return 30
}

function buildMockUrl(seed: string): string {
	const digest = createHash('sha256').update(seed).digest('hex').slice(0, 16)
	return `https://cdn.snapvid.ai/rendered/${digest}.mp4`
}

function buildFilterGraph(input: ComposeClipInput): string {
	const layers: string[] = []

	layers.push('[0:v]scale=1080:1920[base]')
	layers.push('[1:v]format=rgba[foreground]')
	layers.push('[base][foreground]overlay=(W-w)/2:(H-h)/2[composed]')

	if (input.subtitleFileUrl) {
		layers.push('[composed]subtitles=subtitles.srt[with_subtitles]')
	}

	if (input.watermarkEnabled) {
		const source = input.subtitleFileUrl ? '[with_subtitles]' : '[composed]'
		layers.push(
			`${source}drawtext=text='SnapVid':${WATERMARK_POSITION_EXPRESSION}:fontsize=28[with_watermark]`,
		)
	}

	return layers.join(';')
}

export class FFmpegComposer implements ComposerPort {
	private readonly logger = createChildLogger({ provider: 'FFMPEG_COMPOSER' })

	public async compose(input: ComposeClipInput): Promise<ComposeClipOutput> {
		if (input.backgroundClipUrls.length === 0) {
			throw new Error('At least one background clip is required')
		}

		const filterGraph = buildFilterGraph(input)
		const durationSec = estimateDuration(input)
		const outputUrl = buildMockUrl(
			`${input.foregroundImageUrl}|${input.backgroundClipUrls.join(',')}|${filterGraph}|${durationSec}`,
		)

		this.logger.info(
			{
				durationSec,
				layerCount: input.backgroundClipUrls.length,
				watermarkEnabled: input.watermarkEnabled,
			},
			'ffmpeg composition command planned',
		)

		return {
			masterVideoUrl: outputUrl,
			durationSec,
			width: DEFAULT_RESOLUTION.width,
			height: DEFAULT_RESOLUTION.height,
		}
	}

	public async renderVariant(input: {
		readonly masterVideoUrl: string
		readonly platform: 'TIKTOK' | 'YOUTUBE_SHORTS' | 'INSTAGRAM_REELS'
	}): Promise<{ variantUrl: string }> {
		return {
			variantUrl: buildMockUrl(`${input.masterVideoUrl}|${input.platform}|variant`),
		}
	}
}
