import type { Platform } from '@1dragon/shared'

type PlatformVariantConfig = {
	resolution: string
	bitrateKbps: number
	safeZone: {
		top: number
		bottom: number
		left: number
		right: number
	}
	subtitleAnchor: 'BOTTOM_CENTER' | 'CENTER'
}

const DEFAULT_CONFIGS: Record<Platform, PlatformVariantConfig> = {
	TIKTOK: {
		resolution: '1080x1920',
		bitrateKbps: 8000,
		safeZone: { top: 240, bottom: 320, left: 80, right: 80 },
		subtitleAnchor: 'BOTTOM_CENTER',
	},
	YOUTUBE_SHORTS: {
		resolution: '1080x1920',
		bitrateKbps: 9000,
		safeZone: { top: 220, bottom: 260, left: 72, right: 72 },
		subtitleAnchor: 'BOTTOM_CENTER',
	},
	INSTAGRAM_REELS: {
		resolution: '1080x1920',
		bitrateKbps: 8500,
		safeZone: { top: 250, bottom: 330, left: 90, right: 90 },
		subtitleAnchor: 'BOTTOM_CENTER',
	},
}

export class PlatformVariantRenderer {
	public constructor(private readonly platformConfigs: Record<Platform, PlatformVariantConfig> = DEFAULT_CONFIGS) {}

	public getConfig(platform: Platform): PlatformVariantConfig {
		return this.platformConfigs[platform]
	}

	public buildRenderPlan(input: {
		readonly platform: Platform
		readonly masterVideoUrl: string
		readonly subtitleEnabled: boolean
		readonly watermarkEnabled: boolean
	}): {
		readonly outputFileName: string
		readonly ffmpegArgs: string[]
		readonly safeZone: PlatformVariantConfig['safeZone']
	} {
		const config = this.getConfig(input.platform)
		const baseName = input.platform.toLowerCase()
		const outputFileName = `${baseName}-${Date.now()}.mp4`

		const ffmpegArgs = [
			'-i',
			input.masterVideoUrl,
			'-vf',
			`scale=${config.resolution}:force_original_aspect_ratio=decrease`,
			'-b:v',
			`${config.bitrateKbps}k`,
		]

		if (input.subtitleEnabled) {
			ffmpegArgs.push('-metadata', `subtitle_anchor=${config.subtitleAnchor}`)
		}

		if (input.watermarkEnabled) {
			ffmpegArgs.push('-metadata', 'watermark=on')
		}

		ffmpegArgs.push(outputFileName)

		return {
			outputFileName,
			ffmpegArgs,
			safeZone: config.safeZone,
		}
	}
}
