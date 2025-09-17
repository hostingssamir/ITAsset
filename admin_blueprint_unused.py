# admin_blueprint.py
from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_required, current_user
from werkzeug.security import generate_password_hash
import os

from models import db, User

# إنشاء Blueprint لوحدة الإدارة
admin_bp = Blueprint("admin", __name__, template_folder="templates/admin")

# مثال: صفحة لوحة التحكم
@admin_bp.route("/dashboard")
@login_required
def dashboard():
    return render_template("admin/dashboard.html")

# صفحة إعدادات الإدارة
@admin_bp.route("/settings", methods=["GET", "POST"])
@login_required
def settings():
    if current_user.role != 'admin':
        flash('غير مصرح لك بالوصول إلى إعدادات المشرف', 'error')
        return redirect(url_for('index'))

    if request.method == 'POST':
        action = request.form.get('action')
        if action == 'change_password':
            new_password = request.form.get('new_password')
            if not new_password or len(new_password) < 6:
                flash('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error')
            else:
                current_user.password_hash = generate_password_hash(new_password)
                db.session.commit()
                flash('تم تحديث كلمة المرور بنجاح', 'success')
        elif action == 'rotate_init_token':
            # يتم تدوير INIT_TOKEN بشكل يدوي عبر متغيرات البيئة في منصات النشر
            flash('يرجى تحديث INIT_TOKEN من إعدادات البيئة ثم إعادة النشر', 'info')
        return redirect(url_for('admin.settings'))

    return render_template("admin/settings.html", init_token_set=bool(os.environ.get('INIT_TOKEN')))

# واجهات REST بسيطة لإدارة المستخدمين (اختياري إن استُخدمت في القوالب)
@admin_bp.route('/users')
@login_required
def list_users():
    if current_user.role != 'admin':
        flash('غير مصرح', 'error')
        return redirect(url_for('index'))
    users = User.query.order_by(User.created_at.desc()).all()
    return render_template('admin/users.html', users=users)