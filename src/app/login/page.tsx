"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const handleAuth = async () => {
    setLoading(true);

    try {
      if (isSignUp) {
        // [회원가입]
        if (!fullName.trim()) {
          alert("이름(실명)을 입력해주세요.");
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });

        if (error) throw error;

        alert("가입 신청이 완료되었습니다.\n관리자 승인 후 이용 가능합니다.");
        setIsSignUp(false);

      } else {
        // [로그인]
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // --- [추가된 문지기 로직] ---
        // 로그인 성공 후, 프로필 테이블에서 '등급(role)' 확인
        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();
          
          // 만약 'waiting' 상태라면?
          if (profile?.role === 'waiting') {
            await supabase.auth.signOut(); // 즉시 로그아웃
            alert("승인 대기 중인 계정입니다.\n관리자 승인 후 이용해주세요.");
            setLoading(false);
            return; // 페이지 이동 막음
          }
        }
        // ---------------------------

        // 통과하면 메인으로 이동
        router.push("/");
      }
    } catch (error: any) {
      alert("오류 발생: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-md border border-gray-100">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          {isSignUp ? "회원가입 신청" : "로그인"}
        </h1>
        <p className="text-center text-gray-500 mb-8 text-sm">
          {isSignUp 
            ? "관리자의 승인을 받아야 이용할 수 있습니다." 
            : "사내 비품 관리 시스템에 오신 것을 환영합니다."}
        </p>

        <div className="space-y-4">
          {isSignUp && (
            <div className="space-y-1">
              <Label htmlFor="name">이름 (실명)</Label>
              <Input
                id="name"
                type="text"
                placeholder="홍길동"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              placeholder="******"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAuth()}
            />
          </div>

          <Button 
            onClick={handleAuth} 
            disabled={loading} 
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold h-11"
          >
            {loading ? "처리 중..." : (isSignUp ? "가입 신청하기" : "로그인")}
          </Button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            {isSignUp ? "이미 계정이 있으신가요?" : "계정이 없으신가요?"}
          </p>
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setFullName("");
            }}
            className="text-sm font-semibold text-blue-600 hover:underline mt-1"
          >
            {isSignUp ? "로그인하기" : "회원가입 신청하기"}
          </button>
        </div>
      </div>
    </div>
  );
}