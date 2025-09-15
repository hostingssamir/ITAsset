# admin_blueprint.py
from flask import Blueprint, render_template

# إنشاء Blueprint لوحدة الإدارة
admin_bp = Blueprint("admin", __name__, template_folder="templates/admin")

# مثال: صفحة لوحة التحكم
@admin_bp.route("/dashboard")
def dashboard():
    # تأكد من وجود هذا القالب قبل زيارته
    return render_template("admin/dashboard.html")