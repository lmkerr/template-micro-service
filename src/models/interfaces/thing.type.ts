interface Thing {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export type { Thing };
