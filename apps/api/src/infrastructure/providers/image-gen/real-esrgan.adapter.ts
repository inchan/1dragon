import type {
	ImageEnhancerInput,
	ImageEnhancerOutput,
	ImageEnhancerPort,
} from '@/domain/product/ports.js'

export class RealEsganUpscalerAdapter implements ImageEnhancerPort {
	public async removeNoise(input: ImageEnhancerInput): Promise<ImageEnhancerOutput> {
		return {
			imageUrl: input.imageUrl,
			hasTransparency: false,
		}
	}
}
