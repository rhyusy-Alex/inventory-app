"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export default function ManagerDashboard() {
  const router = useRouter();
  
  // 상태 관리
  const [rentals, setRentals] = useState<any[]>([]); // 현재 대여중인 목록
  const [brokenLogs, setBrokenLogs] = useState<any[]>([]); // [New] 파손 이력 목록
  const [loading, setLoading] = useState(true);
  
  // 탭 상태: all(전체대여), byUser(교사별), broken(파손기록)
  const [activeTab, setActiveTab] = useState<"all" | "byUser" | "broken">("all");

  useEffect(() => {
    checkRoleAndFetchData();
  }, []);

  // 탭이 바뀔 때 데이터 로드 (파손 탭 누르면 파손 기록 가져옴)
  useEffect(() => {
    if (activeTab === "broken") {
        fetchBrokenLogs();
    } else {
        fetchAllRentals();
    }
  }, [activeTab]);

  const checkRoleAndFetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) { router.push("/login"); return; }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'manager' && profile?.role !== 'admin') {
      alert("접근 권한이 없습니다.");
      router.push("/");
      return;
    }

    // 초기 데이터 로드
    await fetchAllRentals();
    setLoading(false);
  };

  // 1. 현재 대여 중인 목록 가져오기 (Active)
  const fetchAllRentals = async () => {
    const { data, error } = await supabase
      .from('rentals')
      .select(`
        *,
        inventory_items (name, image_url),
        profiles (full_name, email)
      `)
      .eq('status', 'active')
      .order('due_date', { ascending: true });

    if (error) console.error(error);
    else setRentals(data || []);
  };

  // 2. [New] 파손/망실 기록 가져오기 (History)
  // broken_log 컬럼이 0보다 큰 기록만 가져옴 (반납 여부 상관없음)
  const fetchBrokenLogs = async () => {
    const { data, error } = await supabase
      .from('rentals')
      .select(`
        *,
        inventory_items (name, image_url),
        profiles (full_name, email)
      `)
      .gt('broken_log', 0) // 0보다 큰 것만 필터링
      .order('updated_at', { ascending: false }); // 최근 발생한 순서

    if (error) console.error(error);
    else setBrokenLogs(data || []);
  };

  // 강제 반납 처리
  const handleForceReturn = async (rental: any, isBroken: boolean) => {
    const actionName = isBroken ? "파손/망실 처리" : "정상 반납";
    const confirmMsg = isBroken 
        ? `[주의] 이 물품을 '파손/망실'로 처리하시겠습니까?\n재고가 복구되지 않고 '파손 수량'으로 이동합니다.`
        : `이 물품을 '정상 반납' 처리하시겠습니까?\n재고가 다시 대여 가능 상태로 복구됩니다.`;

    if (!confirm(confirmMsg)) return;

    try {
      const { error } = await supabase.rpc('process_return', {
        p_rental_id: rental.id,
        p_return_qty: rental.current_rented_qty,
        p_broken_qty: isBroken ? rental.current_rented_qty : 0 
      });

      if (error) throw error;
      
      await supabase.from('rentals')
        .update({ return_proof_url: `관리자 강제 처리 (${actionName})` })
        .eq('id', rental.id);

      alert(`${actionName} 완료되었습니다.`);
      fetchAllRentals(); 

    } catch (e: any) {
      alert("처리 중 오류: " + e.message);
    }
  };
  
  const getDDay = (dateStr: string) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const due = new Date(dateStr);
    due.setHours(0,0,0,0);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const groupedByUser = rentals.reduce((acc: any, curr) => {
    const userName = curr.profiles?.full_name || "알수없음";
    if (!acc[userName]) acc[userName] = [];
    acc[userName].push(curr);
    return acc;
  }, {});

  if (loading) return <div className="text-center py-20">데이터 불러오는 중...</div>;

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div>
            <h1 className="text-xl font-bold text-gray-800">📊 통합 대여 관리</h1>
            <p className="text-xs text-gray-500 mt-1">
                {activeTab === 'broken' 
                    ? `파손/망실 기록: 총 ${brokenLogs.length}건` 
                    : `현재 대여 중: 총 ${rentals.length}건`
                }
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push("/")}>
            ← 메인으로
          </Button>
        </header>

        {/* 탭 버튼 그룹 */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
            <button 
                onClick={() => setActiveTab("all")}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-colors whitespace-nowrap ${
                    activeTab === "all" ? "bg-gray-800 text-white" : "bg-white text-gray-600 border"
                }`}
            >
                전체 대여 목록
            </button>
            <button 
                onClick={() => setActiveTab("byUser")}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-colors whitespace-nowrap ${
                    activeTab === "byUser" ? "bg-gray-800 text-white" : "bg-white text-gray-600 border"
                }`}
            >
                교사별 보유 현황
            </button>
            <button 
                onClick={() => setActiveTab("broken")}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-colors whitespace-nowrap flex items-center gap-1 ${
                    activeTab === "broken" ? "bg-red-600 text-white border-red-600" : "bg-white text-red-600 border border-red-200"
                }`}
            >
                🚨 파손/망실 이력
            </button>
        </div>

        {/* [탭 1] 전체 리스트 */}
        {activeTab === "all" && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                            <tr>
                                <th className="p-3 w-24">상태</th>
                                <th className="p-3">비품명</th>
                                <th className="p-3">대여자</th>
                                <th className="p-3">반납예정일</th>
                                <th className="p-3 text-right w-40">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {rentals.length === 0 ? (
                                <tr><td colSpan={5} className="p-10 text-center text-gray-400">현재 대여 중인 물품이 없습니다.</td></tr>
                            ) : rentals.map((rental) => {
                                const dDay = getDDay(rental.due_date);
                                const isOverdue = dDay < 0;
                                return (
                                    <tr key={rental.id} className={isOverdue ? "bg-red-50/50" : ""}>
                                        <td className="p-3">
                                            {isOverdue ? (
                                                <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">연체 (D{dDay})</span>
                                            ) : (
                                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">대여중 (D-{dDay})</span>
                                            )}
                                        </td>
                                        <td className="p-3 font-medium text-gray-900 flex items-center gap-2">
                                            <div className="w-8 h-8 bg-gray-100 rounded overflow-hidden shrink-0">
                                                {rental.inventory_items?.image_url && (
                                                    <img src={rental.inventory_items.image_url} className="w-full h-full object-cover"/>
                                                )}
                                            </div>
                                            <div>
                                                {rental.inventory_items?.name}
                                                <div className="text-gray-400 text-xs">수량: {rental.current_rented_qty}개</div>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <div className="font-bold">{rental.profiles?.full_name}</div>
                                        </td>
                                        <td className={`p-3 ${isOverdue ? "text-red-600 font-bold" : "text-gray-600"}`}>
                                            {rental.due_date}
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="flex flex-col gap-1 items-end">
                                                <Button 
                                                    size="sm" variant="outline" className="h-7 text-xs border-gray-300 w-20"
                                                    onClick={() => handleForceReturn(rental, false)}
                                                >
                                                    정상 반납
                                                </Button>
                                                <Button 
                                                    size="sm" variant="outline" className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50 w-20"
                                                    onClick={() => handleForceReturn(rental, true)}
                                                >
                                                    파손/망실
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* [탭 2] 교사별 통계 */}
        {activeTab === "byUser" && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Object.keys(groupedByUser).length === 0 ? (
                     <div className="col-span-3 text-center py-20 text-gray-400">대여 중인 교사가 없습니다.</div>
                ) : Object.entries(groupedByUser).map(([name, items]: [string, any]) => (
                    <div key={name} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex justify-between items-center mb-3 border-b pb-2">
                            <h3 className="font-bold text-lg text-gray-800">{name} 선생님</h3>
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">
                                {items.length}건
                            </span>
                        </div>
                        <ul className="space-y-2">
                            {items.map((r: any) => {
                                const isOverdue = getDDay(r.due_date) < 0;
                                return (
                                    <li key={r.id} className="flex justify-between items-start text-sm bg-gray-50 p-2 rounded">
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-700">{r.inventory_items?.name} ({r.current_rented_qty}개)</div>
                                            <div className="text-xs text-gray-400">~ {r.due_date}</div>
                                        </div>
                                        {isOverdue && <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded font-bold ml-2">연체</span>}
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                ))}
            </div>
        )}

        {/* [탭 3] 파손/망실 이력 (New) */}
        {activeTab === "broken" && (
            <div className="bg-white rounded-lg shadow-sm border border-red-200 overflow-hidden">
                <div className="bg-red-50 p-3 text-xs text-red-600 font-bold border-b border-red-100">
                    * 이 목록은 파손 또는 망실 신고가 접수된 기록입니다. (총 {brokenLogs.length}건)
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white text-gray-500 font-medium border-b">
                            <tr>
                                <th className="p-3">발생일 (반납일)</th>
                                <th className="p-3">비품명</th>
                                <th className="p-3">책임자 (대여자)</th>
                                <th className="p-3 text-red-600">파손 수량</th>
                                <th className="p-3">증빙</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {brokenLogs.length === 0 ? (
                                <tr><td colSpan={5} className="p-10 text-center text-gray-400">파손/망실 기록이 없습니다.</td></tr>
                            ) : brokenLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-red-50/30 transition-colors">
                                    <td className="p-3 text-gray-600">
                                        {new Date(log.updated_at).toLocaleDateString()}
                                    </td>
                                    <td className="p-3 font-medium text-gray-900 flex items-center gap-2">
                                        <div className="w-8 h-8 bg-gray-100 rounded overflow-hidden shrink-0">
                                            {log.inventory_items?.image_url && (
                                                <img src={log.inventory_items.image_url} className="w-full h-full object-cover"/>
                                            )}
                                        </div>
                                        {log.inventory_items?.name}
                                    </td>
                                    <td className="p-3 font-bold">
                                        {log.profiles?.full_name}
                                    </td>
                                    <td className="p-3 text-red-600 font-bold">
                                        -{log.broken_log}개
                                    </td>
                                    <td className="p-3">
                                        {log.return_proof_url && log.return_proof_url.startsWith('http') ? (
                                            <a href={log.return_proof_url} target="_blank" className="text-blue-500 underline text-xs">
                                                사진보기
                                            </a>
                                        ) : (
                                            <span className="text-xs text-gray-400">{log.return_proof_url || '-'}</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

      </div>
    </main>
  );
}