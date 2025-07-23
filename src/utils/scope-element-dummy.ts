const mockData: { [key: string]: { [uuid: string]: string[] } } = {
  "partner-2iam": {
    "2533b4d3-39d6-49bc-8f3a-207ba30b341a": ["2533b4d3-39d6-49bc-8f3a-207ba30b341a", "00000000-0000-0000-0000-000000000000"],
    "e687c796-8958-49fd-9db2-fba0eb130e2c": ["e687c796-8958-49fd-9db2-fba0eb130e2c", "00000000-0000-0000-0000-000000000000"],
  },
  "customer-3iam": {
    "3d420db4-9d2c-4f06-898e-9c650457caf1": ["3d420db4-9d2c-4f06-898e-9c650457caf1", "2533b4d3-39d6-49bc-8f3a-207ba30b341a", "00000000-0000-0000-0000-000000000000"],
    "9e486e79-a184-49b1-bbe6-deb658b8d4eb": ["9e486e79-a184-49b1-bbe6-deb658b8d4eb", "2533b4d3-39d6-49bc-8f3a-207ba30b341a", "00000000-0000-0000-0000-000000000000"],
    "e5ba4640-4686-4ba4-b75c-a818f533abec": ["e5ba4640-4686-4ba4-b75c-a818f533abec", "2533b4d3-39d6-49bc-8f3a-207ba30b341a", "00000000-0000-0000-0000-000000000000"],
    "5d256ad1-9120-4ba7-98cb-49471add0997": ["5d256ad1-9120-4ba7-98cb-49471add0997", "e687c796-8958-49fd-9db2-fba0eb130e2c", "00000000-0000-0000-0000-000000000000"],
    "5b904b89-01c1-4a31-b3f0-c526ce63f231": ["5b904b89-01c1-4a31-b3f0-c526ce63f231", "e687c796-8958-49fd-9db2-fba0eb130e2c", "00000000-0000-0000-0000-000000000000"],
    "5257c750-e1da-4217-8327-82bd385d4071": ["5257c750-e1da-4217-8327-82bd385d4071", "e687c796-8958-49fd-9db2-fba0eb130e2c", "00000000-0000-0000-0000-000000000000"],
  },
};

export async function scopeElementAncestor(uuid: string | undefined, code: string | undefined): Promise<string[]> {
  if (!code || !uuid) {
    return ["00000000-0000-0000-0000-000000000000"];
  }

  const entityMap = mockData[code];
  if (!entityMap) {
    return ["00000000-0000-0000-0000-000000000000"];
  }

  const startingEntity = entityMap[uuid];
  if (!startingEntity) {
    return ["00000000-0000-0000-0000-000000000000"];
  }

  const hierarchy = [...startingEntity];

  return hierarchy;
}




export const dummyHierarchy = {
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
          module: [
            {
              "uuid": "2acfbf00-4554-444e-9ad0-b085fff6d35c",
              "name": "A3"
            },
            {
              "uuid": "ab02e578-3080-455b-bcc3-c3c28a9c8c88",
              "name": "M-Files"
            }
          ],
          exchange: [
            {
              "uuid": "40181e13-ed99-4954-a480-2be282aeaccd",
              "name": "Facture fournisseur"
            },
            {
              "uuid": "5444b5ed-77e3-433d-b3b4-d464b961dba2",
              "name": "Mandant"
            },
            {
              "uuid": "80ca8f95-e55f-4024-b97a-9971d0c067e3",
              "name": "Fournisseur"
            },
            {
              "uuid": "89771b87-43fa-4d89-a5c7-21492bbd541a",
              "name": "Moyen de paiement"
            },
            {
              "uuid": "91f85b93-79e9-400b-8517-8b1a4f8ea752",
              "name": "Code TVA"
            },
            {
              "uuid": "de1fbade-83dd-43e7-a021-ab092197b7de",
              "name": "Compte"
            },
            {
              "uuid": "f1b5318d-27ae-4cc1-bb5d-aa93a232fb79",
              "name": "CDC"
            }
          ],
          subscription: [
            {
              "uuid": "00af9c3c-6238-493a-92f4-60ba3b39f287",
              "name": "M-Files - Facture fournisseur"
            },
            {
              "uuid": "091dae05-86ae-4d7f-b1b1-38b396e532f2",
              "name": "A3 - Mandant"
            },
            {
              "uuid": "1e232afa-bd51-4992-8408-527a9f9856fc",
              "name": "M-Files - Code TVA"
            },
            {
              "uuid": "206d0084-5007-4ed3-b67f-a58cde5bf4ff",
              "name": "M-Files - Fournisseur"
            },
            {
              "uuid": "415d9625-8467-49ab-acc8-b0752775ddee",
              "name": "M-Files - Mandant"
            },
            {
              "uuid": "41725a8e-7b66-4115-acd6-c4ede7e70b3c",
              "name": "A3 - Facture fournisseur"
            },
            {
              "uuid": "6eff8fcd-0f6f-4b4f-9dbe-48202aeb9b83",
              "name": "M-Files - Fournisseur"
            },
            {
              "uuid": "83fcd79e-6168-4ed3-b564-1fed59694677",
              "name": "M-Files - Fournisseur"
            },
            {
              "uuid": "84b9f5bf-9563-4eea-9b1a-20cda76a5d3c",
              "name": "M-Files - Moyen de paiement"
            },
            {
              "uuid": "9b00a3ac-272a-4927-a91c-155dc0467f93",
              "name": "A3 - CDC"
            },
            {
              "uuid": "9e9b2fc1-5568-4760-a397-4c0e5d58e0ef",
              "name": "M-Files - CDC"
            },
            {
              "uuid": "ae4862f4-e54e-4e28-bc66-b1b7a7c5512f",
              "name": "M-Files - Compte"
            },
            {
              "uuid": "afe16a93-2038-44bc-8c8d-1425367108e9",
              "name": "M-Files - Moyen de paiement"
            },
            {
              "uuid": "b57d379e-477a-47d8-be9a-0f0a3657acc2",
              "name": "M-Files - Fournisseur"
            },
            {
              "uuid": "b6c9fee0-df24-41c5-ad66-07a155e562c1",
              "name": "M-Files - Moyen de paiement"
            },
            {
              "uuid": "b7425f76-0827-44c9-afbe-28d4d4bcc5df",
              "name": "A3 - Moyen de paiement"
            },
            {
              "uuid": "c02502fc-b29b-46c2-a986-247483464fa5",
              "name": "M-Files - Moyen de paiement"
            },
            {
              "uuid": "cac9b8bd-7a20-44f8-a367-491c7b1a7fd9",
              "name": "M-Files - Fournisseur"
            },
            {
              "uuid": "d8d7af28-0a29-4005-a4f9-b1c1bcd48c09",
              "name": "A3 - Compte"
            },
            {
              "uuid": "dbe7b20a-5513-4dae-974d-046247af39bc",
              "name": "M-Files - Moyen de paiement"
            },
            {
              "uuid": "e0e85711-e247-4639-b1ee-a49c31020043",
              "name": "A3 - Fournisseur"
            },
            {
              "uuid": "e4b9be8c-2ab4-4ec1-a937-3cec716d0a0c",
              "name": "A3 - Code TVA"
            }
          ]
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
    },
    {
      uuid: "287d0a58-fd98-4e7f-add1-504526a49cdc",
      name: "New partner",
      customer: [
        {
          uuid: "0e6fcd15-a623-48d9-a276-2650cc353d68",
          name: "qwe",
          module: [],
          exchange: [],
          subscription: []
        },
      ]
    }
  ]
};

export async function scopeElementHierarchy(code?: string, uuid?: string) {
  if (!code || code === "global-1iam") {
    return [dummyHierarchy];
  }

  if (code.startsWith("partner")) {
    if (uuid) {
      return [dummyHierarchy.partner.find(p => p.uuid === uuid)];
    }
    return dummyHierarchy.partner;
  } else if (code.startsWith("customer")) {
    if (uuid) {
      for (const partner of dummyHierarchy.partner) {
        const customer = partner.customer.find(c => c.uuid === uuid);
        if (customer) {
          return [customer];
        }
      }
      return [];
    } else {
      return dummyHierarchy.partner.flatMap(partner => partner.customer);
    }
  }

  return [];
}

