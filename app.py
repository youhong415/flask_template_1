from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import csv
from io import StringIO
from werkzeug.utils import secure_filename
from flask import Response

app = Flask(__name__)
CORS(app)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///data.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)

# 資料庫模型
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), nullable=False)

# 初始化資料庫
with app.app_context():
    db.create_all()

# 取得資料
@app.route("/get_data", methods=["GET"])
def get_data():
    search = request.args.get("search", "", type=str)  # 取得篩選關鍵字
    page = request.args.get("page", 1, type=int)  # 當前頁數
    per_page = request.args.get("per_page", 10, type=int)  # 每頁筆數
    sort_by = request.args.get("sort_by", "id", type=str)  # 取得排序欄位，預設 id
    order = request.args.get("order", "asc", type=str)  # 取得排序順序，預設升冪

    # 建立查詢
    query = User.query
    if search:
        query = query.filter(
            (User.name.contains(search)) | (User.email.contains(search)) | (User.id == search)
        )

    # 依據前端傳來的欄位進行排序
    if sort_by == "id":
        query = query.order_by(User.id.asc() if order == "asc" else User.id.desc())
    elif sort_by == "name":
        query = query.order_by(User.name.asc() if order == "asc" else User.name.desc())
    elif sort_by == "email":
        query = query.order_by(User.email.asc() if order == "asc" else User.email.desc())

    # 取得總筆數
    total_records = query.count()

    # 分頁
    users = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "data": [{"id": u.id, "name": u.name, "email": u.email} for u in users.items],
        "total": total_records,
        "page": page,
        "per_page": per_page
    })



# 更新資料
@app.route("/update_data", methods=["POST"])
def update_data():
    data = request.json  # 取得前端傳來的 JSON 資料
    print("收到的資料:", data)  # Debug 用，看看前端到底傳了什麼

    if "id" not in data:
        return jsonify({"status": "error", "message": "缺少 id"}), 400

    user = User.query.get(data["id"])
    if not user:
        return jsonify({"status": "error", "message": "User not found"}), 404

    # 只有當前端有傳對應欄位時才更新
    if "name" in data:
        user.name = data["name"]
    if "email" in data:
        user.email = data["email"]

    db.session.commit()
    return jsonify({"status": "success"})


# 新增資料
@app.route("/add_data", methods=["POST"])
def add_data():
    data = request.json  # 取得前端傳來的 JSON 資料
    print("收到的新增資料:", data)  # Debug 用

    if "name" not in data or "email" not in data:
        return jsonify({"status": "error", "message": "缺少必要欄位"}), 400

    # 建立新使用者
    new_user = User(name=data["name"], email=data["email"])
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"status": "success", "id": new_user.id})


# 刪除資料
@app.route("/delete_data", methods=["POST"])
def delete_data():
    data = request.json
    user = User.query.get(data["id"])
    if user:
        db.session.delete(user)
        db.session.commit()
        return jsonify({"status": "success"})
    return jsonify({"status": "error", "message": "User not found"}), 404

# 匯入資料
@app.route("/import_data", methods=["POST"])
def import_data():
    if "file" not in request.files:
        return jsonify({"status": "error", "message": "未選擇檔案"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"status": "error", "message": "檔案名稱為空"}), 400

    # 檢查是否為 CSV 檔案
    if not file.filename.endswith(".csv"):
        return jsonify({"status": "error", "message": "只能上傳 CSV 檔案"}), 400

    # 讀取 CSV 檔案
    content = file.read().decode("utf-8")
    csv_reader = csv.reader(StringIO(content))

    # 跳過標題行
    next(csv_reader)

    # 儲存資料庫
    for row in csv_reader:
        if len(row) >= 2:  # 確保每行至少有name和email
            name, email = row[0], row[1]
            new_user = User(name=name, email=email)
            db.session.add(new_user)
    db.session.commit()

    return jsonify({"status": "success", "message": "資料匯入成功"})

# 匯出資料
@app.route("/export_data", methods=["GET"])
def export_data():
    search = request.args.get("search", "", type=str)  # 篩選條件
    sort_by = request.args.get("sort_by", "id", type=str)  # 排序欄位
    order = request.args.get("order", "asc", type=str)  # 排序順序
    per_page = request.args.get("per_page", 10, type=int)  # 每頁筆數
    page = request.args.get("page", 1, type=int)  # 當前頁數

    query = User.query
    if search:
        query = query.filter(
            (User.name.contains(search)) | (User.email.contains(search)) | (User.id == search)
        )

    # 根據排序條件排序
    if sort_by == "id":
        query = query.order_by(User.id.asc() if order == "asc" else User.id.desc())
    elif sort_by == "name":
        query = query.order_by(User.name.asc() if order == "asc" else User.name.desc())
    elif sort_by == "email":
        query = query.order_by(User.email.asc() if order == "asc" else User.email.desc())

    # 取得篩選後的資料
    users = query.paginate(page=page, per_page=per_page, error_out=False)

    # 將資料轉換成 CSV，不包含 id
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["name", "email"])  # CSV 標題
    for user in users.items:
        writer.writerow([user.name, user.email])

    # 讓使用者下載 CSV
    output.seek(0)
    return Response(output.getvalue(), mimetype="text/csv", headers={"Content-Disposition": "attachment;filename=export_data.csv"})

# 批次刪除
@app.route('/batch_delete', methods=['POST'])
def batch_delete():
    try:
        # 取得前端傳來的 JSON 資料
        data = request.get_json()
        ids_to_delete = data.get('ids', [])  # 取得要刪除的 ID 列表

        # 如果沒有傳遞任何 ID，回傳錯誤訊息
        if not ids_to_delete:
            return jsonify({"success": False, "message": "沒有提供要刪除的 ID"}), 400

        # 執行批次刪除，篩選符合 ID 的資料並刪除
        User.query.filter(User.id.in_(ids_to_delete)).delete(synchronize_session=False)
        db.session.commit()  # 提交刪除操作

        return jsonify({"success": True, "message": "資料已成功刪除"})

    except Exception as e:
        db.session.rollback()  # 如果有錯誤，回滾交易
        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/")
def index():
    return render_template("index.html")

if __name__ == "__main__":
    app.run(debug=True)
