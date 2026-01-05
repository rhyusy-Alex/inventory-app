"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  rental: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReturnModal({ rental, isOpen, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  // 수량 상태
  const [returnQty, setReturnQty] = useState(1); // 이번에 반납할 총 개수
  const [brokenQty, setBrokenQty] = useState(0); // 그 중 망실/파손 개수

  useEffect(() => {
    if (rental) {
      setReturnQty(rental.current_rented_qty); 
      setBrokenQty(0);
    }
  }, [rental, isOpen]);

  const handleReturn = async () => {
    if (!rental) return;
    if (returnQty > rental.current_rented_qty) return alert("대여 수량보다 많이 반납할 수 없습니다.");
    if (brokenQty > returnQty) return alert("망실 수량이 전체 반납 수량보다 많을 수 없습니다.");
    if (!file) return alert("반납 인증샷을 첨부해주세요.");

    if (brokenQty > 0) {
        if(!confirm(`망실/파손 수량 ${brokenQty}개가 포함되어 있습니다.\n관리자에게 해당 내용이 보고됩니다. 진행하시겠습니까?`)) return;
    }

    try {
      setLoading(true);

      // 1. 사진 업로드
      const fileExt = file.name.split('.').pop();
      const fileName = `${rental.id}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('return-proofs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const publicUrl = `https://${process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID}.supabase.co/storage/v1/object/public/return-proofs/${fileName}`;

      // 2. 인증샷 URL 업데이트
      await supabase.from('rentals').update({ return_proof_url: publicUrl }).eq('id', rental.id);

      // 3. 반납 처리 (SQL 함수 호출 - 파손 기록 포함)
      const { error: rpcError } = await supabase.rpc('process_return', {
        p_rental_id: rental.id,
        p_return_qty: returnQty,
        p_broken_qty: brokenQty
      });

      if (rpcError) throw rpcError;

      alert("반납 처리가 완료되었습니다.");
      setFile(null);
      onSuccess();
      onClose();

    } catch (error: any) {
      console.error(error);
      alert("오류 발생: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!rental) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>반납하기</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 border border-gray-100">
             <div className="font-bold text-base mb-1">{rental.inventory_items?.name}</div>
             <div>현재 대여 수량: <span className="font-bold text-blue-600">{rental.current_rented_qty}개</span></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
                <Label>총 반납 수량</Label>
                <Input 
                    type="number" 
                    min={1} 
                    max={rental.current_rented_qty}
                    value={returnQty}
                    onChange={(e) => setReturnQty(Number(e.target.value))}
                />
            </div>
            <div className="space-y-1">
                <Label className="text-red-600 font-bold">망실/파손 수량</Label>
                <Input 
                    type="number" 
                    min={0} 
                    max={returnQty}
                    value={brokenQty}
                    onChange={(e) => setBrokenQty(Number(e.target.value))}
                    className="border-red-200 focus:border-red-500 bg-red-50"
                />
            </div>
          </div>
          
          {brokenQty > 0 && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  ⚠️ <b>{brokenQty}개</b>는 망실/파손으로 기록되며, 관리자 대장에 기록이 남습니다.
              </div>
          )}

          <div className="space-y-2">
            <Label>반납 인증샷 (필수)</Label>
            <Input 
              type="file" 
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <p className="text-[10px] text-gray-400">보관함에 넣은 사진이나 파손 부위 사진을 올려주세요.</p>
          </div>

          <Button onClick={handleReturn} disabled={loading} className="w-full bg-gray-900 text-white hover:bg-black mt-2">
            {loading ? "처리 중..." : "반납 완료"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}