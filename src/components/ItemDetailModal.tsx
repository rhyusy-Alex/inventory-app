"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InventoryItem } from "@/types";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";

interface Props {
  isOpen: boolean;
  item: InventoryItem | null;
  categories: string[];
  onClose: () => void;
  onUpdate: () => void;
  // [New] 장바구니 담기 함수 전달받음
  onAddToCart?: (item: InventoryItem) => void; 
}

export default function ItemDetailModal({ isOpen, item, categories, onClose, onUpdate, onAddToCart }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<InventoryItem>>({});
  const [loading, setLoading] = useState(false);
  
  // 현재 사용자 권한 확인용
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    if (isOpen && item) {
      setEditForm(item);
      setIsEditing(false);
      checkUserRole();
    }
  }, [isOpen, item]);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      setUserRole(data?.role || "");
    }
  };

  // --- [수정 로직] ---
  const handleSave = async () => {
    if (!editForm.name) return alert("비품명을 입력해주세요.");
    setLoading(true);
    
    // 수량 유효성 검사 (현재 대여중인 것보다 적게 설정 불가)
    const currentUsed = (item?.rented_qty || 0) + (item?.broken_qty || 0);
    if ((editForm.total_qty || 0) < currentUsed) {
        alert(`현재 대여/파손 중인 수량(${currentUsed}개)보다 적게 설정할 수 없습니다.`);
        setLoading(false);
        return;
    }

    const { error } = await supabase
      .from('inventory_items')
      .update({
        name: editForm.name,
        category: editForm.category,
        total_qty: editForm.total_qty,
        image_url: editForm.image_url
      })
      .eq('id', item?.id);

    if (error) alert("수정 실패: " + error.message);
    else {
      alert("수정되었습니다.");
      onUpdate();
      setIsEditing(false);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm("정말 삭제하시겠습니까? 대여 기록이 있는 경우 삭제되지 않을 수 있습니다.")) return;
    const { error } = await supabase.from('inventory_items').delete().eq('id', item?.id);
    if (error) alert("삭제 실패: " + error.message);
    else {
      alert("삭제되었습니다.");
      onUpdate();
      onClose();
    }
  };

  if (!item) return null;

  const available = item.total_qty - item.rented_qty - item.broken_qty;
  const isManager = userRole === 'manager' || userRole === 'admin';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "비품 정보 수정" : "비품 상세"}</DialogTitle>
        </DialogHeader>

        {/* --- [A] 일반 모드 (조회 및 담기) --- */}
        {!isEditing ? (
          <div className="space-y-4">
            {/* 이미지 */}
            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center relative">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="w-full h-full object-contain" />
              ) : (
                <span className="text-gray-400">이미지 없음</span>
              )}
              {available <= 0 && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white font-bold text-lg border-2 border-white px-4 py-1 rounded">품절</span>
                </div>
              )}
            </div>

            {/* 정보 */}
            <div>
              <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{item.name}</h2>
                    <p className="text-sm text-gray-500">{item.category}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-blue-600">
                        가용: {available} / 총 {item.total_qty}
                    </div>
                  </div>
              </div>
            </div>
            
            {/* 액션 버튼 */}
            <div className="flex gap-2 pt-2">
                {/* [장바구니 담기 버튼] */}
                <Button 
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg"
                    disabled={available <= 0}
                    onClick={() => {
                        if (onAddToCart) {
                            onAddToCart(item);
                            onClose();
                        }
                    }}
                >
                    {available > 0 ? "🛒 장바구니 담기" : "재고 부족"}
                </Button>
            </div>

            {/* 관리자용 버튼 */}
            {isManager && (
                <div className="border-t pt-4 mt-2 flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>수정</Button>
                    <Button variant="outline" size="sm" className="text-red-500 hover:bg-red-50" onClick={handleDelete}>삭제</Button>
                </div>
            )}
          </div>
        ) : (
          /* --- [B] 수정 모드 --- */
          <div className="space-y-4">
            <div>
                <label className="text-sm font-bold text-gray-700">비품명</label>
                <Input value={editForm.name || ""} onChange={e => setEditForm({...editForm, name: e.target.value})} />
            </div>
            <div>
                <label className="text-sm font-bold text-gray-700">카테고리</label>
                <select 
                    className="w-full border rounded-md p-2 text-sm"
                    value={editForm.category}
                    onChange={e => setEditForm({...editForm, category: e.target.value})}
                >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
            <div>
                <label className="text-sm font-bold text-gray-700">총 수량 (보유량)</label>
                <Input 
                    type="number" 
                    value={editForm.total_qty} 
                    onChange={e => setEditForm({...editForm, total_qty: Number(e.target.value)})} 
                />
                <p className="text-xs text-gray-500 mt-1">* 대여 중인 수량보다 적게 수정할 수 없습니다.</p>
            </div>
            <div>
                <label className="text-sm font-bold text-gray-700">이미지 URL</label>
                <Input value={editForm.image_url || ""} onChange={e => setEditForm({...editForm, image_url: e.target.value})} />
            </div>

            <div className="flex gap-2 pt-2">
                <Button className="flex-1 bg-black text-white" onClick={handleSave} disabled={loading}>저장</Button>
                <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>취소</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}