export const features = [
  {
    icon: "TrendingUp",
    titleKey: "features.items.0.title",
    descriptionKey: "features.items.0.description",
  },
  {
    icon: "BarChart3",
    titleKey: "features.items.1.title",
    descriptionKey: "features.items.1.description",
  },
  {
    icon: "Brain",
    titleKey: "features.items.2.title",
    descriptionKey: "features.items.2.description",
  },
  {
    icon: "Bell",
    titleKey: "features.items.3.title",
    descriptionKey: "features.items.3.description",
  },
  {
    icon: "Shield",
    titleKey: "features.items.4.title",
    descriptionKey: "features.items.4.description",
  },
  {
    icon: "Zap",
    titleKey: "features.items.5.title",
    descriptionKey: "features.items.5.description",
  },
] as const;

export type Feature = (typeof features)[number];
