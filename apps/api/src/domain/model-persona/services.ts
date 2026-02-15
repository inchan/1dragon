import { ProductCategory, type ProductCategory as ProductCategoryType } from '@snapvid/shared'

const MODEL_ELIGIBLE_CATEGORIES = new Set<ProductCategoryType>([
	ProductCategory.FASHION,
	ProductCategory.ACCESSORIES,
	ProductCategory.BEAUTY,
])

export class PersonaCategoryMatcher {
	public isModelEligible(category: ProductCategoryType): boolean {
		return MODEL_ELIGIBLE_CATEGORIES.has(category)
	}

	public resolveCategory(input: {
		readonly detectedCategory: ProductCategoryType
		readonly overriddenCategory?: ProductCategoryType
	}): ProductCategoryType {
		return input.overriddenCategory ?? input.detectedCategory
	}

	public shouldShowModelSelector(input: {
		readonly detectedCategory: ProductCategoryType
		readonly overriddenCategory?: ProductCategoryType
	}): boolean {
		const finalCategory = this.resolveCategory(input)
		return this.isModelEligible(finalCategory)
	}
}
