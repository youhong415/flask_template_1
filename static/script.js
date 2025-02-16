let allUsers = [];  // 用來儲存所有資料

document.addEventListener("DOMContentLoaded", function () {
    fetchData();
});

function fetchData() {
    // 先撈所有資料
    fetch("/get_data?page=1&per_page=10000")  // 一次性載入大量資料
        .then(response => response.json())
        .then(result => {
            allUsers = result.data;  // 儲存所有資料
            renderTable(allUsers);  // 顯示所有資料
        });
}

function renderTable(data) {
    const table = document.getElementById("user-table");
    table.innerHTML = "";
    
    data.forEach(user => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <!-- 隱藏 id 欄位 -->
            <td><input type="checkbox" name="row-select" value="${user.id}"></td>  <!-- 每一行的勾選框 -->
            <td class="hidden-id">${user.id}</td>
            <td contenteditable="true" id="name-${user.id}" ">${user.name}</td>
            <td contenteditable="true" id="email-${user.id}" ">${user.email}</td>
            <td>
                <button class="btn btn-success btn-sm" onclick="updateData(${user.id})">更新</button>
            </td>
        `;
        table.appendChild(row);
    });
}

function updateData(id) {
    const name = document.getElementById(`name-${id}`).innerText;
    const email = document.getElementById(`email-${id}`).innerText;
    
    let updatePayload = { id: id, name: name, email: email };
    
    fetch("/update_data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload)
    }).then(response => response.json())
      .then(result => {
          if (result.status === "success") {
              alert("更新成功！");
          } else {
              alert("更新失敗：" + result.message);
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
            fetchData();  // 重新載入資料
            alert("新增成功！");  // 顯示新增成功的提示訊息
        } else {
            alert("新增失敗：" + result.message);
        }
    });
}

function filterTable() {
    const filterId = document.querySelector('[data-column="1"]').value.toLowerCase().trim();
    const filterName = document.querySelector('[data-column="2"]').value.toLowerCase().trim();
    const filterEmail = document.querySelector('[data-column="3"]').value.toLowerCase().trim();

    const filteredData = allUsers.filter(user => {
        return (user.id.toString().includes(filterId) &&
                user.name.toLowerCase().includes(filterName) &&
                user.email.toLowerCase().includes(filterEmail));
    });

    renderTable(filteredData);
}

// 批次刪除功能
function batchDeleteSelected() {
    const selectedRows = document.querySelectorAll('input[name="row-select"]:checked');
    const idsToDelete = Array.from(selectedRows).map(row => row.value);

    if (idsToDelete.length === 0) {
        alert("請選擇要刪除的資料。");
        return;
    }

    const confirmDelete = confirm("您確定要刪除選中的資料嗎？");

    if (confirmDelete) {
        fetch('/batch_delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ids: idsToDelete })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert("選中的資料已成功刪除。");
                fetchData();  // 刪除後重新載入資料
            } else {
                alert("刪除資料時發生錯誤。");
            }
        })
        .catch(error => {
            console.error("錯誤:", error);
        });
    } else {
        alert("刪除操作已取消。");
    }
}

// 全選功能
function selectAllRows() {
    const isChecked = document.getElementById('select-all').checked;
    const checkboxes = document.querySelectorAll('input[name="row-select"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = isChecked;
    });
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

            // 清空檔案選擇框
            fileInput.value = '';
        } else {
            alert(result.message);
        }
    });
}

// 匯出資料
function exportData() {
    const filterId = document.querySelector('[data-column="1"]').value;
    const filterName = document.querySelector('[data-column="2"]').value;
    const filterEmail = document.querySelector('[data-column="3"]').value;

    window.location.href = `/export_data?filter_id=${filterId}&filter_name=${filterName}&filter_email=${filterEmail}`;
}
