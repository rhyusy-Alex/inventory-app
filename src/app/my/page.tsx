// 📂 파일 경로: src/app/my/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import ReturnModal from "@/components/ReturnModal";

export default function MyPage() {
  const router = useRouter();
  const [rentals, setRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 반납 모달용 상태
  const [selectedRental, setSelectedRental] = useState<any>(null);

  useEffect(() => {
    fetchMyRentals();
  }, []);

  const fetchMyRentals = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert("로그인이 필요합니다.");
      router.push("/login");
      return;
    }

    // 내 대여 목록 가져오기
    const { data, error } = await supabase
      .from("rentals")
      .select(`
        *,
        inventory_items (
          id, name, image_url, rented_qty
        )
      `)
      .eq("user_id", user.id)
      .eq("status", "active") 
      .order("created_at", { ascending: false });

    if (error) console.error(error);
    else setRentals(data || []);
    
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 pb-20">
      <header className="mb-6 flex items-center justify-between max-w-3xl mx-auto">
        <h1 className="text-xl font-bold text-gray-800">🙋‍♂️ 내 대여 목록</h1>
        <Button variant="outline" size="sm" onClick={() => router.push("/")}>
          ← 메인으로
        </Button>
      </header>

      <div className="max-w-3xl mx-auto space-y-4">
        {loading ? (
          <div className="text-center py-10">로딩 중...</div>
        ) : rentals.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg shadow-sm">
            <p className="text-gray-500 mb-2">대여 중인 물품이 없습니다.</p>
            <Button onClick={() => router.push("/")} className="mt-2 bg-blue-600 text-white">
              비품 빌리러 가기
            </Button>
          </div>
        ) : (
          rentals.map((rental) => {
            const item = rental.inventory_items;
            const dDay = new Date(rental.due_date);
            const today = new Date();
            const isOverdue = dDay < today; 

            return (
              <div key={rental.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex items-center gap-4">
                {/* 이미지 */}
                <div className="w-20 h-20 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                  {item?.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No Img</div>
                  )}
                </div>

                {/* 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-gray-900 truncate">{item?.name || "삭제된 비품"}</h3>
                    {isOverdue && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">연체됨</span>}
                  </div>
                  
                  <p className="text-sm text-gray-500 mt-1">
                    반납 예정일: {rental.due_date}
                  </p>
                  <p className="text-sm font-medium text-blue-600 mt-1">
                    대여 수량: {rental.current_rented_qty}개
                  </p>
                </div>

                {/* 반납 버튼 */}
                <Button 
                    onClick={() => setSelectedRental(rental)}
                    className="bg-gray-800 hover:bg-black text-white text-sm shrink-0"
                >
                  반납하기
                </Button>
              </div>
            );
          })
        )}
      </div>

      {/* 반납 모달 */}
      <ReturnModal 
        rental={selectedRental}
        isOpen={!!selectedRental}
        onClose={() => setSelectedRental(null)}
        onSuccess={fetchMyRentals} 
      />
    </main>
  );
}