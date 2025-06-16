// ========== متغيرات التطبيق ==========
const app = {
  currentImage: null,
  isLoading: false,
  apiBaseUrl: "https://image.pollinations.ai/prompt",
  
  // عناصر DOM
  elements: {
    promptInput: document.getElementById("promptInput"),
    imageContainer: document.getElementById("imageContainer"),
    actions: document.getElementById("actions"),
    generateBtn: document.getElementById("generateBtn"),
    randomPromptBtn: document.getElementById("randomPromptBtn"),
    modelSelect: document.getElementById("modelSelect")
  },

  // نماذج توليد الصور المتاحة
  availableModels: [
    { id: "default", name: "النموذج الافتراضي" },
    { id: "stable-diffusion", name: "Stable Diffusion" },
    { id: "openjourney", name: "OpenJourney" },
    { id: "protogen", name: "Protogen" },
    { id: "sd-xl", name: "Stable Diffusion XL" }
  ],

  // أفكار عشوائية مختصرة
  randomPrompts: [
    "غروب شمس على شاطئ رملي",
    "قطة نائمة على وسادة حمراء",
    "مدينة مستقبلية عائمة في السماء",
    "غابة سحرية ليلاً مع أضواء",
    "رائد فضاء على سطح المريخ",
    "طبق معكرونة إيطالية شهي",
    "دبابة وردية في مدينة حديثة",
    "كوخ خشبي في غابة ثلجية",
    "روبوت يقدم فنجان قهوة",
    "شلال في غابة استوائية",
    "سفينة فضائية فوق مدينة",
    "فنجان قهوة برسمة قلب",
    "تنين يطير فوق قلعة",
    "قطرة ماء على ورقة نبات",
    "مكتب عمل حديث بأناقة"
  ]
};

// ========== تهيئة التطبيق ==========
function initApp() {
  // تعيين سنة حقوق النشر
  document.getElementById("currentYear").textContent = new Date().getFullYear();
  
  // تهيئة قائمة النماذج
  app.availableModels.forEach(model => {
    const option = document.createElement("option");
    option.value = model.id;
    option.textContent = model.name;
    app.elements.modelSelect.appendChild(option);
  });
  
  // إضافة مستمعي الأحداث
  app.elements.generateBtn.addEventListener("click", generateImage);
  app.elements.randomPromptBtn.addEventListener("click", generateRandomPrompt);
  
  // تحميل أي إعدادات محفوظة
  loadSettings();
}

// ========== الوظائف الرئيسية ==========
function generateRandomPrompt() {
  const randomIndex = Math.floor(Math.random() * app.randomPrompts.length);
  app.elements.promptInput.value = app.randomPrompts[randomIndex];
  app.elements.promptInput.focus();
  showToast("تم توليد وصف عشوائي", "success");
}

async function generateImage() {
  if (app.isLoading) return;
  
  const prompt = app.elements.promptInput.value.trim();
  if (!prompt) {
    showToast("الرجاء إدخال وصف للصورة", "warning");
    return;
  }
  
  startLoading();
  
  try {
    const selectedModel = app.elements.modelSelect.value;
    const width = 800;
    const height = 600;
    
    // بناء URL API مع المعلمات
    const apiUrl = `${app.apiBaseUrl}/${encodeURIComponent(prompt)}?width=${width}&height=${height}&model=${selectedModel}`;
    
    // عرض رسالة تحميل مع معلومات النموذج
    updateLoadingMessage(`جاري توليد الصورة باستخدام ${getModelName(selectedModel)}...`);
    
    const img = await loadImage(apiUrl);
    
    // قص الجزء السفلي لإزالة أي علامة مائية
    removeWatermark(img);
    
    app.currentImage = img;
    displayImage(img);
    app.elements.actions.style.display = "flex";
    showToast("تم توليد الصورة بنجاح!", "success");
    
    // حفظ الإعدادات
    saveSettings();
    
  } catch (error) {
    console.error("Error generating image:", error);
    showError("حدث خطأ أثناء توليد الصورة. يرجى المحاولة مرة أخرى.");
  } finally {
    stopLoading();
  }
}

async function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("فشل في تحميل الصورة"));
    
    // إضافة طابع زمني لمنع التخزين المؤقت
    img.src = `${url}&timestamp=${Date.now()}`;
  });
}

function removeBackground() {
  if (!app.currentImage || app.isLoading) {
    showToast("لا توجد صورة لمعالجتها", "warning");
    return;
  }
  
  startLoading();
  updateLoadingMessage("جاري إزالة الخلفية...");
  
  setTimeout(() => {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = app.currentImage.width;
      canvas.height = app.currentImage.height;
      
      ctx.drawImage(app.currentImage, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // خوارزمية متقدمة لإزالة الخلفية
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i+1], b = data[i+2];
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        const isGrayish = Math.abs(r - g) < 30 && Math.abs(r - b) < 30 && Math.abs(g - b) < 30;
        
        if (brightness > 200 || (isGrayish && brightness > 180)) {
          data[i+3] = 0; // جعل البكسل شفاف
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      const result = new Image();
      result.src = canvas.toDataURL("image/png");
      
      result.onload = () => {
        app.currentImage = result;
        displayImage(result);
        showToast("تمت إزالة الخلفية بنجاح!", "success");
        stopLoading();
      };
    } catch (error) {
      console.error("Error removing background:", error);
      showToast("فشل في إزالة الخلفية", "error");
      stopLoading();
    }
  }, 500);
}

function enhanceQuality() {
  if (!app.currentImage || app.isLoading) {
    showToast("لا توجد صورة لتحسينها", "warning");
    return;
  }
  
  startLoading();
  updateLoadingMessage("جاري تحسين جودة الصورة...");
  
  setTimeout(() => {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      // زيادة الدقة لمحاكاة تحسين الجودة
      canvas.width = app.currentImage.width * 1.2;
      canvas.height = app.currentImage.height * 1.2;
      
      // تطبيق تصفية لتحسين الجودة
      ctx.imageSmoothingEnabled = true;
      ctx.filter = "contrast(1.1) brightness(1.05) saturate(1.1)";
      ctx.drawImage(app.currentImage, 0, 0, canvas.width, canvas.height);
      
      // تحسينات إضافية على البيانات
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        // زيادة التباين
        data[i] = data[i] < 128 ? data[i] * 0.95 : data[i] * 1.05;
        data[i+1] = data[i+1] < 128 ? data[i+1] * 0.95 : data[i+1] * 1.05;
        data[i+2] = data[i+2] < 128 ? data[i+2] * 0.95 : data[i+2] * 1.05;
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      const result = new Image();
      result.src = canvas.toDataURL("image/jpeg", 0.95);
      
      result.onload = () => {
        app.currentImage = result;
        displayImage(result);
        showToast("تم تحسين جودة الصورة بنجاح!", "success");
        stopLoading();
      };
    } catch (error) {
      console.error("Error enhancing quality:", error);
      showToast("فشل في تحسين الجودة", "error");
      stopLoading();
    }
  }, 800);
}

function applyArtisticFilter() {
  if (!app.currentImage || app.isLoading) {
    showToast("لا توجد صورة لتطبيق التأثير", "warning");
    return;
  }
  
  startLoading();
  updateLoadingMessage("جاري تطبيق التأثير الفني...");
  
  setTimeout(() => {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = app.currentImage.width;
      canvas.height = app.currentImage.height;
      ctx.drawImage(app.currentImage, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // تأثير فني: زيادة التشبع والتأثير الرسومي
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i+1] + data[i+2]) / 3;
        data[i] = avg + 1.5 * (data[i] - avg);
        data[i+1] = avg + 1.5 * (data[i+1] - avg);
        data[i+2] = avg + 1.5 * (data[i+2] - avg);
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      const result = new Image();
      result.src = canvas.toDataURL("image/jpeg", 0.9);
      
      result.onload = () => {
        app.currentImage = result;
        displayImage(result);
        showToast("تم تطبيق التأثير الفني بنجاح!", "success");
        stopLoading();
      };
    } catch (error) {
      console.error("Error applying artistic filter:", error);
      showToast("فشل في تطبيق التأثير", "error");
      stopLoading();
    }
  }, 700);
}

function removeWatermark(img = app.currentImage) {
  if (!img) return;
  
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  
  // قص 10% من الأسفل لإزالة العلامة المائية
  const cutHeight = img.height * 0.9;
  canvas.width = img.width;
  canvas.height = cutHeight;
  
  ctx.drawImage(img, 0, 0, img.width, cutHeight, 0, 0, canvas.width, canvas.height);
  
  const result = new Image();
  result.src = canvas.toDataURL("image/png");
  
  result.onload = () => {
    app.currentImage = result;
    displayImage(result);
  };
}

function downloadImage() {
  if (!app.currentImage) {
    showToast("لا توجد صورة لتحميلها", "warning");
    return;
  }
  
  const link = document.createElement("a");
  link.href = app.currentImage.src;
  link.download = `ai-image-${Date.now()}.jpg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showToast("بدأ تحميل الصورة...", "info");
}

function removeImage() {
  app.elements.imageContainer.innerHTML = `
    <div class="placeholder">
      <i class="fas fa-image"></i>
      <p>الصورة المولدة ستظهر هنا</p>
    </div>
  `;
  
  app.elements.actions.style.display = "none";
  app.currentImage = null;
  
  showToast("تمت إزالة الصورة", "info");
}

// ========== وظائف المساعدة ==========
function startLoading() {
  app.isLoading = true;
  app.elements.imageContainer.innerHTML = `
    <div class="loading-overlay">
      <div class="spinner"></div>
      <p id="loadingMessage">جاري معالجة الصورة...</p>
    </div>
  `;
  
  // تعطيل الأزرار أثناء التحميل
  document.querySelectorAll("button").forEach(btn => {
    btn.disabled = true;
  });
}

function updateLoadingMessage(message) {
  const loadingMessage = document.getElementById("loadingMessage");
  if (loadingMessage) loadingMessage.textContent = message;
}

function stopLoading() {
  app.isLoading = false;
  
  // تمكين الأزرار بعد الانتهاء
  document.querySelectorAll("button").forEach(btn => {
    btn.disabled = false;
  });
}

function displayImage(img) {
  app.elements.imageContainer.innerHTML = "";
  const imgWrapper = document.createElement("div");
  imgWrapper.className = "image-wrapper";
  
  const imgElement = img.cloneNode();
  imgWrapper.appendChild(imgElement);
  
  app.elements.imageContainer.appendChild(imgWrapper);
}

function showError(message) {
  app.elements.imageContainer.innerHTML = `
    <div class="error-message">
      <i class="fas fa-exclamation-triangle"></i>
      <p>${message}</p>
    </div>
  `;
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  const icon = type === "error" ? "fa-exclamation-circle" : 
               type === "warning" ? "fa-info-circle" : 
               type === "info" ? "fa-info-circle" : "fa-check-circle";
  
  toast.innerHTML = `
    <i class="fas ${icon}"></i>
    <span>${message}</span>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function getModelName(id) {
  const model = app.availableModels.find(m => m.id === id);
  return model ? model.name : "النموذج الافتراضي";
}

function saveSettings() {
  const settings = {
    model: app.elements.modelSelect.value,
    prompt: app.elements.promptInput.value
  };
  localStorage.setItem("aiImageGeneratorSettings", JSON.stringify(settings));
}

function loadSettings() {
  const savedSettings = localStorage.getItem("aiImageGeneratorSettings");
  if (savedSettings) {
    const settings = JSON.parse(savedSettings);
    app.elements.modelSelect.value = settings.model || "default";
    app.elements.promptInput.value = settings.prompt || "";
  }
}

// بدء التطبيق عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", initApp);
