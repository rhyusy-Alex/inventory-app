export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
  total_qty: number;
  rented_qty: number;
  broken_qty: number;
  // 정렬에 사용되는 생성일자 (필수)
  created_at: string;
  // 가용 수량 (전체 - 대여 - 파손) - UI 계산용
  available_qty?: number; 
}