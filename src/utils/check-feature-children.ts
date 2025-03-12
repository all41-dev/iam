import { FeatureCompositionTable } from "../db/feature-composition-table";

export async function checkFeatureChildren(featureUuid: string): Promise<string[]> {
  const childrenSet = new Set<string>();

  async function traverse(currentUuid: string): Promise<void> {
    const compositions = await FeatureCompositionTable.findAll({
      where: { parent_uuid: currentUuid },
    });

    for (const composition of compositions) {
      const childUuid = composition.child_uuid;
      if (!childrenSet.has(childUuid)) {
        childrenSet.add(childUuid);
        await traverse(childUuid);
      }
    }
  }

  await traverse(featureUuid);
  return Array.from(childrenSet);
}
