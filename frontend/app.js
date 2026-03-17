// Auth Guard
const token = localStorage.getItem('paytrack_token');
if (!token) {
    window.location.href = 'login.html';
}

const API_URL = 'http://localhost:3000/api';

// State
let clients = [];
let editingId = null;
let currentView = 'dashboard';

// DOM Elements
const contentArea = document.getElementById('content-area');
const navItems = document.querySelectorAll('.nav-item');
const balancesTableBody = document.getElementById('balances-table-body');
const saleClientNameInput = document.getElementById('sale-client-name');
const clientSuggestions = document.getElementById('client-suggestions');
const paymentClientSelect = document.getElementById('payment-client-select');

// Setup Fetch Interceptor for Auth Header
const originalFetch = window.fetch;
window.fetch = function () {
    let [resource, config] = arguments;
    if (config == null) config = {};
    if (config.headers == null) config.headers = {};

    config.headers['Authorization'] = `Bearer ${token}`;

    return originalFetch(resource, config).then(async response => {
        if (response.status === 401) {
            alert('Sessão expirada. Faça login novamente.');
            localStorage.removeItem('paytrack_token');
            window.location.href = 'login.html';
        }
        return response;
    });
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    fetchClients();
    loadDashboard();
    setupEventListeners();

    // Set today's date in inputs
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('sale-date').value = today;
    document.getElementById('payment-date').value = today;
});

// Navigation
navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        const view = item.dataset.view;
        currentView = view;

        switch (view) {
            case 'dashboard': loadDashboard(); break;
            case 'clients': loadClientsView(); break;
            case 'sales': loadSalesView(); break;
            case 'payments': loadPaymentsView(); break;
            case 'products': loadProductsView(); break; // New
            case 'orders': loadOrdersView(); break; // New
        }
    });
});

// Logout
function logout() {
    localStorage.removeItem('paytrack_token');
    window.location.href = 'login.html';
}

// Data Fetching
async function fetchClients() {
    try {
        const res = await fetch(`${API_URL}/clients`);
        clients = await res.json();
        updateClientSelects();
    } catch (err) {
        console.error('Error fetching clients:', err);
    }
}

async function fetchBalances() {
    try {
        const res = await fetch(`${API_URL}/reports/balances`);
        return await res.json();
    } catch (err) {
        console.error('Error fetching balances:', err);
        return [];
    }
}

async function fetchSales() {
    try {
        const res = await fetch(`${API_URL}/sales`);
        return await res.json();
    } catch (err) {
        console.error('Error fetching sales:', err);
        return [];
    }
}

async function fetchPayments() {
    try {
        const res = await fetch(`${API_URL}/payments`);
        return await res.json();
    } catch (err) {
        console.error('Error fetching payments:', err);
        return [];
    }
}

// UI Updates
function updateClientSelects() {
    const selectOptions = clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    const datalistOptions = clients.map(c => `<option value="${c.name}"></option>`).join('');

    clientSuggestions.innerHTML = datalistOptions;
    paymentClientSelect.innerHTML = '<option value="">Automático / Nenhum</option>' + selectOptions;
}

function updateHeader(title, actions = '') {
    document.getElementById('page-title').innerText = title;
    document.getElementById('header-actions').innerHTML = actions;
}

async function loadDashboard() {
    // Add Export Button
    updateHeader('Dashboard', '<button class="btn btn-secondary" onclick="exportDebtorsCsv()">Exportar Relatório</button>');

    // Restore Dashboard HTML Structure
    contentArea.innerHTML = `
        <div class="dashboard-grid">
            <div class="card stat-card">
                <h3>Total a Receber</h3>
                <p class="stat-value" id="total-receivable">R$ 0,00</p>
            </div>
            <div class="card stat-card">
                <h3>Vendas (Mês)</h3>
                <p class="stat-value" id="total-sales-month">R$ 0,00</p>
            </div>
            <div class="card stat-card">
                <h3>Recebido (Mês)</h3>
                <p class="stat-value" id="total-payments-month">R$ 0,00</p>
            </div>
        </div>

        <div class="card recent-activity">
            <h3>Saldos Pendentes</h3>
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Cliente</th>
                            <th>Consumido</th>
                            <th>Pago</th>
                            <th>Deve</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody id="balances-table-body">
                        <!-- Populated by JS -->
                    </tbody>
                </table>
            </div>
        </div>
    `;

    const balances = await fetchBalances();

    // Calculate Stats
    const totalReceivable = balances.reduce((sum, c) => sum + parseFloat(c.balance), 0);

    document.getElementById('total-receivable').innerText = formatCurrency(totalReceivable);

    // Populate Table
    document.getElementById('balances-table-body').innerHTML = balances.map(c => `
        <tr>
            <td>${c.name}</td>
            <td>${formatCurrency(c.total_consumed)}</td>
            <td>${formatCurrency(c.total_paid)}</td>
            <td class="${parseFloat(c.balance) > 0 ? 'text-danger' : 'text-success'}">
                ${formatCurrency(c.balance)}
            </td>
            <td>
                <button class="btn btn-secondary" style="padding: 5px 10px; font-size: 12px;" onclick="viewClient(${c.id})">Ver</button>
                ${parseFloat(c.balance) > 0.01 ? `<button class="btn btn-primary" style="padding: 5px 10px; font-size: 12px; margin-left: 5px; background-color: #25D366; border-color: #25D366;" onclick='generateCollectionMessage(${JSON.stringify(c)})'>Cobrar 📱</button>` : ''}
            </td>
        </tr>
    `).join('');
}

function renderClientsTable(data) {
    const tbody = document.getElementById('clients-tbody');
    if (!tbody) return;
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#666;">Nenhum cliente encontrado.</td></tr>';
        return;
    }
    tbody.innerHTML = data.map(c => `
        <tr>
            <td>${c.id}</td>
            <td>${c.name}</td>
            <td>${c.phone || '-'}</td>
            <td>
                <button class="btn btn-secondary" style="padding: 5px 10px; font-size: 12px;" onclick="editClient(${c.id})">Editar</button>
                <button class="btn btn-danger" style="padding: 5px 10px; font-size: 12px; background-color: #dc3545;" onclick="deleteClient(${c.id})">Excluir</button>
            </td>
        </tr>
    `).join('');
}

function loadClientsView() {
    updateHeader('Clientes', '<button class="btn btn-primary" onclick="openNewClient()">+ Novo Cliente</button>');

    contentArea.innerHTML = `
        <div class="card">
            <div style="padding: 0 0 16px 0;">
                <input type="text" id="search-clients" placeholder="🔍 Buscar por nome ou telefone..." oninput="filterClients(this.value)"
                    style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid var(--border);background:var(--bg-dark);color:var(--text-primary);font-size:14px;box-sizing:border-box;">
            </div>
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nome</th>
                            <th>Telefone</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody id="clients-tbody"></tbody>
                </table>
            </div>
        </div>
    `;
    renderClientsTable(clients);
}

function filterClients(query) {
    const q = query.toLowerCase().trim();
    const filtered = clients.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q))
    );
    renderClientsTable(filtered);
}

let allSales = [];

function renderSalesTable(data) {
    const tbody = document.getElementById('sales-tbody');
    if (!tbody) return;
    // Reset master checkbox
    const master = document.getElementById('select-all-sales');
    if (master) { master.checked = false; master.indeterminate = false; }
    const btn = document.getElementById('btn-delete-sales');
    if (btn) btn.style.display = 'none';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#666;">Nenhuma venda encontrada.</td></tr>';
        return;
    }
    const totalQty   = data.reduce((sum, s) => sum + s.quantity, 0);
    const totalValue = data.reduce((sum, s) => sum + (s.quantity * parseFloat(s.unit_price)), 0);

    tbody.innerHTML = data.map(s => `
        <tr>
            <td><input type="checkbox" class="sale-checkbox" value="${s.id}" onchange="toggleDeleteButton('sales')"></td>
            <td>${s.id}</td>
            <td>${s.Client ? s.Client.name : 'N/A'}</td>
            <td>${s.product_type || 'Normal'}</td>
            <td>${s.quantity}</td>
            <td>${formatCurrency(s.unit_price)}</td>
            <td>${formatCurrency(s.quantity * s.unit_price)}</td>
            <td>${formatDate(s.date)}</td>
            <td>
                <button class="btn btn-secondary" style="padding: 5px 10px; font-size: 12px;" onclick="editSale(${s.id})">Editar</button>
                <button class="btn btn-danger" style="padding: 5px 10px; font-size: 12px; background-color: #dc3545;" onclick="deleteSale(${s.id})">Excluir</button>
            </td>
        </tr>
    `).join('') + `
        <tr style="border-top: 2px solid var(--border); font-weight: 700; background: rgba(255,255,255,0.03);">
            <td></td>
            <td></td>
            <td style="color: var(--text-secondary); font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Total (${data.length} venda${data.length !== 1 ? 's' : ''})</td>
            <td></td>
            <td>${totalQty}</td>
            <td></td>
            <td style="color: var(--success);">${formatCurrency(totalValue)}</td>
            <td></td>
            <td></td>
        </tr>
    `;
}

async function loadSalesView() {
    allSales = await fetchSales();
    updateHeader('Vendas', `
        <button class="btn btn-danger" onclick="deleteSelectedSales()" id="btn-delete-sales" style="display: none; margin-right: 10px;">Excluir Selecionados</button>
        <button class="btn btn-secondary" onclick="openModal('importSalesModal')">Importar Vendas</button>
        <button class="btn btn-primary" onclick="openNewSale()">+ Nova Venda</button>
    `);

    contentArea.innerHTML = `
        <div class="card">
            <div style="padding: 0 0 16px 0;">
                <input type="text" id="search-sales" placeholder="🔍 Buscar por cliente, tipo ou data..." oninput="filterSales(this.value)"
                    style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid var(--border);background:var(--bg-dark);color:var(--text-primary);font-size:14px;box-sizing:border-box;">
            </div>
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th><input type="checkbox" id="select-all-sales" onchange="toggleAllSales(this)"></th>
                            <th>ID</th>
                            <th>Cliente</th>
                            <th>Tipo</th>
                            <th>Qtd</th>
                            <th>Valor Unit.</th>
                            <th>Total</th>
                            <th>Data</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody id="sales-tbody"></tbody>
                </table>
            </div>
        </div>
    `;
    renderSalesTable(allSales);
}

function filterSales(query) {
    const q = query.toLowerCase().trim();
    const filtered = allSales.filter(s => {
        const clientName = s.Client ? s.Client.name.toLowerCase() : '';
        const type = (s.product_type || 'normal').toLowerCase();
        const date = formatDate(s.date);
        return clientName.includes(q) || type.includes(q) || date.includes(q);
    });
    renderSalesTable(filtered);
}

let allPayments = [];

function renderPaymentsTable(data) {
    const tbody = document.getElementById('payments-tbody');
    if (!tbody) return;
    const master = document.getElementById('select-all-payments');
    if (master) { master.checked = false; master.indeterminate = false; }
    const btn = document.getElementById('btn-delete-payments');
    if (btn) btn.style.display = 'none';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#666;">Nenhum pagamento encontrado.</td></tr>';
        return;
    }
    const totalAmount = data.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    tbody.innerHTML = data.map(p => `
        <tr>
            <td><input type="checkbox" class="payment-checkbox" value="${p.id}" onchange="toggleDeleteButton('payments')"></td>
            <td>${p.id}</td>
            <td>${p.payer_name}</td>
            <td>${p.Client ? p.Client.name : '<span class="text-danger">Não associado</span>'}</td>
            <td>${formatCurrency(p.amount)}</td>
            <td>${formatDate(p.date)}</td>
            <td>
                <button class="btn btn-secondary" style="padding: 5px 10px; font-size: 12px;" onclick="editPayment(${p.id})">Editar</button>
                <button class="btn btn-danger" style="padding: 5px 10px; font-size: 12px; background-color: #dc3545;" onclick="deletePayment(${p.id})">Excluir</button>
            </td>
        </tr>
    `).join('') + `
        <tr style="border-top: 2px solid var(--border); font-weight: 700; background: rgba(255,255,255,0.03);">
            <td></td>
            <td></td>
            <td style="color: var(--text-secondary); font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Total (${data.length} pagamento${data.length !== 1 ? 's' : ''})</td>
            <td></td>
            <td style="color: var(--success);">${formatCurrency(totalAmount)}</td>
            <td></td>
            <td></td>
        </tr>
    `;
}

async function loadPaymentsView() {
    allPayments = await fetchPayments();
    updateHeader('Pagamentos', `
        <button class="btn btn-danger" onclick="deleteSelectedPayments()" id="btn-delete-payments" style="display: none; margin-right: 10px;">Excluir Selecionados</button>
        <button class="btn btn-secondary" onclick="openModal('importModal')">Importar Extrato</button>
        <button class="btn btn-primary" onclick="openNewPayment()">+ Novo Pagamento</button>
    `);

    contentArea.innerHTML = `
        <div class="card">
            <div style="padding: 0 0 16px 0;">
                <input type="text" id="search-payments" placeholder="🔍 Buscar por pagador, cliente ou data..." oninput="filterPayments(this.value)"
                    style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid var(--border);background:var(--bg-dark);color:var(--text-primary);font-size:14px;box-sizing:border-box;">
            </div>
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th><input type="checkbox" id="select-all-payments" onchange="toggleAllPayments(this)"></th>
                            <th>ID</th>
                            <th>Pagador (Banco)</th>
                            <th>Cliente Associado</th>
                            <th>Valor</th>
                            <th>Data</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody id="payments-tbody"></tbody>
                </table>
            </div>
        </div>
    `;
    renderPaymentsTable(allPayments);
}

function filterPayments(query) {
    const q = query.toLowerCase().trim();
    const filtered = allPayments.filter(p => {
        const payer = p.payer_name.toLowerCase();
        const client = p.Client ? p.Client.name.toLowerCase() : '';
        const date = formatDate(p.date);
        return payer.includes(q) || client.includes(q) || date.includes(q);
    });
    renderPaymentsTable(filtered);
}

// Form Handling
document.getElementById('importForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('import-file');
    const file = fileInput.files[0];

    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const btn = e.target.querySelector('button');
        const originalText = btn.innerText;
        btn.innerText = 'Importando...';
        btn.disabled = true;

        const res = await fetch(`${API_URL}/payments/import`, {
            method: 'POST',
            body: formData
        });

        const result = await res.json();

        if (res.ok) {
            alert(`Importação concluída! ${result.imported} pagamentos registrados.`);
            closeModal('importModal');
            loadPaymentsView(); // Refresh
            e.target.reset();
        } else {
            alert('Erro na importação: ' + (result.error || 'Erro desconhecido'));
        }
    } catch (err) {
        alert('Erro ao enviar arquivo');
        console.error(err);
    } finally {
        const btn = e.target.querySelector('button');
        btn.innerText = 'Importar';
        btn.disabled = false;
    }
});
document.getElementById('saleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        client_name: document.getElementById('sale-client-name').value,
        quantity: document.getElementById('sale-quantity').value,
        product_type: document.getElementById('sale-type').value,
        // Append T12:00:00 to ensure it falls in the middle of the day, preventing timezone shifts
        date: document.getElementById('sale-date').value ? `${document.getElementById('sale-date').value}T12:00:00` : null
    };

    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${API_URL}/sales/${editingId}` : `${API_URL}/sales`;

    try {
        await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        closeModal('saleModal');
        loadDashboard(); // Refresh
        if (document.querySelector('.nav-item[data-view="sales"]').classList.contains('active')) {
            loadSalesView();
        }
        e.target.reset();
        editingId = null;
    } catch (err) {
        alert('Erro ao salvar venda');
    }
});

document.getElementById('paymentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const clientId = document.getElementById('payment-client-select').value;
    const data = {
        payer_name: document.getElementById('payment-payer').value,
        amount: document.getElementById('payment-amount').value,
        date: document.getElementById('payment-date').value ? `${document.getElementById('payment-date').value}T12:00:00` : null,
        client_id: clientId || null
    };

    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${API_URL}/payments/${editingId}` : `${API_URL}/payments`;

    try {
        await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        closeModal('paymentModal');
        loadDashboard(); // Refresh
        if (document.querySelector('.nav-item[data-view="payments"]').classList.contains('active')) {
            loadPaymentsView();
        }
        e.target.reset();
        editingId = null;
    } catch (err) {
        alert('Erro ao salvar pagamento');
    }
});

document.getElementById('clientForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        name: document.getElementById('client-name').value,
        phone: document.getElementById('client-phone').value
    };

    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${API_URL}/clients/${editingId}` : `${API_URL}/clients`;

    try {
        await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        closeModal('clientModal');
        fetchClients(); // Refresh list
        if (document.querySelector('.nav-item[data-view="clients"]').classList.contains('active')) {
            loadClientsView();
        }
        e.target.reset();
        editingId = null;
    } catch (err) {
        alert('Erro ao salvar cliente');
    }
});

// Helpers
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// Exibe a data corretamente independente do fuso horário.
// new Date('2026-02-19') interpreta como UTC e no Brasil (UTC-3) vira 18/02 — esta função corrige isso.
function formatDate(dateStr) {
    if (!dateStr) return '-';
    // Se já vier com hora (ISO completo), usa direto
    if (dateStr.includes('T') || dateStr.includes(' ')) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('pt-BR');
    }
    // Data pura 'YYYY-MM-DD' — parse manual para evitar conversão UTC
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

function openModal(id) {
    document.getElementById(id).style.display = 'flex';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

function setupEventListeners() {
    window.onclick = function (event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = "none";
        }
    }
}

async function deletePayment(id) {
    if (!confirm('Tem certeza que deseja excluir este pagamento?')) return;

    try {
        const res = await fetch(`${API_URL}/payments/${id}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            loadPaymentsView(); // Refresh list
            loadDashboard(); // Refresh stats
        } else {
            const result = await res.json();
            alert('Erro ao excluir: ' + (result.error || 'Erro desconhecido'));
        }
    } catch (err) {
        console.error(err);
        alert('Erro ao excluir pagamento');
    }
}

function viewClient(id) {
    // Switch to Clients view
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelector('.nav-item[data-view="clients"]').classList.add('active');
    loadClientsView();

    // Open Edit Modal for this client
    setTimeout(() => editClient(id), 100);
}

// New/Edit Actions
function openNewClient() {
    editingId = null;
    document.getElementById('clientForm').reset();
    openModal('clientModal');
}

async function editClient(id) {
    try {
        const res = await fetch(`${API_URL}/clients/${id}`);
        const client = await res.json();

        editingId = id;
        document.getElementById('client-name').value = client.name;
        document.getElementById('client-phone').value = client.phone || '';
        openModal('clientModal');
    } catch (err) {
        alert('Erro ao carregar cliente');
    }
}

async function deleteClient(id) {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    try {
        await fetch(`${API_URL}/clients/${id}`, { method: 'DELETE' });
        await fetchClients();
        loadClientsView();
    } catch (err) {
        alert('Erro ao excluir cliente');
    }
}

function openNewSale() {
    editingId = null;
    document.getElementById('saleForm').reset();
    document.getElementById('sale-date').value = new Date().toISOString().split('T')[0];
    openModal('saleModal');
}

async function editSale(id) {
    try {
        const res = await fetch(`${API_URL}/sales/${id}`);
        const sale = await res.json();

        editingId = id;
        document.getElementById('sale-client-name').value = sale.Client ? sale.Client.name : '';
        document.getElementById('sale-quantity').value = sale.quantity;
        document.getElementById('sale-type').value = sale.product_type || 'Normal';
        document.getElementById('sale-date').value = sale.date ? sale.date.split('T')[0] : '';
        openModal('saleModal');
    } catch (err) {
        alert('Erro ao carregar venda');
    }
}

async function deleteSale(id) {
    if (!confirm('Tem certeza que deseja excluir esta venda?')) return;
    try {
        await fetch(`${API_URL}/sales/${id}`, { method: 'DELETE' });
        loadSalesView();
        loadDashboard();
    } catch (err) {
        alert('Erro ao excluir venda');
    }
}

// Import Sales Handler
document.getElementById('importSalesForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    const fileField = document.getElementById('import-sales-file');

    formData.append('file', fileField.files[0]);

    try {
        const res = await fetch(`${API_URL}/sales/import`, {
            method: 'POST',
            body: formData
        });

        if (res.ok) {
            const result = await res.json();
            alert(`Importação concluída! ${result.imported} vendas registradas.`);
            closeModal('importSalesModal');
            loadSalesView();
            loadDashboard();
        } else {
            const err = await res.json();
            alert('Erro na importação: ' + err.error);
        }
    } catch (error) {
        console.error(error);
        alert('Erro ao enviar arquivo.');
    }
});

function openNewPayment() {
    editingId = null;
    document.getElementById('paymentForm').reset();
    document.getElementById('payment-date').value = new Date().toISOString().split('T')[0];
    openModal('paymentModal');
}

async function editPayment(id) {
    try {
        const res = await fetch(`${API_URL}/payments/${id}`);
        const payment = await res.json();

        editingId = id;
        document.getElementById('payment-payer').value = payment.payer_name;
        document.getElementById('payment-amount').value = payment.amount;
        document.getElementById('payment-date').value = payment.date ? payment.date.split('T')[0] : '';
        document.getElementById('payment-client-select').value = payment.client_id || '';
        openModal('paymentModal');
    } catch (err) {
        alert('Erro ao carregar pagamento');
    }
}

// Bulk Actions
function toggleAllSales(source) {
    document.querySelectorAll('.sale-checkbox').forEach(cb => cb.checked = source.checked);
    toggleDeleteButton('sales');
}

function toggleAllPayments(source) {
    document.querySelectorAll('.payment-checkbox').forEach(cb => cb.checked = source.checked);
    toggleDeleteButton('payments');
}

function toggleDeleteButton(type) {
    const checkboxes = document.querySelectorAll(`.${type}-checkbox:checked`);
    const btn = document.getElementById(`btn-delete-${type}`);
    if (btn) {
        btn.style.display = checkboxes.length > 0 ? 'inline-block' : 'none';
        btn.innerText = `Excluir Selecionados (${checkboxes.length})`;
    }
}

async function deleteSelectedSales() {
    const checkboxes = document.querySelectorAll('.sale-checkbox:checked');
    const ids = Array.from(checkboxes).map(cb => cb.value);

    if (ids.length === 0) return;
    if (!confirm(`Tem certeza que deseja excluir ${ids.length} vendas?`)) return;

    try {
        await fetch(`${API_URL}/sales/batch-delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });
        loadSalesView();
        loadDashboard();
    } catch (err) {
        alert('Erro ao excluir vendas');
    }
}

async function deleteSelectedPayments() {
    const checkboxes = document.querySelectorAll('.payment-checkbox:checked');
    const ids = Array.from(checkboxes).map(cb => cb.value);

    if (ids.length === 0) return;
    if (!confirm(`Tem certeza que deseja excluir ${ids.length} pagamentos?`)) return;

    try {
        await fetch(`${API_URL}/payments/batch-delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });
        loadPaymentsView();
        loadDashboard();
    } catch (err) {
        alert('Erro ao excluir pagamentos');
    }
}

async function exportDebtorsCsv() {
    const balances = await fetchBalances();

    const headers = ['Nome', 'Telefone', 'Total Consumido', 'Total Pago', 'Saldo'];
    const rows = balances.map(c => [
        `"${c.name}"`,
        `"${c.phone || ''}"`,
        c.total_consumed.replace('.', ','),
        c.total_paid.replace('.', ','),
        c.balance.replace('.', ',')
    ]);

    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'relatorio_devedores.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function generateCollectionMessage(client) {
    const balance = parseFloat(client.balance);
    const totalConsumed = parseFloat(client.total_consumed);
    const totalPaid = parseFloat(client.total_paid);

    // Format sales list
    const salesList = client.sales.slice(0, 5).map(s => {
        const date = formatDate(s.date);
        // Format: - 3 trufa(s) Fit em 03/12/2025
        return `    - ${s.quantity} trufa(s) ${s.type} em ${date}`;
    }).join('\n');

    const moreSales = client.sales.length > 5 ? `\n    ... e mais ${client.sales.length - 5} venda(s).` : '';

    const message = `Olá, ${client.name}! Tudo bem? 😊

Estou organizando aqui nosso controle de vendas de trufas e percebi que você tem um saldo pendente de ${formatCurrency(balance)} no nosso registro.

Conferindo as informações, esse valor é referente às seguintes compras:

${salesList}${moreSales}

    Valor Consumido (Total das Vendas): ${formatCurrency(totalConsumed)}
    Valor Pago (até o momento): ${formatCurrency(totalPaid)}

Eu não encontrei o comprovante Pix referente ao pagamento do saldo restante de ${formatCurrency(balance)}.

Se você puder verificar se o pagamento foi feito em outro momento ou reenviar o comprovante para que eu possa dar baixa aqui, ficarei muito grato(a)! Caso ainda não tenha efetuado o pagamento, o valor final é ${formatCurrency(balance)}.

Me avise se tiver qualquer dúvida ou se algo estiver errado!

Obrigado(a)`;

    // Copy to clipboard
    navigator.clipboard.writeText(message).then(() => {
        alert('Mensagem copiada para a área de transferência!');
    }).catch(err => {
        console.error('Erro ao copiar', err);
        // Fallback: Show in alert/prompt
        prompt('Copie a mensagem abaixo:', message);
    });
}

// New V2 Views: Products
async function loadProductsView() {
    updateHeader('Produtos', '<button class="btn btn-primary" onclick="openNewProduct()">+ Novo Produto</button>');

    try {
        const res = await fetch(`${API_URL}/products`);
        const products = await res.json();

        contentArea.innerHTML = `
            <div class="card">
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nome</th>
                                <th>Tipo</th>
                                <th>Preço</th>
                                <th>Estoque</th>
                                <th>Ativo</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${products.map(p => `
                                <tr>
                                    <td>${p.id}</td>
                                    <td>${p.name}</td>
                                    <td>${p.type}</td>
                                    <td>${formatCurrency(p.price)}</td>
                                    <td>${p.stock}</td>
                                    <td>${p.active ? '<span class="text-success">Sim</span>' : '<span class="text-danger">Não</span>'}</td>
                                    <td>
                                        <button class="btn btn-secondary" style="padding: 5px 10px; font-size: 12px;" onclick='editProduct(${JSON.stringify(p)})'>Editar</button>
                                        <button class="btn btn-danger" style="padding: 5px 10px; font-size: 12px; background-color: #dc3545;" onclick="deleteProduct(${p.id})">Excluir</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Product Modal (Injected here or we could add to index.html static) -->
            <div id="productModal" class="modal" style="display:none;">
                <div class="modal-content">
                    <span class="close" onclick="closeModal('productModal')">&times;</span>
                    <h2 id="productModalTitle">Novo Produto</h2>
                    <form id="productForm">
                        <div class="form-group">
                            <label>Nome</label>
                            <input type="text" id="prod-name" required>
                        </div>
                        <div class="form-group">
                            <label>Tipo</label>
                            <select id="prod-type">
                                <option value="Normal">Normal</option>
                                <option value="Fit">Fit</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Preço (R$)</label>
                            <input type="number" step="0.01" id="prod-price" required>
                        </div>
                        <div class="form-group">
                            <label>Estoque</label>
                            <input type="number" id="prod-stock" required value="0">
                        </div>
                        <div class="form-group">
                             <label><input type="checkbox" id="prod-active" checked> Ativo na Loja</label>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="closeModal('productModal')">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Salvar</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Setup Modal Listeners dynamically since we injected HTML
        document.getElementById('productForm').addEventListener('submit', handleProductSubmit);

    } catch (err) {
        contentArea.innerHTML = '<p class="text-danger">Erro ao carregar produtos.</p>';
        console.error(err);
    }
}

function openNewProduct() {
    editingId = null;
    document.getElementById('productModalTitle').innerText = 'Novo Produto';
    // Clear form if exists
    if (document.getElementById('productForm')) document.getElementById('productForm').reset();
    document.getElementById('productModal').style.display = 'flex';
}

function editProduct(product) {
    editingId = product.id;
    document.getElementById('productModalTitle').innerText = 'Editar Produto';
    document.getElementById('prod-name').value = product.name;
    document.getElementById('prod-type').value = product.type;
    document.getElementById('prod-price').value = product.price;
    document.getElementById('prod-stock').value = product.stock;
    document.getElementById('prod-active').checked = product.active;
    document.getElementById('productModal').style.display = 'flex';
}

async function handleProductSubmit(e) {
    e.preventDefault();
    const data = {
        name: document.getElementById('prod-name').value,
        type: document.getElementById('prod-type').value,
        price: document.getElementById('prod-price').value,
        stock: document.getElementById('prod-stock').value,
        active: document.getElementById('prod-active').checked
    };

    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${API_URL}/products/${editingId}` : `${API_URL}/products`;

    try {
        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        closeModal('productModal');
        loadProductsView();
    } catch (err) {
        alert('Erro ao salvar produto');
    }
}

async function deleteProduct(id) {
    if (!confirm('Excluir este produto?')) return;
    try {
        await fetch(`${API_URL}/products/${id}`, { method: 'DELETE' });
        loadProductsView();
    } catch (err) {
        alert('Erro ao excluir');
    }
}

// New V2 Views: Orders
async function loadOrdersView() {
    updateHeader('Pedidos', '<button class="btn btn-secondary" onclick="loadOrdersView()">Atualizar 🔄</button>');

    try {
        const res = await fetch(`${API_URL}/orders`); // Auth header handled by interceptor
        const orders = await res.json();

        if (orders.length === 0) {
            contentArea.innerHTML = '<div class="card"><p style="text-align: center; color: #666;">Nenhum pedido pendente no momento. 😴</p></div>';
            return;
        }

        contentArea.innerHTML = `
            <div class="dashboard-grid" style="grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));">
                ${orders.map(o => `
                    <div class="card" style="border-left: 5px solid #25D366;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <h3>Pedido #${o.id}</h3>
                            <span style="background: #e8f5e9; color: #2e7d32; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;">${o.status}</span>
                        </div>
                        <p><strong>Cliente:</strong> ${o.client_name}</p>
                        <p><strong>Contato:</strong> ${o.client_phone || '-'}</p>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 10px 0;">
                        <ul style="padding-left: 20px; color: #444;">
                            ${o.OrderItems.map(item => `
                                <li>${item.quantity}x ${item.Product ? item.Product.name : 'Produto Removido'}</li>
                            `).join('')}
                        </ul>
                        <div style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center;">
                            <strong style="color: var(--primary-color);">Total: ${formatCurrency(o.total)}</strong>
                            <button class="btn btn-primary" onclick="completeOrder(${o.id})">Entregar ✅</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (err) {
        contentArea.innerHTML = '<p class="text-danger">Erro ao carregar pedidos.</p>';
        console.error(err);
    }
}

async function completeOrder(id) {
    if (!confirm('Confirmar entrega e baixar estoque?')) return;
    try {
        const res = await fetch(`${API_URL}/orders/${id}/complete`, { method: 'POST' });
        if (res.ok) {
            alert('Pedido entregue com sucesso!');
            loadOrdersView();
            // Also refresh dashboard stats if user goes there, but reloading view is enough
        } else {
            const err = await res.json();
            alert('Erro: ' + err.error);
        }
    } catch (error) {
        alert('Erro ao processar pedido');
    }
}

// ── Seleção em massa ──────────────────────────────────────────

function toggleDeleteButton(type) {
    const checkboxes = document.querySelectorAll(`.${type.slice(0, -1)}-checkbox`);
    const anyChecked = Array.from(checkboxes).some(cb => cb.checked);
    const btn = document.getElementById(`btn-delete-${type}`);
    if (btn) btn.style.display = anyChecked ? 'inline-block' : 'none';

    // Sincroniza o "selecionar todos" se todos estiverem marcados ou não
    const selectAll = document.getElementById(`select-all-${type}`);
    if (selectAll) {
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        selectAll.checked = allChecked && checkboxes.length > 0;
        selectAll.indeterminate = anyChecked && !allChecked;
    }
}

function toggleAllSales(masterCb) {
    document.querySelectorAll('.sale-checkbox').forEach(cb => cb.checked = masterCb.checked);
    toggleDeleteButton('sales');
}

function toggleAllPayments(masterCb) {
    document.querySelectorAll('.payment-checkbox').forEach(cb => cb.checked = masterCb.checked);
    toggleDeleteButton('payments');
}

async function deleteSelectedSales() {
    const ids = Array.from(document.querySelectorAll('.sale-checkbox:checked')).map(cb => Number(cb.value));
    if (ids.length === 0) return;

    const msg = ids.length === 1
        ? 'Excluir 1 venda selecionada?'
        : `Excluir ${ids.length} vendas selecionadas?`;
    if (!confirm(msg)) return;

    try {
        const res = await fetch(`${API_URL}/sales/batch-delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });
        if (res.ok) {
            loadSalesView();
            loadDashboard();
        } else {
            const err = await res.json();
            alert('Erro ao excluir: ' + (err.error || 'Erro desconhecido'));
        }
    } catch (e) {
        alert('Erro ao excluir vendas');
    }
}

async function deleteSelectedPayments() {
    const ids = Array.from(document.querySelectorAll('.payment-checkbox:checked')).map(cb => Number(cb.value));
    if (ids.length === 0) return;

    const msg = ids.length === 1
        ? 'Excluir 1 pagamento selecionado?'
        : `Excluir ${ids.length} pagamentos selecionados?`;
    if (!confirm(msg)) return;

    try {
        const res = await fetch(`${API_URL}/payments/batch-delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });
        if (res.ok) {
            loadPaymentsView();
            loadDashboard();
        } else {
            const err = await res.json();
            alert('Erro ao excluir: ' + (err.error || 'Erro desconhecido'));
        }
    } catch (e) {
        alert('Erro ao excluir pagamentos');
    }
}
