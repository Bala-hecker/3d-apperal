"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Heart, 
  X, 
  Trash2, 
  ShoppingBag,
  Loader2
} from "lucide-react";

const getDisplayImage = (p) => {
  if (!p) return "";
  const isTemplate = p.is_template === true || !!p.glb_file_url || (p.category && (p.category.toLowerCase().trim() === "template" || p.category.toLowerCase().trim() === "custom-template" || p.category.toLowerCase().trim().startsWith("custom-"))) || (p.name && (p.name.toLowerCase().includes("template") || p.name.toLowerCase().includes("blank")));
  if (isTemplate && p.gallery_urls) {
    const urls = p.gallery_urls.includes(",") 
      ? p.gallery_urls.split(",").map(u => u.trim()).filter(Boolean)
      : [p.gallery_urls.trim()];
    if (urls.length > 0) return urls[0];
  }
  return p.texture_url || "";
};

export default function WishlistDrawer({ isOpen, onClose }) {
  const [wishlistIds, setWishlistIds] = useState([]);
  const [localProducts, setLocalProducts] = useState([]);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadWishlistData();
    window.addEventListener("wishlist-updated", loadWishlistData);
    return () => window.removeEventListener("wishlist-updated", loadWishlistData);
  }, []);

  const loadWishlistData = async () => {
    try {
      // 1. Load Wishlist IDs
      const storedWl = localStorage.getItem("apparel_wishlist");
      const wlIds = storedWl ? JSON.parse(storedWl) : [];
      setWishlistIds(wlIds);

      // 2. Load Local Custom Designs
      const storedLocal = localStorage.getItem("apparel_products_local");
      const lp = storedLocal ? JSON.parse(storedLocal) : [];
      setLocalProducts(lp);

      // 3. Fetch Catalog Products from Supabase
      const { data } = await supabase
        .from("products")
        .select("id, name, price, texture_url, category, glb_file_url, gallery_urls, is_template");
      if (data) {
        setCatalogProducts(data);
      }
    } catch (err) {
      console.error("Error loading wishlist items:", err);
    }
  };

  const handleRemoveItem = (productId) => {
    const updated = wishlistIds.filter(id => id !== productId);
    localStorage.setItem("apparel_wishlist", JSON.stringify(updated));
    setWishlistIds(updated);
    window.dispatchEvent(new Event("wishlist-updated"));
  };

  const handleMoveToCart = (product) => {
    const itemId = `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const isCustomDesign = product.id.toString().startsWith("custom_");
    
    const cartItem = {
      id: itemId,
      productId: product.id,
      name: isCustomDesign ? product.name : `${product.name} (Ready-to-Wear)`,
      baseTexture: product.texture_url,
      glbUrl: product.glb_file_url || null,
      thumbnailUrl: getDisplayImage(product),
      size: "M",
      quantity: 1,
      addedAt: new Date().toISOString(),
      price: product.price || 3999,
      fabric: isCustomDesign ? "premium" : "cotton",
      designCacheKey: isCustomDesign ? product.id : null
    };

    try {
      const stored = localStorage.getItem("apparel_cart");
      const currentCart = stored ? JSON.parse(stored) : [];
      
      const existingIdx = currentCart.findIndex(item => 
        item.productId === product.id && 
        item.size === "M"
      );
      
      if (existingIdx > -1) {
        currentCart[existingIdx].quantity += 1;
      } else {
        currentCart.push(cartItem);
      }
      
      localStorage.setItem("apparel_cart", JSON.stringify(currentCart));
      window.dispatchEvent(new Event("cart-updated"));
      
      // Remove from wishlist
      handleRemoveItem(product.id);
      
      // Close wishlist and open cart drawer for premium seamless flow
      onClose();
      setTimeout(() => {
        window.dispatchEvent(new Event("open-cart"));
      }, 300);
    } catch (err) {
      console.error("Failed to move item to bag:", err);
    }
  };

  // Compile full set of products
  const allProducts = [
    ...catalogProducts,
    ...localProducts.filter(lp => !catalogProducts.some(cp => cp.id === lp.id))
  ];
  const wishlistedItems = allProducts.filter(p => wishlistIds.includes(p.id));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm transition-opacity duration-300"
      />

      {/* Drawer Container */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10 select-none">
        <div className="w-screen max-w-md bg-zinc-950 border-l border-zinc-900 shadow-2xl flex flex-col justify-between h-full animate-in slide-in-from-right duration-300">
          
          {/* Header */}
          <div className="p-5 border-b border-zinc-900 bg-zinc-900/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
              <h2 className="font-extrabold text-sm text-white uppercase tracking-widest">
                My Wishlist ({wishlistedItems.length})
              </h2>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {wishlistedItems.length === 0 ? (
              <div className="py-24 text-center border border-dashed border-zinc-850 rounded-2xl bg-zinc-900/10 h-full flex flex-col items-center justify-center">
                <Heart className="w-12 h-12 text-zinc-800 mb-4 animate-pulse" />
                <p className="text-sm font-semibold text-zinc-500">Your wishlist is empty</p>
                <p className="text-xs text-zinc-650 mt-1.5 max-w-[200px] leading-relaxed">
                  Browse catalog blanks or designs and save them to your wishlist.
                </p>
              </div>
            ) : (
              wishlistedItems.map((product) => {
                const isCustom = product.id.toString().startsWith("custom_");
                return (
                  <div 
                    key={product.id} 
                    className="bg-zinc-900/40 border border-zinc-900/85 rounded-xl p-4 flex gap-4 items-start relative group"
                  >
                    {/* Thumbnail */}
                    <div className="w-18 h-18 bg-zinc-950 border border-zinc-850 rounded-lg overflow-hidden shrink-0 flex items-center justify-center relative">
                      <img 
                        src={getDisplayImage(product)} 
                        alt={product.name} 
                        className="w-full h-full object-cover" 
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      {isCustom && (
                        <div className="absolute top-1 left-1 bg-indigo-600/90 text-white font-mono text-[7px] font-extrabold px-1 rounded uppercase tracking-wider">
                          Custom
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-grow min-w-0 pr-6">
                      <h4 className="font-extrabold text-xs text-zinc-200 truncate group-hover:text-white transition-colors">
                        {product.name}
                      </h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5 uppercase font-bold tracking-wider">
                        {product.category || "Apparel"}
                      </p>
                      
                      <div className="flex items-center justify-between mt-3.5 pt-2 border-t border-zinc-900/50">
                        <span className="text-xs font-mono font-extrabold text-indigo-400">
                          ₹{(product.price || 3999).toLocaleString('en-IN')}
                        </span>
                        
                        <button 
                          onClick={() => handleMoveToCart(product)}
                          className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 transition-all cursor-pointer shadow-sm hover:shadow-indigo-600/20"
                        >
                          <ShoppingBag className="w-3 h-3" />
                          <span>Move to Bag</span>
                        </button>
                      </div>
                    </div>

                    {/* Remove Action */}
                    <button 
                      onClick={() => handleRemoveItem(product.id)}
                      className="absolute top-3 right-3 p-1.5 bg-zinc-950/80 hover:bg-red-500/10 border border-zinc-900 hover:border-red-500/20 text-zinc-600 hover:text-red-400 rounded-md transition-colors cursor-pointer"
                      title="Remove from saved list"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer controls */}
          <div className="p-5 border-t border-zinc-900 bg-zinc-950/30 backdrop-blur-md">
            <button 
              onClick={onClose}
              className="w-full bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-colors cursor-pointer text-center"
            >
              Continue Browsing
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
