"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { saveDesignData } from "@/lib/indexedDb";
import { supabase } from "@/lib/supabase";
import {
  Sparkles,
  Layers,
  Settings,
  Type,
  Square,
  Circle,
  Paintbrush,
  Image as ImageIcon,
  Trash2,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Loader2,
  LogOut,
  Sliders,
  ChevronRight,
  RefreshCw,
  Plus,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
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

const isTemplateProduct = (p) => {
  if (!p) return false;
  if (p.glb_file_url) return true; // Any product with a GLB file is a 3D model template/blank for the studio!
  if (p.is_template === true) return true;
  const cat = (p.category || "").toLowerCase().trim();
  if (cat === "custom-template" || cat === "template" || cat.startsWith("custom-")) return true;
  const name = (p.name || "").toLowerCase();
  if (name.includes("template") || name.includes("blank")) return true;
  return false;
};

const createProceduralFabricTexture = (fabricType) => {
  if (typeof window === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  
  // Fill with neutral grey bump background
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, 128, 128);
  
  if (fabricType === "cotton") {
    // Coarse organic grid weave pattern
    ctx.strokeStyle = "#909090";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 128; i += 4) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(128, i);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 128);
      ctx.stroke();
    }
  } else if (fabricType === "polyester") {
    // Tight fine athletic mesh diagonal weave
    ctx.strokeStyle = "#888888";
    ctx.lineWidth = 0.8;
    for (let i = -128; i < 128; i += 3) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 128, 128);
      ctx.stroke();
    }
  } else if (fabricType === "fleece") {
    // Soft noise fleece pile/nap grain
    for (let x = 0; x < 128; x++) {
      for (let y = 0; y < 128; y++) {
        const val = Math.floor(128 + (Math.random() - 0.5) * 25);
        ctx.fillStyle = `rgb(${val},${val},${val})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(45, 45); 
  return texture;
};

export default function StudioPage() {
  const router = useRouter();
  
  // Auth state
  const [session, setSession] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Products state
  const [products, setProducts] = useState([]);
  const [activeProduct, setActiveProduct] = useState(null);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState("all");

  // Canvas / Studio references
  const fabricCanvasRef = useRef(null);
  const fabricCanvasElRef = useRef(null);
  const threeContainerRef = useRef(null);
  
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const modelRef = useRef(null);
  const textureRef = useRef(null);
  const hiddenCanvasRef = useRef(null);
  const animateFrameIdRef = useRef(null);
  const hasInitializedThreeRef = useRef(false);
  const hasInitializedFabricRef = useRef(false);
  
  // Studio UI Control State
  const [activeTab, setActiveTab] = useState("presets"); // presets, text, graphics, draw
  const [fillColor, setFillColor] = useState("#4f46e5");
  const [textColor, setTextColor] = useState("#ffffff");
  const [isDrawing, setIsDrawing] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [canvasHistory, setCanvasHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [isThreeReady, setIsThreeReady] = useState(false);
  const [isFabricReady, setIsFabricReady] = useState(false);
  const [garmentColor, setGarmentColor] = useState("#ffffff");
  const [selectedObjectType, setSelectedObjectType] = useState(null);
  
  // Custom Premium Fabric Selection state tokens
  const [selectedFabric, setSelectedFabric] = useState("cotton"); // cotton, polyester, fleece
  const fabricProperties = {
    cotton: { roughness: 0.85, metalness: 0.1, upcharge: 0, label: "Matte Organic Cotton", bumpScale: 0.04 },
    polyester: { roughness: 0.25, metalness: 0.45, upcharge: 999, label: "Shiny Athletic Polyester", bumpScale: 0.02 },
    fleece: { roughness: 1.0, metalness: 0.05, upcharge: 1299, label: "Heavy Luxury Fleece", bumpScale: 0.06 }
  };

  // Three.js Light References and Environment State
  const [lightingPreset, setLightingPreset] = useState("studio"); // studio, showroom, sunset
  const ambientLightRef = useRef(null);
  const dirLight1Ref = useRef(null);
  const dirLight2Ref = useRef(null);
  const isCopyingRef = useRef(false);

  // Admin Pre-design Publishing state
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishName, setPublishName] = useState("");
  const [publishPrice, setPublishPrice] = useState("3999");
  const [publishCategory, setPublishCategory] = useState("t-shirt");
  const [publishDescription, setPublishDescription] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  // Admin Identification
  const adminEmailSetting = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";
  const adminEmails = adminEmailSetting 
    ? adminEmailSetting.split(",").map(e => e.trim().toLowerCase())
    : ["admin@example.com", "admin@thread3d.com"];
  const isAdmin = session?.user?.email && adminEmails.includes(session.user.email.toLowerCase());

  // Security Audit Logging helper
  const addAuditLog = async (actionText) => {
    try {
      const email = session?.user?.email || "system-admin";
      await supabase.from("system_logs").insert([{ operator: email, action: actionText }]);
    } catch (err) {
      console.warn("Log failed:", err);
    }
  };

  const openPublishModal = () => {
    if (!activeProduct) {
      alert("Please select a garment to customize first!");
      return;
    }
    setPublishName(`Designer Special - ${activeProduct.name}`);
    setPublishPrice((activeProduct.price || 3999).toString());
    setPublishCategory(activeProduct.category || "t-shirt");
    setPublishDescription(`Exclusive designer pre-designed ${activeProduct.name} crafted inside the interactive 3D studio.`);
    setShowPublishModal(true);
  };

  const handlePublishToCatalog = async () => {
    if (!activeProduct) {
      alert("Please select a garment to customize first!");
      return;
    }

    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    setIsPublishing(true);

    // Show custom publishing modal overlay loader
    const loaderOverlay = document.createElement("div");
    loaderOverlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(9, 9, 11, 0.85);
      backdrop-filter: blur(8px);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      font-family: sans-serif;
    `;
    loaderOverlay.innerHTML = `
      <div style="width:50px; height:50px; border:4px solid #3f3f46; border-top-color:#6366f1; border-radius:50%; animation:spin 1s linear infinite; margin-bottom:20px;"></div>
      <p style="font-weight:bold; font-size:14px; margin-top:16px;">Publishing Design to Shop Catalog...</p>
      <p style="font-size:11px; color:#71717a; margin-top:6px;">Please wait while we render and upload your pre-designed garment.</p>
      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    `;
    document.body.appendChild(loaderOverlay);

    try {
      // 1. Helper to convert dataurl to Blob for supabase storage upload
      const dataURLtoBlob = (dataurl) => {
        let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], {type:mime});
      };

      // 2. Export composite flat texture map (just in case it's needed for other lookups)
      const designDataUrl = canvas.toDataURL({
        format: "png",
        quality: 0.95
      });
      const textureBlob = dataURLtoBlob(designDataUrl);
      const textureFileName = `${Date.now()}_flat_texture_${Math.random().toString(36).substr(2, 5)}.png`;
      const texturePath = `textures/${textureFileName}`;
      await supabase.storage
        .from("product-assets")
        .upload(texturePath, textureBlob, { cacheControl: "3600", upsert: false });

      // 3. Dynamic Side Captures inside WebGL Viewport!
      let galleryUrlsArray = [];
      let mainDisplayPhotoUrl = "";

      if (modelRef.current && rendererRef.current && sceneRef.current && cameraRef.current) {
        try {
          const originalRotationY = modelRef.current.rotation.y;
          
          // Define angles (in radians): Front (0 deg), Back (180 deg), Left Side (90 deg), Right Side (-90 deg)
          const angles = [
            { name: "front", rotY: 0 },
            { name: "back", rotY: Math.PI },
            { name: "left", rotY: Math.PI / 2 },
            { name: "right", rotY: -Math.PI / 2 }
          ];

          for (let angle of angles) {
            // Apply rotation to the 3D model
            modelRef.current.rotation.y = angle.rotY;
            // Force re-render the scene
            rendererRef.current.render(sceneRef.current, cameraRef.current);
            
            // Capture image as PNG Data URL
            const angleDataUrl = rendererRef.current.domElement.toDataURL("image/png");
            
            // Convert to Blob for upload
            const angleBlob = dataURLtoBlob(angleDataUrl);
            const angleFileName = `${Date.now()}_side_${angle.name}_${Math.random().toString(36).substr(2, 5)}.png`;
            const anglePath = `gallery/${angleFileName}`;
            
            // Upload to Supabase Storage in "gallery" subfolder
            const { error: angleUploadErr } = await supabase.storage
              .from("product-assets")
              .upload(anglePath, angleBlob, { cacheControl: "3600", upsert: false });
              
            if (!angleUploadErr) {
              const { data: angleUrlData } = supabase.storage
                .from("product-assets")
                .getPublicUrl(anglePath);
              
              galleryUrlsArray.push(angleUrlData.publicUrl);
              
              if (angle.name === "front") {
                mainDisplayPhotoUrl = angleUrlData.publicUrl;
              }
            }
          }
          
          // Restore original model rotation
          modelRef.current.rotation.y = originalRotationY;
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        } catch (captureErr) {
          console.warn("Could not capture dynamic side screenshots:", captureErr);
        }
      }

      // Fallback to flat texture if screenshot renders failed
      if (!mainDisplayPhotoUrl) {
        const { data: textureUrlData } = supabase.storage
          .from("product-assets")
          .getPublicUrl(texturePath);
        mainDisplayPhotoUrl = textureUrlData.publicUrl;
      }

      const galleryUrlsString = galleryUrlsArray.join(",");

      // 4. Insert new pre-designed product into products database
      const insertData = {
        name: publishName,
        glb_file_url: null, // Pre-designed items are standard catalog products (strictly 2D!)
        texture_url: mainDisplayPhotoUrl, // 3D Front Render becomes the premium shop main photo!
        price: parseFloat(publishPrice) || 3999,
        category: publishCategory,
        description: publishDescription || "Pre-designed premium garment customized by administrator in 3D studio.",
        is_template: false,
        gallery_urls: galleryUrlsString // Dynamic front/back/left/right 3D angles in product page!
      };

      const { error: insertErr } = await supabase.from("products").insert([insertData]);
      if (insertErr) throw insertErr;

      // 5. Log security audit trail
      await addAuditLog(`Published pre-designed standard catalog product "${publishName}" with 4-side 3D photos under category "${publishCategory}" with base price: ₹${parseFloat(publishPrice).toLocaleString('en-IN')}.`);

      alert("Design published successfully as a 4-side pre-designed catalog product!");
      setShowPublishModal(false);
    } catch (err) {
      console.error("Failed to publish design:", err.message || err);
      alert(`Publishing failed: ${err.message || err}`);
    } finally {
      document.body.removeChild(loaderOverlay);
      setIsPublishing(false);
    }
  };

  // 1. Auth and Products Fetching
  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        router.push("/auth");
      } else {
        setSession(currentSession);
        setCheckingAuth(false);
        await fetchProducts();
      }
    };
    checkAuthAndFetch();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!newSession) {
        router.push("/auth");
      } else {
        setSession(newSession);
        setCheckingAuth(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      const allProducts = data || [];
      const templates = allProducts.filter(isTemplateProduct);
      setProducts(templates);
      
      if (templates.length > 0) {
        const params = new URLSearchParams(window.location.search);
        const urlProductId = (params.get("product") || "").toLowerCase().trim();
        const selectedProduct = templates.find(p => p.id === urlProductId || getSlug(p.name) === urlProductId) || templates[0];
        setActiveProduct(selectedProduct);
      }
    } catch (err) {
      console.error("Error fetching products:", err.message);
    } finally {
      setLoadingProducts(false);
    }
  };

  // 2. Initialize Fabric.js (Initialized EXACTLY ONCE, completely decoupled from focus re-renders to prevent canvas clears)
  useEffect(() => {
    if (checkingAuth || !session) return;
    if (hasInitializedFabricRef.current) return; // Prevent any double-runs or focus-induced clears!

    hasInitializedFabricRef.current = true;

    // Dynamically load fabric on the client side
    import("fabric").then((fabricModule) => {
      const fabric = fabricModule.fabric;
      
      // Initialize Fabric Canvas with Premium Grab Cursors
      const canvas = new fabric.Canvas("fabric-canvas", {
        width: 512,
        height: 512,
        backgroundColor: "#ffffff",
        preserveObjectStacking: true,
        hoverCursor: "grab",
        moveCursor: "grabbing",
        freeDrawingCursor: "crosshair",
      });

      fabricCanvasRef.current = canvas;

      // Event listener to record history on modifications
      const saveState = () => {
        if (!canvas) return;
        const json = JSON.stringify(canvas.toJSON());
        setCanvasHistory((prev) => {
          const updated = prev.slice(0, historyIndex + 1);
          return [...updated, json];
        });
        setHistoryIndex((prev) => prev + 1);
      };

      canvas.on("object:added", saveState);
      canvas.on("object:modified", saveState);
      canvas.on("object:removed", saveState);

      // Keep selectedObjectType in sync for rendering custom scaling buttons
      canvas.on("selection:created", (e) => {
        const obj = e.selected?.[0];
        setSelectedObjectType(obj ? obj.type : null);
      });
      canvas.on("selection:updated", (e) => {
        const obj = e.selected?.[0];
        setSelectedObjectType(obj ? obj.type : null);
      });
      canvas.on("selection:cleared", () => {
        setSelectedObjectType(null);
      });

      // Explicit hover cursor sync to guarantee the move/grab hand shows up
      canvas.on("mouse:over", (e) => {
        if (e.target && !canvas.isDrawingMode) {
          canvas.setCursor("grab");
        }
      });
      canvas.on("mouse:down", (e) => {
        if (e.target && !canvas.isDrawingMode) {
          canvas.setCursor("grabbing");
        }
      });
      canvas.on("mouse:up", () => {
        if (!canvas.isDrawingMode) {
          canvas.setCursor("default");
        }
      });

      // Performance Optimization: Update 3D canvas texture only when Fabric renders
      canvas.on("after:render", () => {
        updateHiddenCanvas();
        if (textureRef.current) {
          textureRef.current.needsUpdate = true;
        }
      });

      // Save initial empty state
      const initialJson = JSON.stringify(canvas.toJSON());
      setCanvasHistory([initialJson]);
      setHistoryIndex(0);
      setIsFabricReady(true); // Signal Fabric canvas is fully initialized!
    });
  }, [checkingAuth, session]);

  // 2c. Handle actual unmount cleanup exactly once for Fabric canvas
  useEffect(() => {
    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
      setIsFabricReady(false);
      hasInitializedFabricRef.current = false;
    };
  }, []);

  // 2ca. Auto-load preloaded decal sticker onto canvas on mount
  useEffect(() => {
    if (!isFabricReady) return;

    const preloadedDecal = localStorage.getItem("apparel_preloaded_decal");
    if (preloadedDecal) {
      import("fabric").then((fabricModule) => {
        const fabric = fabricModule.fabric;
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        fabric.Image.fromURL(preloadedDecal, (img) => {
          img.set({
            left: 128,
            top: 185,
            originX: "center",
            originY: "center",
            scaleX: 0.25,
            scaleY: 0.25,
            cornerColor: "#4f46e5",
            cornerSize: 8,
            transparentCorners: false,
            selectable: true,
            evented: true,
            padding: 12,
            hoverCursor: "grab",
            perPixelTargetFind: false,
            hasBorders: true,
            hasControls: true,
            lockScalingX: true,
            lockScalingY: true,
            lockUniScaling: true,
          });

          img.setControlsVisibility({
            mt: false, mb: false, ml: false, mr: false,
            bl: false, br: false, tl: false, tr: false,
            mtr: true
          });

          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.renderAll();

          // Clear preloaded decal from storage immediately
          localStorage.removeItem("apparel_preloaded_decal");
        });
      });
    }
  }, [isFabricReady]);

  // 2b. Automatically disable drawing mode and restore selection/movability when switching tabs
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    if (activeTab !== "draw") {
      canvas.isDrawingMode = false;
      setIsDrawing(false);
      
      // Explicitly restore grab hover states and grab pointers on all decals/texts
      canvas.forEachObject((obj) => {
        if (obj !== canvas.backgroundImage) {
          obj.set({
            selectable: true,
            evented: true,
          });
        }
      });
      canvas.renderAll();
    }
  }, [activeTab]);

  // 2d. Helper to update the offline flipped canvas for Three.js texture rendering
  const updateHiddenCanvas = () => {
    try {
      const canvas = fabricCanvasRef.current;
      if (!canvas) {
        console.log("updateHiddenCanvas: No fabricCanvasRef.current");
        return;
      }
      if (isCopyingRef.current) return; // Prevent infinite recursion during selection toggle renders

      if (!hiddenCanvasRef.current) {
        console.log("updateHiddenCanvas: No hiddenCanvasRef.current");
        return;
      }
      
      const fabricCanvasEl = canvas.getElement();
      if (!fabricCanvasEl) {
        console.log("updateHiddenCanvas: No fabricCanvasEl");
        return;
      }
      
      const w = 512;
      const h = 512;
      
      const hiddenCanvas = hiddenCanvasRef.current;
      if (hiddenCanvas.width !== w || hiddenCanvas.height !== h) {
        hiddenCanvas.width = w;
        hiddenCanvas.height = h;
      }
      
      const ctx = hiddenCanvas.getContext("2d");
      if (!ctx) {
        console.log("updateHiddenCanvas: No ctx");
        return;
      }
      
      // Temporarily clear active selection highlight to get a clean canvas elements draw
      const activeObject = canvas.getActiveObject();
      if (activeObject) {
        isCopyingRef.current = true;
        canvas.discardActiveObject();
        canvas.renderAll();
      }

      ctx.clearRect(0, 0, w, h);
      
      const halfW = w / 2;
      
      console.log("updateHiddenCanvas: Drawing split texture...", {
        fabricWidth: fabricCanvasEl.width,
        fabricHeight: fabricCanvasEl.height,
        halfW,
        h
      });

      // Draw Left Half (Front) 1:1 exactly as-is to preserve horizontal alignment
      ctx.drawImage(fabricCanvasEl, 0, 0, fabricCanvasEl.width / 2, fabricCanvasEl.height, 0, 0, halfW, h);
      
      // Draw Right Half (Back) 1:1 exactly as-is to preserve horizontal alignment
      ctx.drawImage(fabricCanvasEl, fabricCanvasEl.width / 2, 0, fabricCanvasEl.width / 2, fabricCanvasEl.height, halfW, 0, halfW, h);

      // Perform high-fidelity pixel replacement to replace the grey background layout area with the active garment color
      try {
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        
        // Parse target garment color to RGB
        const hex = (garmentColor || "#ffffff").replace("#", "");
        const rTarget = parseInt(hex.substring(0, 2), 16);
        const gTarget = parseInt(hex.substring(2, 4), 16);
        const bTarget = parseInt(hex.substring(4, 6), 16);

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i+1];
          const b = data[i+2];
          
          const diffRG = Math.abs(r - g);
          const diffGB = Math.abs(g - b);
          const diffRB = Math.abs(r - b);
          
          // Neutral grey background detection (low saturation, and in the grey layout range)
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
        console.warn("Pixel replacement failed:", pixelErr);
      }

      // Restore active selection back on screen for the user interface
      if (activeObject) {
        canvas.setActiveObject(activeObject);
        canvas.renderAll();
        isCopyingRef.current = false;
      }
    } catch (e) {
      console.error("Error in updateHiddenCanvas:", e);
      isCopyingRef.current = false;
    }
  };

  // 3. Initialize Three.js Scene (Initialized EXACTLY ONCE, completely decoupled from focus re-renders to prevent WebGL Context Loss)
  useEffect(() => {
    if (checkingAuth || !session || !threeContainerRef.current) return;
    if (hasInitializedThreeRef.current) return; // Prevent any double-runs or focus-induced updates!

    hasInitializedThreeRef.current = true;

    const width = threeContainerRef.current.clientWidth;
    const height = threeContainerRef.current.clientHeight;

    // A. Scene Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // B. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0.35, 2.3);
    cameraRef.current = camera;

    // C. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Clear previous children
    threeContainerRef.current.innerHTML = "";
    threeContainerRef.current.appendChild(renderer.domElement);

    // D. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(2, 4, 3);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 1024;
    dirLight1.shadow.mapSize.height = 1024;
    scene.add(dirLight1);
    dirLight1Ref.current = dirLight1;

    const dirLight2 = new THREE.DirectionalLight(0xa5b4fc, 0.4); // soft purple rim light
    dirLight2.position.set(-2, -2, -3);
    scene.add(dirLight2);
    dirLight2Ref.current = dirLight2;

    // E. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 10;
    controls.minDistance = 1;
    controls.target.set(0, 0.35, 0);

    // F. Canvas Texture creation from Fabric element
    const fabricCanvasEl = document.getElementById("fabric-canvas");
    let canvasTexture = null;

    if (fabricCanvasEl) {
      // Initialize offline flipping canvas
      const hiddenCanvas = document.createElement("canvas");
      hiddenCanvas.width = 512;
      hiddenCanvas.height = 512;
      hiddenCanvasRef.current = hiddenCanvas;
      
      // Perform initial flip mapping
      updateHiddenCanvas();

      canvasTexture = new THREE.CanvasTexture(hiddenCanvas);
      canvasTexture.colorSpace = THREE.SRGBColorSpace;
      canvasTexture.flipY = true; // Auto-flip vertically to align right-side up in WebGL UV space
      textureRef.current = canvasTexture;
      setIsThreeReady(true);
    }

    // G. Animation loop
    const animate = () => {
      controls.update();

      renderer.render(scene, camera);
      animateFrameIdRef.current = requestAnimationFrame(animate);
    };
    animate();

    // H. Handle Resize
    const handleResize = () => {
      if (!threeContainerRef.current || !rendererRef.current) return;
      const w = threeContainerRef.current.clientWidth;
      const h = threeContainerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);
  }, [checkingAuth, session]);

  // 3b. Handle actual unmount cleanup exactly once
  useEffect(() => {
    return () => {
      if (animateFrameIdRef.current) {
        cancelAnimationFrame(animateFrameIdRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      setIsThreeReady(false);
      hasInitializedThreeRef.current = false;
    };
  }, []);

  // 3c. Dynamic Environment Showroom Lighting Controller
  useEffect(() => {
    const ambient = ambientLightRef.current;
    const dir1 = dirLight1Ref.current;
    const dir2 = dirLight2Ref.current;
    if (!ambient || !dir1 || !dir2) return;

    if (lightingPreset === "studio") {
      // Clean, bright neutral studio white lights
      ambient.color.set("#ffffff");
      ambient.intensity = 0.65;
      dir1.color.set("#ffffff");
      dir1.intensity = 0.8;
      dir1.position.set(2, 4, 3);
      dir2.color.set("#a5b4fc"); // soft lavender
      dir2.intensity = 0.4;
    } else if (lightingPreset === "showroom") {
      // Warm, rich diffuse boutique showcase lighting
      ambient.color.set("#ffedd5"); // soft orange/warm cream tint
      ambient.intensity = 0.85;
      dir1.color.set("#fde047"); // gold accent key
      dir1.intensity = 0.55;
      dir1.position.set(3, 3, 1);
      dir2.color.set("#e0e7ff"); // neutral light fill
      dir2.intensity = 0.3;
    } else if (lightingPreset === "sunset") {
      // High-contrast dramatic outdoor golden hour Sunset
      ambient.color.set("#fee2e2"); // rose tint ambient
      ambient.intensity = 0.4;
      dir1.color.set("#f97316"); // bright deep amber sun key
      dir1.intensity = 1.6;
      dir1.position.set(4, 2.5, 4);
      dir2.color.set("#6366f1"); // deep purple/indigo ground bounce reflection
      dir2.intensity = 0.85;
    }
  }, [lightingPreset, isThreeReady]);

  // 3d. Watch selectedFabric changes and update active model materials dynamically in real-time
  useEffect(() => {
    if (!modelRef.current) return;
    const props = fabricProperties[selectedFabric] || fabricProperties.cotton;
    const weaveTexture = createProceduralFabricTexture(selectedFabric);
    
    modelRef.current.traverse((node) => {
      if (node.isMesh && node.material) {
        node.material.roughness = props.roughness;
        node.material.metalness = props.metalness;
        node.material.bumpMap = weaveTexture;
        node.material.bumpScale = props.bumpScale || 0.03;
        node.material.needsUpdate = true;
      }
    });
  }, [selectedFabric]);

  // 4. Watch activeProduct state and load .glb and base texture
  useEffect(() => {
    if (!isThreeReady || !isFabricReady || !activeProduct) return;

    const canvas = fabricCanvasRef.current;
    const scene = sceneRef.current;
    const texture = textureRef.current;
    if (!canvas || !scene || !texture) return;

    setIsLoadingModel(true);

    // A. Load and apply base texture to Fabric canvas with premium multiply blending
    import("fabric").then((fabricModule) => {
      const fabric = fabricModule.fabric;
      
      canvas.setBackgroundColor(garmentColor, () => {
        fabric.Image.fromURL(
          activeProduct.texture_url,
          (img) => {
            if (!img) return;
            img.set({
              scaleX: canvas.width / img.width,
              scaleY: canvas.height / img.height,
              selectable: false,
              evented: false,
              globalCompositeOperation: "multiply", // High-fidelity blend mode that multiplies highlights/shadows over color!
            });
            
            canvas.setBackgroundImage(img, () => {
              canvas.renderAll();
              updateHiddenCanvas();
              if (textureRef.current) {
                textureRef.current.needsUpdate = true;
              }
            });
          },
          { crossOrigin: "anonymous" } // Prevent CORS taint on dynamic canvas textures
        );
      });
    });

    // B. Clear previous 3D model
    if (modelRef.current) {
      sceneRef.current.remove(modelRef.current);
      modelRef.current.traverse((node) => {
        if (node.isMesh) {
          node.geometry.dispose();
          if (Array.isArray(node.material)) {
            node.material.forEach((mat) => mat.dispose());
          } else {
            node.material.dispose();
          }
        }
      });
      modelRef.current = null;
    }

    // C. Load new 3D model (.glb) from Cloud Storage
    const loader = new GLTFLoader();
    loader.load(
      activeProduct.glb_file_url,
      (gltf) => {
        const model = gltf.scene;
        modelRef.current = model;

        // Apply Fabric canvas texture to model materials
        model.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;

            // Map our dynamic canvas texture
            node.material.map = textureRef.current;
            // Keep material color tint white to allow exact Fabric canvas colors and graphics to render untinted
            if (node.material.color) {
              node.material.color.set("#ffffff");
            }
            
            // Apply dynamic fabric material properties (cotton, polyester, fleece)
            const props = fabricProperties[selectedFabric] || fabricProperties.cotton;
            node.material.roughness = props.roughness;
            node.material.metalness = props.metalness;
            node.material.bumpMap = createProceduralFabricTexture(selectedFabric);
            node.material.bumpScale = props.bumpScale || 0.03;
            node.material.needsUpdate = true;
          }
        });

        // Center model in scene
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Center position
        model.position.x += (model.position.x - center.x);
        model.position.y += (model.position.y - center.y);
        model.position.z += (model.position.z - center.z);

        // Adjust scale if necessary to fit nicely
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          const scale = 1.6 / maxDim;
          model.scale.set(scale, scale, scale);
        }

        sceneRef.current.add(model);
        setIsLoadingModel(false);
      },
      (xhr) => {
        // progress
      },
      (err) => {
        console.error("An error occurred loading GLB:", err);
        setIsLoadingModel(false);
      }
    );

  }, [activeProduct, checkingAuth, session, isThreeReady, isFabricReady]);



  // 5. Canvas manipulation utilities
  const addText = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    import("fabric").then((fabricModule) => {
      const fabric = fabricModule.fabric;
      const text = new fabric.IText("Double-click to edit", {
        left: 128,
        top: 185,
        originX: "center",
        originY: "center",
        fontFamily: "Outfit, Inter, sans-serif",
        fill: textColor,
        fontSize: 28,
        fontWeight: "bold",
        cornerColor: "#4f46e5",
        cornerSize: 8,
        transparentCorners: false,
      });
      canvas.add(text);
      canvas.setActiveObject(text);
      canvas.renderAll();
    });
  };

  const addShape = (type) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    import("fabric").then((fabricModule) => {
      const fabric = fabricModule.fabric;
      let shape;

      if (type === "square") {
        shape = new fabric.Rect({
          left: 128,
          top: 185,
          originX: "center",
          originY: "center",
          fill: fillColor,
          width: 80,
          height: 80,
          cornerColor: "#4f46e5",
          cornerSize: 8,
          transparentCorners: false,
        });
      } else if (type === "circle") {
        shape = new fabric.Circle({
          left: 128,
          top: 185,
          originX: "center",
          originY: "center",
          fill: fillColor,
          radius: 40,
          cornerColor: "#4f46e5",
          cornerSize: 8,
          transparentCorners: false,
        });
      }

      if (shape) {
        canvas.add(shape);
        canvas.setActiveObject(shape);
        canvas.renderAll();
      }
    });
  };

  const toggleDrawingMode = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.isDrawingMode = !isDrawing;
    canvas.freeDrawingBrush.color = fillColor;
    canvas.freeDrawingBrush.width = 5;
    setIsDrawing(!isDrawing);
  };

  const updateSelectedColor = (color) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObj = canvas.getActiveObject();
    if (activeObj) {
      activeObj.set("fill", color);
      canvas.renderAll();
    }
    
    setFillColor(color);
    if (canvas.isDrawingMode) {
      canvas.freeDrawingBrush.color = color;
    }
  };

  const handleGarmentColorChange = (color) => {
    setGarmentColor(color);

    // 1. Update Fabric Canvas Background Color and instantly refresh dynamic WebGL texture
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      canvas.setBackgroundColor(color, () => {
        canvas.renderAll();
        if (textureRef.current) {
          textureRef.current.needsUpdate = true;
        }
      });
    }

    // 2. Keep Three.js material color white to render canvas background and graphics exactly as-is
    if (modelRef.current) {
      modelRef.current.traverse((node) => {
        if (node.isMesh) {
          if (node.material && node.material.color) {
            node.material.color.set("#ffffff");
            node.material.needsUpdate = true;
          }
        }
      });
    }
  };

  const handleScaleSelected = (factor) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObj = canvas.getActiveObject();
    if (activeObj && activeObj.type === "image") {
      const currentScaleX = activeObj.scaleX || 1;
      const currentScaleY = activeObj.scaleY || 1;
      
      const newScaleX = currentScaleX * factor;
      const newScaleY = currentScaleY * factor;

      // Impose boundaries for scaling safety
      if (newScaleX >= 0.05 && newScaleX <= 3.0) {
        activeObj.set({
          scaleX: newScaleX,
          scaleY: newScaleY
        });
        canvas.renderAll();
        // Force 3D WebGL texture mapping update
        if (textureRef.current) {
          textureRef.current.needsUpdate = true;
        }
      }
    }
  };

  const updateSelectedTextColor = (color) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObj = canvas.getActiveObject();
    if (activeObj && activeObj.type === "i-text") {
      activeObj.set("fill", color);
      canvas.renderAll();
    }
    setTextColor(color);
  };

  const deleteSelected = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObj = canvas.getActiveObject();
    if (activeObj) {
      canvas.remove(activeObj);
      canvas.discardActiveObject();
      canvas.renderAll();
    }
  };

  const clearCanvas = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    if (!confirm("Are you sure you want to clear your custom design?")) return;

    // Remove all shapes/text, but keep base background image
    const objects = canvas.getObjects();
    while (objects.length > 0) {
      canvas.remove(objects[0]);
    }
    canvas.renderAll();
  };

  // 6. Undo/Redo logic
  const handleUndo = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || historyIndex <= 0) return;

    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    
    canvas.loadFromJSON(canvasHistory[newIndex], () => {
      canvas.renderAll();
    });
  };

  const handleRedo = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || historyIndex >= canvasHistory.length - 1) return;

    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);

    canvas.loadFromJSON(canvasHistory[newIndex], () => {
      canvas.renderAll();
    });
  };

  // 7. Image Sticker Upload
  const handleStickerUpload = (e) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !e.target.files?.[0]) return;

    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (f) => {
      const data = f.target.result;
      import("fabric").then((fabricModule) => {
        const fabric = fabricModule.fabric;
        fabric.Image.fromURL(data, (img) => {
          img.set({
            left: 128,
            top: 185,
            originX: "center",
            originY: "center",
            scaleX: 0.25,
            scaleY: 0.25,
            cornerColor: "#4f46e5",
            cornerSize: 8,
            transparentCorners: false,
            selectable: true,
            evented: true,
            padding: 12, // Expand click/drag selection hitbox size
            hoverCursor: "grab", // Open hand cursor when hovering!
            perPixelTargetFind: false, // Transparent pixel click-through disabled so entire box is clickable!
            hasBorders: true,
            hasControls: true,

            // Lock all standard manual scaling controls as requested!
            lockScalingX: true,
            lockScalingY: true,
            lockUniScaling: true,
          });
          
          // Disable all standard scale corner handles, keeping only drag and rotate
          img.setControlsVisibility({
            mt: false, // middle top
            mb: false, // middle bottom
            ml: false, // middle left
            mr: false, // middle right
            bl: false, // bottom left
            br: false, // bottom right
            tl: false, // top left
            tr: false, // top right
            mtr: true, // keep rotation control (top middle)
          });

          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.renderAll();
        });
      });
    };
    reader.readAsDataURL(file);
  };

  const handleAddToCart = async () => {
    if (!activeProduct) {
      alert("Please select a garment to customize first!");
      return;
    }

    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Show a premium glassmorphic loader while packing 3D/2D files!
    const loaderOverlay = document.createElement("div");
    loaderOverlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(9, 9, 11, 0.85);
      backdrop-filter: blur(8px);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      font-family: sans-serif;
    `;
    loaderOverlay.innerHTML = `
      <div style="width:50px; height:50px; border:4px solid #3f3f46; border-top-color:#6366f1; border-radius:50%; animation:spin 1s linear infinite; margin-bottom:20px;"></div>
      <p style="font-weight:bold; font-size:14px; margin-top:16px;">Saving Custom Design...</p>
      <p style="font-size:11px; color:#71717a; margin-top:6px;">Please wait while we package your custom garment details.</p>
      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    `;
    document.body.appendChild(loaderOverlay);

    try {
      // 1. Export Fabric 2D Canvas full composite texture map
      const designDataUrl = canvas.toDataURL({
        format: "png",
        quality: 0.95
      });

      // Calculate final pricing based on active product base price + selected premium fabric upcharge
      const fabricProps = fabricProperties[selectedFabric] || fabricProperties.cotton;
      const upcharge = fabricProps.upcharge;
      const finalPrice = (activeProduct.price || 3999) + upcharge;

      const customProductId = `custom_${Date.now()}`;

      // 2. Build the custom catalog product object
      const customProduct = {
        id: customProductId,
        name: `Custom ${activeProduct.name}`,
        glb_file_url: activeProduct.glb_file_url,
        texture_url: designDataUrl,
        price: finalPrice,
        category: activeProduct.category || "custom",
        description: `A bespoke customized ${activeProduct.name} crafted inside our interactive 3D design configurator using premium ${fabricProps.label}.`,
        is_template: false,
        gallery_urls: designDataUrl
      };

      // 3. Retrieve and update the local products catalog in localStorage
      const storedLocal = localStorage.getItem("apparel_products_local");
      const localProducts = storedLocal ? JSON.parse(storedLocal) : [];
      
      const updatedLocalProducts = [customProduct, ...localProducts.filter(p => p.id !== customProductId)];
      localStorage.setItem("apparel_products_local", JSON.stringify(updatedLocalProducts));

      // 4. Log custom design audit entry
      await addAuditLog(`Saved customer designed catalog product "${customProduct.name}" (ID: ${customProductId}) with base price: ₹${finalPrice.toLocaleString('en-IN')}.`);

      if (document.body.contains(loaderOverlay)) {
        document.body.removeChild(loaderOverlay);
      }

      alert(`🎉 Custom design saved successfully! Opening your product detail page...`);
      router.push(`/product/${customProductId}`);
    } catch (err) {
      console.error("Design save failed:", err);
      if (document.body.contains(loaderOverlay)) {
        document.body.removeChild(loaderOverlay);
      }
      alert("Could not save design. Please try again.");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
        <p className="text-sm text-zinc-400">Loading custom apparel studio...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-zinc-950 text-white overflow-hidden font-sans">
      
      {/* Studio Header (Unified Shared Navbar) */}
      <Navbar>
        {isAdmin && (
          <button
            onClick={openPublishModal}
            className="text-xs font-semibold px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-300 animate-pulse" />
            <span>Publish to Catalog</span>
          </button>
        )}
        <button
          onClick={handleAddToCart}
          className="text-xs font-semibold px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/10 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>Save Design</span>
        </button>
      </Navbar>

      {/* Main Studio Body */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar (Preset Models) */}
        <aside className="w-[280px] border-r border-zinc-900 bg-zinc-950/40 backdrop-blur-xl flex flex-col shrink-0">
          <div className="p-4 border-b border-zinc-900">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Garment Library</span>
            </h3>
            <p className="text-sm text-zinc-600 mt-1">Select a base garment mesh below to begin customization.</p>
            
            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1 mt-3">
              {[
                { id: "all", label: "All" },
                { id: "t-shirt", label: "Tees" },
                { id: "hoodie", label: "Hoodies" },
                { id: "jacket", label: "Jackets" },
                { id: "activewear", label: "Active" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategoryTab(tab.id)}
                  className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    selectedCategoryTab === tab.id
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                      : "bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-zinc-800/40"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Model Preset List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loadingProducts ? (
              <div className="py-12 flex flex-col items-center justify-center text-zinc-500">
                <Loader2 className="w-5 h-5 animate-spin text-zinc-400 mb-2" />
                <p className="text-sm">Syncing cloud library...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="py-10 text-center px-4">
                <p className="text-xs text-zinc-500">No models in database.</p>
                <Link href="/admin" className="text-sm text-indigo-400 hover:underline mt-2 block">
                  Add custom .glb models →
                </Link>
              </div>
            ) : (
              (() => {
                const filtered = products.filter(
                  (p) => selectedCategoryTab === "all" || (p.category || "").toLowerCase().trim() === selectedCategoryTab
                );
                
                if (filtered.length === 0) {
                  return (
                    <div className="py-12 text-center px-4">
                      <p className="text-sm text-zinc-500 font-medium">No templates in this category.</p>
                    </div>
                  );
                }
                
                return filtered.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => setActiveProduct(product)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 group cursor-pointer ${
                      activeProduct?.id === product.id
                        ? "bg-indigo-500/10 border-indigo-500/30 shadow-inner"
                        : "bg-zinc-900/20 border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/40"
                    }`}
                  >
                    <div className="w-12 h-12 bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden shrink-0 flex items-center justify-center group-hover:border-zinc-700 transition-colors">
                      <img 
                        src={product.texture_url} 
                        alt={product.name} 
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" 
                      />
                    </div>
                    <div className="truncate flex-1">
                      <h4 className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors truncate">
                        {product.name}
                      </h4>
                      <p className="text-xs text-zinc-500 mt-0.5 truncate">
                        Deploy: {new Date(product.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 text-zinc-600 transition-transform ${
                      activeProduct?.id === product.id ? "text-indigo-400 translate-x-0.5" : "group-hover:translate-x-0.5"
                    }`} />
                  </button>
                ));
              })()
            )}
          </div>
          {/* Premium Material Selector inside Left Sidebar! */}
          <div className="p-4 border-t border-zinc-900 bg-zinc-950/60 mt-auto shrink-0 select-none">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>Premium Fabrics</span>
            </h3>
            <p className="text-xs text-zinc-500 mb-3.5 leading-relaxed">
              Tailor physical surface reflections. Premium selections add a custom upcharge.
            </p>
            
            <div className="space-y-2">
              {Object.entries(fabricProperties).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => setSelectedFabric(key)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all flex flex-col gap-1 group cursor-pointer ${
                    selectedFabric === key
                      ? "bg-indigo-500/10 border-indigo-500/30 shadow-inner"
                      : "bg-zinc-900/20 border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/40"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-sm font-bold ${selectedFabric === key ? "text-indigo-400" : "text-zinc-300 group-hover:text-white"}`}>
                      {key === "cotton" ? "Matte Organic Cotton" : key === "polyester" ? "Shiny Athletic Polyester" : "Heavy Luxury Fleece"}
                    </span>
                    {value.upcharge > 0 ? (
                      <span className="text-sm font-extrabold px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                        +₹{value.upcharge.toLocaleString('en-IN')}
                      </span>
                    ) : (
                      <span className="text-sm font-extrabold px-1.5 py-0.5 bg-zinc-850 text-zinc-400 border border-zinc-800 rounded-md">
                        FREE
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500 leading-snug">
                    {key === "cotton" ? "Flat, organic 100% cotton threads" : key === "polyester" ? "Reflective, sleek high-performance finish" : "Extra thick, warm luxury heavy fleece feel"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Center Canvas Area (2D Designer) */}
        <section className="flex-1 bg-zinc-950 flex flex-col items-center justify-center py-3 px-6 relative overflow-hidden">
          
          {/* Custom dotted grid background for blueprint feel */}
          <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:20px_20px] opacity-60" />

          {/* Dotted grid workspace container */}
          <div className="relative z-10 flex flex-col items-center">
            
            {/* Top Toolbar (Fabric tools & Undo/Redo) */}
            <div className="mb-2 bg-zinc-900/70 border border-zinc-800 backdrop-blur-xl px-4 py-2 rounded-2xl flex items-center justify-between gap-6 shadow-xl max-w-lg w-full">
              
              {/* History Controls */}
              <div className="flex items-center gap-1.5 border-r border-zinc-800/80 pr-4">
                <button
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                  title="Undo"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={historyIndex >= canvasHistory.length - 1}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                  title="Redo"
                >
                  <Redo2 className="w-4 h-4" />
                </button>
              </div>

              {/* Action Tabs selector */}
              <div className="flex items-center gap-1">
                {[
                  { id: "presets", label: "Branding", icon: Sliders },
                  { id: "text", label: "Typography", icon: Type },
                  { id: "graphics", label: "Graphics", icon: Square },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                      }}
                      className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                        activeTab === tab.id
                          ? "bg-indigo-500/10 text-indigo-400"
                          : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Utility Tools */}
              <div className="flex items-center gap-1.5 border-l border-zinc-800/80 pl-4">
                <button
                  onClick={deleteSelected}
                  className="p-1.5 hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/20 rounded-lg text-zinc-400 transition-all cursor-pointer"
                  title="Delete Selected object"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={clearCanvas}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Clear canvas"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

            </div>

            {/* Fabric Canvas Frame */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-2.5 shadow-2xl relative overflow-hidden">
              {/* Inner wrapper */}
              <div className="border border-zinc-800/80 rounded-lg overflow-hidden bg-white shadow-inner">
                <canvas id="fabric-canvas" />
              </div>
            </div>

            {/* Bottom context configuration bar */}
            <div className="mt-2.5 bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl px-4 py-2.5 rounded-2xl shadow-lg w-full max-w-lg">
              {activeTab === "presets" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs gap-4 w-full">
                    <div className="flex flex-col">
                      <span className="font-semibold text-zinc-300">Base Garment Specs</span>
                      <span className="text-sm text-zinc-500 mt-0.5 truncate max-w-[100px]">
                        {activeProduct ? activeProduct.name : "None Loaded"}
                      </span>
                    </div>

                    {/* Garment Base Color Picker */}
                    <div className="flex items-center gap-2 border-l border-zinc-800/80 px-4">
                      <span className="text-sm text-zinc-500 font-semibold uppercase">Fabric Color:</span>
                      <input
                        type="color"
                        value={garmentColor}
                        onChange={(e) => handleGarmentColorChange(e.target.value)}
                        className="w-7 h-7 rounded border border-zinc-700 bg-transparent cursor-pointer"
                        title="Change Garment Base Color"
                      />
                    </div>

                    {/* Decal Scale Controls (Only visible if an image is selected) */}
                    {selectedObjectType === "image" && (
                      <div className="flex items-center gap-2 border-l border-zinc-800/80 px-4 animate-fade-in">
                        <span className="text-sm text-zinc-500 font-semibold uppercase">Decal Size:</span>
                        <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-850 rounded-lg p-0.5">
                          <button
                            onClick={() => handleScaleSelected(0.9)}
                            className="w-6 h-6 hover:bg-zinc-900 rounded font-bold text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer text-sm"
                            title="Shrink Decal (-)"
                          >
                            -
                          </button>
                          <span className="text-xs text-zinc-600 font-mono px-1 select-none">SCALE</span>
                          <button
                            onClick={() => handleScaleSelected(1.1)}
                            className="w-6 h-6 hover:bg-zinc-900 rounded font-bold text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer text-sm"
                            title="Enlarge Decal (+)"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Sticker Upload */}
                    <label className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Apply Decal</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleStickerUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}

              {activeTab === "text" && (
                <div className="flex items-center justify-between gap-4">
                  <button
                    onClick={addText}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Insert Text</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-500 font-semibold uppercase">Color:</span>
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => updateSelectedTextColor(e.target.value)}
                      className="w-7 h-7 rounded border border-zinc-700 bg-transparent cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {activeTab === "graphics" && (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => addShape("square")}
                      className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Square className="w-3.5 h-3.5" />
                      <span>Add Box</span>
                    </button>
                    <button
                      onClick={() => addShape("circle")}
                      className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Circle className="w-3.5 h-3.5" />
                      <span>Add Round</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-500 font-semibold uppercase">Fill:</span>
                    <input
                      type="color"
                      value={fillColor}
                      onChange={(e) => updateSelectedColor(e.target.value)}
                      className="w-7 h-7 rounded border border-zinc-700 bg-transparent cursor-pointer"
                    />
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* Floating 3D Preview Window */}
          <div className="absolute bottom-6 right-6 w-[320px] h-[340px] bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden flex flex-col z-20 group">
            
            {/* Header of 3D frame */}
            <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-950/40 flex items-center justify-between text-xs select-none">
              <span className="font-semibold tracking-wider text-zinc-400 uppercase">3D Real-time Render</span>
              <div className="flex items-center gap-1.5">
                {isLoadingModel ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                ) : (
                  <span className="w-2 h-2 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/20" />
                )}
                <span className="text-xs text-zinc-500 font-semibold">WEBGL ENGINE</span>
              </div>
            </div>

            {/* Three.js Canvas Container */}
            <div 
              ref={threeContainerRef} 
              className="flex-1 w-full h-full relative bg-radial from-zinc-900 to-zinc-950/80 cursor-grab active:cursor-grabbing"
            >
              {isLoadingModel && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 bg-zinc-950/60 backdrop-blur-sm z-10">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
                  <span className="text-sm font-semibold tracking-widest uppercase">Fetching 3D mesh...</span>
                </div>
              )}
            </div>

            {/* Showroom Lighting Presets Selector */}
            <div className="px-3 py-2 border-t border-zinc-850 bg-zinc-950/40 flex items-center justify-between gap-1.5 select-none">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest whitespace-nowrap">Lighting:</span>
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                {[
                  { id: "studio", label: "Studio" },
                  { id: "showroom", label: "Showroom" },
                  { id: "sunset", label: "Sunset" }
                ].map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setLightingPreset(preset.id)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase transition-all cursor-pointer whitespace-nowrap border ${
                      lightingPreset === preset.id
                        ? "bg-indigo-600/10 border-indigo-500 text-indigo-400 shadow-sm shadow-indigo-500/20"
                        : "bg-zinc-900/50 border-zinc-850 text-zinc-400 hover:text-zinc-300 hover:border-zinc-800"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Base Colors Selector */}
            <div className="px-4 py-2 border-t border-zinc-850 bg-zinc-950/20 flex items-center justify-between gap-2">
              <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Base Color:</span>
              <div className="flex items-center gap-1.5">
                {[
                  { name: "White", value: "#ffffff" },
                  { name: "Charcoal", value: "#18181b" },
                  { name: "Heather Gray", value: "#71717a" },
                  { name: "Crimson", value: "#dc2626" },
                  { name: "Royal Blue", value: "#2563eb" },
                  { name: "Forest", value: "#16a34a" },
                  { name: "Sand", value: "#d97706" },
                ].map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handleGarmentColorChange(preset.value)}
                    className={`w-3.5 h-3.5 rounded-full border transition-all cursor-pointer hover:scale-110 ${
                      garmentColor.toLowerCase() === preset.value.toLowerCase()
                        ? "border-indigo-500 scale-105 shadow-md ring-1 ring-indigo-500/50"
                        : "border-zinc-700 hover:border-zinc-500"
                    }`}
                    style={{ backgroundColor: preset.value }}
                    title={preset.name}
                  />
                ))}
              </div>
            </div>

            {/* Instruction tooltip in 3D frame */}
            <div className="px-4 py-2 border-t border-zinc-850/60 bg-zinc-950/60 text-xs text-zinc-500 text-center select-none">
              Left Click + Drag to rotate 3D model. Scroll to zoom.
            </div>

          </div>

        </section>

      </div>

      {/* Admin Publish to Catalog Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200 select-none">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <span>Publish to Shop Catalog</span>
            </h3>
            <p className="text-sm text-zinc-400 mb-6">
              Style and deploy this custom design directly into the shop's standard catalog for direct customer purchase.
            </p>

            <div className="space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Pre-designed Product Name
                </label>
                <input
                  type="text"
                  required
                  value={publishName}
                  onChange={(e) => setPublishName(e.target.value)}
                  placeholder="e.g. Designer Embroidered Tee"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Product Price */}
              <div>
                <label className="block text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Base Price (₹ INR)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={publishPrice}
                  onChange={(e) => setPublishPrice(e.target.value)}
                  placeholder="e.g. 3999"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Product Category */}
              <div>
                <label className="block text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Store Category
                </label>
                <select
                  value={publishCategory}
                  onChange={(e) => setPublishCategory(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="t-shirt">T-Shirts</option>
                  <option value="hoodie">Hoodies</option>
                  <option value="jacket">Jackets</option>
                  <option value="activewear">Activewear</option>
                </select>
              </div>

              {/* Product Description */}
              <div>
                <label className="block text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Product Description
                </label>
                <textarea
                  value={publishDescription}
                  onChange={(e) => setPublishDescription(e.target.value)}
                  placeholder="Enter a premium design description..."
                  rows="3"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                disabled={isPublishing}
                onClick={() => setShowPublishModal(false)}
                className="px-4 py-2 bg-zinc-950 hover:bg-zinc-950/70 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-semibold rounded-xl cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPublishing || !publishName}
                onClick={handlePublishToCatalog}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-indigo-500/10 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Confirm Publish</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
