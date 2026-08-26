// Cure Plus Biotech Attendance - Application Controllers & Logic
(function() {
    // Ensure state from data.js is loaded
    const App = window.AttendanceApp;
    if (!App) {
        console.error("AttendanceApp data layer not loaded!");
        return;
    }

    // Helper to get initials from a name
    function getInitials(name) {
        if (!name) return "";
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }

    // Helper to get consistent background color class for avatars
    function getAvatarColorClass(empId) {
        const num = parseInt(empId.replace(/\D/g, '')) || 1;
        const index = ((num - 1) % 8) + 1; // 1 to 8
        return `color-${index}`;
    }

    // Active Interval for Running Clock
    let clockInterval = null;

    // Pagination State
    let logCurrentPage = 1;
    const logItemsPerPage = 10;
    let filteredLogs = [];

    // Theme state
    let activeTheme = localStorage.getItem("attendance_theme") || "dark";

    // DOM Elements Cache
    const DOM = {
        // Navigation & Theme
        navItems: document.querySelectorAll('.nav-menu .nav-item'),
        tabContents: document.querySelectorAll('.tab-content'),
        themeToggleBtn: document.getElementById('themeToggleBtn'),
        htmlElement: document.documentElement,
        
        // Header
        headerGreeting: document.getElementById('headerGreeting'),
        headerDate: document.getElementById('headerDate'),
        liveClock: document.getElementById('liveClockDisplay'),
        
        // User Selector
        userProfileWidget: document.getElementById('userProfileWidget'),
        sidebarUserAvatar: document.getElementById('sidebarUserAvatar'),
        sidebarUserName: document.getElementById('sidebarUserName'),
        employeeSwitcherMenu: document.getElementById('employeeSwitcherMenu'),
        
        // Logs Tab Filters & Table
        filterSearchName: document.getElementById('filterSearchName'),
        filterStatus: document.getElementById('filterStatus'),
        filterStartDate: document.getElementById('filterStartDate'),
        filterEndDate: document.getElementById('filterEndDate'),
        attendanceLogsTableBody: document.getElementById('attendanceLogsTableBody'),
        btnExportCSV: document.getElementById('btnExportCSV'),
        btnPrintReport: document.getElementById('btnPrintReport'),
        paginationInfo: document.getElementById('paginationInfo'),
        prevPageBtn: document.getElementById('prevPageBtn'),
        nextPageBtn: document.getElementById('nextPageBtn'),
        
        // CEO Portal Elements
        ceoTotalEmployees: document.getElementById('ceoTotalEmployees'),
        ceoActiveEmployees: document.getElementById('ceoActiveEmployees'),
        ceoOfflineEmployees: document.getElementById('ceoOfflineEmployees'),
        ceoAddEmployeeModal: document.getElementById('ceoAddEmployeeModal'),
        btnOpenAddEmployeeModal: document.getElementById('btnOpenAddEmployeeModal'),
        btnAddEmployeeClose: document.getElementById('btnAddEmployeeClose'),
        ceoAddEmployeeForm: document.getElementById('ceoAddEmployeeForm')
    };

    // ----------------------------------------------------
    // INITIALIZATION & THEMING
    // ----------------------------------------------------
    function init() {
        // Theme initialization
        DOM.htmlElement.setAttribute('data-theme', activeTheme);
        
        // Set dates
        updateHeaderDates();
        
        // Start running clock
        clockInterval = setInterval(updateHeaderDates, 1000);
        
        // Render core UI components
        renderUserSwitcher();
        updateCurrentUserUI();

        // Event Listeners Setup
        setupEventListeners();
    }

    function setupEventListeners() {
        // Tab switching
        DOM.navItems.forEach(item => {
            item.addEventListener('click', () => {
                const targetTab = item.getAttribute('data-tab');
                switchTab(targetTab);
            });
        });

        // Theme toggler
        DOM.themeToggleBtn.addEventListener('click', toggleTheme);

        // Account Switcher Menu toggle
        DOM.userProfileWidget.addEventListener('click', (e) => {
            e.stopPropagation();
            DOM.employeeSwitcherMenu.classList.toggle('active');
        });

        document.addEventListener('click', () => {
            DOM.employeeSwitcherMenu.classList.remove('active');
        });

        // Logs filters
        DOM.filterSearchName.addEventListener('input', () => { logCurrentPage = 1; filterAndRenderLogs(); });
        DOM.filterStatus.addEventListener('change', () => { logCurrentPage = 1; filterAndRenderLogs(); });
        DOM.filterStartDate.addEventListener('change', () => { logCurrentPage = 1; filterAndRenderLogs(); });
        DOM.filterEndDate.addEventListener('change', () => { logCurrentPage = 1; filterAndRenderLogs(); });
        
        DOM.prevPageBtn.addEventListener('click', () => { if (logCurrentPage > 1) { logCurrentPage--; renderLogsTable(); } });
        DOM.nextPageBtn.addEventListener('click', () => { if (logCurrentPage * logItemsPerPage < filteredLogs.length) { logCurrentPage++; renderLogsTable(); } });
        DOM.btnExportCSV.addEventListener('click', exportLogsToCSV);
        DOM.btnPrintReport.addEventListener('click', () => window.print());

        // CEO Portal events
        if (DOM.btnOpenAddEmployeeModal) {
            DOM.btnOpenAddEmployeeModal.addEventListener('click', () => {
                document.getElementById('addEmpJoinedDate').value = new Date().toISOString().split('T')[0];
                DOM.ceoAddEmployeeModal.classList.add('active');
            });
        }
        if (DOM.btnAddEmployeeClose) {
            DOM.btnAddEmployeeClose.addEventListener('click', () => {
                DOM.ceoAddEmployeeModal.classList.remove('active');
            });
        }
        if (DOM.ceoAddEmployeeModal) {
            DOM.ceoAddEmployeeModal.addEventListener('click', (e) => {
                if (e.target === DOM.ceoAddEmployeeModal) DOM.ceoAddEmployeeModal.classList.remove('active');
            });
        }
        if (DOM.ceoAddEmployeeForm) {
            DOM.ceoAddEmployeeForm.addEventListener('submit', handleAddEmployee);
        }
    }

    // ----------------------------------------------------
    // TAB ROUTER
    // ----------------------------------------------------
    function switchTab(tabId) {
        // Update navigation classes
        DOM.navItems.forEach(item => {
            if (item.getAttribute('data-tab') === tabId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update tab display
        DOM.tabContents.forEach(content => {
            if (content.id === tabId) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });

        // Render tab specific components when visited
        if (tabId === 'logs') {
            filterAndRenderLogs();
        } else if (tabId === 'ceo') {
            renderCeoPortal();
        }
    }

    // ----------------------------------------------------
    // THEME CONTROLLER
    // ----------------------------------------------------
    function toggleTheme() {
        activeTheme = activeTheme === 'dark' ? 'light' : 'dark';
        DOM.htmlElement.setAttribute('data-theme', activeTheme);
        localStorage.setItem("attendance_theme", activeTheme);
    }

    // ----------------------------------------------------
    // DIGITAL CLOCK & DATE GREETINGS
    // ----------------------------------------------------
    function updateHeaderDates() {
        const now = new Date();
        
        // Format live clock
        DOM.liveClock.textContent = now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });

        // Format greeting details
        const hours = now.getHours();
        let greeting = "Good Night";
        if (hours >= 5 && hours < 12) greeting = "Good Morning";
        else if (hours >= 12 && hours < 17) greeting = "Good Afternoon";
        else if (hours >= 17 && hours < 21) greeting = "Good Evening";

        const currentEmployee = App.getCurrentEmployee();
        DOM.headerGreeting.textContent = `${greeting}, ${currentEmployee ? currentEmployee.name.split(' ')[0] : 'User'}!`;

        // Format Date
        DOM.headerDate.textContent = now.toLocaleTimeString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).split(' at ')[0];
    }

    // ----------------------------------------------------
    // SWITCH EMPLOYEE WIDGET
    // ----------------------------------------------------
    function renderUserSwitcher() {
        DOM.employeeSwitcherMenu.innerHTML = '';
        App.employees.forEach(emp => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.innerHTML = `
                <div class="dropdown-item-avatar initials-avatar ${getAvatarColorClass(emp.id)}">${getInitials(emp.name)}</div>
                <div class="dropdown-item-details">
                    <span class="dropdown-item-name">${emp.name}</span>
                </div>
            `;
            item.addEventListener('click', () => {
                // Switch user
                App.setCurrentUser(emp.id);
                updateCurrentUserUI();
                DOM.employeeSwitcherMenu.classList.remove('active');
            });
            DOM.employeeSwitcherMenu.appendChild(item);
        });
    }

    function updateCurrentUserUI() {
        const user = App.getCurrentEmployee();
        if (!user) return;

        // Sidebar card
        DOM.sidebarUserAvatar.textContent = getInitials(user.name);
        DOM.sidebarUserAvatar.className = `user-avatar initials-avatar ${getAvatarColorClass(user.id)}`;
        DOM.sidebarUserName.textContent = user.name;

        // Check if the current user is the CEO
        const isCeo = user.role && user.role.toLowerCase() === 'ceo';
        
        // Show/hide CEO Portal tab in sidebar
        const ceoTab = document.querySelector('.nav-item[data-tab="ceo"]');
        if (ceoTab) ceoTab.style.display = isCeo ? '' : 'none';
        
        // If not CEO and currently on a restricted tab, switch back to logs
        if (!isCeo) {
            const activeTab = document.querySelector('.nav-menu .nav-item.active');
            if (activeTab) {
                const activeTabId = activeTab.getAttribute('data-tab');
                if (activeTabId === 'ceo') {
                    switchTab('logs');
                }
            }
        }

        // Always refresh the current tab content
        const activeTab = document.querySelector('.nav-menu .nav-item.active');
        if (activeTab) {
            const activeTabId = activeTab.getAttribute('data-tab');
            if (activeTabId === 'logs') {
                filterAndRenderLogs();
            } else if (activeTabId === 'ceo') {
                renderCeoPortal();
            }
        }
    }

    function updateEmployeeStatus(empId, status) {
        const employees = App.employees.map(emp => {
            if (emp.id === empId) emp.status = status;
            return emp;
        });
        App.saveEmployees(employees);
    }

    function addActivityLog(type, text, theme) {
        const activities = JSON.parse(localStorage.getItem("attendance_activities") || "[]");
        const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        
        activities.unshift({ type, text, time, theme });
        
        // Keep max 10
        if (activities.length > 10) activities.pop();
        
        localStorage.setItem("attendance_activities", JSON.stringify(activities));
    }

    // ----------------------------------------------------
    // LOGS TABLE VIEW & FILTERING
    // ----------------------------------------------------
    function filterAndRenderLogs() {
        const searchVal = DOM.filterSearchName.value.toLowerCase();
        const statusVal = DOM.filterStatus.value;
        const startVal = DOM.filterStartDate.value;
        const endVal = DOM.filterEndDate.value;

        filteredLogs = App.logs.filter(log => {
            // Find employee
            const emp = App.employees.find(e => e.id === log.employeeId);
            if (!emp) return false;

            // Search Filter
            const matchesSearch = emp.name.toLowerCase().includes(searchVal);
            
            // Status Filter
            const matchesStatus = statusVal === 'All' || log.status === statusVal;
            
            // Date Filter
            const matchesStart = !startVal || log.date >= startVal;
            const matchesEnd = !endVal || log.date <= endVal;

            return matchesSearch && matchesStatus && matchesStart && matchesEnd;
        });

        // Sort descending by date
        filteredLogs.sort((a, b) => b.date.localeCompare(a.date));

        renderLogsTable();
    }

    function renderLogsTable() {
        DOM.attendanceLogsTableBody.innerHTML = '';

        if (filteredLogs.length === 0) {
            DOM.attendanceLogsTableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">
                        No logs match the current filters.
                    </td>
                </tr>
            `;
            DOM.paginationInfo.textContent = "Showing 0 of 0 entries";
            DOM.prevPageBtn.disabled = true;
            DOM.nextPageBtn.disabled = true;
            return;
        }

        // Calculate pages
        const startIdx = (logCurrentPage - 1) * logItemsPerPage;
        const endIdx = Math.min(startIdx + logItemsPerPage, filteredLogs.length);
        const paginatedItems = filteredLogs.slice(startIdx, endIdx);

        paginatedItems.forEach(log => {
            const emp = App.employees.find(e => e.id === log.employeeId);
            if (!emp) return;
            
            const badgeClass = log.status.toLowerCase().replace(' ', '-');
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="display: flex; align-items: center; gap: 10px;">
                    <div class="log-avatar initials-avatar ${getAvatarColorClass(emp.id)}" style="width: 28px; height: 28px; border-radius: 50%;">${getInitials(emp.name)}</div>
                    <div>
                        <div style="font-weight: 600;">${emp.name}</div>
                    </div>
                </td>
                <td>${log.date}</td>
                <td>${log.checkIn || '--:--'}</td>
                <td>${log.checkOut || '--:--'}</td>
                <td>${log.breakDuration || 0} m</td>
                <td><span class="status-badge ${badgeClass}">${log.status}</span></td>
                <td style="max-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${log.location ? log.location.address : ''}">
                    ${log.location ? log.location.address.split('(')[0] : 'Office'}
                </td>
                <td style="max-width: 160px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${log.notes || ''}">
                    ${log.notes || '--'}
                </td>
            `;
            DOM.attendanceLogsTableBody.appendChild(row);
        });

        // Update pagination UI
        DOM.paginationInfo.textContent = `Showing ${startIdx + 1}-${endIdx} of ${filteredLogs.length} entries`;
        DOM.prevPageBtn.disabled = logCurrentPage === 1;
        DOM.nextPageBtn.disabled = endIdx >= filteredLogs.length;
    }

    function exportLogsToCSV() {
        if (filteredLogs.length === 0) return;
        
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Employee Name,Date,Check-In,Check-Out,Break Duration (Mins),Status,Location,Notes\n";

        filteredLogs.forEach(log => {
            const emp = App.employees.find(e => e.id === log.employeeId);
            const name = emp ? emp.name : 'Unknown';
            const location = log.location ? log.location.address.replace(/,/g, ' ') : '';
            const notes = log.notes ? log.notes.replace(/,/g, ' ') : '';

            csvContent += `"${name}","${log.date}","${log.checkIn || ''}","${log.checkOut || ''}",${log.breakDuration || 0},"${log.status}","${location}","${notes}"\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Cure_Plus_Biotech_Attendance_Log_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // ----------------------------------------------------
    // CEO PORTAL MANAGEMENT PANEL
    // ----------------------------------------------------
    function renderCeoPortal() {
        const ceoAttendanceGrid = document.getElementById('ceoAttendanceGrid');
        if (!ceoAttendanceGrid) return;

        // Calculate statistics
        const todayStr = new Date().toISOString().split('T')[0];
        const total = App.employees.length;
        let present = 0;
        let absent = 0;

        App.employees.forEach(emp => {
            // Find today's log status
            const log = App.logs.find(l => l.employeeId === emp.id && l.date === todayStr);
            if (log) {
                if (log.status === "Present" || log.status === "Late") {
                    present++;
                } else if (log.status === "Absent") {
                    absent++;
                }
            }
        });

        if (DOM.ceoTotalEmployees) DOM.ceoTotalEmployees.textContent = total;
        if (DOM.ceoActiveEmployees) DOM.ceoActiveEmployees.textContent = present;
        if (DOM.ceoOfflineEmployees) DOM.ceoOfflineEmployees.textContent = absent;

        // Render attendance grid cards
        ceoAttendanceGrid.innerHTML = '';

        App.employees.forEach(emp => {
            // Find today's log status
            const log = App.logs.find(l => l.employeeId === emp.id && l.date === todayStr);
            const status = log ? log.status : 'Unmarked'; // Present, Absent, Unmarked
            
            const isPresentActive = (status === 'Present' || status === 'Late') ? 'active' : '';
            const isAbsentActive = (status === 'Absent') ? 'active' : '';

            const card = document.createElement('div');
            card.className = 'ceo-emp-card';
            card.innerHTML = `
                <div class="ceo-emp-info">
                    <div class="log-avatar initials-avatar ${getAvatarColorClass(emp.id)}" style="width: 38px; height: 38px; border-radius: 50%; font-size: 13px;">${getInitials(emp.name)}</div>
                    <div class="ceo-emp-details">
                        <span class="ceo-emp-name">${emp.name}</span>
                    </div>
                </div>
                <div class="ceo-emp-actions">
                    <button class="ceo-btn-present ${isPresentActive}" onclick="window.AttendanceApp.markEmployeePresent('${emp.id}')" title="Mark Present">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                    </button>
                    <button class="ceo-btn-absent ${isAbsentActive}" onclick="window.AttendanceApp.markEmployeeAbsent('${emp.id}')" title="Mark Absent">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
            `;
            ceoAttendanceGrid.appendChild(card);
        });
    }

    // Expose CEO action functions globally
    App.markEmployeePresent = function(empId) {
        const emp = App.employees.find(e => e.id === empId);
        if (!emp) return;

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];

        // Default check-in and check-out times
        const checkInTime = App.settings.workStartTime + ":00";
        const checkOutTime = App.settings.workEndTime + ":00";

        // Check if there is an existing log for today
        const existingLogIndex = App.logs.findIndex(log => log.employeeId === empId && log.date === dateStr);

        const newLog = {
            id: `LOG_${dateStr.replace(/-/g, '')}_${empId}`,
            employeeId: empId,
            date: dateStr,
            status: "Present",
            checkIn: checkInTime,
            checkOut: checkOutTime,
            breakDuration: 0,
            notes: "Marked Present by CEO",
            location: { lat: 37.7749, lng: -122.4194, address: "HQ Office (San Francisco)" }
        };

        if (existingLogIndex >= 0) {
            App.logs[existingLogIndex] = newLog;
        } else {
            App.logs.push(newLog);
        }

        App.saveLogs(App.logs);
        updateEmployeeStatus(empId, "active");

        // Refresh UI
        renderCeoPortal();
        
        // If the CEO marked the currently selected user, sync UI
        if (empId === App.currentUserId) {
            updateCurrentUserUI();
        }

        addActivityLog("System Admin", `CEO marked ${emp.name} Present.`, "success");
    };

    App.markEmployeeAbsent = function(empId) {
        const emp = App.employees.find(e => e.id === empId);
        if (!emp) return;

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];

        // Check if there is an existing log for today
        const existingLogIndex = App.logs.findIndex(log => log.employeeId === empId && log.date === dateStr);

        const newLog = {
            id: `LOG_${dateStr.replace(/-/g, '')}_${empId}`,
            employeeId: empId,
            date: dateStr,
            status: "Absent",
            checkIn: null,
            checkOut: null,
            breakDuration: 0,
            notes: "Marked Absent by CEO",
            location: null
        };

        if (existingLogIndex >= 0) {
            App.logs[existingLogIndex] = newLog;
        } else {
            App.logs.push(newLog);
        }

        App.saveLogs(App.logs);
        updateEmployeeStatus(empId, "offline");

        // Refresh UI
        renderCeoPortal();

        // If the CEO marked the currently selected user, sync UI
        if (empId === App.currentUserId) {
            updateCurrentUserUI();
        }

        addActivityLog("System Admin", `CEO marked ${emp.name} Absent.`, "danger");
    };

    function handleAddEmployee(e) {
        e.preventDefault();
        const name = document.getElementById('addEmpName').value.trim();
        const role = document.getElementById('addEmpRole').value.trim();
        const email = document.getElementById('addEmpEmail').value.trim();
        const joinedDate = document.getElementById('addEmpJoinedDate').value;

        if (!name || !role || !email || !joinedDate) return;

        // Generate ID
        const nextIdNum = App.employees.length + 1;
        const newId = `EMP${nextIdNum.toString().padStart(3, '0')}`;

        const newEmp = {
            id: newId,
            name: name,
            role: role,
            email: email,
            status: "offline",
            joinedDate: joinedDate
        };

        App.employees.push(newEmp);
        App.saveEmployees(App.employees);

        // Reset form & close modal
        DOM.ceoAddEmployeeForm.reset();
        DOM.ceoAddEmployeeModal.classList.remove('active');

        // Refresh UI
        renderCeoPortal();
        renderUserSwitcher();

        addActivityLog("System Admin", `CEO added new employee: ${name} (${role}).`, "success");
    }

    // Initialize on page load
    document.addEventListener("DOMContentLoaded", init);
})();
