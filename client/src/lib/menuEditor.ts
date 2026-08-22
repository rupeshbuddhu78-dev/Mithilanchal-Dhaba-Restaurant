export function toMenuSavePayload(input: { id?: number; categoryId: number; name: string; slug: string; description: string; pricePaise: number; imageUrl: string; isVegetarian: boolean; isFeatured: boolean; isAvailable: boolean; customisation: unknown }) {
  return { id: input.id, categoryId: input.categoryId, name: input.name, slug: input.slug, description: input.description || undefined, pricePaise: input.pricePaise, imageUrl: input.imageUrl || null, isVegetarian: input.isVegetarian, isFeatured: input.isFeatured, isAvailable: input.isAvailable, customisation: input.customisation };
}
