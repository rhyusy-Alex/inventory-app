"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AddItemModal({ onAdded }: { onAdded: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // 입력값 상태 관리
  const [name, setName] = useState("");
  const [category, setCategory] = useState("IT기기");
  const [totalQty, setTotalQty] = useState(1);
  const [file, setFile] = useState<File | null>(null);

  // 저장 버튼 눌렀을 때 실행되는 함수
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !category) return alert("필수 정보를 입력해주세요!");
    setLoading(true);

    try {
      let imageUrl = null;

      // 1. 이미지가 있다면 스토리지에 업로드
      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError, data } = await supabase.storage
          .from("items") // 아까 만든 버킷 이름
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // 업로드된 이미지의 공개 주소 가져오기
        const { data: urlData } = supabase.storage
          .from("items")
          .getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }

      // 2. DB에 비품 정보 저장 (Insert)
      const { error: dbError } = await supabase.from("inventory_items").insert({
        name,
        category,
        total_qty: totalQty,
        image_url: imageUrl,
        rented_qty: 0,
        broken_qty: 0,
      });

      if (dbError) throw dbError;

      // 3. 성공 후 뒷정리
      alert("등록되었습니다!");
      setIsOpen(false); // 창 닫기
      setName(""); setFile(null); // 입력창 초기화
      onAdded(); // 부모 페이지(리스트) 새로고침

    } catch (error: any) {
      console.error(error);
      alert("등록 실패: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          + 비품 등록
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle>새 비품 등록</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">비품명 (필수)</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 맥북 프로 16인치" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="category">카테고리</Label>
              <select 
                id="category" 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="IT기기">IT기기</option>
                <option value="촬영장비">촬영장비</option>
                <option value="사무가구">사무가구</option>
                <option value="기타">기타</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="qty">초기 수량</Label>
              <Input id="qty" type="number" min="1" value={totalQty} onChange={(e) => setTotalQty(Number(e.target.value))} required />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="picture">사진 첨부</Label>
            <Input id="picture" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <Button type="submit" disabled={loading} className="mt-2 bg-black text-white">
            {loading ? "저장 중..." : "저장하기"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}