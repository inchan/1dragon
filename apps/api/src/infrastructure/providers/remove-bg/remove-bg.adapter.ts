import type { RemoveBgInput, RemoveBgOutput, RemoveBgPort } from '@/domain/product/ports.js'

export class RemoveBgAdapter implements RemoveBgPort {
	public async removeBackground(input: RemoveBgInput): Promise<RemoveBgOutput> {
		return {
			imageUrl: input.imageUrl,
			transparentBackground: false,
		}
	}
}
