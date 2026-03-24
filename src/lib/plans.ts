export type PlanId = "free" | "pro" | "agency";

export type Plan = {
  monthlyPostLimit: number;
  maxAutoPerMonth: number;
  briefGeneration: boolean;
  experienceBank: boolean;
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    monthlyPostLimit: 20,
    maxAutoPerMonth: 5,
    briefGeneration: false,
    experienceBank: false,
  },
  pro: {
    monthlyPostLimit: 30,
    maxAutoPerMonth: 15,
    briefGeneration: true,
    experienceBank: true,
  },
  agency: {
    monthlyPostLimit: 100,
    maxAutoPerMonth: 50,
    briefGeneration: true,
    experienceBank: true,
  },
};

export function getPlan(planId: string): Plan {
  const id = planId === "pro" || planId === "agency" ? planId : "free";
  return PLANS[id];
}
