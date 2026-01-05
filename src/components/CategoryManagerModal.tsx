"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void; 
}

export default function CategoryManagerModal({ isOpen, onClose, onUpdate }: Props) {
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [loading, setLoading] = useState(false);

  // [수정 모드 상태]
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    if (isOpen) {
        fetchCategories();
        cancelEdit(); // 모달 열 때 수정 상태 초기화
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('id', { ascending: true });
    if (data) setCategories(data);
  };

  // 1. 카테고리 추가
  const handleAdd = async () => {
    if (!newCategory.trim()) return;
    setLoading(true);
    
    const { error } = await supabase.from('categories').insert({ name: newCategory });
    
    if (error) {
      alert("추가 실패 (중복된 이름일 수 있습니다).");
    } else {
      setNewCategory("");
      await fetchCategories();
      onUpdate(); 
    }
    setLoading(false);
  };

  // 2. 카테고리 삭제
  const handleDelete = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까? (이미 등록된 물품의 카테고리 이름은 유지됩니다)")) return;

    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) alert("삭제 실패");
    else {
      await fetchCategories();
      onUpdate();
    }
  };

  // 3. 수정 모드 진입
  const startEdit = (cat: any) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
  };

  // 4. 수정 취소
  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  // 5. 수정 사항 저장 (중요: 비품 테이블 데이터도 같이 변경)
  const handleUpdateCategory = async () => {
    if (!editingName.trim()) return alert("카테고리 이름을 입력해주세요.");
    
    // 원래 이름 찾기 (비품 테이블 업데이트용)
    const oldCat = categories.find(c => c.id === editingId);
    if (!oldCat) return;

    if (oldCat.name === editingName) {
        cancelEdit(); // 변경된 게 없으면 그냥 종료
        return;
    }

    if (!confirm(`'${oldCat.name}'을(를) '${editingName}'(으)로 변경하시겠습니까?\n등록된 모든 비품의 카테고리명도 같이 변경됩니다.`)) return;

    setLoading(true);

    try {
        // A. 카테고리 테이블 업데이트
        const { error: catError } = await supabase
            .from('categories')
            .update({ name: editingName })
            .eq('id', editingId);
        
        if (catError) throw catError;

        // B. 비품(items) 테이블도 일괄 업데이트 (데이터 꼬임 방지)
        // 기존에 'IT기기'로 등록된 물품들을 'IT장비'로 싹 바꿔줌
        const { error: itemError } = await supabase
            .from('inventory_items')
            .update({ category: editingName })
            .eq('category', oldCat.name);

        if (itemError) throw itemError;

        alert("수정되었습니다.");
        await fetchCategories();
        onUpdate(); // 메인 화면 갱신
        cancelEdit();

    } catch (error: any) {
        console.error(error);
        alert("수정 실패: " + error.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>카테고리 관리</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {/* 상단: 추가 입력창 */}
          <div className="flex gap-2 mb-6 border-b pb-6">
            <Input 
              placeholder="새 카테고리명" 
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              disabled={loading || editingId !== null} // 수정 중엔 추가 막음
            />
            <Button onClick={handleAdd} disabled={loading || editingId !== null}>추가</Button>
          </div>

          {/* 목록 영역 */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto px-1">
            {categories.map((cat) => (
              <div key={cat.id} className="flex justify-between items-center bg-gray-50 p-2 rounded border">
                
                {/* 수정 모드일 때 vs 아닐 때 화면 분기 */}
                {editingId === cat.id ? (
                    // [수정 모드]
                    <div className="flex w-full items-center gap-2">
                        <Input 
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="h-8 text-sm"
                            autoFocus
                        />
                        <div className="flex gap-1">
                            <Button size="sm" onClick={handleUpdateCategory} disabled={loading} className="h-8 bg-green-600 hover:bg-green-700">
                                V
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEdit} className="h-8 text-gray-500">
                                X
                            </Button>
                        </div>
                    </div>
                ) : (
                    // [일반 모드]
                    <>
                        <span className="text-sm font-medium pl-1">{cat.name}</span>
                        <div className="flex gap-1">
                            {/* 수정 버튼 */}
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => startEdit(cat)}
                                className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                title="이름 수정"
                            >
                                ✎
                            </Button>
                            {/* 삭제 버튼 */}
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDelete(cat.id)}
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                title="삭제"
                            >
                                🗑️
                            </Button>
                        </div>
                    </>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}