"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import { 
  Star, 
  ShoppingBag, 
  ArrowLeft, 
  Loader2, 
  Sparkles, 
  CheckCircle, 
  ShieldCheck, 
  ThumbsUp, 
  Plus, 
  Minus, 
  Check, 
  MessageSquare,
  Box as BoxIcon,
  Sliders,
  X,
  Search,
  HelpCircle,
  Lock,
  ChevronLeft,
  ChevronRight,
  Truck,
  RefreshCw,
  Tag,
  Heart
} from "lucide-react";
import Link from "next/link";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const getSlug = (name) => {
  return (name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

const getCleanDescription = (desc) => {
  if (!desc) return "";
  return desc
    .replace(/<!--PERS:NAME=(true|false),NUMBER=(true|false)-->/g, "")
    .replace(/<!--STOCK:STATUS=(in_stock|out_of_stock)-->/g, "")
    .trim();
};

const isTemplateProduct = (p) => {
  if (!p) return false;
  if (p.glb_file_url) return true;
  if (p.is_template === true) return true;
  const cat = (p.category || "").toLowerCase().trim();
  if (cat === "custom-template" || cat === "template" || cat.startsWith("custom-")) return true;
  const name = (p.name || "").toLowerCase();
  if (name.includes("template") || name.includes("blank")) return true;
  return false;
};

export default function ProductDetailPage({ params }) {
  const router = useRouter();
  
  const [productId, setProductId] = useState(null);
  useEffect(() => {
    if (params) {
      if (params instanceof Promise) {
        params.then((res) => setProductId(res?.id));
      } else {
        setProductId(params.id);
      }
    }
  }, [params]);

  const [product, setProduct] = useState(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeMediaTab, setActiveMediaTab] = useState("photo");
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  
  const [selectedSize, setSelectedSize] = useState("M");
  const [quantity, setQuantity] = useState(1);
  const [customName, setCustomName] = useState("");
  const [customNumber, setCustomNumber] = useState("");
  const [activeToast, setActiveToast] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [enableCustomName, setEnableCustomName] = useState(false);
  const [enableCustomNumber, setEnableCustomNumber] = useState(false);
  const [stockStatus, setStockStatus] = useState("in_stock");

  const [hasPurchased, setHasPurchased] = useState(false);
  const [simulationMode, setSimulationMode] = useState(false);

  const [isHovering, setIsHovering] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });

  const [pincode, setPincode] = useState("");
  const [estimationResult, setEstimationResult] = useState(null);
  const [pincodeError, setPincodeError] = useState("");

  const [selectedRatingFilter, setSelectedRatingFilter] = useState(null);
  const [faqSearch, setFaqSearch] = useState("");
  const [faqInputQuestion, setFaqInputQuestion] = useState("");
  const [faqStatus, setFaqStatus] = useState("");
  const [localFaqs, setLocalFaqs] = useState([]);

  // Technical Specifications — loaded from localStorage (set by admin per product)
  const DEFAULT_SPECS = [
    { key: "Fit Profile",          val: "Relaxed Modern Boxy Fit" },
    { key: "Material",             val: "100% Organic Ring-Spun Cotton" },
    { key: "Fabric Weight",        val: "380 GSM Heavyweight" },
    { key: "Country of Assembly",  val: "India" },
  ];
  const [productSpecs, setProductSpecs] = useState(DEFAULT_SPECS);
  const [allowPersonalization, setAllowPersonalization] = useState(false);
  const [allowNamePersonalization, setAllowNamePersonalization] = useState(false);
  const [allowNumberPersonalization, setAllowNumberPersonalization] = useState(false);

  // Load per-product specs from localStorage when productId is known
  useEffect(() => {
    if (!productId) return;
    try {
      const raw = localStorage.getItem(`apparel_specs_${productId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) setProductSpecs(parsed);
        else setProductSpecs(DEFAULT_SPECS);
      } else {
        setProductSpecs(DEFAULT_SPECS);
      }
      
      const rawPers = localStorage.getItem(`apparel_personalization_${productId}`);
      setAllowPersonalization(rawPers === "true");
      
      const rawPersName = localStorage.getItem(`apparel_pers_name_${productId}`);
      const enableName = rawPersName === "true";
      setAllowNamePersonalization(enableName);
      setEnableCustomName(enableName);

      const rawPersNumber = localStorage.getItem(`apparel_pers_number_${productId}`);
      const enableNumber = rawPersNumber === "true";
      setAllowNumberPersonalization(enableNumber);
      setEnableCustomNumber(enableNumber);

      const rawStock = localStorage.getItem(`apparel_stock_${productId}`);
      setStockStatus(rawStock || "in_stock");
    } catch { 
      setProductSpecs(DEFAULT_SPECS); 
      setAllowPersonalization(false);
      setAllowNamePersonalization(false);
      setAllowNumberPersonalization(false);
      setEnableCustomName(false);
      setEnableCustomNumber(false);
      setStockStatus("in_stock");
    }
  }, [productId]);

  const [reviews, setReviews] = useState([]);
  const [reviewerName, setReviewerName] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewStatus, setReviewStatus] = useState({ type: "", text: "" });

  // Touch/swipe state for mobile gallery
  const [touchStartX, setTouchStartX] = useState(null);

  const threeContainerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const modelRef = useRef(null);
  const animateFrameIdRef = useRef(null);
  const [loading3D, setLoading3D] = useState(false);

  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => setActiveToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  // Check wishlist on mount
  useEffect(() => {
    if (!productId) return;
    try {
      const wl = JSON.parse(localStorage.getItem("apparel_wishlist") || "[]");
      setIsWishlisted(wl.includes(productId));
    } catch {}
  }, [productId]);

  const toggleWishlist = () => {
    try {
      const wl = JSON.parse(localStorage.getItem("apparel_wishlist") || "[]");
      let updated;
      if (isWishlisted) {
        updated = wl.filter(id => id !== productId);
      } else {
        updated = [...wl, productId];
      }
      localStorage.setItem("apparel_wishlist", JSON.stringify(updated));
      setIsWishlisted(!isWishlisted);
      
      // Dispatch custom event to sync shared Navbar badge
      window.dispatchEvent(new Event("wishlist-updated"));

      setActiveToast({
        title: isWishlisted ? "💔 Removed from Wishlist" : "❤️ Added to Wishlist",
        message: isWishlisted ? "Item removed from your saved list." : `${product?.name} saved to your wishlist!`
      });
    } catch {}
  };

  // Load product
  useEffect(() => {
    if (!productId) return;
    const fetchProductData = async () => {
      setLoadingProduct(true);
      setErrorMsg("");
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", productId)
          .single();
        if (error) {
          loadLocalProductFallback();
        } else if (data) {
          setProduct(data);
          
          const pers = parseDescriptionPersonalization(data.description);
          if (data.description && (data.description.includes("<!--PERS:") || data.description.includes("<!--STOCK:"))) {
            const enableName = pers.allowName;
            const enableNumber = pers.allowNumber;
            
            setAllowPersonalization(enableName || enableNumber);
            setAllowNamePersonalization(enableName);
            setAllowNumberPersonalization(enableNumber);
            setEnableCustomName(enableName);
            setEnableCustomNumber(enableNumber);
            setStockStatus(pers.stockStatus);
          } else {
            // Check localStorage setting
            try {
              const rawPers = localStorage.getItem(`apparel_personalization_${productId}`);
              const rawPersName = localStorage.getItem(`apparel_pers_name_${productId}`);
              const rawPersNumber = localStorage.getItem(`apparel_pers_number_${productId}`);
              const rawStock = localStorage.getItem(`apparel_stock_${productId}`);
              
              const enableName = rawPersName === "true";
              const enableNumber = rawPersNumber === "true";
              
              setAllowPersonalization(rawPers === "true" || enableName || enableNumber);
              setAllowNamePersonalization(enableName);
              setAllowNumberPersonalization(enableNumber);
              setEnableCustomName(enableName);
              setEnableCustomNumber(enableNumber);
              setStockStatus(rawStock || "in_stock");
            } catch {
              // ignore and default to false / in_stock
            }
          }
        } else {
          loadLocalProductFallback();
        }
      } catch (err) {
        loadLocalProductFallback();
      } finally {
        setLoadingProduct(false);
      }
    };

    const parseDescriptionPersonalization = (descString) => {
      const result = {
        cleanDescription: descString || "",
        allowName: false,
        allowNumber: false,
        stockStatus: "in_stock"
      };
      if (!descString) return result;
      
      const match = descString.match(/<!--PERS:NAME=(true|false),NUMBER=(true|false)-->/);
      if (match) {
        result.allowName = match[1] === "true";
        result.allowNumber = match[2] === "true";
      }

      const stockMatch = descString.match(/<!--STOCK:STATUS=(in_stock|out_of_stock)-->/);
      if (stockMatch) {
        result.stockStatus = stockMatch[1];
      }

      result.cleanDescription = descString
        .replace(/<!--PERS:NAME=(true|false),NUMBER=(true|false)-->/g, "")
        .replace(/<!--STOCK:STATUS=(in_stock|out_of_stock)-->/g, "")
        .trim();

      return result;
    };

    const loadLocalProductFallback = () => {
      try {
        const stored = localStorage.getItem("apparel_products_local");
        const fallbackList = stored ? JSON.parse(stored) : [];
        const localProduct = fallbackList.find(p => p.id === productId);
        if (localProduct) {
          setProduct(localProduct);
          
          const pers = parseDescriptionPersonalization(localProduct.description);
          if (localProduct.description && (localProduct.description.includes("<!--PERS:") || localProduct.description.includes("<!--STOCK:"))) {
            const enableName = pers.allowName;
            const enableNumber = pers.allowNumber;
            
            setAllowPersonalization(enableName || enableNumber);
            setAllowNamePersonalization(enableName);
            setAllowNumberPersonalization(enableNumber);
            setEnableCustomName(enableName);
            setEnableCustomNumber(enableNumber);
            setStockStatus(pers.stockStatus);
          } else {
            try {
              const rawPers = localStorage.getItem(`apparel_personalization_${productId}`);
              const rawPersName = localStorage.getItem(`apparel_pers_name_${productId}`);
              const rawPersNumber = localStorage.getItem(`apparel_pers_number_${productId}`);
              const rawStock = localStorage.getItem(`apparel_stock_${productId}`);
              
              const enableName = rawPersName === "true";
              const enableNumber = rawPersNumber === "true";
              
              setAllowPersonalization(rawPers === "true" || enableName || enableNumber);
              setAllowNamePersonalization(enableName);
              setAllowNumberPersonalization(enableNumber);
              setEnableCustomName(enableName);
              setEnableCustomNumber(enableNumber);
              setStockStatus(rawStock || "in_stock");
            } catch {
              // ignore
            }
          }
        } else {
          setErrorMsg("Garment product could not be retrieved from active catalog.");
        }
      } catch (err) {
        setErrorMsg("Garment product could not be retrieved from active catalog.");
      }
    };
    fetchProductData();
  }, [productId]);

  useEffect(() => {
    if (!productId) return;
    const checkPurchaseHistory = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        const storedOrders = localStorage.getItem("apparel_orders");
        const localOrdersList = storedOrders ? JSON.parse(storedOrders) : [];
        const hasLocalPurchase = localOrdersList.some(order =>
          (order.items || []).some(item => item.productId === productId)
        );
        if (hasLocalPurchase) { setHasPurchased(true); return; }
        if (userId) {
          const { data, error } = await supabase.from("orders").select("*").eq("user_id", userId);
          if (!error && data) {
            const hasDbPurchase = data.some(order =>
              (order.items || []).some(item => item.productId === productId)
            );
            if (hasDbPurchase) { setHasPurchased(true); return; }
          }
        }
        setHasPurchased(false);
      } catch (e) {
        setHasPurchased(false);
      }
    };
    checkPurchaseHistory();
  }, [productId]);

  useEffect(() => { if (!productId) return; fetchReviews(); }, [productId]);
  useEffect(() => {
    if (!productId) return;
    const stored = localStorage.getItem(`apparel_faqs_${productId}`);
    if (stored) setLocalFaqs(JSON.parse(stored));
  }, [productId]);

  const fetchReviews = async () => {
    if (!productId) return;
    try {
      const { data, error } = await supabase
        .from("product_reviews").select("*").eq("product_id", productId).order("created_at", { ascending: false });
      if (error) { loadLocalReviewsFallback(); }
      else {
        const localReviews = getLocalReviews();
        setReviews(mergeReviews(data || [], localReviews));
      }
    } catch (err) { loadLocalReviewsFallback(); }
  };

  const getLocalReviews = () => {
    try { return JSON.parse(localStorage.getItem("apparel_reviews_local") || "[]"); } catch { return []; }
  };

  const loadLocalReviewsFallback = () => {
    setReviews(getLocalReviews().filter(r => r.product_id === productId));
  };

  const mergeReviews = (dbReviews, localReviews) => {
    const localForThisProduct = localReviews.filter(r => r.product_id === productId);
    const combined = [...dbReviews];
    localForThisProduct.forEach((localRev) => {
      const exists = combined.some(dbRev => dbRev.author === localRev.author && dbRev.comment === localRev.comment);
      if (!exists) combined.unshift(localRev);
    });
    return combined;
  };

  // Three.js
  useEffect(() => {
    if (activeMediaTab !== "3d" || !product || !product.glb_file_url || !threeContainerRef.current) {
      cleanupThree();
      return;
    }
    setLoading3D(true);
    const container = threeContainerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 450;
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0.35, 2.3);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const d1 = new THREE.DirectionalLight(0xffffff, 0.85);
    d1.position.set(2, 4, 3); d1.castShadow = true; scene.add(d1);
    const d2 = new THREE.DirectionalLight(0xa5b4fc, 0.45);
    d2.position.set(-2, -2, -3); scene.add(d2);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.05;
    controls.maxDistance = 10; controls.minDistance = 1; controls.target.set(0, 0.35, 0);
    // Dynamically process the flat layout texture to match the Studio's alignment and seamless base color
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      const w = 512;
      const h = 512;
      const halfW = 256;
      
      // Draw split halves 1:1 exactly as-is to map front/back bodices correctly
      ctx.drawImage(img, 0, 0, img.width / 2, img.height, 0, 0, halfW, h);
      ctx.drawImage(img, img.width / 2, 0, img.width / 2, img.height, halfW, 0, halfW, h);
      
      // Perform pixel replacement to clean up neutral grey backgrounds
      try {
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        
        const rTarget = 255;
        const gTarget = 255;
        const bTarget = 255;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i+1];
          const b = data[i+2];
          
          const diffRG = Math.abs(r - g);
          const diffGB = Math.abs(g - b);
          const diffRB = Math.abs(r - b);
          
          if (diffRG < 18 && diffGB < 18 && diffRB < 18) {
            if (r >= 85 && r <= 225) {
              data[i] = rTarget;
              data[i+1] = gTarget;
              data[i+2] = bTarget;
            }
          }
        }
        ctx.putImageData(imgData, 0, 0);
      } catch (pixelErr) {
        console.warn("Product detail page pixel replacement failed:", pixelErr);
      }
      
      const processedTexture = new THREE.CanvasTexture(canvas);
      processedTexture.colorSpace = THREE.SRGBColorSpace;
      processedTexture.flipY = true; // Auto-flip vertically to align right-side up in WebGL UV space
      
      const loader = new GLTFLoader();
      loader.load(product.glb_file_url, (gltf) => {
        const model = gltf.scene;
        modelRef.current = model;
        model.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true; node.receiveShadow = true;
            node.material.map = processedTexture;
            if (node.material.color) node.material.color.set("#ffffff");
            node.material.roughness = 0.8; node.material.metalness = 0.1; node.material.needsUpdate = true;
          }
        });
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        model.position.x += (model.position.x - center.x);
        model.position.y += (model.position.y - center.y);
        model.position.z += (model.position.z - center.z);
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) { const scale = 1.6 / maxDim; model.scale.set(scale, scale, scale); }
        scene.add(model);
        setLoading3D(false);
      }, undefined, () => setLoading3D(false));
    };
    img.onerror = () => setLoading3D(false);
    img.src = product.texture_url;
    const animate = () => {
      controls.update(); renderer.render(scene, camera);
      animateFrameIdRef.current = requestAnimationFrame(animate);
    };
    animate();
    const handleResize = () => {
      if (!container || !rendererRef.current) return;
      const w = container.clientWidth; const h = container.clientHeight || 450;
      camera.aspect = w / h; camera.updateProjectionMatrix(); rendererRef.current.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("resize", handleResize); cleanupThree(); };
  }, [activeMediaTab, product]);

  const cleanupThree = () => {
    if (animateFrameIdRef.current) { cancelAnimationFrame(animateFrameIdRef.current); animateFrameIdRef.current = null; }
    if (rendererRef.current) { rendererRef.current.dispose(); rendererRef.current = null; }
    if (sceneRef.current) { sceneRef.current.clear(); sceneRef.current = null; }
    modelRef.current = null;
  };

  const getGalleryUrls = () => {
    if (!product) return [];
    const baseList = [product.texture_url];
    if (product.gallery_urls) {
      let additional = [];
      if (product.gallery_urls.startsWith("data:image")) {
        additional = [product.gallery_urls];
      } else {
        additional = product.gallery_urls.split(",").map(url => url.trim()).filter(Boolean);
      }
      additional.forEach(url => {
        if (!baseList.includes(url)) {
          baseList.push(url);
        }
      });
    }
    return baseList;
  };

  const images = getGalleryUrls();

  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x, y });
  };

  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        setActivePhotoIndex(prev => Math.min(prev + 1, images.length - 1));
      } else {
        setActivePhotoIndex(prev => Math.max(prev - 1, 0));
      }
    }
    setTouchStartX(null);
  };

  const handleEstimateDelivery = (e) => {
    e.preventDefault();
    setPincodeError(""); setEstimationResult(null);
    if (!pincode.trim() || !/^[1-9][0-9]{5}$/.test(pincode)) {
      setPincodeError("Please enter a valid 6-digit Indian PIN code."); return;
    }
    
    const startsWith3 = pincode.substring(0, 3);
    const startsWith2 = pincode.substring(0, 2);
    const startsWith1 = pincode.charAt(0);
    const today = new Date();
    let estimate = { date: "", carrier: "", hub: "Chennai Customization Hub" };
    
    // Check zone distance from Chennai
    if (startsWith3 >= "600" && startsWith3 <= "603" || startsWith3 === "609" || pincode.startsWith("600")) {
      // Local Chennai Pincodes (Fastest Local Dispatch)
      const d = new Date(today); d.setDate(today.getDate() + 9); 
      estimate = { 
        date: `Estimated: 7-9 Business Days (${d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })})`, 
        carrier: "BlueDart Local Express", 
        hub: "Chennai Main Customization Hub" 
      };
    } else if (startsWith2 >= "60" && startsWith2 <= "64") {
      // Tamil Nadu State region
      const d = new Date(today); d.setDate(today.getDate() + 10); 
      estimate = { 
        date: `Estimated: 8-10 Business Days (${d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })})`, 
        carrier: "Delhivery Surface Priority", 
        hub: "Chennai Main Customization Hub" 
      };
    } else if (startsWith1 === "5" || startsWith1 === "6") {
      // South India Zone (Karnataka, Kerala, AP, Telangana)
      const d = new Date(today); d.setDate(today.getDate() + 11); 
      estimate = { 
        date: `Estimated: 9-11 Business Days (${d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })})`, 
        carrier: "BlueDart Priority Air", 
        hub: "Chennai Main Customization Hub" 
      };
    } else {
      // Pan-India National Zone (Rest of India)
      const d = new Date(today); d.setDate(today.getDate() + 14); 
      estimate = { 
        date: `Estimated: 10-14 Business Days (${d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })})`, 
        carrier: "Delhivery National Air", 
        hub: "Chennai Main Customization Hub" 
      };
    }
    setEstimationResult(estimate);
  };

  const handleAddToCart = () => {
    if (!product) return;
    setIsAdding(true);
    const itemId = `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const finalCustomName = enableCustomName ? (customName.trim() || null) : null;
    const finalCustomNumber = enableCustomNumber ? (customNumber.trim() || null) : null;
    const cartItem = {
      id: itemId, productId: product.id,
      name: `${product.name} (Ready-to-Wear)`,
      baseTexture: product.texture_url, glbUrl: product.glb_file_url, thumbnailUrl: product.texture_url,
      size: selectedSize, quantity, addedAt: new Date().toISOString(), price: product.price || 3999, fabric: "cotton",
      customName: finalCustomName,
      customNumber: finalCustomNumber
    };
    try {
      const stored = localStorage.getItem("apparel_cart");
      const currentCart = stored ? JSON.parse(stored) : [];
      const existingIdx = currentCart.findIndex(item => 
        item.productId === product.id && 
        item.size === selectedSize && 
        !item.designCacheKey && 
        item.customName === finalCustomName && 
        item.customNumber === finalCustomNumber
      );
      if (existingIdx > -1) { currentCart[existingIdx].quantity += quantity; } else { currentCart.push(cartItem); }
      localStorage.setItem("apparel_cart", JSON.stringify(currentCart));
      window.dispatchEvent(new Event("cart-updated"));
      
      const toastMsg = finalCustomName 
        ? `${quantity}x ${product.name} personalized for "${finalCustomName}" has been added.`
        : `${quantity}x ${product.name} has been added to your shopping bag.`;
        
      setActiveToast({ title: "🛒 Added to Shopping Bag", message: toastMsg });
    } catch (e) { console.error("Cart addition failed:", e); }
    finally { setIsAdding(false); }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setReviewStatus({ type: "", text: "" });
    if (!reviewerName.trim()) { setReviewStatus({ type: "error", text: "Please enter your name." }); return; }
    if (!reviewTitle.trim()) { setReviewStatus({ type: "error", text: "Please provide a summary title." }); return; }
    if (!reviewComment.trim()) { setReviewStatus({ type: "error", text: "Please write a comment." }); return; }
    setSubmittingReview(true);
    const newReview = { product_id: productId, rating: reviewRating, title: reviewTitle, comment: reviewComment, author: reviewerName, created_at: new Date().toISOString() };
    try {
      const currentLocal = getLocalReviews();
      localStorage.setItem("apparel_reviews_local", JSON.stringify([newReview, ...currentLocal]));
    } catch {}
    let supabaseSuccess = false;
    try {
      const { error } = await supabase.from("product_reviews").insert([newReview]);
      if (!error) supabaseSuccess = true;
    } catch {}
    setSubmittingReview(false);
    setReviewStatus({ type: "success", text: supabaseSuccess ? "Thank you! Your review has been published." : "Review saved locally! (Database sync pending)" });
    setReviewerName(""); setReviewTitle(""); setReviewComment(""); setReviewRating(5);
    fetchReviews();
  };

  const handleFaqSubmit = (e) => {
    e.preventDefault();
    setFaqStatus("");
    if (!faqInputQuestion.trim()) return;
    const newQ = { question: faqInputQuestion, answer: "Thank you for asking! A textile developer will review shortly.", isCustom: true, id: Date.now() };
    const updated = [newQ, ...localFaqs];
    setLocalFaqs(updated);
    localStorage.setItem(`apparel_faqs_${productId}`, JSON.stringify(updated));
    setFaqInputQuestion("");
    setFaqStatus("Question submitted! Our team will respond shortly.");
    setTimeout(() => setFaqStatus(""), 4000);
  };

  const totalReviewsCount = reviews.length;
  const averageStars = totalReviewsCount > 0 ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviewsCount).toFixed(1) : "0.0";
  const ratingCounts = [0, 0, 0, 0, 0];
  reviews.forEach(r => { const starIdx = Math.min(Math.max(r.rating, 1), 5) - 1; ratingCounts[starIdx]++; });
  const getPercentageForStars = (starLevel) => {
    if (totalReviewsCount === 0) return 0;
    return Math.round((ratingCounts[starLevel - 1] / totalReviewsCount) * 100);
  };
  const filteredReviews = selectedRatingFilter ? reviews.filter(r => r.rating === selectedRatingFilter) : reviews;

  const baseFaqs = [
    { question: "Can I customize the color overlay or upload logos on this product?", answer: "No, this is a ready-to-wear pre-designed catalog item. For custom decals and 3D color mapping, head to our 3D Design Studio tab." },
    { question: "What is your return and exchange policy?", answer: "Due to the custom-made, on-demand fabrication and print sublimation process of all our customized items, we do not accept returns, refunds, or exchanges once an order enters production." },
    { question: "What specific fabric structure does this use?", answer: "High-density ringspun organic cotton (380 GSM). Premium double-knitted draping structure that fits flat with minimal wrinkles." },
    { question: "How long does fabrication take?", answer: "Pre-designed inventory is processed at our Bangalore/Delhi hubs and shipped instantly. Use the zip code estimator for exact dates." }
  ];
  const allFaqs = [...localFaqs, ...baseFaqs].filter(faq => {
    if (!faqSearch.trim()) return true;
    const s = faqSearch.toLowerCase();
    return faq.question.toLowerCase().includes(s) || faq.answer.toLowerCase().includes(s);
  });

  const [relatedProducts, setRelatedProducts] = useState([]);
  useEffect(() => {
    if (!productId) return;
    const fetchRelated = async () => {
      try {
        const { data } = await supabase.from("products").select("*").neq("id", productId).limit(4);
        if (data && data.length > 0) {
          const isTP = (p) => { if (p.glb_file_url) return true; if (p.is_template === true) return true; const c = (p.category || "").toLowerCase(); return c === "custom-template" || c === "template"; };
          setRelatedProducts(data.filter(p => !isTP(p)));
        }
      } catch {}
    };
    fetchRelated();
  }, [productId]);

  const canSubmitReview = hasPurchased || simulationMode;

  if (loadingProduct) return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white font-sans">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
      <p className="text-sm font-medium text-zinc-400">Fetching product details...</p>
    </div>
  );

  if (errorMsg) return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center">
        <div className="py-24 text-center max-w-lg mx-auto border border-zinc-900 bg-zinc-950/40 rounded-3xl p-10">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4 text-xl">⚠️</div>
          <h3 className="font-extrabold text-lg text-white">Item Retrieval Failed</h3>
          <p className="text-zinc-400 text-xs mt-2 leading-relaxed">{errorMsg}</p>
          <Link href="/dashboard" className="mt-6 inline-block px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors">Back to Catalog</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans pb-28 relative overflow-x-hidden">
      
      {/* Ambient glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/8 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-[40%] right-1/4 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[160px] pointer-events-none -z-10" />

      <Navbar />

      {/* Slide-in Toast */}
      {activeToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 min-w-[300px] max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-2xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0 text-sm">✓</div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-white">{activeToast.title}</h4>
            <p className="text-sm text-zinc-400 mt-0.5 leading-normal">{activeToast.message}</p>
            <div className="flex gap-3 mt-2">
              <button onClick={() => window.dispatchEvent(new Event("open-cart"))} className="text-xs font-extrabold text-indigo-400 underline underline-offset-2 hover:text-indigo-300 cursor-pointer">Checkout Now →</button>
              <button onClick={() => setActiveToast(null)} className="text-xs font-bold text-zinc-500 hover:text-zinc-400">Dismiss</button>
            </div>
          </div>
          <button onClick={() => setActiveToast(null)} className="text-zinc-600 hover:text-zinc-400 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {product && (
        <>
          {/* Sticky Add-to-Cart bar (mobile) */}
          <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-zinc-950/95 border-t border-zinc-900 backdrop-blur-md px-4 py-3 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs font-extrabold text-white truncate">{product.name}</p>
              <p className="text-indigo-400 font-black text-sm">₹{product.price ? product.price.toLocaleString('en-IN') : "3,999"}</p>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={isAdding || stockStatus === "out_of_stock"}
              className={`px-5 py-2.5 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shrink-0 ${stockStatus === "out_of_stock" ? "bg-zinc-800 border border-zinc-700 text-zinc-500 cursor-not-allowed" : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"}`}
            >
              {stockStatus === "out_of_stock" ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Out of Stock</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Add to Bag</span>
                </>
              )}
            </button>
          </div>
        </>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 relative z-10">

        {/* Breadcrumb row */}
        <div className="mb-6 flex justify-between items-center flex-wrap gap-3">
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-semibold hover:border-zinc-700 transition-all cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Shop Catalog</span>
          </Link>
          {process.env.NODE_ENV !== "production" && !hasPurchased && (
            <button
              onClick={() => setSimulationMode(!simulationMode)}
              className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border tracking-wider transition-all cursor-pointer flex items-center gap-1 ${simulationMode ? "bg-emerald-600/25 border-emerald-500/30 text-emerald-400" : "bg-zinc-900/60 border-zinc-800/80 text-zinc-500 hover:text-zinc-400"}`}
            >
              <span>⚡ Dev:{simulationMode ? " BUYER ACTIVE" : " OFF"}</span>
            </button>
          )}
        </div>

        {loadingProduct ? (
          <div className="py-32 flex flex-col items-center justify-center text-zinc-500">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
            <p className="text-sm font-medium">Fetching catalog apparel details...</p>
          </div>
        ) : product && (
          <div className="space-y-14">

            {/* ====== MAIN PRODUCT SECTION ====== */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

              {/* LEFT: Amazon-style gallery */}
              <div className="lg:col-span-7">
                <div className="flex gap-3 sm:gap-4">

                  {/* Vertical Thumbnail Strip (desktop) */}
                  {images.length > 1 && (
                    <div className="hidden sm:flex flex-col gap-2 shrink-0 w-16">
                      {images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActivePhotoIndex(idx)}
                          className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                            activePhotoIndex === idx
                              ? "border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg shadow-indigo-500/10"
                              : "border-zinc-800 hover:border-zinc-600"
                          }`}
                        >
                          <img src={img} alt={`View ${idx + 1}`} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Main Image Viewer */}
                  <div className="flex-1 space-y-3">

                    {/* 3D / Photo toggle — only for GLB products */}
                    {product.glb_file_url && (
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          onClick={() => setActiveMediaTab("photo")}
                          className={`px-4 py-1.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-all cursor-pointer border ${activeMediaTab === "photo" ? "bg-indigo-600 border-indigo-500 text-white shadow-md" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"}`}
                        >
                          Photos
                        </button>
                        <button
                          onClick={() => setActiveMediaTab("3d")}
                          className={`px-4 py-1.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-all cursor-pointer border flex items-center gap-1 ${activeMediaTab === "3d" ? "bg-indigo-600 border-indigo-500 text-white shadow-md" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"}`}
                        >
                          <Sparkles className="w-3 h-3" />
                          3D View
                        </button>
                      </div>
                    )}

                    {/* Main Display Area */}
                    <div className="relative bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden"
                      style={{ aspectRatio: '4/5', maxHeight: '580px' }}>
                      
                      {activeMediaTab === "photo" ? (
                        <div
                          className="w-full h-full relative flex items-center justify-center cursor-zoom-in select-none"
                          onMouseMove={handleMouseMove}
                          onMouseEnter={() => setIsHovering(true)}
                          onMouseLeave={() => setIsHovering(false)}
                          onTouchStart={handleTouchStart}
                          onTouchEnd={handleTouchEnd}
                        >
                          <img
                            src={images[activePhotoIndex]}
                            alt={`${product.name} - View ${activePhotoIndex + 1}`}
                            className="w-full h-full object-contain transition-opacity duration-300"
                            onError={(e) => { e.target.style.display = "none"; }}
                          />

                          {/* Zoom lens (desktop) */}
                          {isHovering && (
                            <div
                              className="absolute rounded-full border-2 border-indigo-500/70 pointer-events-none shadow-2xl z-10 hidden sm:block"
                              style={{
                                width: "180px", height: "180px",
                                left: `calc(${zoomPos.x}% - 90px)`, top: `calc(${zoomPos.y}% - 90px)`,
                                backgroundImage: `url(${images[activePhotoIndex]})`,
                                backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                                backgroundSize: "300% 300%", backgroundRepeat: "no-repeat",
                                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.9), inset 0 0 20px rgba(99,102,241,0.35)"
                              }}
                            />
                          )}

                          {/* Photo counter badge */}
                          <div className="absolute top-3 right-3 bg-zinc-950/80 border border-zinc-800 px-2 py-1 rounded-lg text-xs font-mono text-zinc-400 select-none backdrop-blur-sm">
                            {activePhotoIndex + 1} / {images.length}
                          </div>

                          {/* Prev/Next arrows (mobile swipe + desktop click) */}
                          {images.length > 1 && (
                            <>
                              <button
                                onClick={() => setActivePhotoIndex(prev => Math.max(prev - 1, 0))}
                                disabled={activePhotoIndex === 0}
                                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-zinc-950/70 border border-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-600 transition-all cursor-pointer disabled:opacity-20 backdrop-blur-sm"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setActivePhotoIndex(prev => Math.min(prev + 1, images.length - 1))}
                                disabled={activePhotoIndex === images.length - 1}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-zinc-950/70 border border-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-600 transition-all cursor-pointer disabled:opacity-20 backdrop-blur-sm"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="w-full h-full relative">
                          {loading3D && (
                            <div className="absolute inset-0 bg-zinc-950/80 flex flex-col items-center justify-center text-zinc-500 z-10 backdrop-blur-sm">
                              <Loader2 className="w-7 h-7 animate-spin text-zinc-400 mb-2.5" />
                              <p className="text-sm uppercase tracking-wider">Loading 3D Viewport...</p>
                            </div>
                          )}
                          <div ref={threeContainerRef} className="w-full h-full cursor-grab active:cursor-grabbing" style={{ minHeight: '400px' }} />
                          <div className="absolute bottom-3 left-3 bg-zinc-950/80 border border-zinc-900 px-2.5 py-1 rounded-lg text-xs text-zinc-400 select-none pointer-events-none font-mono backdrop-blur-sm">
                            Drag to Rotate · Scroll to Zoom
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Mobile horizontal thumbnail strip */}
                    {activeMediaTab === "photo" && images.length > 1 && (
                      <div className="flex sm:hidden items-center gap-2 overflow-x-auto py-1 select-none">
                        {images.map((img, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActivePhotoIndex(idx)}
                            className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${activePhotoIndex === idx ? "border-indigo-500" : "border-zinc-800"}`}
                          >
                            <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Dot indicators (mobile) */}
                    {images.length > 1 && activeMediaTab === "photo" && (
                      <div className="flex sm:hidden justify-center gap-1.5">
                        {images.map((_, idx) => (
                          <button key={idx} onClick={() => setActivePhotoIndex(idx)}
                            className={`rounded-full transition-all cursor-pointer ${activePhotoIndex === idx ? "w-4 h-1.5 bg-indigo-500" : "w-1.5 h-1.5 bg-zinc-700 hover:bg-zinc-600"}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT: Product info panel */}
              <div className="lg:col-span-5 space-y-5">

                {/* Product heading + badge */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {stockStatus === "in_stock" ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-extrabold px-2.5 py-1 rounded-full uppercase tracking-widest select-none">
                        <CheckCircle className="w-3.5 h-3.5" />
                        In Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-extrabold px-2.5 py-1 rounded-full uppercase tracking-widest select-none">
                        <X className="w-3.5 h-3.5" />
                        Out of Stock
                      </span>
                    )}
                    {product.category && (
                      <span className="inline-flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-bold px-2.5 py-1 rounded-full uppercase tracking-widest select-none">
                        <Tag className="w-3 h-3" />
                        {product.category}
                      </span>
                    )}
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-50 leading-tight">
                    {product.name}
                  </h1>

                  {/* Rating row */}
                  <div className="flex items-center gap-2.5 select-none">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star key={star} className={`w-3.5 h-3.5 ${star <= Math.round(Number(averageStars)) ? "fill-amber-400 text-amber-400" : "text-zinc-700"}`} />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-zinc-300">{averageStars}</span>
                    <span className="text-zinc-700">·</span>
                    <span className="text-xs text-indigo-400 font-bold cursor-pointer hover:underline">{totalReviewsCount} reviews</span>
                  </div>
                </div>

                {/* Price */}
                <div className="bg-gradient-to-r from-zinc-900/60 to-zinc-900/30 border border-zinc-800 p-4 rounded-2xl">
                  <span className="text-sm text-zinc-500 font-bold uppercase tracking-wider">Price</span>
                  <div className="flex items-baseline gap-3 mt-1">
                    <span className="text-3xl font-black text-indigo-400">
                      ₹{product.price ? product.price.toLocaleString('en-IN') : "3,999"}
                    </span>
                    <span className="text-sm text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      FREE Shipping
                    </span>
                  </div>
                  <p className="text-sm text-zinc-500 mt-1.5">Inclusive of all taxes</p>
                </div>

                {/* Size Selector */}
                <div className="space-y-2.5 select-none">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Select Size</span>
                    <span className="text-sm text-indigo-400 underline font-semibold cursor-pointer hover:text-indigo-300">Size Guide</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {["XS", "S", "M", "L", "XL", "XXL"].map(size => (
                      <button key={size} onClick={() => setSelectedSize(size)}
                        className={`min-w-[44px] h-11 px-2 rounded-xl text-xs font-extrabold transition-all border cursor-pointer ${selectedSize === size ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20" : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-white"}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantity */}
                <div className="space-y-2.5 select-none">
                  <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest block">Quantity</span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-xl gap-1 shadow-inner">
                      <button onClick={() => setQuantity(prev => Math.max(prev - 1, 1))} disabled={quantity <= 1}
                        className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white disabled:opacity-20 cursor-pointer transition-colors">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-10 text-center text-sm font-extrabold text-zinc-100">{quantity}</span>
                      <button onClick={() => setQuantity(prev => Math.min(prev + 1, 10))} disabled={quantity >= 10}
                        className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white disabled:opacity-20 cursor-pointer transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-sm text-zinc-600 font-medium">Max 10 per order</span>
                  </div>
                </div>

                {/* Jersey Personalization Form (For already existing/non-customized catalog items only) */}
                {!product.id.toString().startsWith("custom_") && allowPersonalization && (
                  <div className="bg-zinc-900/30 border border-zinc-800 p-4 rounded-2xl space-y-3.5 select-none animate-fade-in">
                    <div className="flex items-center gap-1.5 pb-2 border-b border-zinc-850">
                      <span className="text-sm text-zinc-400 font-bold uppercase tracking-widest">👕 Jersey Custom Personalization (Optional)</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      {allowNamePersonalization && (
                        <div className="space-y-1.5 col-span-2 sm:col-span-1">
                          <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider block">Custom Name</label>
                          <input
                            type="text"
                            maxLength={12}
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value.toUpperCase().replace(/[^A-Z\s]/g, ""))}
                            placeholder="e.g. BALA"
                            className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none placeholder-zinc-800 font-bold tracking-wider"
                          />
                        </div>
                      )}
                      {allowNumberPersonalization && (
                        <div className="space-y-1.5 col-span-2 sm:col-span-1">
                          <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider block">Custom Number</label>
                          <input
                            type="text"
                            maxLength={2}
                            value={customNumber}
                            onChange={(e) => setCustomNumber(e.target.value.replace(/\D/g, ""))}
                            placeholder="e.g. 10"
                            className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none placeholder-zinc-800 font-bold tracking-wider"
                          />
                        </div>
                      )}
                    </div>
                    
                    {(customName || customNumber) && (
                      <div className="bg-zinc-950/60 border border-zinc-900 p-2.5 rounded-xl flex items-center justify-between">
                        <span className="text-xs text-zinc-500 font-bold uppercase">Jersey Preview:</span>
                        <div className="bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 font-black text-sm px-3 py-0.5 rounded-lg tracking-widest uppercase">
                          {allowNamePersonalization && (customName || "NAME")}
                          {allowNamePersonalization && allowNumberPersonalization && " | "}
                          {allowNumberPersonalization && (customNumber || "00")}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Add to Cart + Wishlist */}
                <div className="flex gap-3 hidden lg:flex">
                  <button
                    onClick={handleAddToCart}
                    disabled={isAdding || stockStatus === "out_of_stock"}
                    className={`flex-1 py-3.5 text-white font-black text-sm rounded-2xl shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${stockStatus === "out_of_stock" ? "bg-zinc-800 border border-zinc-700 text-zinc-500 cursor-not-allowed" : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 hover:shadow-indigo-500/25"}`}
                  >
                    {stockStatus === "out_of_stock" ? (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Out of Stock</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" />
                        <span>{isAdding ? "Adding..." : "Add to Shopping Bag"}</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={toggleWishlist}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${isWishlisted ? "bg-rose-500/10 border-rose-500/30 text-rose-400" : "bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-rose-500/30 hover:text-rose-400"}`}
                    title={isWishlisted ? "Remove from Wishlist" : "Save to Wishlist"}
                  >
                    <Heart className={`w-5 h-5 ${isWishlisted ? "fill-rose-400" : ""}`} />
                  </button>
                </div>

                {/* Delivery Estimator */}
                <div className="bg-zinc-900/30 border border-zinc-800 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-sm text-zinc-400 font-bold uppercase tracking-widest">Delivery Estimator</span>
                  </div>
                  <form onSubmit={handleEstimateDelivery} className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                      placeholder="Enter 6-digit PIN code"
                      className="flex-1 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none placeholder-zinc-700 font-semibold font-mono"
                    />
                    <button type="submit"
                      className="px-4 py-2.5 bg-indigo-500/10 border border-indigo-500/25 hover:bg-indigo-600 hover:text-white text-indigo-400 rounded-xl text-xs font-bold transition-all cursor-pointer">
                      Check
                    </button>
                  </form>
                  {pincodeError && <p className="text-sm text-rose-400 font-semibold">{pincodeError}</p>}
                  {estimationResult && (
                    <div className="bg-zinc-950/50 border border-zinc-800 p-3 rounded-xl">
                      <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{estimationResult.date}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Trust Badges */}
                <div className="grid grid-cols-3 gap-2 text-center select-none">
                  {[
                    { icon: <ShieldCheck className="w-4 h-4 mx-auto text-indigo-400 mb-1" />, label: "Secure Payment" },
                    (allowNamePersonalization || allowNumberPersonalization || isTemplateProduct(product)) ? (
                      { icon: <X className="w-4 h-4 mx-auto text-rose-500 mb-1" />, label: "No Returns" }
                    ) : (
                      { icon: <RefreshCw className="w-4 h-4 mx-auto text-emerald-400 mb-1" />, label: "7-Day Returns" }
                    ),
                    { icon: <Star className="w-4 h-4 mx-auto text-amber-400 mb-1" />, label: "Quality Fabric" },
                  ].map((badge, i) => (
                    <div key={i} className="bg-zinc-900/20 border border-zinc-900/60 p-3 rounded-xl hover:border-zinc-800 transition-colors">
                      {badge.icon}
                      <span className="text-xs text-zinc-500 font-bold block uppercase tracking-wider">{badge.label}</span>
                    </div>
                  ))}
                </div>

                {/* Return Policy Notice Disclaimer */}
                {(allowNamePersonalization || allowNumberPersonalization || isTemplateProduct(product)) ? (
                  <div className="bg-rose-950/20 border border-rose-900/30 p-3.5 rounded-2xl flex items-start gap-2.5">
                    <span className="text-rose-500 font-bold text-xs select-none">⚠️</span>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-rose-400 uppercase tracking-wider">No Returns or Exchanges</h4>
                      <p className="text-xs text-zinc-500 leading-normal mt-0.5 font-medium">
                        Because each apparel garment is custom-printed, tailored, and fabricated specifically to your order, we do not accept returns or exchanges.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-950/20 border border-emerald-900/30 p-3.5 rounded-2xl flex items-start gap-2.5">
                    <span className="text-emerald-500 font-bold text-xs select-none">✓</span>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">7-Day Returns Accepted</h4>
                      <p className="text-xs text-zinc-500 leading-normal mt-0.5 font-medium">
                        Returns and exchanges are accepted within 7 days of delivery. The garment must be unworn, unwashed, and in its original premium packaging.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ====== DESCRIPTION & SPECS ====== */}
            <section className="bg-zinc-900/15 border border-zinc-900/60 rounded-3xl p-6 sm:p-10 backdrop-blur-md">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-7 space-y-4">
                  <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                    Product Description
                  </h2>
                  <h3 className="text-xl font-bold text-zinc-100">Streetwear Redefined in 3D</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                    {getCleanDescription(product.description) || "This premium streetwear garment is tailored from heavy-gauge organic ringspun cotton fibers. Carefully pre-shrunk for dimension retention, it features double-needle flatlock topstitching along the shoulders and hems for a clean modern finish."}
                  </p>
                  <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                    Our dynamic print overlays are embedded using digital pigment sublimation, providing high contrast and saturation that resists washing fades and maintains print longevity.
                  </p>
                </div>
                <div className="lg:col-span-5">
                  <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 mb-4">
                    <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                    Technical Specifications
                  </h2>
                  <div className="border border-zinc-800/60 rounded-2xl overflow-hidden divide-y divide-zinc-900/60 bg-zinc-950/30">
                    {[
                      { key: "Category", val: product.category || "t-shirt" },
                      ...productSpecs,
                      { key: "Item ID", val: product.id.substring(0, 10).toUpperCase() },
                    ].map(spec => (
                      <div key={spec.key} className="flex justify-between items-center px-4 py-3 text-xs hover:bg-zinc-900/20 transition-colors">
                        <span className="font-semibold text-zinc-500">{spec.key}</span>
                        <span className="font-bold text-zinc-200">{spec.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* ====== RELATED PRODUCTS ====== */}
            {relatedProducts.length > 0 && (
              <section>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                    <BoxIcon className="w-5 h-5 text-indigo-400" />
                    You May Also Like
                  </h2>
                  <Link href="/dashboard" className="text-sm text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider">View All →</Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {relatedProducts.map(item => (
                    <div
                      key={item.id}
                      onClick={() => router.push(`/product/${item.id}`)}
                      className="bg-zinc-900/25 border border-zinc-900 hover:border-zinc-700 rounded-2xl overflow-hidden cursor-pointer group transition-all hover:shadow-lg hover:shadow-zinc-950/50"
                    >
                      <div className="aspect-square bg-zinc-950 overflow-hidden">
                        <img src={item.texture_url} alt={item.name}
                          className="w-full h-full object-cover opacity-75 group-hover:opacity-100 transition-all duration-300 group-hover:scale-105" />
                      </div>
                      <div className="p-3">
                        <h4 className="font-bold text-xs text-zinc-200 truncate group-hover:text-white transition-colors">{item.name}</h4>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs font-black text-indigo-400">₹{(item.price || 3999).toLocaleString('en-IN')}</span>
                          <span className="text-xs font-bold text-zinc-500 group-hover:text-indigo-400 transition-colors">View →</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ====== FAQ SECTION ====== */}
            <section className="bg-zinc-900/15 border border-zinc-900/60 rounded-3xl p-6 sm:p-10 backdrop-blur-md space-y-6">
              <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                  <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-indigo-400" />
                    Customer Q&A
                  </h2>
                  <p className="text-sm text-zinc-500 mt-1">Questions about fit, fabric, care, and custom orders.</p>
                </div>
                <div className="relative">
                  <input type="text" value={faqSearch} onChange={(e) => setFaqSearch(e.target.value)}
                    placeholder="Search questions..."
                    className="bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-zinc-700 focus:outline-none w-44 font-semibold" />
                  <Search className="w-3.5 h-3.5 text-zinc-700 absolute left-3 top-2.5" />
                </div>
              </div>
              <form onSubmit={handleFaqSubmit} className="flex gap-2 bg-zinc-950/50 p-3 rounded-2xl border border-zinc-800">
                <input type="text" value={faqInputQuestion} onChange={(e) => setFaqInputQuestion(e.target.value)}
                  placeholder="Ask a question about this product..."
                  className="flex-1 bg-transparent px-2.5 py-1 text-xs text-white focus:outline-none placeholder-zinc-600 font-semibold" />
                <button type="submit" className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-600 hover:text-white border border-indigo-500/20 text-indigo-400 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0">
                  Ask
                </button>
              </form>
              {faqStatus && <p className="text-sm text-emerald-400 font-bold">{faqStatus}</p>}
              <div className="space-y-3">
                {allFaqs.length === 0 ? (
                  <div className="py-8 text-center text-zinc-600 text-xs font-semibold">No matching Q&As. Ask above!</div>
                ) : allFaqs.map((faq, idx) => (
                  <div key={faq.id || idx} className="bg-zinc-950/30 border border-zinc-900/60 p-4 rounded-2xl space-y-2">
                    <div className="flex gap-2 items-start text-xs text-zinc-100 font-bold">
                      <span className="bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded font-mono text-xs uppercase shrink-0">Q</span>
                      <p>{faq.question}</p>
                    </div>
                    <div className="flex gap-2 items-start text-sm text-zinc-400 leading-relaxed pl-8">
                      <span className="bg-zinc-900 text-zinc-500 border border-zinc-800 px-1.5 py-0.5 rounded font-mono text-xs uppercase shrink-0">A</span>
                      <p>{faq.answer}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ====== REVIEWS ====== */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start pt-8 border-t border-zinc-900">
              
              {/* Rating Summary */}
              <div className="lg:col-span-4 space-y-5 bg-zinc-900/20 border border-zinc-900 p-5 rounded-2xl select-none">
                <h2 className="text-sm font-extrabold text-white">Customer Reviews</h2>
                <div className="flex items-center gap-3">
                  <span className="text-5xl font-black text-indigo-400">{averageStars}</span>
                  <div>
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map(star => (
                        <Star key={star} className={`w-4 h-4 ${star <= Math.round(Number(averageStars)) ? "fill-amber-400 text-amber-400" : "text-zinc-700"}`} />
                      ))}
                    </div>
                    <p className="text-sm text-zinc-500 font-semibold mt-0.5">{totalReviewsCount} global ratings</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {[5,4,3,2,1].map(stars => {
                    const pct = getPercentageForStars(stars);
                    const isSelected = selectedRatingFilter === stars;
                    return (
                      <button key={stars} onClick={() => setSelectedRatingFilter(isSelected ? null : stars)}
                        className={`w-full flex items-center gap-3 text-xs text-zinc-400 font-medium hover:text-white transition-colors cursor-pointer text-left px-2 py-1.5 rounded-lg ${isSelected ? "bg-indigo-500/10 border border-indigo-500/20 text-white" : "border border-transparent hover:bg-zinc-900/30"}`}>
                        <span className="w-11 text-right text-sm">{stars} star</span>
                        <div className="flex-1 h-2 bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400/70 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-7 text-right font-mono font-bold text-sm">{pct}%</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reviews List + Form */}
              <div className="lg:col-span-8 space-y-10">
                
                {/* Submit Form */}
                <div className="bg-zinc-900/20 border border-zinc-900 p-5 sm:p-7 rounded-2xl">
                  <div className="flex justify-between items-center mb-5 flex-wrap gap-2">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-400" />
                      Write a Review
                    </h3>
                    {canSubmitReview && (
                      <span className="inline-flex items-center gap-1 text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded font-extrabold uppercase">
                        <ShieldCheck className="w-3 h-3" />
                        Verified Buyer
                      </span>
                    )}
                  </div>

                  {!canSubmitReview ? (
                    <div className="bg-zinc-950/80 border border-zinc-900 rounded-2xl p-6 text-center relative overflow-hidden select-none">
                      <Lock className="w-7 h-7 mx-auto text-zinc-600 mb-3" />
                      <h5 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Verified Purchase Required</h5>
                      <p className="text-sm text-zinc-500 max-w-sm mx-auto mt-2 leading-relaxed">Reviews are restricted to verified purchasers. Buy this item to share your experience!</p>
                      {process.env.NODE_ENV !== "production" && (
                        <button onClick={() => setSimulationMode(true)}
                          className="mt-4 px-4 py-1.5 bg-indigo-500/10 hover:bg-indigo-600 border border-indigo-500/20 text-indigo-400 hover:text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer">
                          ⚡ Dev: Enable Buyer Mode
                        </button>
                      )}
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitReview} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-zinc-400 font-bold uppercase tracking-wider block mb-1.5">Your Name</label>
                          <input type="text" value={reviewerName} onChange={(e) => setReviewerName(e.target.value)}
                            placeholder="e.g. John Doe"
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none placeholder-zinc-700 font-semibold" />
                        </div>
                        <div>
                          <label className="text-sm text-zinc-400 font-bold uppercase tracking-wider block mb-1.5 select-none">Rating</label>
                          <div className="flex items-center gap-1.5 py-2">
                            {[1,2,3,4,5].map(val => (
                              <button key={val} type="button" onClick={() => setReviewRating(val)} className="cursor-pointer">
                                <Star className={`w-6 h-6 transition-transform hover:scale-110 ${val <= reviewRating ? "fill-amber-400 text-amber-400" : "text-zinc-700 hover:text-zinc-500"}`} />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm text-zinc-400 font-bold uppercase tracking-wider block mb-1.5">Review Title</label>
                        <input type="text" value={reviewTitle} onChange={(e) => setReviewTitle(e.target.value)}
                          placeholder="Summarize your experience..."
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none placeholder-zinc-700 font-semibold" />
                      </div>
                      <div>
                        <label className="text-sm text-zinc-400 font-bold uppercase tracking-wider block mb-1.5">Comment</label>
                        <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="Write your detailed review..."
                          rows={3}
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none placeholder-zinc-700 resize-none font-semibold" />
                      </div>
                      {reviewStatus.text && (
                        <div className={`p-3 rounded-xl text-xs font-semibold ${reviewStatus.type === "success" ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}>
                          {reviewStatus.text}
                        </div>
                      )}
                      <div className="flex justify-end">
                        <button type="submit" disabled={submittingReview}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer">
                          {submittingReview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          Post Review
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Reviews list */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-indigo-400" />
                      {filteredReviews.length} {selectedRatingFilter ? `${selectedRatingFilter}-Star` : ""} Reviews
                    </h3>
                    {selectedRatingFilter && (
                      <button onClick={() => setSelectedRatingFilter(null)}
                        className="text-xs bg-indigo-600/10 border border-indigo-500/25 text-indigo-400 px-2 py-0.5 rounded font-extrabold uppercase hover:bg-indigo-600 hover:text-white transition-colors cursor-pointer">
                        Clear Filter ×
                      </button>
                    )}
                  </div>
                  {filteredReviews.length === 0 ? (
                    <div className="py-12 border border-dashed border-zinc-900 rounded-2xl text-center bg-zinc-900/5">
                      <p className="text-xs text-zinc-500 font-semibold">No reviews yet. Be the first!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredReviews.map((rev, idx) => (
                        <div key={rev.id || idx} className="bg-zinc-900/15 border border-zinc-900 p-5 rounded-2xl space-y-3 hover:bg-zinc-900/25 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600/30 to-purple-600/20 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm">
                                {(rev.author || "U").charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                                  <span>{rev.author || "Guest"}</span>
                                  <span className="text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-extrabold uppercase">Verified</span>
                                </h5>
                                <div className="flex items-center gap-0.5 mt-0.5">
                                  {[1,2,3,4,5].map(star => (
                                    <Star key={star} className={`w-2.5 h-2.5 ${star <= rev.rating ? "fill-amber-400 text-amber-400" : "text-zinc-700"}`} />
                                  ))}
                                </div>
                              </div>
                            </div>
                            <span className="text-xs text-zinc-600 font-mono">
                              {new Date(rev.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                            </span>
                          </div>
                          <div className="pl-10 space-y-1">
                            <h6 className="text-xs font-extrabold text-zinc-200">{rev.title}</h6>
                            <p className="text-sm text-zinc-400 leading-relaxed font-medium">{rev.comment}</p>
                          </div>
                          <div className="flex justify-end pl-10">
                            <button onClick={() => alert("Thank you for your feedback!")}
                              className="text-xs font-bold text-zinc-500 hover:text-zinc-300 flex items-center gap-1 cursor-pointer">
                              <ThumbsUp className="w-3 h-3" />
                              Helpful
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

          </div>
        )}
      </main>
    </div>
  );
}
