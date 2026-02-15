import type { ImageGeneratorInput, ImageGeneratorOutput, ImageGeneratorPort } from '@/domain/product/ports.js'

export class GeminiImagenAdapter implements ImageGeneratorPort {
	public async generate(input: ImageGeneratorInput): Promise<ImageGeneratorOutput> {
		return {
			imageUrl: input.imageUrl,
		}
	}
}
