// Init Lucide Icons
lucide.createIcons();

// Data Management
let leads = [];

// Initialize

// Initialize
document.getElementById('currentDate').innerText = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

const isAuth = localStorage.getItem('minicrm_auth') === 'true';
const navTabs = ['dashboard','leads','add','followups','reports','search','profile','settings'];
const defaultNavClass = "nav-item";
const activeNavClass = "nav-item active-nav";

if (!isAuth) {
    document.getElementById('loginScreen').classList.remove('hidden');
} else {
    document.getElementById('loginScreen').classList.add('hidden');
    loadLeads().then(() => switchTab('dashboard'));
}

// Authentication Logic
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    return login();
});

async function login() {
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !email || !password) {
        showLoginMessage('Please enter username, email, and password.', true);
        return;
    }

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username, password })
        });
        
        if (!response.ok) {
            let errorMsg = 'Login failed.';
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch (e) {
                // Response is not JSON, use default message
            }
            showLoginMessage(errorMsg, true);
            return;
        }
        
        const data = await response.json();
        showLoginMessage(data.message || 'Login successful!', false);
        setTimeout(() => completeLogin(), 1000);
    } catch (error) {
        showLoginMessage('Network error: ' + error.message, true);
    }
}

function showLoginMessage(message, isError) {
    const status = document.getElementById('loginStatus');
    status.innerText = message;
    status.className = isError ? 'mb-4 p-3 rounded-2xl text-sm bg-red-50 text-red-700' : 'mb-4 p-3 rounded-2xl text-sm bg-blue-50 text-slate-900';
    status.classList.remove('hidden');
}

function completeLogin() {
    localStorage.setItem('minicrm_auth', 'true');
    document.getElementById('loginScreen').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('loginScreen').classList.add('hidden');
        loadLeads().then(() => switchTab('dashboard'));
    }, 500);
}

function logout() {
    localStorage.removeItem('minicrm_auth');
    location.reload();
}

// Data Loading
async function loadLeads() {
    try {
        const response = await fetch('/api/leads');
        if (!response.ok) throw new Error('Failed to load leads');
        leads = await response.json();
        renderLeads();
        renderDashboard();
    } catch (error) {
        console.error('Failed to load leads:', error);
    }
}

// Data Persistence (API)
async function saveData() {
    // Data is auto-saved via API on each action
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('sidebar-open');
    overlay.classList.toggle('visible');
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.remove('sidebar-open');
    overlay.classList.remove('visible');
}

// Navigation
function switchTab(tab) {
    navTabs.forEach(name => {
        const button = document.getElementById(`nav-${name}`);
        const view = document.getElementById(`view-${name}`);
        if (button) button.className = defaultNavClass;
        if (view) view.classList.add('hidden');
    });

    const activeButton = document.getElementById(`nav-${tab}`);
    if (activeButton) activeButton.className = activeNavClass;

    if (tab === 'add') {
        const addView = document.getElementById('view-add');
        if (addView) addView.classList.remove('hidden');
        openLeadModal();
    } else {
        const activeView = document.getElementById(`view-${tab}`);
        if (activeView) activeView.classList.remove('hidden');
    }

    document.getElementById('headerTitle').innerText = {
        dashboard: 'Dashboard Overview',
        leads: 'Lead Book Directory',
        add: 'Add New Lead',
        followups: 'Follow-ups & Notes',
        reports: 'Reports & Analytics',
        search: 'Search & Filter',
        profile: 'User Profile',
        settings: 'Account Settings'
    }[tab] || 'Client Lead Management';

    if (window.innerWidth <= 1024) closeSidebar();
    if (tab === 'dashboard') renderDashboard();
    if (tab === 'leads') renderLeads();
    if (tab === 'followups') renderFollowups();
    if (tab === 'reports') renderReports();
}

// Dashboard Rendering
function renderDashboard() {
    const tot = leads.length;
    const con = leads.filter(l => l.status === 'converted').length;
    const newL = leads.filter(l => l.status === 'new').length;
    const ctc = leads.filter(l => l.status === 'contacted').length;

    document.getElementById('stat-total').innerText = tot;
    document.getElementById('stat-converted').innerText = con;
    document.getElementById('stat-new').innerText = newL;
    document.getElementById('stat-contacted').innerText = ctc;

    const recentTbody = document.getElementById('recentLeadsTable');
    recentTbody.innerHTML = '';
    
    const renderClasses = {
        new: 'text-blue-500 bg-blue-50 px-2 py-1 rounded-md text-[10px] uppercase tracking-widest inline-block',
        contacted: 'text-orange-500 bg-orange-50 px-2 py-1 rounded-md text-[10px] uppercase tracking-widest inline-block',
        converted: 'text-green-500 bg-green-50 px-2 py-1 rounded-md text-[10px] uppercase tracking-widest inline-block'
    };

    leads.slice().reverse().slice(0, 5).forEach(l => {
        recentTbody.innerHTML += `
            <tr>
                <td class="py-3 text-slate-800">${l.name}</td>
                <td class="py-3"><span class="${renderClasses[l.status]}">${l.status}</span></td>
                <td class="py-3 text-xs text-slate-400 font-bold">${new Date(l.date).toLocaleDateString()}</td>
            </tr>
        `;
    });
    lucide.createIcons();
}

function renderFollowups() {
    const records = leads.flatMap(lead => (lead.notes || []).map(note => ({ lead: lead.name, content: note.content, date: note.date })));
    const list = document.getElementById('followupsList');
    const count = records.length;
    const recentCount = records.length ? Math.min(records.length, 5) : 0;
    const engagement = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;

    document.getElementById('followupsCount').innerText = count;
    document.getElementById('recentNotesLabel').innerText = recentCount;
    document.getElementById('followupsEngagement').innerText = `${engagement}%`;

    list.innerHTML = '';
    if (records.length === 0) {
        list.innerHTML = `<div class="p-10 bg-slate-50 rounded-3xl text-center text-slate-400 font-bold text-sm uppercase tracking-widest">No follow-up activity captured yet.</div>`;
        return;
    }

    records.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6).forEach(entry => {
        list.innerHTML += `
            <div class="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <div class="flex items-center justify-between gap-4 mb-4">
                    <p class="font-black text-slate-900">${entry.lead}</p>
                    <span class="text-[10px] uppercase tracking-[0.2em] text-slate-400">${new Date(entry.date).toLocaleDateString()}</span>
                </div>
                <p class="text-sm text-slate-600 leading-relaxed">${entry.content}</p>
            </div>
        `;
    });
}

function renderReports() {
    const total = leads.length;
    const converted = leads.filter(l => l.status === 'converted').length;
    const openLeads = leads.filter(l => l.status !== 'converted').length;
    const conversionRate = total ? Math.round((converted / total) * 100) : 0;

    document.getElementById('reportTotal').innerText = total;
    document.getElementById('reportConversion').innerText = `${conversionRate}%`;
    document.getElementById('reportOpen').innerText = openLeads;

    const reportSummary = document.getElementById('reportsSummary');
    reportSummary.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="p-5 rounded-3xl bg-slate-50 border border-slate-100">
                <p class="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-3">High priority leads</p>
                <p class="font-black text-slate-800">${leads.filter(l => l.status === 'contacted').length}</p>
            </div>
            <div class="p-5 rounded-3xl bg-slate-50 border border-slate-100">
                <p class="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-3">Recent conversions</p>
                <p class="font-black text-slate-800">${converted}</p>
            </div>
            <div class="p-5 rounded-3xl bg-slate-50 border border-slate-100">
                <p class="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-3">Open follow-ups</p>
                <p class="font-black text-slate-800">${countNotesPending()}</p>
            </div>
        </div>
    `;
}

function countNotesPending() {
    return leads.reduce((sum, lead) => sum + (lead.notes?.length || 0), 0);
}

// Leads Rendering
function renderLeads() {
    const srch = document.getElementById('searchInput').value.toLowerCase();
    const filt = document.getElementById('statusFilter').value;
    const tbody = document.getElementById('leadsTableBody');
    
    let filtered = leads.filter(l => {
        const matchSearch = l.name.toLowerCase().includes(srch) || l.email.toLowerCase().includes(srch);
        const matchFilt = filt === 'all' || l.status === filt;
        return matchSearch && matchFilt;
    });

    tbody.innerHTML = '';
    if(filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No records available.</td></tr>`;
        return;
    }

    const cMap = {
        new: 'bg-blue-100 text-blue-600',
        contacted: 'bg-orange-100 text-orange-600',
        converted: 'bg-green-100 text-green-600'
    };

    filtered.slice().reverse().forEach(l => {
        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 transition-colors group border-b border-slate-50 last:border-0">
                <td class="p-6">
                    <p class="font-black text-sm text-slate-800">${l.name}</p>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 mt-1"><i data-lucide="message-square" class="w-3 h-3"></i> ${l.notes?.length||0} Logs</p>
                </td>
                <td class="p-6">
                    <p class="font-bold text-xs text-slate-600">${l.email}</p>
                    <p class="font-bold text-xs text-slate-400 mt-1">${l.phone}</p>
                </td>
                <td class="p-6 text-xs font-black text-slate-500 uppercase tracking-widest">${l.source}</td>
                <td class="p-6">
                    <select onchange="changeStatus('${l.id}', this.value)" class="px-4 py-2 border-0 outline-none rounded-xl text-[10px] font-black uppercase tracking-widest appearance-none cursor-pointer ${cMap[l.status]}">
                        <option value="new" ${l.status==='new'?'selected':''}>New</option>
                        <option value="contacted" ${l.status==='contacted'?'selected':''}>Contacted</option>
                        <option value="converted" ${l.status==='converted'?'selected':''}>Converted</option>
                    </select>
                </td>
                <td class="p-6 text-right">
                    <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="openNoteModal('${l.id}')" class="p-2 text-blue-500 hover:bg-blue-50 rounded-xl" title="Logs"><i data-lucide="message-square" class="w-4 h-4"></i></button>
                        <button onclick="openEditModal('${l.id}')" class="p-2 text-slate-500 hover:bg-slate-100 rounded-xl" title="Edit"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                        <button onclick="deleteLead('${l.id}')" class="p-2 text-red-500 hover:bg-red-50 rounded-xl" title="Delete"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>
                </td>
            </tr>
        `;
    });
    lucide.createIcons();
}

// Actions
function changeStatus(id, newStatus) {
    const lead = leads.find(l => l.id === id);
    if (!lead) return;
    
    fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...lead, status: newStatus })
    }).then(r => {
        if (!r.ok) throw new Error('Update failed');
        return r.json();
    }).then(updated => {
        leads = leads.map(l => l.id === id ? updated : l);
        renderDashboard();
    }).catch(e => console.error('Update status failed:', e));
}

function deleteLead(id) {
    if(!confirm('Delete this lead permanently?')) return;
    
    fetch(`/api/leads/${id}`, { method: 'DELETE' })
        .then(r => {
            if (!r.ok) throw new Error('Delete failed');
            return r.json();
        })
        .then(() => {
            leads = leads.filter(l => l.id !== id);
            renderLeads();
            renderDashboard();
        })
        .catch(e => console.error('Delete failed:', e));
}

// Modals Management
function openLeadModal() {
    document.getElementById('leadId').value = '';
    document.getElementById('leadForm').reset();
    document.getElementById('modalTitle').innerText = 'Initialize Lead';
    document.getElementById('leadModal').classList.remove('hidden');
}

function openEditModal(id) {
    const lead = leads.find(l => l.id === id);
    if (!lead) return;
    document.getElementById('leadId').value = lead.id;
    document.getElementById('leadName').value = lead.name;
    document.getElementById('leadEmail').value = lead.email;
    document.getElementById('leadPhone').value = lead.phone;
    document.getElementById('leadSource').value = lead.source;
    document.getElementById('leadStatus').value = lead.status;
    document.getElementById('modalTitle').innerText = 'Modify Context';
    document.getElementById('leadModal').classList.remove('hidden');
}

document.getElementById('leadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('leadId').value;
    const data = {
        name: document.getElementById('leadName').value,
        email: document.getElementById('leadEmail').value,
        phone: document.getElementById('leadPhone').value,
        source: document.getElementById('leadSource').value,
        status: document.getElementById('leadStatus').value
    };

    try {
        let result;
        if(id) {
            const response = await fetch(`/api/leads/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Update failed');
            result = await response.json();
            leads = leads.map(l => l.id === id ? result : l);
        } else {
            const response = await fetch('/api/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({...data, notes: []})
            });
            if (!response.ok) throw new Error('Create failed');
            result = await response.json();
            leads.push(result);
        }
        closeModals();
        renderLeads();
        renderDashboard();
    } catch (error) {
        console.error('Save lead failed:', error);
        alert('Error saving lead: ' + error.message);
    }
});

// Notes System
function openNoteModal(id) {
    const lead = leads.find(l => l.id === id);
    if (!lead) return;
    document.getElementById('noteLeadId').value = lead.id;
    document.getElementById('noteLeadName').innerText = lead.name;
    
    const cont = document.getElementById('notesContainer');
    cont.innerHTML = lead.notes.length === 0 ? '<p class="text-center text-slate-400 font-bold text-xs uppercase tracking-widest my-10">No chronological logs.</p>' : '';
    
    lead.notes.forEach(n => {
        cont.innerHTML += `
            <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative">
                <div class="absolute top-5 left-0 w-1 h-8 bg-blue-500 rounded-r-full"></div>
                <p class="text-sm font-medium text-slate-700 leading-relaxed pl-2">${n.content}</p>
                <p class="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-3 pl-2 text-right">${new Date(n.date).toLocaleString()}</p>
            </div>
        `;
    });
    document.getElementById('notesModal').classList.remove('hidden');
}

document.getElementById('noteForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('noteLeadId').value;
    const content = document.getElementById('noteContent').value;
    
    try {
        const response = await fetch(`/api/leads/${id}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
        if (!response.ok) throw new Error('Save note failed');
        const updated = await response.json();
        leads = leads.map(l => l.id === id ? updated : l);
        document.getElementById('noteContent').value = '';
        openNoteModal(id);
        renderLeads();
    } catch (error) {
        console.error('Save note failed:', error);
        alert('Error saving note: ' + error.message);
    }
});

function closeModals() {
    document.getElementById('leadModal').classList.add('hidden');
    document.getElementById('notesModal').classList.add('hidden');
}
