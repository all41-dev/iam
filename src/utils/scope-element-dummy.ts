interface EntityDetails {
  uuid: string | undefined;
  name: string | undefined;
}

interface ClientDetails extends EntityDetails {
  module: EntityDetails[];
  exchange: EntityDetails[];
  subscription: EntityDetails[];
}

interface PartnerDetails extends EntityDetails {
  customer: ClientDetails[];
}

interface DummyHierarchy {
  uuid: string;
  name: string;
  partner: PartnerDetails[];
}

const mockData: { [key: string]: { [uuid: string]: string[] } } = {
  "partner-2iam": {
    "2533b4d3-39d6-49bc-8f3a-207ba30b341a": ["2533b4d3-39d6-49bc-8f3a-207ba30b341a", "00000000-0000-0000-0000-000000000000"],
    "e687c796-8958-49fd-9db2-fba0eb130e2c": ["e687c796-8958-49fd-9db2-fba0eb130e2c", "00000000-0000-0000-0000-000000000000"],
  },
  "client-3iam": {
    "3d420db4-9d2c-4f06-898e-9c650457caf1": ["3d420db4-9d2c-4f06-898e-9c650457caf1", "2533b4d3-39d6-49bc-8f3a-207ba30b341a", "00000000-0000-0000-0000-000000000000"],
    "9e486e79-a184-49b1-bbe6-deb658b8d4eb": ["9e486e79-a184-49b1-bbe6-deb658b8d4eb", "2533b4d3-39d6-49bc-8f3a-207ba30b341a", "00000000-0000-0000-0000-000000000000"],
    "e5ba4640-4686-4ba4-b75c-a818f533abec": ["e5ba4640-4686-4ba4-b75c-a818f533abec", "2533b4d3-39d6-49bc-8f3a-207ba30b341a", "00000000-0000-0000-0000-000000000000"],
    "5d256ad1-9120-4ba7-98cb-49471add0997": ["5d256ad1-9120-4ba7-98cb-49471add0997", "e687c796-8958-49fd-9db2-fba0eb130e2c", "00000000-0000-0000-0000-000000000000"],
    "5b904b89-01c1-4a31-b3f0-c526ce63f231": ["5b904b89-01c1-4a31-b3f0-c526ce63f231", "e687c796-8958-49fd-9db2-fba0eb130e2c", "00000000-0000-0000-0000-000000000000"],
    "5257c750-e1da-4217-8327-82bd385d4071": ["5257c750-e1da-4217-8327-82bd385d4071", "e687c796-8958-49fd-9db2-fba0eb130e2c", "00000000-0000-0000-0000-000000000000"],
  },
};

export async function scopeHierarchy(uuid: string | undefined, code: string | undefined): Promise<{ [key: string]: string }> {
  if (!code || !uuid) {
    return { "global-1iam": "00000000-0000-0000-0000-000000000000" };
  }

  const entityMap = mockData[code];
  if (!entityMap) {
    return { "global-1iam": "00000000-0000-0000-0000-000000000000" };
  }

  const startingEntity = entityMap[uuid];
  if (!startingEntity) {
    return { "global-1iam": "00000000-0000-0000-0000-000000000000" };
  }

  const hierarchy: { [key: string]: string } = { [code]: startingEntity[0] };

  if (code === "client-3iam") {
    const partnerUuid = startingEntity[1];
    const partnerEntity = mockData["partner-2iam"][partnerUuid];
    if (partnerEntity) {
      hierarchy["partner-2iam"] = partnerEntity[0];
    }
  }

  hierarchy["global-1iam"] = "00000000-0000-0000-0000-000000000000";

  return hierarchy;
}



const dummyHierarchy = {
  uuid: "00000000-0000-0000-0000-000000000000",
  name: "global",
  partner: [
    {
      uuid: "2533b4d3-39d6-49bc-8f3a-207ba30b341a",
      name: "Harps",
      customer: [
        {
          uuid: "3d420db4-9d2c-4f06-898e-9c650457caf1",
          name: "Gravières d'Epeisses SA",
          module: [],
          exchange: [],
          subscription: []
        },
        {
          uuid: "9e486e79-a184-49b1-bbe6-deb658b8d4eb",
          name: "Logifleet SA",
          module: [],
          exchange: [],
          subscription: []
        },
        {
          uuid: "e5ba4640-4686-4ba4-b75c-a818f533abec",
          name: "Securitas SA (python sécurité)",
          module: [],
          exchange: [],
          subscription: []
        }
      ]
    },
    {
      uuid: "e687c796-8958-49fd-9db2-fba0eb130e2c",
      name: "Arc Logiciels",
      customer: [
        {
          uuid: "5d256ad1-9120-4ba7-98cb-49471add0997",
          name: "Phida Management SA",
          module: [],
          exchange: [],
          subscription: []
        },
        {
          uuid: "5b904b89-01c1-4a31-b3f0-c526ce63f231",
          name: "Jaquier Services SA",
          module: [],
          exchange: [],
          subscription: []
        },
        {
          uuid: "5257c750-e1da-4217-8327-82bd385d4071",
          name: "Charles Gasser SA",
          module: [],
          exchange: [],
          subscription: []
        }
      ]
    }
  ]
};

export async function scopeElementHierarchy(code: string, uuid?: string) {
  if (!code || code === "global-1iam") {
    return [dummyHierarchy];
  }

  if (code.startsWith("partner")) {
    if (uuid) {
      return [dummyHierarchy.partner.find(p => p.uuid === uuid)];
    }
    return dummyHierarchy.partner;
  } else if (code.startsWith("client")) {
    if (uuid) {
      for (const partner of dummyHierarchy.partner) {
        const client = partner.customer.find(c => c.uuid === uuid);
        if (client) {
          return [client];
        }
      }
      return [];
    } else {
      return dummyHierarchy.partner.flatMap(partner => partner.customer);
    }
  }

  return [];
}

