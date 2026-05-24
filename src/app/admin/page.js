"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Upload, 
  Layers, 
  Package, 
  Trash2, 
  ChevronRight, 
  ArrowLeft, 
  Loader2, 
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  ShoppingBag,
  DollarSign,
  MapPin,
  Phone,
  Clock,
  Download,
  Box,
  Eye,
  X,
  Edit,
  ShieldAlert
} from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import JSZip from "jszip";
import { getDesignData } from "@/lib/indexedDb";

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

export default function AdminPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Form State
  const [name, setName] = useState("");
  const [glbFile, setGlbFile] = useState(null);
  const [textureFile, setTextureFile] = useState(null);

  // Upload/Status State
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });
  
  // Products State
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Form State additions
  const [price, setPrice] = useState("3999");
  const [category, setCategory] = useState("t-shirt");
  const [description, setDescription] = useState("");
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [isTemplate, setIsTemplate] = useState(false);
  const [selectedBaseTemplateId, setSelectedBaseTemplateId] = useState("");
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);

  // Edit Product Extensions
  const [editDescription, setEditDescription] = useState("");
  const [editGalleryUrls, setEditGalleryUrls] = useState("");
  const [editIsTemplate, setEditIsTemplate] = useState(false);

  // Sub tab selection
  const [adminInventorySubTab, setAdminInventorySubTab] = useState("standard");

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Edit Product State
  const [editingProduct, setEditingProduct] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCategory, setEditCategory] = useState("t-shirt");
  const [savingEdit, setSavingEdit] = useState(false);

  // Simulated Email State
  const [simulatedEmail, setSimulatedEmail] = useState(null);

  // Order Tracking Form states per order
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [trackingNumberInput, setTrackingNumberInput] = useState("");
  const [carrierInput, setCarrierInput] = useState("FedEx");
  const [statusInput, setStatusInput] = useState("processing");

  // Orders State
  const [activeTab, setActiveTab] = useState("catalog"); // "catalog", "orders", or "logs"
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [dbMismatches, setDbMismatches] = useState([]);

  // Search and Filter States for Orders and Logs
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [logSearchQuery, setLogSearchQuery] = useState("");

  // Verify Supabase Database Table Schemas & Columns on Admin Dashboard Boot
  const checkDatabaseSchema = async () => {
    const mismatches = [];
    try {
      const { error } = await supabase.from("products").select("price").limit(1);
      if (error && (error.message.includes("column") || error.code === "PGRST205" || error.code === "42703")) {
        mismatches.push("Missing 'price' column in your 'products' table.");
      }
    } catch (e) {
      mismatches.push("Missing 'price' column in your 'products' table.");
    }

    try {
      const { error } = await supabase.from("orders").select("carrier, tracking_number").limit(1);
      if (error && (error.message.includes("column") || error.code === "PGRST205" || error.code === "42703")) {
        mismatches.push("Missing 'carrier' or 'tracking_number' columns in your 'orders' table.");
      }
    } catch (e) {
      mismatches.push("Missing 'carrier' or 'tracking_number' columns in your 'orders' table.");
    }

    try {
      const { error } = await supabase.from("products").select("is_template, description, gallery_urls").limit(1);
      if (error && (error.message.includes("column") || error.code === "PGRST205" || error.code === "42703")) {
        mismatches.push("Missing new columns ('is_template', 'description', 'gallery_urls') in the 'products' table.");
      }
    } catch (e) {
      mismatches.push("Missing new columns ('is_template', 'description', 'gallery_urls') in the 'products' table.");
    }

    try {
      const { error } = await supabase.from("product_reviews").select("*").limit(1);
      if (error && (error.message.includes("does not exist") || error.code === "PGRST205" || error.code === "42P01")) {
        mismatches.push("Missing the 'product_reviews' table in your Supabase database schema.");
      }
    } catch (e) {
      mismatches.push("Missing the 'product_reviews' table in your Supabase database schema.");
    }

    try {
      const { error } = await supabase.from("system_logs").select("*").limit(1);
      if (error && (error.message.includes("does not exist") || error.code === "PGRST205" || error.code === "42P01")) {
        mismatches.push("Missing the 'system_logs' table in your Supabase database schema.");
      }
    } catch (e) {
      mismatches.push("Missing the 'system_logs' table in your Supabase database schema.");
    }

    setDbMismatches(mismatches);
  };


  // Audit Log insertion utility
  const addAuditLog = async (actionMsg) => {
    const logData = {
      operator: session?.user?.email || "admin@example.com",
      action: actionMsg,
      created_at: new Date().toISOString()
    };

    try {
      const { error } = await supabase
        .from("system_logs")
        .insert([logData]);

      if (error) {
        console.warn("Could not insert log row in Supabase system_logs:", error.message);
      }
    } catch (err) {
      console.warn("Network issue writing audit logs to Supabase:", err);
    }

    try {
      const storedLogs = localStorage.getItem("apparel_system_logs");
      const currentLogs = storedLogs ? JSON.parse(storedLogs) : [];
      localStorage.setItem("apparel_system_logs", JSON.stringify([logData, ...currentLogs]));
    } catch (err) {
      console.error("Failed to back up audit log in LocalStorage:", err);
    }
  };

  // Audit Log fetching utility
  const fetchAuditLogs = async () => {
    setLoadingLogs(true);
    let cloudLogs = [];
    try {
      const { data, error } = await supabase
        .from("system_logs")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) {
        cloudLogs = data;
      }
    } catch (err) {
      console.warn("Could not fetch audit logs from Supabase:", err.message);
    }

    let localLogs = [];
    try {
      const stored = localStorage.getItem("apparel_system_logs");
      if (stored) {
        localLogs = JSON.parse(stored);
      }
    } catch (err) {
      console.error("Failed to read local audit logs:", err);
    }

    const mergedMap = new Map();
    localLogs.forEach(l => mergedMap.set(l.created_at + l.action, l));
    cloudLogs.forEach(l => mergedMap.set(l.created_at + l.action, l));

    const mergedList = Array.from(mergedMap.values()).sort((a, b) => {
      return new Date(b.created_at) - new Date(a.created_at);
    });

    setAuditLogs(mergedList.slice(0, 100)); // Cap at 100 logs
    setLoadingLogs(false);
  };

  // Admin 3D Viewer & ZIP Exporter states
  const adminThreeContainerRef = useRef(null);
  const [activeAdmin3dModel, setActiveAdmin3dModel] = useState(null);
  const [activeAdmin3dModelName, setActiveAdmin3dModelName] = useState("");

  // Download ZIP bundle package containing GLB, 2D composite texture, transparent decal PNG and details.json
  const handleDownloadZip = async (order, item) => {
    try {
      const zip = new JSZip();

      // Dynamic Hydration from Local IndexedDB Cache if using the stripped LocalStorage fallback
      let customDesign = item.customDesignUrl;
      let customDecal = item.customDecalUrl;
      let customGlb = item.customGlbBase64;
      let customSvg = null;

      if ((!customDesign || customDesign === "[Cached]") && item.designCacheKey) {
        const cached = await getDesignData(item.designCacheKey);
        if (cached) {
          customDesign = cached.customDesignUrl;
          customDecal = cached.customDecalUrl;
          customGlb = cached.customGlbBase64;
          customSvg = cached.customSvg;
        }
      }

      // A. Compile details descriptor JSON
      const details = {
        orderId: order.id,
        createdAt: order.created_at,
        customer: {
          name: order.customer_name,
          email: order.customer_email,
          phone: order.customer_phone,
          address: order.shipping_address
        },
        product: {
          productId: item.productId,
          name: item.name,
          size: item.size,
          quantity: item.quantity
        }
      };
      zip.file("details.json", JSON.stringify(details, null, 2));

      // B. Save composite custom texture image
      if (customDesign && customDesign !== "[Cached]") {
        const designData = customDesign.includes(",") 
          ? customDesign.split(",")[1] 
          : customDesign;
        zip.file("composite_texture.png", designData, { base64: true });
      }

      // C. Save isolated transparent decal image
      if (customDecal && customDecal !== "[Cached]") {
        const decalData = customDecal.includes(",") 
          ? customDecal.split(",")[1] 
          : customDecal;
        zip.file("decal.png", decalData, { base64: true });
      }

      // D. Save base64 GLB model
      if (customGlb && customGlb !== "[Cached]") {
        zip.file("design.glb", customGlb, { base64: true });
      }

      // E. Save vector design SVG file for high-res printing shop prepress
      if (customSvg) {
        zip.file("vector_design.svg", customSvg);
      }

      // F. Generate and save ZIP package
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Order_${order.id}_Item_${item.id}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("ZIP Generation Failed:", err);
      alert("Failed to build ZIP archive. Please verify design data exists.");
    }
  };

  // Mount 3D Three.js canvas dynamically to render active custom GLB
  useEffect(() => {
    if (!activeAdmin3dModel || !adminThreeContainerRef.current) return;

    let scene, camera, renderer, controls, frameId;
    const container = adminThreeContainerRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;

    // 1. Setup Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color("#09090b");

    // 2. Setup Camera
    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 0.35, 2.3);

    // 3. Setup Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(2, 4, 3);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xa5b4fc, 0.4);
    dirLight2.position.set(-2, -2, -3);
    scene.add(dirLight2);

    // 5. Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 10;
    controls.minDistance = 0.8;
    controls.target.set(0, 0.35, 0);

    // 6. LoadGLB model from base64
    const loader = new GLTFLoader();
    
    try {
      const binaryStr = atob(activeAdmin3dModel);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "model/gltf-binary" });
      const blobUrl = URL.createObjectURL(blob);

      loader.load(
        blobUrl,
        (gltf) => {
          const model = gltf.scene;
          
          model.traverse((node) => {
            if (node.isMesh) {
              node.castShadow = true;
              node.receiveShadow = true;
              if (node.material) {
                node.material.needsUpdate = true;
              }
            }
          });

          // Center model automatically
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());

          model.position.x += (model.position.x - center.x);
          model.position.y += (model.position.y - center.y);
          model.position.z += (model.position.z - center.z);

          const maxDim = Math.max(size.x, size.y, size.z);
          if (maxDim > 0) {
            const scale = 1.6 / maxDim;
            model.scale.set(scale, scale, scale);
          }

          scene.add(model);
          URL.revokeObjectURL(blobUrl);
        },
        undefined,
        (err) => {
          console.error("GLB render parsing issue:", err);
        }
      );
    } catch (err) {
      console.error("Base64 string decode issue:", err);
    }

    // 7. Animation Loop
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      if (!container || !renderer) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(frameId);
      if (renderer) {
        renderer.dispose();
      }
      container.innerHTML = "";
    };
  }, [activeAdmin3dModel]);

  // Fetch all orders from Supabase & fallback LocalStorage
  const fetchOrders = async () => {
    setLoadingOrders(true);
    let cloudOrders = [];
    
    // 1. Try to fetch orders from Supabase table
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        cloudOrders = data;
      }
    } catch (err) {
      console.warn("Could not read orders from Supabase, relying on local redundancy:", err.message);
    }

    // 2. Fetch local orders for double-layered redundancy
    let localOrders = [];
    try {
      const stored = localStorage.getItem("apparel_orders");
      if (stored) {
        localOrders = JSON.parse(stored);
      }
    } catch (err) {
      console.error("Failed to read local storage backup orders:", err);
    }

    // 3. Merge them based on unique identifiers to present a complete unified dashboard!
    const mergedMap = new Map();
    localOrders.forEach(o => mergedMap.set(o.id, o));
    cloudOrders.forEach(o => mergedMap.set(o.id, o));

    const mergedList = Array.from(mergedMap.values()).sort((a, b) => {
      return new Date(b.created_at) - new Date(a.created_at);
    });

    setOrders(mergedList);
    setLoadingOrders(false);
  };

  // Update order status, carrier, tracking details in Supabase & LocalStorage
  const handleSaveFulfillment = async (orderId, newStatus, carrier, trackingNumber) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ 
          status: newStatus,
          carrier: carrier || null,
          tracking_number: trackingNumber || null
        })
        .eq("id", orderId);

      if (error) {
        console.warn("Could not update full fulfillment on Supabase, retrying with status-only...", error.message);
        // Fallback: update ONLY the status column which is always present
        const { error: retryError } = await supabase
          .from("orders")
          .update({ 
            status: newStatus
          })
          .eq("id", orderId);

        if (retryError) {
          console.error("Complete Supabase order status update failure:", retryError.message);
        } else {
          console.log("Successfully updated order status in Supabase. Carrier & tracking synced locally.");
        }
      }
    } catch (err) {
      console.warn("Failed to reach Supabase network:", err);
    }

    try {
      const stored = localStorage.getItem("apparel_orders");
      if (stored) {
        const localList = JSON.parse(stored);
        const updated = localList.map(o => {
          if (o.id === orderId) {
            return { 
              ...o, 
              status: newStatus,
              carrier: carrier || null,
              tracking_number: trackingNumber || null
            };
          }
          return o;
        });
        localStorage.setItem("apparel_orders", JSON.stringify(updated));
      }
    } catch (err) {
      console.error("Failed to update status in LocalStorage backup:", err);
    }

    // Retrieve order details to log audit and show dynamic email preview
    const activeOrder = orders.find(o => o.id === orderId) || {};
    
    // Log Audit Log
    await addAuditLog(`Updated fulfillment for Order #${orderId}. State: ${newStatus}${carrier ? `, Carrier: ${carrier}` : ""}${trackingNumber ? `, Track #: ${trackingNumber}` : ""}.`);

    // Trigger simulated email notice to customer
    setSimulatedEmail({
      to: activeOrder.customer_email || "customer@example.com",
      customerName: activeOrder.customer_name || "Valued Customer",
      orderId: orderId,
      status: newStatus,
      carrier: carrier || "FedEx",
      trackingNumber: trackingNumber || "TRK" + Math.floor(Math.random() * 1000000000),
      items: activeOrder.items || [],
      total: activeOrder.total_amount || 0.00
    });

    fetchOrders();
    setUpdatingOrderId(null); // Close active form
  };

  // Delete/Cancel order
  const handleDeleteOrder = async (orderId) => {
    if (!confirm("Are you sure you want to delete/cancel this order?")) return;

    try {
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);

      if (error) {
        console.warn("Could not delete from Supabase orders table:", error.message);
      }
    } catch (err) {
      console.warn("Failed to delete from Supabase network:", err);
    }

    try {
      const stored = localStorage.getItem("apparel_orders");
      if (stored) {
        const localList = JSON.parse(stored);
        const filtered = localList.filter(o => o.id !== orderId);
        localStorage.setItem("apparel_orders", JSON.stringify(filtered));
      }
    } catch (err) {
      console.error("Failed to delete from LocalStorage backup:", err);
    }

    await addAuditLog(`Deleted/cancelled order ID #${orderId} from system ledger.`);
    fetchOrders();
  };

  // Inline Product Details Update (CRUD: Update)
  const handleSaveEditProduct = async (productId) => {
    setSavingEdit(true);
    const parsedPrice = parseFloat(editPrice) || 3999;
    let updateSuccess = false;

    // First try: name, price, category, description, gallery_urls, is_template update
    try {
      const { error } = await supabase
        .from("products")
        .update({
          name: editName,
          price: parsedPrice,
          category: editCategory,
          description: editDescription,
          gallery_urls: editGalleryUrls,
          is_template: editIsTemplate
        })
        .eq("id", productId);

      if (!error) {
        updateSuccess = true;
      } else {
        console.warn("Category/Extensions update failed, retrying standard columns...", error.message);
        const { error: retryError } = await supabase
          .from("products")
          .update({
            name: editName,
            price: parsedPrice,
            category: editIsTemplate ? "custom-template" : editCategory
          })
          .eq("id", productId);

        if (!retryError) {
          updateSuccess = true;
        } else {
          const { error: nameOnlyError } = await supabase
            .from("products")
            .update({
              name: editName
            })
            .eq("id", productId);
          
          if (!nameOnlyError) {
            updateSuccess = true;
          }
        }
      }
    } catch (err) {
      console.warn("Direct update exception, attempting fallback:", err.message);
      try {
        const { error: nameOnlyError } = await supabase
          .from("products")
          .update({
            name: editName
          })
          .eq("id", productId);
        if (!nameOnlyError) {
          updateSuccess = true;
        }
      } catch (innerErr) {
        console.error("Double fallback failed:", innerErr);
      }
    }

    // Always update local products state & audit log to provide seamless operation
    await addAuditLog(`Updated base product details for ID #${productId.substring(0, 8)}. New Name: "${editName}", Category: "${editCategory}", Price: ₹${parsedPrice.toLocaleString('en-IN')}, Type: ${editIsTemplate ? 'Template' : 'Standard'}.`);
    setProducts(products.map(p => p.id === productId ? { 
      ...p, 
      name: editName, 
      price: parsedPrice, 
      category: editCategory, 
      description: editDescription,
      gallery_urls: editGalleryUrls,
      is_template: editIsTemplate
    } : p));
    setEditingProduct(null);

    if (updateSuccess) {
      setStatusMsg({ type: "success", text: "Product details saved successfully!" });
    } else {
      setStatusMsg({ type: "warning", text: "Saved locally fallback! Please run schema.sql inside Supabase to sync new columns." });
    }
    setSavingEdit(false);
  };

  // Auth checking
  useEffect(() => {
    const getSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        router.push("/auth");
      } else {
        const adminEmailSetting = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";
        const adminEmails = adminEmailSetting 
          ? adminEmailSetting.split(",").map(e => e.trim().toLowerCase())
          : ["admin@example.com", "admin@thread3d.com"];
        const userEmail = currentSession.user?.email?.toLowerCase();

        if (!adminEmails.includes(userEmail)) {
          alert("Access Denied: You are not authorized to view the admin panel.");
          router.push("/");
        } else {
          setSession(currentSession);
          setCheckingAuth(false);
          fetchProducts();
          fetchOrders();
          checkDatabaseSchema();
        }
      }
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!newSession) {
        router.push("/auth");
      } else {
        const adminEmailSetting = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";
        const adminEmails = adminEmailSetting 
          ? adminEmailSetting.split(",").map(e => e.trim().toLowerCase())
          : ["admin@example.com", "admin@thread3d.com"];
        const userEmail = newSession.user?.email?.toLowerCase();

        if (!adminEmails.includes(userEmail)) {
          router.push("/");
        } else {
          setSession(newSession);
          setCheckingAuth(false);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // Fetch all products
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error("Error fetching products:", err.message);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Handle GLB Upload
  const handleGlbChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith(".glb")) {
        setStatusMsg({ type: "error", text: "Please upload a valid .glb file for the 3D model." });
        setGlbFile(null);
        return;
      }
      setGlbFile(file);
    }
  };

  // Handle Texture Upload
  const handleTextureChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith("image/")) {
        setStatusMsg({ type: "error", text: "Please upload a valid image file for the texture." });
        setTextureFile(null);
        return;
      }
      setTextureFile(file);
    }
  };

  // Handle Gallery Uploads
  const handleGalleryChange = (e) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const invalidFile = files.find(file => !file.type.startsWith("image/"));
      if (invalidFile) {
        setStatusMsg({ type: "error", text: "Please upload valid image files for the gallery." });
        return;
      }
      setGalleryFiles(files);
    }
  };

  // Submit Product Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check validation based on Template (Requires GLB upload) vs Ready-made Catalog Product
    if (isTemplate) {
      if (!name || !glbFile || !textureFile) {
        setStatusMsg({ type: "error", text: "All fields (Name, GLB Model, and Texture) are required for templates." });
        return;
      }
    } else {
      if (!name || !textureFile) {
        setStatusMsg({ type: "error", text: "Name and Main Display Photo are required for standard catalog products." });
        return;
      }
    }

    setUploading(true);
    setStatusMsg({ type: "info", text: "Starting file uploads..." });

    try {
      let glbPublicUrl = null;

      if (isTemplate) {
        // 1. Upload GLB model (Only for 3D Configurator templates!)
        const glbExt = glbFile.name.split(".").pop();
        const glbFileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${glbExt}`;
        const glbPath = `models/${glbFileName}`;

        setStatusMsg({ type: "info", text: "Uploading 3D model to cloud storage..." });
        const { error: glbUploadErr } = await supabase.storage
          .from("product-assets")
          .upload(glbPath, glbFile, { cacheControl: "3600", upsert: false });

        if (glbUploadErr) throw new Error(`GLB Upload failed: ${glbUploadErr.message}`);

        const { data: glbUrlData } = supabase.storage
          .from("product-assets")
          .getPublicUrl(glbPath);
        
        glbPublicUrl = glbUrlData.publicUrl;
      } else {
        // Standard ready-made catalog products do not have 3D models (purely 2D)
        glbPublicUrl = null;
      }

      // 2. Upload Texture image
      const textureExt = textureFile.name.split(".").pop();
      const textureFileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${textureExt}`;
      const texturePath = `textures/${textureFileName}`;

      setStatusMsg({ type: "info", text: "Uploading texture to cloud storage..." });
      const { error: textureUploadErr } = await supabase.storage
        .from("product-assets")
        .upload(texturePath, textureFile, { cacheControl: "3600", upsert: false });

      if (textureUploadErr) throw new Error(`Texture Upload failed: ${textureUploadErr.message}`);

      const { data: textureUrlData } = supabase.storage
        .from("product-assets")
        .getPublicUrl(texturePath);

      const texturePublicUrl = textureUrlData.publicUrl;

      // 2b. Upload Gallery images (if any)
      const uploadedGalleryUrls = [];
      if (galleryFiles && galleryFiles.length > 0) {
        setStatusMsg({ type: "info", text: `Uploading ${galleryFiles.length} gallery images...` });
        for (let i = 0; i < galleryFiles.length; i++) {
          const file = galleryFiles[i];
          const ext = file.name.split(".").pop();
          const fileName = `${Date.now()}_gal_${i}_${Math.random().toString(36).substr(2, 5)}.${ext}`;
          const filePath = `gallery/${fileName}`;

          const { error: uploadErr } = await supabase.storage
            .from("product-assets")
            .upload(filePath, file, { cacheControl: "3600", upsert: false });

          if (uploadErr) {
            console.error(`Gallery file ${i} upload failed:`, uploadErr.message);
            continue;
          }

          const { data: urlData } = supabase.storage
            .from("product-assets")
            .getPublicUrl(filePath);

          uploadedGalleryUrls.push(urlData.publicUrl);
        }
      }

      const galleryUrlsString = uploadedGalleryUrls.join(",");

      // 3. Save DB Row
      setStatusMsg({ type: "info", text: "Registering product in database..." });
      const parsedPrice = parseFloat(price) || 3999;
      
      const insertData = {
        name,
        glb_file_url: glbPublicUrl,
        texture_url: texturePublicUrl,
        price: parsedPrice,
        category: category,
        description: description,
        gallery_urls: galleryUrlsString,
        is_template: isTemplate
      };

      let dbErr = null;
      try {
        const { error } = await supabase
          .from("products")
          .insert([insertData]);
        dbErr = error;
      } catch (err) {
        dbErr = err;
      }

      if (dbErr) {
        console.warn("Complete columns insert failed, retrying standard columns...", dbErr.message || dbErr);
        // Fallback retry using category fallback for template identification
        const fallbackData = {
          name,
          glb_file_url: glbPublicUrl,
          texture_url: texturePublicUrl,
          price: parsedPrice,
          category: isTemplate ? "custom-template" : category
        };
        const { error: retryErr } = await supabase
          .from("products")
          .insert([fallbackData]);
        if (retryErr) throw retryErr;
      }

      // Log Security Audit Log!
      await addAuditLog(`Uploaded and registered new product "${name}" (Type: ${isTemplate ? 'Template' : 'Standard'}) with pricing: ₹${parsedPrice.toLocaleString('en-IN')}.`);

      setStatusMsg({ type: "success", text: "Product uploaded and created successfully!" });
      setName("");
      setPrice("3999");
      setGlbFile(null);
      setTextureFile(null);
      setDescription("");
      setGalleryFiles([]);
      setIsTemplate(false);
      setSelectedBaseTemplateId("");
      
      // Reset file input elements manually safely
      const glbInput = document.getElementById("glb-input");
      if (glbInput) glbInput.value = "";
      
      const textureInput = document.getElementById("texture-input");
      if (textureInput) textureInput.value = "";
      
      const galleryInput = document.getElementById("gallery-input");
      if (galleryInput) galleryInput.value = "";

      // Refresh product list
      fetchProducts();

    } catch (err) {
      console.error("Full Error Object:", err);
      console.error("Error Message:", err.message);
      console.error("Error Details:", err.details);
      console.error("Error Hint:", err.hint);
      console.error("Error Code:", err.code);

      const errorMessage = err.message 
        ? `${err.message} ${err.details ? `Details: ${err.details}` : ''} ${err.hint ? `Hint: ${err.hint}` : ''}`
        : "Something went wrong during submission.";

      setStatusMsg({ 
        type: "error", 
        text: errorMessage 
      });
    } finally {
      setUploading(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (id, glbUrl, textureUrl) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    // Get details for the log before deletion
    const deletedProduct = products.find(p => p.id === id);

    try {
      // Parse file paths out of Supabase URLs to delete from storage as well (optional but good practice)
      // e.g. https://.../storage/v1/object/public/product-assets/models/file.glb
      const getStoragePath = (url) => {
        if (!url) return null;
        const parts = url.split("/product-assets/");
        return parts.length > 1 ? parts[1] : null;
      };

      const glbPath = getStoragePath(glbUrl);
      const texturePath = getStoragePath(textureUrl);

      if (glbPath) {
        await supabase.storage.from("product-assets").remove([glbPath]);
      }
      if (texturePath) {
        await supabase.storage.from("product-assets").remove([texturePath]);
      }

      // Delete database row
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Log Security Audit Trail
      await addAuditLog(`Deleted base product "${deletedProduct?.name || id}" (ID: #${id.substring(0, 8)}) from system database and cloud storage.`);

      setProducts(products.filter(p => p.id !== id));
    } catch (err) {
      console.error("Error deleting product:", err.message);
      alert(`Failed to delete product: ${err.message}`);
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
        <p className="text-sm text-zinc-400">Verifying administrator credentials...</p>
      </div>
    );
  }

  // Calculate dynamic stats
  const totalRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.total_amount || o.total) || 0), 0);
  const totalFulfilled = orders.filter(o => o.status === "shipped" || o.status === "delivered").length;
  const fulfillmentRate = orders.length > 0 ? Math.round((totalFulfilled / orders.length) * 100) : 0;

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      (order.customer_name || "").toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      (order.customer_email || "").toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      (order.id || "").toLowerCase().includes(orderSearchQuery.toLowerCase());
    
    const matchesStatus = orderStatusFilter === "all" || (order.status || "").toLowerCase() === orderStatusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  // Filter audit logs
  const filteredLogs = auditLogs.filter(log => {
    return (
      (log.operator || "").toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      (log.action || "").toLowerCase().includes(logSearchQuery.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20">
      
      {/* Header Bar (Shared Navbar) */}
      <Navbar>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
            <span>Admin Dashboard</span>
          </div>

          {dbMismatches.length > 0 && (
            <button
              onClick={() => setShowDiagnosticsModal(true)}
              className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-550 border border-amber-500/25 text-amber-450 px-2.5 py-1 rounded-xl text-[9px] font-bold uppercase tracking-wider cursor-pointer animate-pulse"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Warnings ({dbMismatches.length})</span>
            </button>
          )}
        </div>
      </Navbar>

      {/* Diagnostics Warning popover modal dialog */}
      {showDiagnosticsModal && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border-2 border-zinc-800 rounded-3xl max-w-xl w-full p-6 relative overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowDiagnosticsModal(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex gap-3.5 items-start">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex-1 space-y-2 text-left">
                <h4 className="text-sm font-extrabold text-amber-400 tracking-wide uppercase">
                  Supabase Database Schema Diagnostics
                </h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
                  Your cloud Supabase database tables are missing some schema elements required for live data synchronization:
                </p>
                <ul className="list-disc list-inside text-[10px] text-zinc-400 font-mono space-y-1 py-1">
                  {dbMismatches.map((m, idx) => (
                    <li key={idx} className="text-amber-300/85">{m}</li>
                  ))}
                </ul>
                <div className="bg-zinc-950/60 border border-zinc-850 rounded-xl p-4 mt-3 space-y-2.5">
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    💡 <strong>To Connect Fully:</strong> Copy the contents of the generated <code className="bg-zinc-900 text-indigo-400 px-1.5 py-0.5 rounded font-bold font-mono">schema.sql</code> script, paste it in your <strong>Supabase SQL Editor</strong>, and click <strong>Run</strong>.
                  </p>
                  <p className="text-[10px] text-emerald-450 font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                    <span>Interactive LocalStorage Offline-Redundancy is currently handling operations.</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        
        {/* Intro */}
        <div className="mb-8">
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
            {activeTab === "catalog" 
              ? "Apparel Inventory Manager" 
              : activeTab === "orders" 
              ? "Customer Order Ledger" 
              : "System Security Audit Logs"}
          </h2>
          <p className="text-sm text-zinc-400 mt-2">
            {activeTab === "catalog" 
              ? "Upload and deploy 3D models and base textures directly into your studio engine." 
              : activeTab === "orders"
              ? "Track customized apparel transactions, print layouts, and shipping fulfillment statuses live."
              : "Review real-time security logs, operator updates, product modifications, and shipment dispatches."}
          </p>
        </div>

        {/* Executive Stats Dashboard Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Revenue Card */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-xl relative overflow-hidden group hover:border-zinc-700 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total Sales</span>
              <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white tracking-tight font-mono">
              ₹{totalRevenue.toLocaleString('en-IN')}
            </div>
            <p className="text-[9px] text-zinc-500 mt-1 select-none">Gross sales generated online</p>
          </div>

          {/* Orders Card */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-xl relative overflow-hidden group hover:border-zinc-700 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Orders</span>
              <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white tracking-tight font-mono">
              {orders.length}
            </div>
            <p className="text-[9px] text-zinc-500 mt-1 select-none">Total customer transactions</p>
          </div>

          {/* Catalog Card */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-xl relative overflow-hidden group hover:border-zinc-700 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Inventory</span>
              <div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-400">
                <Box className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white tracking-tight font-mono">
              {products.length}
            </div>
            <p className="text-[9px] text-zinc-500 mt-1 select-none">3D custom bases registered</p>
          </div>

          {/* Fulfillment Card */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-xl relative overflow-hidden group hover:border-zinc-700 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-colors" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Fulfillment</span>
              <div className="p-1.5 bg-rose-500/10 rounded-lg text-rose-400">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white tracking-tight font-mono">
              {fulfillmentRate}%
            </div>
            <p className="text-[9px] text-zinc-500 mt-1 select-none">Garments dispatched/delivered</p>
          </div>
        </div>

        {/* Tab Selector */}
        <section className="mb-8 border-b border-zinc-900 pb-px flex gap-6">
          <button
            onClick={() => setActiveTab("catalog")}
            className={`text-xs font-bold uppercase tracking-wider pb-3 border-b-2 transition-all cursor-pointer ${
              activeTab === "catalog"
                ? "border-indigo-500 text-indigo-400 font-extrabold"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Inventory Catalog
          </button>
          <button
            onClick={() => {
              setActiveTab("orders");
              fetchOrders();
            }}
            className={`text-xs font-bold uppercase tracking-wider pb-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "orders"
                ? "border-indigo-500 text-indigo-400 font-extrabold"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span>Customer Orders</span>
            {orders.length > 0 && (
              <span className="bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {orders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab("logs");
              fetchAuditLogs();
            }}
            className={`text-xs font-bold uppercase tracking-wider pb-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "logs"
                ? "border-indigo-500 text-indigo-400 font-extrabold"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span>Security Audit Logs</span>
          </button>
        </section>

        {activeTab === "catalog" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Left/Form Section */}
            <div className="md:col-span-1">
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6 backdrop-blur-xl sticky top-24">
                <div className="flex items-center gap-2.5 mb-6">
                  <div className="p-1.5 bg-indigo-500/10 rounded-md text-indigo-400">
                    <Upload className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold">Upload Product</h3>
                </div>

                {/* Form Status Banner */}
                {statusMsg.text && (
                  <div className={`mb-6 p-3 rounded-lg border text-xs flex gap-2 items-start ${
                    statusMsg.type === "error" 
                      ? "bg-red-500/10 border-red-500/20 text-red-400" 
                      : statusMsg.type === "success" 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                      : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                  }`}>
                    {statusMsg.type === "error" ? (
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : statusMsg.type === "success" ? (
                      <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <Loader2 className="w-4 h-4 shrink-0 mt-0.5 animate-spin" />
                    )}
                    <span>{statusMsg.text}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Product Name */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                      Product Name
                    </label>
                    <input
                      type="text"
                      required
                      disabled={uploading}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Classic White Hoodie"
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Product Price */}
                  {/* Product Price */}
                  {!isTemplate && (
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                        Base Price (₹ INR)
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        required={!isTemplate}
                        disabled={uploading}
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="e.g. 3999"
                        className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  )}

                  {/* Product Category Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                      Product Category
                    </label>
                    <select
                      disabled={uploading}
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="t-shirt">T-Shirts (Explore All)</option>
                      <option value="hoodie">Hoodies</option>
                      <option value="jacket">Jackets</option>
                      <option value="activewear">Activewears</option>
                    </select>
                  </div>

                  {/* Product Type Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                       Product Type
                    </label>
                    <select
                      disabled={uploading}
                      value={isTemplate ? "template" : "standard"}
                      onChange={(e) => setIsTemplate(e.target.value === "template")}
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="standard">Standard Catalog Product</option>
                      <option value="template">3D Configurator Template Model</option>
                    </select>
                  </div>

                  {/* Product Description */}
                  {!isTemplate && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                        Product Description
                      </label>
                      <textarea
                        disabled={uploading}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Enter detailed description of the product garment (material care, style advice)..."
                        rows="3"
                        className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-y"
                      />
                    </div>
                  )}

                  {/* Gallery Images (Multiple) */}
                  {!isTemplate && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                        Gallery Photos (Multiple)
                      </label>
                      <div className="relative border border-dashed border-zinc-800 rounded-lg p-3.5 bg-zinc-950/40 hover:bg-zinc-950/60 transition-colors">
                        <input
                          id="gallery-input"
                          type="file"
                          multiple
                          disabled={uploading}
                          accept="image/*"
                          onChange={handleGalleryChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="flex flex-col items-center justify-center py-2 text-center select-none">
                          <ImageIcon className={`w-6 h-6 mb-2 ${galleryFiles.length > 0 ? "text-indigo-400" : "text-zinc-500"}`} />
                          <p className="text-xs font-medium">
                            {galleryFiles.length > 0 ? `${galleryFiles.length} images selected` : "Select gallery photos"}
                          </p>
                          <p className="text-[10px] text-zinc-600 mt-1">PNG, JPG up to 5 files</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Conditionally render GLB upload box for templates. Ready-made standard catalog products require no GLB upload or templates dropdown selector. */}
                  {isTemplate && (
                    /* GLB File Upload (Mesh Template mode) */
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                        3D Mesh Template (.glb)
                      </label>
                      <div className="relative border border-dashed border-zinc-800 rounded-lg p-3 bg-zinc-950/40 hover:bg-zinc-950/60 transition-colors">
                        <input
                          id="glb-input"
                          type="file"
                          required={isTemplate}
                          disabled={uploading}
                          accept=".glb"
                          onChange={handleGlbChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <div className="flex flex-col items-center justify-center py-2 text-center">
                          <Layers className={`w-6 h-6 mb-2 ${glbFile ? "text-indigo-400" : "text-zinc-500"}`} />
                          <p className="text-xs font-medium">
                            {glbFile ? glbFile.name : "Select Mesh GLB File"}
                          </p>
                          <p className="text-[10px] text-zinc-600 mt-1">Stitch canvas template mesh geometry</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Texture File or Main Display Photo (Always required) */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                      {isTemplate ? "3D Mesh Default Texture Map" : "Main Display Photo"}
                    </label>
                    <div className="relative border border-dashed border-zinc-800 rounded-lg p-3 bg-zinc-950/40 hover:bg-zinc-950/60 transition-colors">
                      <input
                        id="texture-input"
                        type="file"
                        required
                        disabled={uploading}
                        accept="image/*"
                        onChange={handleTextureChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <div className="flex flex-col items-center justify-center py-2 text-center">
                        <ImageIcon className={`w-6 h-6 mb-2 ${textureFile ? "text-indigo-400" : "text-zinc-500"}`} />
                        <p className="text-xs font-medium">
                          {textureFile ? textureFile.name : (isTemplate ? "Select Texture / Graphic Image" : "Select Main Product Photo")}
                        </p>
                        <p className="text-[10px] text-zinc-600 mt-1">PNG, JPG, SVG up to 5MB</p>
                      </div>
                    </div>
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={uploading}
                    className="w-full mt-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium text-sm py-2.5 px-4 rounded-lg shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Deploy to Studio</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Right/List Section */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-6">
                <div className="flex flex-col gap-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-emerald-500/10 rounded-md text-emerald-400">
                        <Package className="w-5 h-5" />
                      </div>
                      <h3 className="text-base font-semibold">Active Inventory</h3>
                    </div>
                  </div>
                  
                  {/* Inventory Sub-Tabs */}
                  <div className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-1 flex">
                    <button
                      onClick={() => setAdminInventorySubTab("standard")}
                      className={`flex-1 text-center py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                        adminInventorySubTab === "standard"
                          ? "bg-indigo-600 text-white shadow"
                          : "text-zinc-500 hover:text-zinc-350"
                      }`}
                    >
                      Standard Catalog Products
                    </button>
                    <button
                      onClick={() => setAdminInventorySubTab("template")}
                      className={`flex-1 text-center py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                        adminInventorySubTab === "template"
                          ? "bg-indigo-600 text-white shadow"
                          : "text-zinc-500 hover:text-zinc-355"
                      }`}
                    >
                      3D Customizer Templates
                    </button>
                  </div>
                </div>

                {loadingProducts ? (
                  <div className="py-12 flex flex-col items-center justify-center text-zinc-500">
                    <Loader2 className="w-6 h-6 animate-spin text-zinc-400 mb-2" />
                    <p className="text-xs">Loading items from database...</p>
                  </div>
                ) : products.filter(p => {
                    const isTemp = isTemplateProduct(p);
                    return adminInventorySubTab === "template" ? isTemp : !isTemp;
                  }).length === 0 ? (
                  <div className="py-16 text-center border border-dashed border-zinc-800/80 rounded-lg bg-zinc-950/20 select-none">
                    <Package className="w-10 h-10 mx-auto text-zinc-700 mb-3" />
                    <p className="text-xs text-zinc-500 font-semibold">No {adminInventorySubTab === "template" ? "customizer templates" : "catalog items"} found here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {products.filter(p => {
                      const isTemp = isTemplateProduct(p);
                      return adminInventorySubTab === "template" ? isTemp : !isTemp;
                    }).map((product) => (
                      <div 
                        key={product.id}
                        className="bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 rounded-xl p-4 transition-all flex flex-col justify-between group shadow-sm min-h-[220px]"
                      >
                        {editingProduct === product.id ? (
                          <div className="space-y-3 flex-1 flex flex-col justify-between">
                            <div className="space-y-2.5">
                              <h4 className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Edit Product Details</h4>
                              <div>
                                <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1 select-none">Product Name</label>
                                <input 
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1 select-none">Base Price (₹ INR)</label>
                                <input 
                                  type="number"
                                  step="1"
                                  min="1"
                                  value={editPrice}
                                  onChange={(e) => setEditPrice(e.target.value)}
                                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1 select-none">Category</label>
                                <select 
                                  value={editCategory}
                                  onChange={(e) => setEditCategory(e.target.value)}
                                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                                >
                                  <option value="t-shirt">T-Shirt (Explore All)</option>
                                  <option value="hoodie">Hoodie</option>
                                  <option value="jacket">Jacket</option>
                                  <option value="activewear">Activewear</option>
                                </select>
                              </div>
                              <div>
                                  <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1 select-none">Product Type</label>
                                  <select 
                                    value={editIsTemplate ? "template" : "standard"}
                                    onChange={(e) => setEditIsTemplate(e.target.value === "template")}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                                  >
                                    <option value="standard">Standard Catalog Product</option>
                                    <option value="template">3D Customizer Template</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1 select-none">Description</label>
                                  <textarea 
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    rows="2"
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 resize-y"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1 select-none">Gallery Image URLs (comma-separated)</label>
                                  <input 
                                    type="text"
                                    value={editGalleryUrls}
                                    onChange={(e) => setEditGalleryUrls(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-550"
                                  />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-4 pt-2 border-t border-zinc-800/50">
                              <button
                                onClick={() => handleSaveEditProduct(product.id)}
                                disabled={savingEdit}
                                className="flex-1 text-center bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 px-3 rounded text-[10px] transition-colors cursor-pointer"
                              >
                                {savingEdit ? "Saving..." : "Save"}
                              </button>
                              <button
                                onClick={() => setEditingProduct(null)}
                                className="flex-1 text-center bg-zinc-850 hover:bg-zinc-800 text-zinc-400 font-bold py-1.5 px-3 rounded text-[10px] transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div>
                              {/* Thumbnail or placeholder */}
                              <div className="w-full aspect-[4/3] bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden relative mb-3.5 flex items-center justify-center group-hover:border-zinc-700 transition-colors">
                                <img 
                                  src={product.texture_url} 
                                  alt={product.name} 
                                  className="w-full h-full object-cover opacity-60 group-hover:opacity-85 transition-opacity"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent flex items-end p-2.5">
                                  <span className="text-[10px] bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-800 text-zinc-400 font-mono tracking-tighter truncate max-w-full">
                                    {(product.glb_file_url || "").split("/").pop().substring(0, 20)}...
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-semibold text-sm text-white group-hover:text-indigo-400 transition-colors truncate">
                                  {product.name}
                                </h4>
                                <span className="text-xs font-mono font-bold text-emerald-400 shrink-0">
                                  ₹{product.price ? product.price.toLocaleString('en-IN') : "3,999"}
                                </span>
                              </div>
                              <p className="text-[10px] text-zinc-500 mt-1 flex items-center justify-between select-none">
                                <span>ID: <span className="font-mono text-zinc-600">{product.id.substring(0, 8)}...</span></span>
                                <span className="text-[9px] bg-zinc-950 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                  {product.category || (product.name.toLowerCase().includes("hoodie") ? "hoodie" : product.name.toLowerCase().includes("jacket") ? "jacket" : product.name.toLowerCase().includes("activewear") ? "activewear" : "t-shirt")}
                                </span>
                              </p>
                            </div>

                            <div className="flex items-center justify-between border-t border-zinc-800/60 mt-4 pt-3">
                              <span className="text-[10px] text-zinc-500">
                                {new Date(product.created_at).toLocaleDateString()}
                              </span>
                              
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingProduct(product.id);
                                    setEditName(product.name);
                                    setEditPrice(product.price ? String(product.price) : "3999");
                                    setEditCategory(product.category || "t-shirt");
                                    setEditDescription(product.description || "");
                                    setEditGalleryUrls(product.gallery_urls || "");
                                    setEditIsTemplate(isTemplateProduct(product));
                                  }}
                                  className="p-1.5 bg-zinc-950 hover:bg-indigo-500/10 border border-zinc-800 hover:border-indigo-500/30 text-zinc-500 hover:text-indigo-400 rounded-md transition-colors cursor-pointer"
                                  title="Edit product"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleDeleteProduct(product.id, product.glb_file_url, product.texture_url)}
                                  className="p-1.5 bg-zinc-950 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/30 text-zinc-500 hover:text-red-400 rounded-md transition-colors cursor-pointer"
                                  title="Delete product"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>

                                <Link
                                  href={`/studio?product=${getSlug(product.name)}`}
                                  className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500 hover:text-white text-indigo-400 rounded-md transition-colors flex items-center justify-center"
                                  title="Open in studio"
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : activeTab === "orders" ? (
          /* Customer Orders Panel View */
          <div className="space-y-6">
            <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-indigo-500/10 rounded-md text-indigo-400">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold">Custom Apparel Orders Ledger</h3>
                </div>

                <button
                  onClick={fetchOrders}
                  className="text-xs font-semibold px-3 py-1.5 bg-zinc-900 border border-zinc-850 hover:border-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  Sync Orders
                </button>
              </div>

              {/* Search & Filter Controls */}
              <div className="flex flex-col md:flex-row items-center gap-3 mb-6 bg-zinc-950/60 p-4 border border-zinc-900 rounded-xl select-none">
                <div className="relative w-full md:flex-1">
                  <input
                    type="text"
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    placeholder="Search orders by customer name, email, or order ID..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors font-sans"
                  />
                </div>

                <div className="flex items-center gap-1.5 w-full md:w-auto shrink-0 overflow-x-auto py-1">
                  {["all", "processing", "shipped", "delivered"].map((status) => (
                    <button
                      key={status}
                      onClick={() => setOrderStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                        orderStatusFilter === status
                          ? "bg-indigo-600/10 border-indigo-500 text-indigo-400 font-extrabold"
                          : "bg-zinc-900 border-zinc-850 text-zinc-400 hover:text-zinc-300 hover:border-zinc-800"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {loadingOrders ? (
                <div className="py-20 flex flex-col items-center justify-center text-zinc-500">
                  <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-3" />
                  <p className="text-xs">Fetching custom transactions...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="py-24 text-center border border-dashed border-zinc-800/80 rounded-2xl bg-zinc-950/20 max-w-xl mx-auto">
                  <ShoppingBag className="w-12 h-12 mx-auto text-zinc-700 mb-4" />
                  <p className="text-sm font-semibold text-zinc-400">No transactions match your search filter.</p>
                  <p className="text-xs text-zinc-500 mt-1">Try resetting the status filter or modifying search terms.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredOrders.map((order) => (
                    <div 
                      key={order.id} 
                      className="bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-800 rounded-xl p-5 space-y-4 shadow-inner"
                    >
                      {/* Header of order */}
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-zinc-900 pb-3.5">
                        <div>
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="text-xs font-mono font-bold text-zinc-300 bg-zinc-950 border border-zinc-850 px-2 py-0.5 rounded">
                              {order.id}
                            </span>
                            <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                              order.status === "payment_pending" ? "text-amber-500 bg-amber-500/10 border border-amber-500/20" :
                              order.status === "processing" ? "text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 animate-pulse" :
                              order.status === "in_production" ? "text-purple-400 bg-purple-500/10 border border-purple-500/20" :
                              order.status === "shipped" ? "text-sky-400 bg-sky-500/10 border border-sky-500/20" :
                              order.status === "delivered" ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" :
                              "text-zinc-400 bg-zinc-500/10 border border-zinc-500/20"
                            }`}>
                              {order.status === "payment_pending" ? "payment pending" :
                               order.status === "processing" ? "processing" :
                               order.status === "in_production" ? "in production" :
                               order.status === "shipped" ? "shipped" :
                               order.status === "delivered" ? "delivered" :
                               order.status || "Pending"}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-500 mt-1.5 block">
                            Order Date: {new Date(order.created_at).toLocaleString()}
                          </span>
                        </div>

                        {/* Change status action */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setUpdatingOrderId(order.id);
                              setStatusInput(order.status || "processing");
                              setCarrierInput(order.carrier || "FedEx");
                              setTrackingNumberInput(order.tracking_number || "");
                            }}
                            className="text-[10px] font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 px-2.5 py-1 rounded transition-colors cursor-pointer"
                          >
                            Update Fulfillment
                          </button>

                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            className="p-1.5 bg-zinc-950 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/20 text-zinc-500 hover:text-red-400 rounded-md transition-colors cursor-pointer"
                            title="Delete Order"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Fulfillment Update Section */}
                      {updatingOrderId === order.id && (
                        <div className="bg-zinc-950/80 border border-zinc-850 rounded-xl p-4 space-y-3.5">
                          <h4 className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
                            <span>Modify Fulfillment & Carrier Shipments</span>
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1 select-none">Fulfillment Phase</label>
                              <select
                                value={statusInput}
                                onChange={(e) => setStatusInput(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                              >
                                <option value="payment_pending">Payment Pending</option>
                                <option value="processing">Processing</option>
                                <option value="in_production">In Production</option>
                                <option value="shipped">Shipped</option>
                                <option value="delivered">Delivered</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1 select-none">Carrier Name</label>
                              <input
                                type="text"
                                value={carrierInput}
                                onChange={(e) => setCarrierInput(e.target.value)}
                                placeholder="e.g. FedEx, DHL, UPS"
                                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1 select-none">Tracking Number</label>
                              <input
                                type="text"
                                value={trackingNumberInput}
                                onChange={(e) => setTrackingNumberInput(e.target.value)}
                                placeholder="e.g. TRK12345678"
                                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 justify-end pt-2 border-t border-zinc-900">
                            <button
                              onClick={() => handleSaveFulfillment(order.id, statusInput, carrierInput, trackingNumberInput)}
                              className="text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-1.5 rounded cursor-pointer transition-all shadow-md shadow-indigo-500/20"
                            >
                              Commit Fulfillment details
                            </button>
                            <button
                              onClick={() => setUpdatingOrderId(null)}
                              className="text-xs font-semibold bg-zinc-850 hover:bg-zinc-800 text-zinc-400 px-3 py-1.5 rounded cursor-pointer transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Display active tracking info */}
                      {order.tracking_number && (
                        <div className="bg-zinc-950/40 border border-zinc-900 rounded-lg px-4 py-2 flex items-center justify-between text-[10px] text-zinc-400">
                          <span className="font-semibold uppercase tracking-wider text-[8px] text-zinc-500">Shipping Details:</span>
                          <span className="flex items-center gap-1.5 font-bold text-white">
                            {order.carrier} — <span className="font-mono text-indigo-400 select-all">{order.tracking_number}</span>
                          </span>
                        </div>
                      )}

                      {/* Main Grid Info */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Customer Address Card */}
                        <div className="md:col-span-1 space-y-2 bg-zinc-950/30 border border-zinc-900 rounded-lg p-4">
                          <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-900/60 pb-1.5">
                            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Shipping Address</span>
                          </h4>
                          <div className="text-[11px] space-y-1 text-zinc-300">
                            <p className="font-semibold text-white">{order.customer_name}</p>
                            <p className="text-zinc-500">{order.customer_email}</p>
                            <p className="flex items-center gap-1 text-zinc-400 mt-1">
                              <Phone className="w-2.5 h-2.5 text-zinc-500" />
                              <span>{order.customer_phone}</span>
                            </p>
                            <div className="border-t border-zinc-900 mt-2.5 pt-2 text-zinc-400 leading-relaxed font-medium">
                              <p>{order.shipping_address?.address || order.shipping_address}</p>
                              <p className="mt-0.5">{order.shipping_address?.city}, {order.shipping_address?.zip}</p>
                            </div>
                          </div>
                        </div>

                        {/* Order Items & Design Preview Cards */}
                        <div className="md:col-span-2 space-y-2.5">
                          <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-900/60 pb-1.5">
                            <Package className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Ordered Items</span>
                          </h4>
                          
                          <div className="space-y-2">
                            {(order.items || []).map((item, idx) => (
                              <div key={idx} className="bg-zinc-950/40 border border-zinc-900 rounded-lg p-3 flex gap-4 items-center">
                                {/* 3D Printable Canvas preview */}
                                <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded overflow-hidden shrink-0 relative flex items-center justify-center group/img">
                                  <img
                                    src={item.customDesignUrl}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute bottom-0.5 right-0.5 bg-indigo-600 text-white text-[7px] font-extrabold px-1 rounded uppercase tracking-tighter shadow-md">
                                    {item.size}
                                  </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                  <h5 className="text-xs font-bold text-white truncate">{item.name}</h5>
                                  <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">
                                    Qty: <span className="font-bold text-zinc-300">{item.quantity}</span> | Customized Base
                                  </p>
                                  <div className="flex flex-wrap items-center gap-3 mt-2">
                                    <button
                                      onClick={async () => {
                                        let customDesign = item.customDesignUrl;
                                        if ((!customDesign || customDesign === "[Cached]") && item.designCacheKey) {
                                          const cached = await getDesignData(item.designCacheKey);
                                          if (cached) {
                                            customDesign = cached.customDesignUrl;
                                          }
                                        }
                                        const w = window.open();
                                        w.document.write(`
                                          <html>
                                            <head><title>Apparel Print Layout - ${item.name}</title></head>
                                            <body style="background:#0c0c0e; color:#fff; font-family:sans-serif; display:flex; flex-direction:column; align-items:center; justify-center; height:100vh; margin:0; padding:20px;">
                                              <h3 style="margin-bottom:15px; font-weight:bold;">Custom printable PNG decal target:</h3>
                                              <img src="${customDesign}" style="max-width:512px; max-height:512px; border:2px dashed #4f46e5; border-radius:12px; background:#fff; box-shadow:0 10px 30px rgba(0,0,0,0.5);" />
                                              <p style="color:#71717a; font-size:12px; mt:15px;">Right-click custom png to save high-definition canvas asset.</p>
                                            </body>
                                          </html>
                                        `);
                                        w.document.close();
                                      }}
                                      className="text-[9px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-2.5 py-1 rounded font-bold cursor-pointer transition-colors"
                                    >
                                      View Printable HD Decal
                                    </button>

                                    {(item.customGlbBase64 || item.designCacheKey) && (
                                      <button
                                        onClick={async () => {
                                          let base64Model = item.customGlbBase64;
                                          if ((!base64Model || base64Model === "[Cached]") && item.designCacheKey) {
                                            const cached = await getDesignData(item.designCacheKey);
                                            if (cached) {
                                              base64Model = cached.customGlbBase64;
                                            }
                                          }
                                          if (base64Model && base64Model !== "[Cached]") {
                                            setActiveAdmin3dModel(base64Model);
                                            setActiveAdmin3dModelName(item.name);
                                          } else {
                                            alert("Interactive 3D model asset is not found in cloud database or local IndexedDB cache.");
                                          }
                                        }}
                                        className="text-[9px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded font-bold cursor-pointer transition-colors flex items-center gap-1"
                                      >
                                        <Eye className="w-3 h-3" />
                                        <span>Load in 3D Viewer</span>
                                      </button>
                                    )}

                                    <button
                                      onClick={() => handleDownloadZip(order, item)}
                                      className="text-[9px] bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 px-2.5 py-1 rounded font-bold cursor-pointer transition-colors flex items-center gap-1"
                                    >
                                      <Download className="w-3 h-3" />
                                      <span>Download ZIP Package</span>
                                    </button>
                                  </div>
                                </div>

                                <span className="text-xs font-mono font-bold text-indigo-400 shrink-0">
                                  ₹{((item.price || 3999) * item.quantity).toLocaleString('en-IN')}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Footer Total */}
                      <div className="flex justify-between items-center border-t border-zinc-900 pt-3 text-xs bg-zinc-950/20 px-4 py-2.5 rounded-lg">
                        <span className="text-zinc-500 font-semibold uppercase tracking-wider text-[9px]">Total Value Received:</span>
                        <span className="font-mono text-emerald-400 font-extrabold text-sm">
                          ₹{order.total_amount ? order.total_amount.toLocaleString('en-IN') : "0"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Security Audit Logs ledger tab */
          <div className="space-y-6">
            <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6 border-b border-zinc-900 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-rose-500/10 rounded-md text-rose-400">
                    <ShieldAlert className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">System Security Audit Trail</h3>
                    <p className="text-[10px] text-zinc-500 mt-0.5 select-none">Live stream of administrator operations, order fulfillments, catalog alterations, and inventory uploads.</p>
                  </div>
                </div>
                
                <button
                  onClick={fetchAuditLogs}
                  className="text-[10px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Refresh Logs
                </button>
              </div>

              {/* Search Log Controls */}
              <div className="mb-6 bg-zinc-950/60 p-4 border border-zinc-900 rounded-xl select-none">
                <input
                  type="text"
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  placeholder="Search logs by operator email or action keyword..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors font-sans"
                />
              </div>

              {loadingLogs ? (
                <div className="py-20 flex flex-col items-center justify-center text-zinc-500">
                  <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-3" />
                  <p className="text-xs">Streaming security events...</p>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="py-24 text-center border border-dashed border-zinc-850 rounded-2xl bg-zinc-950/10 max-w-xl mx-auto">
                  <ShieldAlert className="w-10 h-10 mx-auto text-zinc-800 mb-3" />
                  <p className="text-sm font-semibold text-zinc-500">No security audit logs match your search.</p>
                  <p className="text-xs text-zinc-600 mt-1">Try modifying search keywords or operators.</p>
                </div>
              ) : (
                <div className="overflow-hidden border border-zinc-900 rounded-xl bg-zinc-950/40 shadow-2xl">
                  {/* Console style list of logs */}
                  <div className="max-h-[60vh] overflow-y-auto divide-y divide-zinc-900 font-mono text-[11px] leading-relaxed">
                    {filteredLogs.map((log, idx) => (
                      <div key={idx} className="p-3.5 hover:bg-zinc-900/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start sm:items-center gap-2.5">
                          <span className="text-[9px] font-bold text-zinc-600 shrink-0">
                            [{new Date(log.created_at).toLocaleTimeString()}]
                          </span>
                          <span className="text-indigo-400 font-bold shrink-0">
                            {log.operator}:
                          </span>
                          <span className="text-zinc-200">
                            {log.action}
                          </span>
                        </div>
                        <span className="text-[9px] text-zinc-500 shrink-0 select-none">
                          {new Date(log.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* Premium Admin 3D Customizer Viewer Modal */}
      {activeAdmin3dModel && (
        <div className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl relative overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-850 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-indigo-400 animate-pulse" />
                <div>
                  <h3 className="font-extrabold text-sm text-white">Custom 3D Model Inspector</h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Apparel: <span className="font-bold text-zinc-300">{activeAdmin3dModelName}</span></p>
                </div>
              </div>
              
              <button 
                onClick={() => {
                  setActiveAdmin3dModel(null);
                  setActiveAdmin3dModelName("");
                }}
                className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Three.js Render Target container */}
            <div className="flex-1 bg-zinc-950 relative min-h-0">
              <div ref={adminThreeContainerRef} className="w-full h-full" />
              
              {/* Overlay Interactive Help controls */}
              <div className="absolute bottom-4 left-4 bg-zinc-900/85 backdrop-blur border border-zinc-800 rounded-xl p-3 max-w-xs space-y-1 select-none pointer-events-none">
                <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Interactive controls:</p>
                <p className="text-[10px] text-zinc-300">• Drag left click to rotate mesh</p>
                <p className="text-[10px] text-zinc-300">• Pinch or scroll to zoom in/out</p>
                <p className="text-[10px] text-zinc-300">• Hold shift + drag to pan cameras</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-850 bg-zinc-900/50 flex justify-end">
              <button 
                onClick={() => {
                  setActiveAdmin3dModel(null);
                  setActiveAdmin3dModelName("");
                }}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Close Inspector
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Simulated Customer Email Preview Modal Overlay */}
      {simulatedEmail && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
            
            {/* Header bar */}
            <div className="p-4 border-b border-zinc-850 bg-zinc-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-sans select-none">Simulated Automated Email Notification</span>
              </div>
              <button 
                onClick={() => setSimulatedEmail(null)}
                className="p-1 hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Email Body Preview */}
            <div className="p-6 overflow-y-auto max-h-[70vh] bg-zinc-950 font-sans text-left space-y-4">
              
              {/* Meta headers */}
              <div className="bg-zinc-900 border border-zinc-850 rounded-xl p-3.5 text-xs text-zinc-400 space-y-1 font-mono">
                <p><span className="text-zinc-600 font-bold">FROM:</span> fulfillment@thread3d.com</p>
                <p><span className="text-zinc-600 font-bold">TO:</span> {simulatedEmail.to}</p>
                <p><span className="text-zinc-600 font-bold">SUBJECT:</span> Your Custom Apparel Order #{simulatedEmail.orderId.substring(0, 8)} is now {simulatedEmail.status.toUpperCase()}!</p>
              </div>

              {/* Styled Email HTML Preview */}
              <div className="bg-white text-zinc-900 rounded-xl p-6 space-y-5 shadow-inner">
                {/* Logo */}
                <div className="flex items-center gap-2.5 border-b border-zinc-100 pb-4">
                  <div className="w-7 h-7 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded flex items-center justify-center text-white font-extrabold text-xs">
                    T3D
                  </div>
                  <span className="font-extrabold text-xs tracking-tight text-zinc-900 select-none">THREAD 3D APPAREL SaaS</span>
                </div>

                {/* Greeting */}
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-zinc-900">Order Shipment Update</h3>
                  <p className="text-xs text-zinc-600">Hi {simulatedEmail.customerName},</p>
                </div>

                {/* Update message */}
                <div className="bg-indigo-50/70 border border-indigo-100/50 rounded-lg p-3 text-xs text-indigo-900">
                  <p className="leading-relaxed">
                    Great news! Your customized physical apparel order <strong>#{simulatedEmail.orderId.substring(0, 8)}</strong> status has been updated to <strong>{simulatedEmail.status.replace("_", " ").toUpperCase()}</strong>.
                  </p>
                </div>

                {/* Stepper equivalent inside email */}
                <div className="border border-zinc-100 rounded-lg p-3.5 space-y-2">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block select-none">Transit Details</span>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-[10px] text-zinc-400 font-semibold uppercase">Shipping Carrier</p>
                      <p className="font-bold text-zinc-800 mt-0.5">{simulatedEmail.carrier}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-400 font-semibold uppercase">Tracking Number</p>
                      <p className="font-mono font-bold text-indigo-600 mt-0.5 select-all">{simulatedEmail.trackingNumber}</p>
                    </div>
                  </div>
                  
                  {simulatedEmail.status === "shipped" && (
                    <div className="pt-3 border-t border-zinc-100 mt-3 text-center">
                      <a 
                        href={`https://www.google.com/search?q=${simulatedEmail.carrier}+${simulatedEmail.trackingNumber}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg text-center transition-colors shadow-md shadow-indigo-600/10"
                      >
                        Track Shipment Delivery
                      </a>
                    </div>
                  )}
                </div>

                {/* Items preview list */}
                <div className="space-y-2.5">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block border-b border-zinc-100 pb-1.5 select-none">Order Summary</span>
                  {simulatedEmail.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs text-zinc-800">
                      <span>{item.name} ({item.size}) x {item.quantity}</span>
                      <span className="font-mono font-semibold">₹{((item.price || 3999) * item.quantity).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center text-xs font-bold text-zinc-950 pt-2 border-t border-zinc-100">
                    <span>Total Charged Amount:</span>
                    <span className="font-mono text-emerald-600">₹{simulatedEmail.total.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-[10px] text-zinc-400 pt-4 border-t border-zinc-100 text-center leading-relaxed select-none">
                  <p>Thank you for customizing with Thread 3D Apparel Studio!</p>
                  <p className="mt-0.5">If you have any questions, reach out to help@thread3d.com</p>
                </div>
              </div>

            </div>

            {/* Modal actions */}
            <div className="p-3 border-t border-zinc-850 bg-zinc-900 flex justify-end">
              <button 
                onClick={() => setSimulatedEmail(null)}
                className="text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
