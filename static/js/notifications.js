// نظام الإشعارات التفاعلي

class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.isDropdownOpen = false;
        this.checkInterval = null;
        
        this.init();
    }
    
    init() {
        this.createNotificationElements();
        this.bindEvents();
        this.startPeriodicCheck();
        this.loadInitialNotifications();
    }
    
    createNotificationElements() {
        // إنشاء أيقونة الإشعارات في الشريط العلوي
        const navbar = document.querySelector('.navbar-nav');
        if (navbar) {
            const notificationItem = document.createElement('li');
            notificationItem.className = 'nav-item dropdown position-relative';
            notificationItem.innerHTML = `
                <div class="notification-icon" id="notification-trigger">
                    <i class="fas fa-bell text-white"></i>
                    <span class="notification-badge" id="notification-count" style="display: none;">0</span>
                </div>
                <div class="notifications-dropdown" id="notifications-dropdown">
                    <div class="notifications-header">
                        <h6><i class="fas fa-bell"></i> الإشعارات</h6>
                    </div>
                    <div class="notifications-list" id="notifications-list">
                        <div class="notifications-loading">
                            <div class="spinner"></div>
                            <div>جاري تحميل الإشعارات...</div>
                        </div>
                    </div>
                    <div class="notifications-footer">
                        <a href="#" onclick="NotificationSystem.markAllAsRead()">تعليم الكل كمقروء</a>
                    </div>
                </div>
            `;
            navbar.appendChild(notificationItem);
        }
        
        // إنشاء حاوي Toast
        const toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
        
        // إنشاء شريط الإشعارات العلوي
        const notificationBar = document.createElement('div');
        notificationBar.className = 'notifications-bar';
        notificationBar.id = 'notification-bar';
        notificationBar.innerHTML = `
            <div class="container">
                <span id="notification-bar-text"></span>
                <button class="close-btn" onclick="NotificationSystem.hideNotificationBar()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        document.body.appendChild(notificationBar);
    }
    
    bindEvents() {
        // فتح/إغلاق قائمة الإشعارات
        const trigger = document.getElementById('notification-trigger');
        const dropdown = document.getElementById('notifications-dropdown');
        
        if (trigger && dropdown) {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown();
            });
            
            // إغلاق القائمة عند النقر خارجها
            document.addEventListener('click', (e) => {
                if (!dropdown.contains(e.target) && !trigger.contains(e.target)) {
                    this.closeDropdown();
                }
            });
        }
    }
    
    toggleDropdown() {
        const dropdown = document.getElementById('notifications-dropdown');
        if (dropdown) {
            this.isDropdownOpen = !this.isDropdownOpen;
            dropdown.classList.toggle('show', this.isDropdownOpen);
            
            if (this.isDropdownOpen) {
                this.loadNotifications();
            }
        }
    }
    
    closeDropdown() {
        const dropdown = document.getElementById('notifications-dropdown');
        if (dropdown && this.isDropdownOpen) {
            this.isDropdownOpen = false;
            dropdown.classList.remove('show');
        }
    }
    
    async loadInitialNotifications() {
        try {
            const response = await fetch('/api/notifications/count');
            if (response.ok) {
                const data = await response.json();
                this.updateNotificationCount(data.unread_count || 0);
            }
        } catch (error) {
            console.log('تحديث عدد الإشعارات متوقف مؤقتاً');
        }
    }
    
    async loadNotifications() {
        const listContainer = document.getElementById('notifications-list');
        if (!listContainer) return;
        
        try {
            const response = await fetch('/api/notifications');
            if (response.ok) {
                const data = await response.json();
                this.renderNotifications(data.notifications || []);
            } else {
                this.renderEmptyState();
            }
        } catch (error) {
            this.renderErrorState();
        }
    }
    
    renderNotifications(notifications) {
        const listContainer = document.getElementById('notifications-list');
        if (!listContainer) return;
        
        if (notifications.length === 0) {
            this.renderEmptyState();
            return;
        }
        
        listContainer.innerHTML = notifications.map(notification => `
            <div class="notification-item ${notification.read ? '' : 'unread'}" 
                 onclick="NotificationSystem.markAsRead(${notification.id})">
                <div class="notification-content">
                    <div class="notification-icon-wrapper ${notification.type}">
                        <i class="${this.getNotificationIcon(notification.type)}"></i>
                    </div>
                    <div class="notification-text">
                        <div class="notification-title">${notification.title}</div>
                        <div class="notification-message">${notification.message}</div>
                        <div class="notification-time">${this.formatTime(notification.created_at)}</div>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    renderEmptyState() {
        const listContainer = document.getElementById('notifications-list');
        if (listContainer) {
            listContainer.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-bell-slash fa-3x text-muted mb-3"></i>
                    <p class="text-muted">لا توجد إشعارات جديدة</p>
                </div>
            `;
        }
    }
    
    renderErrorState() {
        const listContainer = document.getElementById('notifications-list');
        if (listContainer) {
            listContainer.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-exclamation-triangle fa-2x text-warning mb-2"></i>
                    <p class="text-muted">فشل في تحميل الإشعارات</p>
                    <button class="btn btn-sm btn-outline-primary" onclick="NotificationSystem.loadNotifications()">
                        إعادة المحاولة
                    </button>
                </div>
            `;
        }
    }
    
    getNotificationIcon(type) {
        const icons = {
            'maintenance': 'fas fa-tools',
            'warranty': 'fas fa-shield-alt',
            'license': 'fas fa-certificate',
            'system': 'fas fa-cog',
            'security': 'fas fa-lock',
            'info': 'fas fa-info-circle',
            'warning': 'fas fa-exclamation-triangle',
            'danger': 'fas fa-exclamation-circle',
            'success': 'fas fa-check-circle'
        };
        return icons[type] || 'fas fa-bell';
    }
    
    formatTime(timestamp) {
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
    
    updateNotificationCount(count) {
        this.unreadCount = count;
        const badge = document.getElementById('notification-count');
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }
    
    showToast(title, message, type = 'info', duration = 5000) {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        
        const toastId = 'toast-' + Date.now();
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.id = toastId;
        toast.innerHTML = `
            <div class="toast-header ${type}">
                <i class="toast-icon ${this.getNotificationIcon(type)}"></i>
                <div class="toast-title">${title}</div>
                <button class="toast-close" onclick="NotificationSystem.hideToast('${toastId}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="toast-body">${message}</div>
        `;
        
        toastContainer.appendChild(toast);
        
        // إظهار Toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        // إخفاء Toast تلقائياً
        setTimeout(() => {
            this.hideToast(toastId);
        }, duration);
    }
    
    hideToast(toastId) {
        const toast = document.getElementById(toastId);
        if (toast) {
            toast.classList.add('hide');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }
    }
    
    showNotificationBar(message, type = 'info') {
        const bar = document.getElementById('notification-bar');
        const text = document.getElementById('notification-bar-text');
        
        if (bar && text) {
            text.innerHTML = `<i class="${this.getNotificationIcon(type)}"></i> ${message}`;
            bar.classList.add('show');
        }
    }
    
    hideNotificationBar() {
        const bar = document.getElementById('notification-bar');
        if (bar) {
            bar.classList.remove('show');
        }
    }
    
    async markAsRead(notificationId) {
        try {
            const response = await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'POST'
            });
            
            if (response.ok) {
                this.loadNotifications();
                this.loadInitialNotifications();
            }
        } catch (error) {
            console.log('تعليم الإشعار كمقروء متوقف مؤقتاً');
        }
    }
    
    async markAllAsRead() {
        try {
            const response = await fetch('/api/notifications/mark-all-read', {
                method: 'POST'
            });
            
            if (response.ok) {
                this.loadNotifications();
                this.updateNotificationCount(0);
                this.showToast('تم بنجاح', 'تم تعليم جميع الإشعارات كمقروءة', 'success');
            }
        } catch (error) {
            console.log('تعليم جميع الإشعارات كمقروءة متوقف مؤقتاً');
        }
    }
    
    startPeriodicCheck() {
        // فحص الإشعارات الجديدة كل دقيقة
        this.checkInterval = setInterval(() => {
            this.loadInitialNotifications();
            this.checkMaintenanceAlerts();
        }, 60000);
    }
    
    async checkMaintenanceAlerts() {
        try {
            const response = await fetch('/api/maintenance/alerts');
            if (response.ok) {
                const data = await response.json();
                
                if (data.urgent_maintenance && data.urgent_maintenance.length > 0) {
                    this.showNotificationBar(
                        `تنبيه: ${data.urgent_maintenance.length} أصل يحتاج صيانة عاجلة!`,
                        'warning'
                    );
                }
            }
        } catch (error) {
            console.log('فحص تنبيهات الصيانة متوقف مؤقتاً');
        }
    }
    
    destroy() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
    }
}

// تهيئة نظام الإشعارات عند تحميل الصفحة
let notificationSystem;

document.addEventListener('DOMContentLoaded', function() {
    notificationSystem = new NotificationSystem();
    console.log('✅ تم تحميل نظام الإشعارات بنجاح');
});

// تصدير للاستخدام العام
window.NotificationSystem = {
    showToast: (title, message, type, duration) => {
        if (notificationSystem) {
            notificationSystem.showToast(title, message, type, duration);
        }
    },
    showNotificationBar: (message, type) => {
        if (notificationSystem) {
            notificationSystem.showNotificationBar(message, type);
        }
    },
    hideNotificationBar: () => {
        if (notificationSystem) {
            notificationSystem.hideNotificationBar();
        }
    },
    markAsRead: (id) => {
        if (notificationSystem) {
            notificationSystem.markAsRead(id);
        }
    },
    markAllAsRead: () => {
        if (notificationSystem) {
            notificationSystem.markAllAsRead();
        }
    },
    loadNotifications: () => {
        if (notificationSystem) {
            notificationSystem.loadNotifications();
        }
    }
};