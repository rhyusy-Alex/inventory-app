"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminAndFetchUsers();
  }, []);

  const checkAdminAndFetchUsers = async () => {
    setLoading(true);
    
    // 1. 내가 관리자(manager 이상)인지 확인
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // 관리자가 아니면 메인으로 쫓아냄
    if (profile?.role !== 'manager' && profile?.role !== 'admin') {
      alert("접근 권한이 없습니다.");
      router.push("/");
      return;
    }

    // 2. 'waiting' 상태인 유저 목록 가져오기
    await fetchWaitingUsers();
    setLoading(false);
  };

  const fetchWaitingUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'waiting')
      .order('created_at', { ascending: false });
    
    if (data) setUsers(data);
    if (error) console.error(error);
  };

  // 등급 변경 (승인) 함수
  const handleApprove = async (userId: string, newRole: string) => {
    if (!confirm(`해당 사용자를 '${newRole}' 등급으로 승인하시겠습니까?`)) return;

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      alert("처리 실패: " + error.message);
    } else {
      alert("승인되었습니다.");
      fetchWaitingUsers(); // 목록 새로고침
    }
  };

  if (loading) return <div className="text-center py-20">로딩 중...</div>;

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-lg shadow-sm">
          <h1 className="text-xl font-bold text-gray-800">🛡️ 회원 승인 관리</h1>
          <Button variant="outline" onClick={() => router.push("/")}>
            ← 메인으로
          </Button>
        </header>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b bg-gray-50 font-medium text-gray-700">
            가입 대기 목록 ({users.length}명)
          </div>
          
          {users.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              현재 승인 대기 중인 회원이 없습니다.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {users.map((u) => (
                <div key={u.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="font-bold text-gray-900">{u.full_name}</div>
                    <div className="text-sm text-gray-500">{u.email}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      신청일: {new Date(u.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  {/* 승인 버튼 그룹 */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 mr-2">등급 선택 승인:</span>
                    <Button 
                      size="sm" 
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => handleApprove(u.id, 'teacher')}
                    >
                      교사
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="text-green-600 border-green-200 hover:bg-green-50"
                      onClick={() => handleApprove(u.id, 'manager')}
                    >
                      팀장
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}