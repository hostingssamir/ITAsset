// لوحة التحكم التفاعلية

// تحديث الوقت والتاريخ
function updateDateTime() {
    const now = new Date();
    const timeElement = document.getElementById('current-time');
    const dateElement = document.getElementById('current-date');
    
    if (timeElement) {
        timeElement.textContent = now.toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
    
    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString('ar-SA', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

// تحديث الإحصائيات بشكل دوري
function updateStats() {
    fetch('/api/dashboard/stats')
        .then(response => response.json())
        .then(data => {
            // تحديث عدد الأصول
            const totalAssetsElement = document.getElementById('total-assets');
            if (totalAssetsElement && data.total_assets !== undefined) {
                animateNumber(totalAssetsElement, data.total_assets);
            }
            
            // تحديث الأصول النشطة
            const activeAssetsElement = document.getElementById('active-assets');
            if (activeAssetsElement && data.active_assets !== undefined) {
                animateNumber(activeAssetsElement, data.active_assets);
            }
            
            // تحديث أعمال الصيانة
            const maintenanceElement = document.getElementById('maintenance-count');
            if (maintenanceElement && data.maintenance_count !== undefined) {
                animateNumber(maintenanceElement, data.maintenance_count);
            }
            
            // تحديث المستخدمين
            const usersElement = document.getElementById('users-count');
            if (usersElement && data.users_count !== undefined) {
                animateNumber(usersElement, data.users_count);
            }
        })
        .catch(error => {
            console.log('تحديث الإحصائيات متوقف مؤقتاً');
        });
}

// تحريك الأرقام
function animateNumber(element, targetNumber) {
    const currentNumber = parseInt(element.textContent) || 0;
    const increment = (targetNumber - currentNumber) / 20;
    let current = currentNumber;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= targetNumber) || 
            (increment < 0 && current <= targetNumber)) {
            current = targetNumber;
            clearInterval(timer);
        }
        element.textContent = Math.round(current);
    }, 50);
}

// إنشاء رسم بياني صغير
function createMiniChart(canvasId, data, color = '#3b82f6') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // مسح الرسم السابق
    ctx.clearRect(0, 0, width, height);
    
    if (!data || data.length === 0) return;
    
    // إعداد البيانات
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    // رسم الخط
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    data.forEach((value, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = height - ((value - min) / range) * height;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // رسم المنطقة تحت الخط
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = color;
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
}

// تحديث الأنشطة الحديثة
function updateRecentActivities() {
    fetch('/api/dashboard/activities')
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('recent-activities');
            if (!container || !data.activities) return;
            
            container.innerHTML = '';
            
            data.activities.forEach(activity => {
                const activityElement = createActivityElement(activity);
                container.appendChild(activityElement);
            });
        })
        .catch(error => {
            console.log('تحديث الأنشطة متوقف مؤقتاً');
        });
}

// إنشاء عنصر نشاط
function createActivityElement(activity) {
    const div = document.createElement('div');
    div.className = 'activity-item d-flex align-items-center';
    
    const iconClass = getActivityIcon(activity.type);
    const timeAgo = getTimeAgo(activity.timestamp);
    
    div.innerHTML = `
        <div class="activity-icon ${activity.type}">
            <i class="${iconClass}"></i>
        </div>
        <div class="flex-grow-1">
            <div class="fw-medium">${activity.title}</div>
            <small class="text-muted">${activity.description}</small>
        </div>
        <small class="text-muted">${timeAgo}</small>
    `;
    
    return div;
}

// الحصول على أيقونة النشاط
function getActivityIcon(type) {
    const icons = {
        'create': 'fas fa-plus',
        'update': 'fas fa-edit',
        'delete': 'fas fa-trash',
        'maintenance': 'fas fa-tools',
        'assignment': 'fas fa-user-tag',
        'login': 'fas fa-sign-in-alt'
    };
    return icons[type] || 'fas fa-info';
}

// حساب الوقت المنقضي
function getTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);
    
    if (diffInSeconds < 60) {
        return 'الآن';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `منذ ${minutes} دقيقة`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `منذ ${hours} ساعة`;
    } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `منذ ${days} يوم`;
    }
}

// تحديث حالة النظام
function updateSystemStatus() {
    const statusElements = {
        database: document.getElementById('db-status'),
        server: document.getElementById('server-status'),
        backup: document.getElementById('backup-status')
    };
    
    // محاكاة حالة النظام (يمكن ربطها بـ API حقيقي لاحقاً)
    Object.keys(statusElements).forEach(key => {
        const element = statusElements[key];
        if (element) {
            element.className = 'badge bg-success';
            element.textContent = 'متصل';
        }
    });
}

// تهيئة الرسوم البيانية الصغيرة
function initializeMiniCharts() {
    // بيانات وهمية للعرض
    const assetsData = [12, 15, 13, 17, 20, 18, 22, 25, 23, 28];
    const maintenanceData = [3, 5, 2, 7, 4, 6, 3, 8, 5, 4];
    
    createMiniChart('assets-chart', assetsData, '#3b82f6');
    createMiniChart('maintenance-chart', maintenanceData, '#f59e0b');
}

// تهيئة التفاعلات
function initializeInteractions() {
    // تأثير hover على البطاقات
    document.querySelectorAll('.stats-card-enhanced').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
    
    // تحديث دوري للبيانات
    setInterval(updateDateTime, 1000);
    setInterval(updateStats, 30000); // كل 30 ثانية
    setInterval(updateRecentActivities, 60000); // كل دقيقة
}

// تهيئة لوحة التحكم عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    updateDateTime();
    updateStats();
    updateRecentActivities();
    updateSystemStatus();
    initializeMiniCharts();
    initializeInteractions();
    
    console.log('✅ تم تحميل لوحة التحكم المحسنة بنجاح');
});

// تصدير الدوال للاستخدام العام
window.DashboardUtils = {
    updateStats,
    updateDateTime,
    updateRecentActivities,
    createMiniChart,
    animateNumber
};