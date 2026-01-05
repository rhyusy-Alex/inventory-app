export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
  total_qty: number;
  rented_qty: number;
  broken_qty: number;
  // 가용 수량 (전체 - 대여 - 파손)
  available_qty?: number; 
}