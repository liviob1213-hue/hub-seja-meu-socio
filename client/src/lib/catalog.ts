export type ProjectKind = "free" | "paid";
export type ProjectStatus = "normal" | "featured" | "coming_soon";
export type MediaKind = "image" | "video" | "iframe";

export type CatalogProject = {
  id: number;
  name: string;
  description: string;
  price: string | number;
  kind: ProjectKind;
  status: ProjectStatus;
  projectUrl: string;
  coverUrl: string;
  coverKey: string | null;
  mediaKind: MediaKind;
  videoUrl: string | null;
  videoKey: string | null;
  iframeUrl: string | null;
  createdAt: Date | string;
};

export function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 }).format(Number(value));
}

export function extractIframeUrl(value: string) {
  const srcMatch = value.match(/src=["']([^"']+)["']/i);
  return srcMatch?.[1] ?? value.trim();
}
