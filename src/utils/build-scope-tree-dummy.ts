export async function buildScopeTreeDummy(code: string, uuid?: string): Promise<any> {
  const hierarchy: any = {};

  try {
    const mockEntityMap: { [key: string]: string } = {
      "partner-2iam": "PartnerTable",
      "client-3iam": "CustomerTable",
      "module-4iam": "ModuleTable",
      "exchange-4iam": "ExchangeTable",
      "subscription-module-5iam": "SubscriptionTable",
      "subscription-exchange-5iam": "SubscriptionTable",
    };

    const Entity = mockEntityMap[code];
    const startingEntity = uuid ? { uuid } : null;

    if (!code || code === "global" || !Entity || !startingEntity) {
      hierarchy["global"] = { partners: {} };

      const mockPartners = [
        { uuid: "partner1" },
        { uuid: "partner2" },
      ];

      for (const partner of mockPartners) {
        const partnerUuid = partner.uuid;
        hierarchy["global"].partners[partnerUuid] = { clients: {} };

        const mockClients = [
          { uuid: "client1", partnerUuid },
          { uuid: "client2", partnerUuid },
        ];

        for (const client of mockClients) {
          const clientUuid = client.uuid;
          hierarchy["global"].partners[partnerUuid].clients[clientUuid] = {
            modules: ["module1", "module2"],
            exchanges: ["exchange1", "exchange2"],
            subscriptions: ["subscription1", "subscription2"],
          };
        }
      }

      return hierarchy;
    }

    if (code.startsWith("partner")) {
      const partnerUuid = startingEntity.uuid;
      hierarchy[partnerUuid] = { clients: {} };

      const mockClients = [
        { uuid: "client1", partnerUuid },
        { uuid: "client2", partnerUuid },
      ];

      for (const client of mockClients) {
        const clientUuid = client.uuid;
        hierarchy[partnerUuid].clients[clientUuid] = {
          modules: ["module1", "module2"],
          exchanges: ["exchange1", "exchange2"],
          subscriptions: ["subscription1", "subscription2"],
        };
      }
    } else if (code.startsWith("client")) {
      const clientUuid = startingEntity.uuid;
      hierarchy[clientUuid] = {
        modules: ["module1", "module2"],
        exchanges: ["exchange1", "exchange2"],
        subscriptions: ["subscription1", "subscription2"],
      };
    }
  } catch (e) {
    return;
  }

  return hierarchy;
}
