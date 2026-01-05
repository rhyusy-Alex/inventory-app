"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { InventoryItem } from "@/types";
import AddItemModal from "@/components/AddItemModal";
import ItemDetailModal from "@/components/ItemDetailModal";
import CategoryManagerModal from "@/components/CategoryManagerModal";
import CartDrawer, { CartItem } from "@/components/CartDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, Star } from "lucide-react";

export default function Home() {
  const router = useRouter();

  // --- 상태 관리 ---
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // 카테고리 및 즐겨찾기
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [favoriteCats, setFavoriteCats] = useState<string[]>([]); // 즐겨찾기 (최대 2개)
  const [selectedCategory, setSelectedCategory] = useState("전체");

  // 드롭다운 메뉴 상태
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const categoryMenuRef = useRef<HTMLDivElement>(null);

  // 카테고리 관리/편집 모달 상태 (관리자용)
  const [isCatManagerOpen, setIsCatManagerOpen] = useState(false);

  // 검색 및 정렬
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");

  const [myRentCount, setMyRentCount] = useState(0);

  // 장바구니
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    checkUserAndFetchData();

    // 외부 클릭 시 드롭다운 닫기
    function handleClickOutside(event: MouseEvent) {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target as Node)) {
        setIsCategoryMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const checkUserAndFetchData = async () => {
    setLoading(true);
    // 1. 사용자 세션 확인
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // 로그인 된 경우: 데이터 가져오기
      setUser(user);
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      setUserRole(profile?.role || "");

      await Promise.all([fetchCategories(), fetchItems(), fetchFavorites(user.id)]);
      fetchMyRentCount(user.id);
      setLoading(false);
    } else {
      // 로그인 안 된 경우: 로그인 페이지로 이동
      setLoading(false);
      router.push('/login');
    }
  };

  // 1. 전체 카테고리 가져오기
  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('name').order('id', { ascending: true });
    if (data) setAllCategories(data.map(c => c.name));
  };

  // 2. 내 즐겨찾기 가져오기
  const fetchFavorites = async (userId: string) => {
    const { data } = await supabase
      .from('category_favorites')
      .select('category_name, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    
    if (data) {
      setFavoriteCats(data.map(f => f.category_name));
    }
  };

  // 3. 즐겨찾기 토글 (최대 2개 유지 로직)
  const toggleFavorite = async (e: React.MouseEvent, catName: string) => {
    e.stopPropagation();
    if (!user) return;
    
    const isFav = favoriteCats.includes(catName);

    if (isFav) {
        // [삭제]
        const { error } = await supabase
            .from('category_favorites')
            .delete()
            .eq('user_id', user.id)
            .eq('category_name', catName);
        if (!error) {
            setFavoriteCats(prev => prev.filter(c => c !== catName));
            if (selectedCategory === catName) setSelectedCategory("전체");
        }
    } else {
        // [추가] (FIFO: 2개 넘으면 오래된 것 삭제)
        let newFavList = [...favoriteCats];
        
        if (newFavList.length >= 2) {
            const outputCat = newFavList[0];
            await supabase
                .from('category_favorites')
                .delete()
                .eq('user_id', user.id)
                .eq('category_name', outputCat);
            newFavList.shift();
        }

        const { error } = await supabase
            .from('category_favorites')
            .insert({ user_id: user.id, category_name: catName });
        
        if (!error) {
            setFavoriteCats([...newFavList, catName]);
        }
    }
  };

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setItems(data);
    if (error) console.error(error);
  };

  const fetchMyRentCount = async (userId: string) => {
    const { count } = await supabase
      .from('rentals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'active');
    setMyRentCount(count || 0);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setItems([]);
    router.push('/login'); // 로그아웃 시에도 로그인 페이지로 이동
  };

  // 장바구니 로직
  const addToCart = (item: InventoryItem) => {
    const exists = cart.find(c => c.item.id === item.id);
    if (exists) {
        alert("이미 장바구니에 담긴 비품입니다.");
        setIsCartOpen(true);
        return;
    }
    setCart([...cart, { item, quantity: 1, dueDate: "" }]);
    if(confirm(`${item.name}을(를) 장바구니에 담았습니다.\n장바구니를 확인하시겠습니까?`)) {
        setIsCartOpen(true);
    }
  };
  const removeFromCart = (itemId: string) => setCart(cart.filter(c => c.item.id !== itemId));
  const updateCartDate = (itemId: string, date: string) => setCart(cart.map(c => c.item.id === itemId ? { ...c, dueDate: date } : c));
  const updateCartQty = (itemId: string, qty: number) => setCart(cart.map(c => c.item.id === itemId ? { ...c, quantity: qty } : c));

  const handleCheckout = async () => {
    if (!user) return;
    try {
        const insertPromises = cart.map(c => {
            return supabase.from('rentals').insert({
                user_id: user.id,
                item_id: c.item.id,
                current_rented_qty: c.quantity,
                due_date: c.dueDate,
                status: 'active'
            });
        });
        await Promise.all(insertPromises);
        const updatePromises = cart.map(c => {
            return supabase.rpc('increment_rented_qty', { row_id: c.item.id, count: c.quantity });
        });
        await Promise.all(updatePromises);
        alert("대여 신청이 완료되었습니다.");
        setCart([]);
        setIsCartOpen(false);
        fetchItems();
        fetchMyRentCount(user.id);
    } catch (error: any) {
        alert("오류 발생: " + error.message);
    }
  };

  // 검색 필터
  const filteredItems = items
    .filter(item => {
      const catMatch = selectedCategory === "전체" || item.category === selectedCategory;
      const searchMatch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      return catMatch && searchMatch;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "available") {
        const availA = a.total_qty - a.rented_qty - a.broken_qty;
        const availB = b.total_qty - b.rented_qty - b.broken_qty;
        return availB - availA;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  if (loading) return <div className="flex justify-center items-center h-screen text-gray-500">로딩 중...</div>;
  
  // 로그인 안 된 상태면 안내 메시지 (이미 checkUserAndFetchData에서 이동 명령 내림)
  if (!user) return <div className="flex justify-center items-center h-screen text-gray-500">로그인 페이지로 이동 중...</div>;

  return (
    <main className="min-h-screen bg-gray-50 pb-20 relative">
      
      {/* 1. 상단 헤더 */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 h-14">
        <div className="max-w-7xl mx-auto px-4 h-full flex justify-between items-center">
            <h1 className="text-lg font-bold text-gray-800 cursor-pointer whitespace-nowrap mr-2" onClick={() => {setSearchTerm(""); setSelectedCategory("전체");}}>
                📦 비품현황
            </h1>
            
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            {(userRole === 'manager' || userRole === 'admin') && (
                <div className="flex items-center bg-gray-100 rounded-md p-0.5 mr-1 shrink-0 border border-gray-200">
                    <Button variant="ghost" size="sm" onClick={() => router.push("/manager")} className="h-7 text-xs font-bold text-gray-700 hover:bg-white hover:text-blue-600 px-3 rounded-sm">현황</Button>
                    <div className="w-[1px] h-3 bg-gray-300 mx-0.5"></div>
                    <Button variant="ghost" size="sm" onClick={() => router.push("/admin")} className="h-7 text-xs font-bold text-gray-700 hover:bg-white hover:text-orange-600 px-3 rounded-sm">승인</Button>
                </div>
            )}
            <Button variant="ghost" size="sm" className="relative h-8 px-2 shrink-0 font-bold text-gray-700" onClick={() => router.push("/my")}>
                MY {myRentCount > 0 && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full"></span>}
            </Button>
            <AddItemModal onAdded={fetchItems} />
            <Button variant="ghost" size="sm" onClick={handleLogout} className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 shrink-0" title="로그아웃"><span className="text-sm">🚪</span></Button>
            </div>
        </div>
      </header>

      {/* 2. 검색/정렬 */}
      <div className="bg-white px-4 py-3 border-b border-gray-100 max-w-7xl mx-auto">
        <div className="flex items-center gap-2"> 
            <div className="relative flex-1 min-w-0">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                <Input placeholder="비품명 검색" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 bg-gray-50 border-gray-200 h-10 text-sm w-full" />
            </div>
            <select className="shrink-0 border border-gray-200 rounded-md px-2 py-2 text-sm bg-white h-10 cursor-pointer" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="name">가나다순</option>
                <option value="recent">최신순</option>
                <option value="available">재고순</option>
            </select>
        </div>
      </div>

      {/* 3. 즐겨찾기 탭 + 카테고리 풀다운 */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 mb-2 relative">
        <div className="max-w-7xl mx-auto flex items-center gap-2">
            
            {/* [전체] 버튼 */}
            <button 
                onClick={() => setSelectedCategory("전체")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                    selectedCategory === "전체" 
                        ? 'bg-slate-800 text-white border-slate-800' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
            >
                전체
            </button>

            {/* 즐겨찾기 탭 (최대 2개) */}
            {favoriteCats.map((cat) => (
                <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border flex items-center gap-1 ${
                        selectedCategory === cat
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'
                    }`}
                >
                    <Star size={12} fill="currentColor" />
                    {cat}
                </button>
            ))}

            {/* [카테고리 ▼] 드롭다운 버튼 */}
            <div className="relative" ref={categoryMenuRef}>
                <button
                    onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border flex items-center gap-1 transition-colors ${
                        isCategoryMenuOpen
                            ? 'border-slate-400 bg-slate-100'
                            : (!favoriteCats.includes(selectedCategory) && selectedCategory !== "전체")
                                ? 'border-slate-800 bg-white text-slate-800 ring-1 ring-slate-800'
                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                    }`}
                >
                    {(!favoriteCats.includes(selectedCategory) && selectedCategory !== "전체") 
                        ? selectedCategory 
                        : "카테고리"
                    }
                    <ChevronDown size={14} />
                </button>

                {/* 드롭다운 메뉴 내용 */}
                {isCategoryMenuOpen && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        <div className="bg-gray-50 px-3 py-2 text-xs font-bold text-gray-500 border-b flex justify-between items-center">
                             <span>전체 카테고리</span>
                             <button onClick={() => { setIsCatManagerOpen(true); setIsCategoryMenuOpen(false); }} className="text-[10px] text-blue-500 underline hover:text-blue-700">⚙️관리</button>
                        </div>

                        <div className="max-h-64 overflow-y-auto p-1">
                            {allCategories.map(cat => {
                                const isFav = favoriteCats.includes(cat);
                                const isSelected = selectedCategory === cat;
                                return (
                                    <div 
                                        key={cat} 
                                        onClick={() => {
                                            setSelectedCategory(cat);
                                            setIsCategoryMenuOpen(false);
                                        }}
                                        className={`flex items-center justify-between px-3 py-2 rounded text-sm cursor-pointer transition-colors ${isSelected ? "bg-slate-100 font-bold" : "hover:bg-slate-50"}`}
                                    >
                                        <span className={isSelected ? "text-slate-900" : "text-slate-600"}>{cat}</span>
                                        <button 
                                            onClick={(e) => toggleFavorite(e, cat)}
                                            className="p-1.5 hover:bg-slate-200 rounded-full transition-colors group"
                                            title={isFav ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                                        >
                                            <Star 
                                                size={16} 
                                                className={`transition-colors ${isFav ? "text-yellow-400" : "text-slate-300 group-hover:text-slate-400"}`} 
                                                fill={isFav ? "currentColor" : "none"}
                                            />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* 4. 메인 리스트 */}
      <div className="max-w-7xl mx-auto px-1"> 
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-1">
            {filteredItems.length === 0 ? (
                <div className="col-span-full py-20 text-center text-gray-400 text-sm">
                    {selectedCategory === "전체" ? "등록된 비품이 없습니다." : `"${selectedCategory}" 카테고리에 비품이 없습니다.`}
                </div>
            ) : filteredItems.map((item) => {
               const available = item.total_qty - item.rented_qty - item.broken_qty;
               const isOutOfStock = available <= 0;
               return (
                <div key={item.id} onClick={() => setSelectedItem(item)} className="relative group bg-white overflow-hidden cursor-pointer active:opacity-90 border border-transparent hover:border-gray-200">
                  <div className="aspect-square bg-gray-200 relative">
                      {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No img</div>}
                      <div className={`absolute bottom-0 right-0 text-white text-[10px] px-1.5 py-0.5 backdrop-blur-sm ${available > 0 ? "bg-black/60" : "bg-red-600/80"}`}>{available}/{item.total_qty}</div>
                      {isOutOfStock && <div className="absolute inset-0 bg-black/10 pointer-events-none flex items-center justify-center"><span className="text-white text-xs font-bold border border-white px-1 rounded bg-black/20">품절</span></div>}
                  </div>
                  <div className="p-1.5"><h3 className="text-[11px] leading-tight text-gray-900 truncate font-medium">{item.name}</h3></div>
                </div>
               );
            })}
        </div>
      </div>

      {/* 플로팅 장바구니 */}
      {cart.length > 0 && (
        <button 
            onClick={() => setIsCartOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center z-50 transition-transform hover:scale-105 active:scale-95"
        >
            <span className="text-2xl">🛒</span>
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-white">
                {cart.length}
            </span>
        </button>
      )}

      {/* 모달들 */}
      <ItemDetailModal 
        isOpen={!!selectedItem}
        item={selectedItem}
        categories={allCategories}
        onClose={() => setSelectedItem(null)}
        onUpdate={fetchItems}
        onAddToCart={addToCart}
      />
      <CartDrawer 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cart}
        onRemove={removeFromCart}
        onUpdateDate={updateCartDate}
        onUpdateQty={updateCartQty}
        onCheckout={handleCheckout}
      />
      <CategoryManagerModal isOpen={isCatManagerOpen} onClose={() => setIsCatManagerOpen(false)} onUpdate={() => { fetchCategories(); fetchItems(); }} />
    </main>
  );
}