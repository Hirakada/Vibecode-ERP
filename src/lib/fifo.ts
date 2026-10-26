import { InventoryCostLayer, SaleCostAllocation } from '../types';

export interface FifoAllocationResult {
  allocations: SaleCostAllocation[];
  updatedLayers: InventoryCostLayer[];
  totalCogs: number;
  isSufficient: boolean;
  shortage: number;
}

/**
 * First In, First Out (FIFO) layer allocation algorithm
 * Strictly consumes the oldest available cost layers first
 */
export function allocateFifoLayers(
  layers: InventoryCostLayer[],
  requiredQuantity: number,
  allowNegativeStock = false
): FifoAllocationResult {
  if (requiredQuantity <= 0) {
    return {
      allocations: [],
      updatedLayers: layers,
      totalCogs: 0,
      isSufficient: true,
      shortage: 0,
    };
  }

  // Clone layers to keep calculation pure
  const layerClones: InventoryCostLayer[] = layers.map((layer) => ({ ...layer }));

  // Sort strictly by receivedAt timestamp ascending; tie breaker by batchNumber or id
  const availableLayers = layerClones
    .filter((layer) => !layer.isDepleted && layer.remainingQuantity > 0)
    .sort((a, b) => {
      const timeDiff = new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime();
      if (timeDiff !== 0) return timeDiff;
      return a.batchNumber.localeCompare(b.batchNumber);
    });

  const totalAvailable = availableLayers.reduce((sum, l) => sum + l.remainingQuantity, 0);

  if (totalAvailable < requiredQuantity && !allowNegativeStock) {
    return {
      allocations: [],
      updatedLayers: layers,
      totalCogs: 0,
      isSufficient: false,
      shortage: requiredQuantity - totalAvailable,
    };
  }

  let remainingToConsume = requiredQuantity;
  const allocations: SaleCostAllocation[] = [];
  let totalCogs = 0;

  for (const layer of availableLayers) {
    if (remainingToConsume <= 0) break;

    const qtyToTake = Math.min(layer.remainingQuantity, remainingToConsume);
    const layerCost = qtyToTake * layer.unitCost;

    layer.remainingQuantity -= qtyToTake;
    if (layer.remainingQuantity <= 0.0001) {
      layer.remainingQuantity = 0;
      layer.isDepleted = true;
    }

    allocations.push({
      layerId: layer.id,
      ingredientId: layer.ingredientId,
      quantityConsumed: qtyToTake,
      unitCost: layer.unitCost,
      totalCost: Math.round(layerCost),
    });

    totalCogs += layerCost;
    remainingToConsume -= qtyToTake;
  }

  // Re-map back into the original layer order
  const updatedLayers = layerClones.map((orig) => {
    const updated = availableLayers.find((l) => l.id === orig.id);
    return updated || orig;
  });

  return {
    allocations,
    updatedLayers,
    totalCogs: Math.round(totalCogs),
    isSufficient: remainingToConsume <= 0.0001,
    shortage: Math.max(0, remainingToConsume),
  };
}

/**
 * Calculates current total inventory valuation from active FIFO layers
 */
export function calculateInventoryValuation(layers: InventoryCostLayer[]): number {
  return Math.round(
    layers.reduce((sum, layer) => {
      if (layer.isDepleted || layer.remainingQuantity <= 0) return sum;
      return sum + layer.remainingQuantity * layer.unitCost;
    }, 0)
  );
}

/**
 * Calculates theoretical cost of a recipe based on current available FIFO layers
 */
export function calculateTheoreticalRecipeCost(
  recipeItems: { ingredientId: string; quantity: number }[],
  allLayers: InventoryCostLayer[]
): number {
  let totalTheoreticalCost = 0;

  for (const item of recipeItems) {
    const ingredientLayers = allLayers
      .filter((l) => l.ingredientId === item.ingredientId && !l.isDepleted && l.remainingQuantity > 0)
      .sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());

    if (ingredientLayers.length === 0) continue;

    // Use current active layer's unit cost
    const currentLayer = ingredientLayers[0];
    totalTheoreticalCost += item.quantity * currentLayer.unitCost;
  }

  return Math.round(totalTheoreticalCost);
}
