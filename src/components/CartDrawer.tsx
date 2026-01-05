"use client";

import { useState } from "react";
import { X, Trash2, CalendarIcon } from "lucide-react"; // 아이콘이 없다면 텍스트로 대체됨
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InventoryItem } from "@/types";

export interface CartItem {
  item: InventoryItem;
  quantity: number;
  dueDate: string; // 반납 예정일
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onRemove: (itemId: string) => void;
  onUpdateDate: (itemId: string, date: string) => void;
  onUpdateQty: (itemId: string, qty: number) => void;
  onCheckout: () => void;
}

export default function CartDrawer({ 
  isOpen, onClose, cartItems, onRemove, onUpdateDate, onUpdateQty, onCheckout 
}: Props) {
  const [loading, setLoading] = useState(false);

  // 오늘 날짜 (기본값용)
  const today = new Date().toISOString().split("T")[0];

  const handleCheckout = async () => {
    // 유효성 검사
    for (const c of cartItems) {
        if (!c.dueDate) return alert(`'${c.item.name}'의 반납 예정일을 설정해주세요.`);
        if (c.dueDate < today) return alert(`'${c.item.name}'의 반납일이 과거일 수 없습니다.`);
    }
    
    if(!confirm(`총 ${cartItems.length}건의 비품을 대여하시겠습니까?`)) return;

    setLoading(true);
    await onCheckout();
    setLoading(false);
  };

  return (
    <>
      {/* 배경 오버레이 */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[60] transition-opacity" 
          onClick={onClose}
        />
      )}

      {/* 슬라이드 패널 (우측) */}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white z-[70] shadow-2xl transform transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}>
        
        {/* 헤더 */}
        <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-lg font-bold flex items-center gap-2">
                🛒 반출 장바구니 <span className="text-blue-600">({cartItems.length})</span>
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>

        {/* 리스트 영역 */}
        <div className="p-4 overflow-y-auto" style={{ height: "calc(100% - 140px)" }}>
            {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                    <span className="text-4xl">🛒</span>
                    <p>담긴 비품이 없습니다.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {cartItems.map((cartItem) => (
                        <div key={cartItem.item.id} className="bg-gray-50 border border-gray-100 rounded-lg p-3 relative">
                            {/* 삭제 버튼 */}
                            <button 
                                onClick={() => onRemove(cartItem.item.id)}
                                className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                            >
                                ✕
                            </button>

                            <div className="flex gap-3 mb-3">
                                <div className="w-16 h-16 bg-white rounded border border-gray-200 overflow-hidden shrink-0">
                                    {cartItem.item.image_url ? (
                                        <img src={cartItem.item.image_url} className="w-full h-full object-cover"/>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-300">No Img</div>
                                    )}
                                </div>
                                <div className="pr-4">
                                    <h4 className="font-bold text-sm text-gray-900">{cartItem.item.name}</h4>
                                    <p className="text-xs text-gray-500 mt-1">{cartItem.item.category}</p>
                                    <div className="text-xs text-blue-600 mt-1">
                                        잔여재고: {cartItem.item.total_qty - cartItem.item.rented_qty - cartItem.item.broken_qty}개
                                    </div>
                                </div>
                            </div>

                            {/* 컨트롤 영역 (날짜 / 수량) */}
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] text-gray-500 font-bold block mb-1">반납 예정일</label>
                                    <Input 
                                        type="date" 
                                        className="h-8 text-xs bg-white"
                                        value={cartItem.dueDate}
                                        onChange={(e) => onUpdateDate(cartItem.item.id, e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-500 font-bold block mb-1">대여 수량</label>
                                    <Input 
                                        type="number" 
                                        min={1}
                                        max={cartItem.item.total_qty - cartItem.item.rented_qty - cartItem.item.broken_qty}
                                        className="h-8 text-xs bg-white"
                                        value={cartItem.quantity}
                                        onChange={(e) => onUpdateQty(cartItem.item.id, Number(e.target.value))}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* 하단 버튼 */}
        <div className="absolute bottom-0 left-0 w-full p-4 border-t bg-white">
            <Button 
                onClick={handleCheckout} 
                disabled={loading || cartItems.length === 0}
                className="w-full h-12 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white"
            >
                {loading ? "처리 중..." : "일괄 대여 신청"}
            </Button>
        </div>
      </div>
    </>
  );
}