# admin.py
from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_required
from werkzeug.security import generate_password_hash

# إنشاء Blueprint باسم "admin" ليتطابق مع الاستخدام في القوالب (admin.users, admin.categories ...)
admin_bp = Blueprint("admin", __name__, template_folder="templates/admin")

# لوحة التحكم
@admin_bp.route("/dashboard")
@login_required
def dashboard():
    return render_template("admin/dashboard.html")

# المستخدمون
@admin_bp.route("/users")
@login_required
def users():
    # الاستيراد داخل الدالة لتجنب الدوران في الاستيراد
    from models import User
    all_users = User.query.order_by(User.created_at.desc()).all()
    return render_template("admin/users.html", users=all_users)

@admin_bp.route("/users", methods=["POST"])
@login_required
def add_user():
    from models import db, User
    try:
        username = request.form["username"].strip()
        full_name = request.form["full_name"].strip()
        email = request.form["email"].strip()
        password = request.form["password"]
        role = request.form.get("role", "user")
        if not username or not full_name or not email or not password:
            flash("الحقول المطلوبة مفقودة", "error")
            return redirect(url_for("admin.users"))
        if User.query.filter((User.username == username) | (User.email == email)).first():
            flash("اسم المستخدم أو البريد الإلكتروني مستخدم مسبقاً", "error")
            return redirect(url_for("admin.users"))
        user = User(
            username=username,
            full_name=full_name,
            email=email,
            password_hash=generate_password_hash(password),
            role=role,
        )
        db.session.add(user)
        db.session.commit()
        flash("تم إنشاء المستخدم بنجاح", "success")
    except Exception:
        from models import db as _db
        _db.session.rollback()
        flash("حدث خطأ أثناء إنشاء المستخدم", "error")
    return redirect(url_for("admin.users"))

@admin_bp.route("/users/<int:user_id>/toggle", methods=["POST"])
@login_required
def toggle_user(user_id):
    from models import db, User
    try:
        user = User.query.get_or_404(user_id)
        user.is_active = not bool(user.is_active)
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "فشل التحديث"}), 500

@admin_bp.route("/users/<int:user_id>/delete", methods=["DELETE"])
@login_required
def delete_user(user_id):
    from models import db, User
    try:
        user = User.query.get_or_404(user_id)
        db.session.delete(user)
        db.session.commit()
        return jsonify({"success": True})
    except Exception:
        db.session.rollback()
        return jsonify({"success": False, "message": "فشل الحذف"}), 500

# الفئات
@admin_bp.route("/categories")
@login_required
def categories():
    from models import Category
    all_categories = Category.query.order_by(Category.created_at.desc()).all()
    return render_template("admin/categories.html", categories=all_categories)

@admin_bp.route("/categories", methods=["POST"])
@login_required
def add_category():
    from models import db, Category
    try:
        name = request.form["name"].strip()
        description = request.form.get("description")
        if not name:
            flash("اسم الفئة مطلوب", "error")
            return redirect(url_for("admin.categories"))
        cat = Category(name=name, description=description)
        db.session.add(cat)
        db.session.commit()
        flash("تم إضافة الفئة", "success")
    except Exception:
        db.session.rollback()
        flash("حدث خطأ أثناء إضافة الفئة", "error")
    return redirect(url_for("admin.categories"))

@admin_bp.route("/categories/<int:category_id>/edit", methods=["POST"])
@login_required
def edit_category(category_id):
    from models import db, Category
    try:
        cat = Category.query.get_or_404(category_id)
        cat.name = request.form.get("name", cat.name)
        cat.description = request.form.get("description", cat.description)
        db.session.commit()
        flash("تم تحديث الفئة", "success")
        return redirect(url_for("admin.categories"))
    except Exception:
        db.session.rollback()
        flash("فشل تحديث الفئة", "error")
        return redirect(url_for("admin.categories"))

@admin_bp.route("/categories/<int:category_id>/delete", methods=["DELETE"])
@login_required
def delete_category(category_id):
    from models import db, Category
    try:
        cat = Category.query.get_or_404(category_id)
        if getattr(cat, 'assets', []):
            # منع الحذف إن كانت تحتوي أصول
            return jsonify({"success": False, "message": "لا يمكن حذف فئة تحتوي على أصول"}), 400
        db.session.delete(cat)
        db.session.commit()
        return jsonify({"success": True})
    except Exception:
        db.session.rollback()
        return jsonify({"success": False, "message": "فشل الحذف"}), 500

# النسخ الاحتياطي
@admin_bp.route("/backup")
@login_required
def backup():
    return render_template("admin/backup.html")

# --- Backup/Restore Endpoints ---
import os
import glob
import shutil
import sqlite3
from datetime import datetime
from flask import current_app, send_from_directory


def _get_backup_dir():
    """Return absolute path to backups directory inside static."""
    backup_dir = os.path.join(current_app.root_path, 'static', 'backups')
    os.makedirs(backup_dir, exist_ok=True)
    return backup_dir


def _resolve_sqlite_db_path(db_uri: str):
    """Resolve SQLite DB file path from SQLALCHEMY_DATABASE_URI.
    Supports:
    - sqlite:////absolute/path.db (absolute)
    - sqlite:///relative.db (relative to instance folder)
    Returns absolute path or None if not sqlite.
    """
    if not db_uri or not db_uri.startswith('sqlite:'):
        return None

    # Remove scheme
    if db_uri.startswith('sqlite:///'):
        path_part = db_uri.replace('sqlite:///', '', 1)
    elif db_uri.startswith('sqlite:////'):
        # Absolute path variant
        path_part = db_uri.replace('sqlite:////', '/', 1)
    else:
        # Other sqlite forms are not expected here
        path_part = db_uri.split('sqlite:', 1)[-1].lstrip('/')

    # Absolute
    if os.path.isabs(path_part):
        return path_part

    # Relative to instance folder
    return os.path.join(current_app.instance_path, path_part)


@admin_bp.route("/backup/create", methods=["POST"])
@login_required
def create_backup():
    """Create a full backup of the SQLite database using sqlite3 backup API."""
    db_uri = current_app.config.get('SQLALCHEMY_DATABASE_URI', '')
    db_path = _resolve_sqlite_db_path(db_uri)
    if not db_path or not os.path.exists(db_path):
        flash("تعذر تحديد ملف قاعدة البيانات أو أنه غير موجود", "error")
        return redirect(url_for("admin.backup"))

    backup_dir = _get_backup_dir()
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"backup_{ts}.db"
    dest_path = os.path.join(backup_dir, backup_filename)

    try:
        # Use sqlite3 backup API for a consistent snapshot
        with sqlite3.connect(db_path) as src, sqlite3.connect(dest_path) as dst:
            src.backup(dst)
        flash("تم إنشاء النسخة الاحتياطية بنجاح", "success")
    except Exception:
        # Cleanup partial file if created
        if os.path.exists(dest_path):
            try:
                os.remove(dest_path)
            except Exception:
                pass
        flash("فشل إنشاء النسخة الاحتياطية", "error")

    return redirect(url_for("admin.backup"))


@admin_bp.route("/backup/list")
@login_required
def backup_list():
    """List available backups with size and creation time."""
    backup_dir = _get_backup_dir()
    files = []
    for p in sorted(glob.glob(os.path.join(backup_dir, "*")), key=os.path.getctime, reverse=True):
        if os.path.isfile(p):
            files.append({
                "filename": os.path.basename(p),
                "size": os.path.getsize(p),
                "created_at": datetime.fromtimestamp(os.path.getctime(p)).isoformat()
            })
    return jsonify({"success": True, "backups": files})


@admin_bp.route("/backup/info")
@login_required
def backup_info():
    """Return current database info and backups summary."""
    db_uri = current_app.config.get('SQLALCHEMY_DATABASE_URI', '')
    db_path = _resolve_sqlite_db_path(db_uri)
    backup_dir = _get_backup_dir()
    backup_files = [p for p in glob.glob(os.path.join(backup_dir, "*")) if os.path.isfile(p)]

    db_size = os.path.getsize(db_path) if db_path and os.path.exists(db_path) else 0
    total_backup_size = sum(os.path.getsize(p) for p in backup_files)

    return jsonify({
        "success": True,
        "current_db_path": db_path,
        "current_db_size": db_size,
        "backup_dir_exists": os.path.exists(backup_dir),
        "backup_count": len(backup_files),
        "total_backup_size": total_backup_size,
    })


@admin_bp.route("/backup/download/<path:filename>")
@login_required
def backup_download(filename):
    """Download a backup file by name."""
    backup_dir = _get_backup_dir()
    return send_from_directory(backup_dir, filename, as_attachment=True)


@admin_bp.route("/backup/restore/<path:filename>", methods=["POST"])
@login_required
def backup_restore(filename):
    """Restore database from a selected backup file.
    Creates an automatic safety backup before restoring.
    """
    from models import db  # local import to avoid circular deps

    db_uri = current_app.config.get('SQLALCHEMY_DATABASE_URI', '')
    db_path = _resolve_sqlite_db_path(db_uri)
    if not db_path:
        return jsonify({"success": False, "message": "قاعدة البيانات ليست SQLite"}), 400

    backup_dir = _get_backup_dir()
    src_path = os.path.join(backup_dir, filename)
    if not os.path.exists(src_path):
        return jsonify({"success": False, "message": "النسخة الاحتياطية غير موجودة"}), 404

    try:
        # Dispose connections before file operations
        db.session.remove()
        db.engine.dispose()

        # Safety backup of current DB
        if os.path.exists(db_path):
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            safety_name = f"auto_before_restore_{ts}.db"
            shutil.copy2(db_path, os.path.join(backup_dir, safety_name))

        # Restore
        shutil.copy2(src_path, db_path)
        return jsonify({"success": True, "message": "تمت الاستعادة بنجاح. يُفضل إعادة تشغيل النظام."})
    except Exception:
        return jsonify({"success": False, "message": "فشل الاستعادة"}), 500


@admin_bp.route("/backup/delete/<path:filename>", methods=["DELETE"])
@login_required
def backup_delete(filename):
    """Delete a backup file."""
    backup_dir = _get_backup_dir()
    target = os.path.join(backup_dir, filename)
    try:
        if os.path.exists(target):
            os.remove(target)
            return jsonify({"success": True})
        return jsonify({"success": False, "message": "الملف غير موجود"}), 404
    except Exception:
        return jsonify({"success": False, "message": "فشل الحذف"}), 500
