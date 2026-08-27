export type ProductKind = "free" | "paid";
export type MediaKind = "image" | "iframe";

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  kind: ProductKind;
  productUrl: string;
  mediaUrl: string;
  mediaKind: MediaKind;
  createdAt: string;
};

const STORAGE_KEY = "hub-seja-meu-socio-products-v1";

export const initialProducts: Product[] = [
  {
    id: "kit-lancamento",
    name: "Kit de Lançamento",
    description: "Estrutura prática para transformar uma ideia em uma oferta clara e pronta para vender.",
    price: 97,
    kind: "paid",
    productUrl: "https://example.com/kit-lancamento",
    mediaUrl: "/manus-storage/product-launch-kit_87eeff3c.jpg",
    mediaKind: "image",
    createdAt: "2026-08-27T00:00:00.000Z",
  },
  {
    id: "aula-vendas",
    name: "Aula de Vendas que Conectam",
    description: "Uma aula direta para ajustar sua mensagem, proposta e rotina comercial.",
    price: 47,
    kind: "paid",
    productUrl: "https://example.com/aula-vendas",
    mediaUrl: "/manus-storage/product-sales-class_78b877c6.jpg",
    mediaKind: "image",
    createdAt: "2026-08-26T00:00:00.000Z",
  },
  {
    id: "mapa-crescimento",
    name: "Mapa de Crescimento",
    description: "Checklist gratuito para organizar prioridades e identificar a próxima alavanca do negócio.",
    price: 0,
    kind: "free",
    productUrl: "https://example.com/mapa-crescimento",
    mediaUrl: "/manus-storage/product-growth-map_1a2920a1.jpg",
    mediaKind: "image",
    createdAt: "2026-08-25T00:00:00.000Z",
  },
];

export function getProducts(): Product[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return initialProducts;
    const parsed = JSON.parse(stored) as Product[];
    return Array.isArray(parsed) ? parsed : initialProducts;
  } catch {
    return initialProducts;
  }
}

export function saveProducts(products: Product[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

export function formatCurrency(price: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(price);
}

export function extractIframeUrl(value: string) {
  const srcMatch = value.match(/src=["']([^"']+)["']/i);
  return srcMatch?.[1] ?? value.trim();
}
