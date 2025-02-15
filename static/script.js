let currentPage = 1;  // 當前頁數
let perPage = 10;  // 預設每頁筆數

document.addEventListener("DOMContentLoaded", function () {
    fetchData();
});

function fetchData() {
    let search = document.getElementById("search-box").value;  // 取得篩選關鍵字
    perPage = document.getElementById("per-page-select").value;  // 取得每頁筆數

    fetch(`/get_data?search=${search}&page=${currentPage}&per_page=${perPage}`)
        .then(response => response.json())
        .then(result => {
            const table = document.getElementById("user-table");
            table.innerHTML = "";
            result.data.forEach(user => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <!-- 隱藏 id 欄位 -->
                    <td><input type="checkbox" name="row-select" value="${user.id}"></td>  <!-- 每一行的勾選框 -->
                    <td class="hidden-id">${user.id}</td>
                    <td contenteditable="true" id="name-${user.id}" , 'name', this.innerText)">${user.name}</td>
                    <td contenteditable="true" id="email-${user.id}" , 'email', this.innerText)">${user.email}</td>
                    <td>
                        <button class="btn btn-success btn-sm" onclick="prepareUpdate(${user.id})">更新</button>
                    </td>
                `;
                table.appendChild(row);
            });

            // 更新分頁資訊
            document.getElementById("page-info").innerText = `第 ${result.page} 頁 / 共 ${Math.ceil(result.total / perPage)} 頁`;

            // 控制按鈕狀態
            document.getElementById("prev-page").disabled = result.page <= 1;
            document.getElementById("next-page").disabled = result.page >= Math.ceil(result.total / perPage);
        });
}


function changePage(offset) {
    currentPage += offset;
    fetchData();
}

function updateData(id, fields) {
    let updatePayload = { id: id, ...fields };

    fetch("/update_data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload)
    }).then(response => response.json())
      .then(result => {
          if (result.status === "success") {
              alert("更新成功！");  // 顯示更新成功的提示
          } else {
              alert("更新失敗：" + result.message);  // 顯示失敗訊息
          }
      });
}


function prepareUpdate(id) {
    let name = document.getElementById(`name-${id}`).innerText;
    let email = document.getElementById(`email-${id}`).innerText;
    updateData(id, { name: name, email: email });
}

function deleteData(id) {
    if (!confirm("確定要刪除這筆資料嗎？")) return;

    fetch("/delete_data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id })
    }).then(response => response.json())
      .then(result => {
          if (result.status === "success") {
              fetchData();  // 重新載入資料
          } else {
              alert("刪除失敗：" + result.message);
          }
      });
}

function addData() {
    let name = document.getElementById("new-name").value.trim();
    let email = document.getElementById("new-email").value.trim();

    if (!name || !email) {
        alert("請輸入 Name 和 Email！");
        return;
    }

    fetch("/add_data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name, email: email })
    })
    .then(response => response.json())
    .then(result => {
        if (result.status === "success") {
            document.getElementById("new-name").value = "";
            document.getElementById("new-email").value = "";
            fetchData();  // 重新載入表格
        } else {
            alert("新增失敗：" + result.message);
        }
    });
}

function filterTable() {
    let filters = document.querySelectorAll(".filter-input");
    let table = document.getElementById("user-table");
    let rows = table.getElementsByTagName("tr");

    for (let row of rows) {
        let showRow = true;
        filters.forEach((input, index) => {
            let filterValue = input.value.toLowerCase().trim();
            let cell = row.getElementsByTagName("td")[index];

            if (cell && filterValue !== "" && !cell.innerText.toLowerCase().includes(filterValue)) {
                showRow = false;
            }
        });

        row.style.display = showRow ? "" : "none";
    }
}

// 匯入資料
function importData() {
    let fileInput = document.getElementById("csv-file");
    let file = fileInput.files[0];

    if (!file) {
        alert("請選擇一個 CSV 檔案");
        return;
    }

    let formData = new FormData();
    formData.append("file", file);

    fetch("/import_data", {
        method: "POST",
        body: formData
    })
    .then(response => response.json())
    .then(result => {
        if (result.status === "success") {
            alert("資料匯入成功");
            fetchData();  // 重新載入表格資料
        } else {
            alert(result.message);
        }
    });
}

// 匯出資料
function exportData() {
    let search = document.getElementById("search-box").value;
    let perPage = document.getElementById("per-page-select").value;

    window.location.href = `/export_data?search=${search}&per_page=${perPage}`;
}

// 批次刪除功能
function batchDeleteSelected() {
    // 取得選中的勾選框 (假設每一行都有勾選框)
    const selectedRows = document.querySelectorAll('input[name="row-select"]:checked');
    // 提取選中行的 ID
    const idsToDelete = Array.from(selectedRows).map(row => row.value);

    // 如果沒有選中任何資料，顯示提示訊息
    if (idsToDelete.length === 0) {
        alert("請選擇要刪除的資料。");
        return;
    }

    // 顯示確認刪除的提示框
    const confirmDelete = confirm("您確定要刪除選中的資料嗎？");
    
    if (confirmDelete) {
        // 如果用戶確認刪除，發送 POST 請求給後端，並附帶選中的 ID 列表
        fetch('/batch_delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ids: idsToDelete })  // 傳遞選中的 ID
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert("選中的資料已成功刪除。");
                location.reload();  // 刪除後重新載入頁面以顯示更新的資料
            } else {
                alert("刪除資料時發生錯誤。");
            }
        })
        .catch(error => {
            console.error("錯誤:", error);
        });
    } else {
        // 如果使用者取消刪除，顯示提示
        alert("刪除操作已取消。");
    }
}


// 全選功能
function selectAllRows() {
    const isChecked = document.getElementById('select-all').checked;  // 取得全選框的狀態
    const checkboxes = document.querySelectorAll('input[name="row-select"]');  // 取得所有勾選框
    checkboxes.forEach(checkbox => {
        checkbox.checked = isChecked;  // 根據全選框的狀態來選中或取消選中
    });
}

// 儲存當前頁面和每頁顯示的項目數
function savePaginationSettings(currentPage, itemsPerPage) {
    localStorage.setItem('currentPage', currentPage);
    localStorage.setItem('itemsPerPage', itemsPerPage);
}

// 讀取當前頁面和每頁顯示的項目數
function loadPaginationSettings() {
    const currentPage = localStorage.getItem('currentPage');
    const itemsPerPage = localStorage.getItem('itemsPerPage');

    if (currentPage !== null && itemsPerPage !== null) {
        return {
            currentPage: parseInt(currentPage),
            itemsPerPage: parseInt(itemsPerPage)
        };
    } else {
        // 如果沒有設置過，使用默認值
        return {
            currentPage: 1,
            itemsPerPage: 10
        };
    }
}

// 當分頁設置變更時，儲存並重新加載資料
function onPaginationChange(pageNumber, pageSize) {
    savePaginationSettings(pageNumber, pageSize);
    loadData(pageNumber, pageSize);
}

// 假設有個分頁函式需要根據當前頁面和項目數來加載資料
function loadData(currentPage, itemsPerPage) {
    // 這裡填寫你的資料加載邏輯，例如重新請求資料
    console.log('Loading data for page ' + currentPage + ' with ' + itemsPerPage + ' items per page');
}

window.onload = function() {
    const paginationSettings = loadPaginationSettings();
    const currentPage = paginationSettings.currentPage;
    const itemsPerPage = paginationSettings.itemsPerPage;

    // 根據頁面設置初始化分頁
    loadData(currentPage, itemsPerPage);

    // 更新UI，例如設置分頁數量和當前頁碼
    // 假設你有一個分頁控件，這裡設置它的狀態
    updatePaginationUI(currentPage, itemsPerPage);
};

function updatePaginationUI(currentPage, itemsPerPage) {
    // 這裡可以根據你的頁面元素更新分頁UI
    // 例如設置當前頁碼的樣式、選擇每頁顯示的數量等
    console.log('Current page:', currentPage);
    console.log('Items per page:', itemsPerPage);
}