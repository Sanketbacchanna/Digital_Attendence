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

    // Active Interval for Time Clock
    let sessionTimerInterval = null;
    let clockInterval = null;
    
    // Calendar State
    let calendarDate = new Date(); // Start with current month/year

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
        sidebarUserRole: document.getElementById('sidebarUserRole'),
        employeeSwitcherMenu: document.getElementById('employeeSwitcherMenu'),
        
        // Dashboard Stats
        statsHoursWorked: document.getElementById('statsHoursWorked'),
        statsAttendanceRate: document.getElementById('statsAttendanceRate'),
        statsLateDays: document.getElementById('statsLateDays'),
        statsLeaveBalance: document.getElementById('statsLeaveBalance'),
        
        // Punch Panel
        currentPunchStatusRibbon: document.getElementById('currentPunchStatusRibbon'),
        mainPunchBtn: document.getElementById('mainPunchBtn'),
        sessionTimer: document.getElementById('sessionTimerDisplay'),
        breakBtn: document.getElementById('breakBtn'),
        wfhBtn: document.getElementById('wfhBtn'),
        punchNoteWrapper: document.getElementById('punchNoteWrapper'),
        punchNoteInput: document.getElementById('punchNoteInput'),
        simulatedLocationDisplay: document.getElementById('simulatedLocationDisplay'),
        
        // Team Tracker & Activities
        teamTrackerList: document.getElementById('teamTrackerList'),
        recentActivityTimeline: document.getElementById('recentActivityTimeline'),
        
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
        
        // Calendar Tab
        prevMonthBtn: document.getElementById('prevMonthBtn'),
        nextMonthBtn: document.getElementById('nextMonthBtn'),
        calendarMonthLabel: document.getElementById('calendarMonthLabel'),
        calendarGrid: document.getElementById('calendarGrid'),
        
        // Modals
        calendarDetailsModal: document.getElementById('calendarDetailsModal'),
        modalDayTitle: document.getElementById('modalDayTitle'),
        modalDetailsContent: document.getElementById('modalDetailsContent'),
        modalCloseBtn: document.getElementById('modalCloseBtn'),
        
        // Analytics
        donutCenterRate: document.getElementById('donutCenterRate'),
        donutChartPresent: document.getElementById('donutChartPresent'),
        donutChartLate: document.getElementById('donutChartLate'),
        donutChartAbsent: document.getElementById('donutChartAbsent'),
        analyticsBarChart: document.getElementById('analyticsBarChart'),
        kpiAvgHours: document.getElementById('kpiAvgHours'),
        kpiAvgHoursStatus: document.getElementById('kpiAvgHoursStatus'),
        kpiOnTimeRate: document.getElementById('kpiOnTimeRate'),
        kpiOnTimeStatus: document.getElementById('kpiOnTimeStatus'),
        kpiTotalDays: document.getElementById('kpiTotalDays'),
        
        // Settings Tab
        settingStartTime: document.getElementById('settingStartTime'),
        settingEndTime: document.getElementById('settingEndTime'),
        settingGracePeriod: document.getElementById('settingGracePeriod'),
        settingLocationTrack: document.getElementById('settingLocationTrack'),
        btnSaveSettings: document.getElementById('btnSaveSettings'),
        btnResetAll: document.getElementById('btnResetAll')
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
        renderTeamTracker();
        renderRecentActivity();
        
        // Set setting inputs to current values
        loadSettingsInputs();

        // Event Listeners Setup
        setupEventListeners();
        
        // Initialize dashboard stats
        updateDashboardStats();
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

        // Check In/Out & Break controls
        DOM.mainPunchBtn.addEventListener('click', handlePunchAction);
        DOM.breakBtn.addEventListener('click', handleBreakAction);
        DOM.wfhBtn.addEventListener('click', () => {
            const display = DOM.punchNoteWrapper.style.display;
            DOM.punchNoteWrapper.style.display = display === 'none' ? 'block' : 'none';
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

        // Calendar Nav
        DOM.prevMonthBtn.addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() - 1); renderCalendar(); });
        DOM.nextMonthBtn.addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() + 1); renderCalendar(); });
        
        // Modal Controls
        DOM.modalCloseBtn.addEventListener('click', () => DOM.calendarDetailsModal.classList.remove('active'));
        DOM.calendarDetailsModal.addEventListener('click', (e) => {
            if (e.target === DOM.calendarDetailsModal) DOM.calendarDetailsModal.classList.remove('active');
        });

        // Settings actions
        DOM.btnSaveSettings.addEventListener('click', saveConfigSettings);
        DOM.btnResetAll.addEventListener('click', resetLocalStorage);
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
        } else if (tabId === 'calendar') {
            renderCalendar();
        } else if (tabId === 'analytics') {
            renderAnalytics();
        } else if (tabId === 'dashboard') {
            updateDashboardStats();
            renderTeamTracker();
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
                    <span class="dropdown-item-role">${emp.role}</span>
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
        DOM.sidebarUserRole.textContent = user.role;

        // Reset check-in state variables
        clearInterval(sessionTimerInterval);
        DOM.sessionTimer.textContent = '00:00:00';
        DOM.punchNoteInput.value = '';
        DOM.punchNoteWrapper.style.display = 'none';

        // Read current punch state
        syncPunchUI();
        updateDashboardStats();
    }

    // ----------------------------------------------------
    // TIME CLOCK ATTENDANCE SYSTEM LOGIC
    // ----------------------------------------------------
    function getTodayLog() {
        const todayStr = new Date().toISOString().split('T')[0];
        return App.logs.find(log => log.employeeId === App.currentUserId && log.date === todayStr);
    }

    function syncPunchUI() {
        const todayLog = getTodayLog();
        const ribbon = DOM.currentPunchStatusRibbon;
        const btn = DOM.mainPunchBtn;
        const breakBtn = DOM.breakBtn;
        const user = App.getCurrentEmployee();

        if (!todayLog) {
            // Checked out, no shift started
            ribbon.textContent = 'Checked Out';
            ribbon.className = 'punch-status-ribbon status-checked-out';
            btn.className = 'punch-btn';
            btn.querySelector('span').textContent = 'Check In';
            btn.querySelector('svg').innerHTML = '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>';
            breakBtn.disabled = true;
            breakBtn.className = 'action-btn';
            breakBtn.querySelector('span').textContent = 'Take Break';
            DOM.simulatedLocationDisplay.textContent = 'Awaiting check-in...';
            
            // Stop session timer
            clearInterval(sessionTimerInterval);
        } else if (todayLog.checkIn && !todayLog.checkOut) {
            // Active shift
            DOM.simulatedLocationDisplay.textContent = `${todayLog.location.address} (${todayLog.location.lat.toFixed(4)}, ${todayLog.location.lng.toFixed(4)})`;

            if (todayLog.status === "On Break") {
                // Currently on break
                ribbon.textContent = 'On Break';
                ribbon.className = 'punch-status-ribbon status-on-break';
                btn.className = 'punch-btn checked-in';
                btn.querySelector('span').textContent = 'Check Out';
                btn.querySelector('svg').innerHTML = '<path d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/>';
                
                breakBtn.disabled = false;
                breakBtn.className = 'action-btn active';
                breakBtn.querySelector('span').textContent = 'Resume Work';
            } else {
                // Active working
                ribbon.textContent = todayLog.status; // Present or Late
                ribbon.className = 'punch-status-ribbon status-checked-in';
                btn.className = 'punch-btn checked-in';
                btn.querySelector('span').textContent = 'Check Out';
                btn.querySelector('svg').innerHTML = '<path d="M9 21H3v-6M21 3l-7 7M15 3h6v6M3 21l7-7"/>';
                
                breakBtn.disabled = false;
                breakBtn.className = 'action-btn';
                breakBtn.querySelector('span').textContent = 'Take Break';
            }

            // Start session duration timer
            startSessionDurationTimer(todayLog);
        } else {
            // Already checked out today
            ribbon.textContent = 'Shift Finished';
            ribbon.className = 'punch-status-ribbon status-checked-out';
            btn.className = 'punch-btn';
            btn.disabled = true;
            btn.style.opacity = 0.5;
            btn.querySelector('span').textContent = 'Done Today';
            breakBtn.disabled = true;
            DOM.simulatedLocationDisplay.textContent = `Ended at ${todayLog.checkOut}`;
            
            clearInterval(sessionTimerInterval);
        }
    }

    function startSessionDurationTimer(todayLog) {
        clearInterval(sessionTimerInterval);
        
        function updateTimer() {
            const now = new Date();
            const checkInParts = todayLog.checkIn.split(':');
            const checkInDate = new Date();
            checkInDate.setHours(parseInt(checkInParts[0]), parseInt(checkInParts[1]), parseInt(checkInParts[2] || 0));

            let diffMs = now - checkInDate;

            // Deduct break time
            let totalBreakMs = todayLog.breakDuration * 60000;
            
            // If currently on break, add the ongoing break duration
            if (todayLog.status === "On Break" && todayLog.breakStartedAt) {
                const ongoingBreakMs = now - new Date(todayLog.breakStartedAt);
                totalBreakMs += ongoingBreakMs;
            }

            diffMs = Math.max(0, diffMs - totalBreakMs);

            const hours = Math.floor(diffMs / 3600000);
            const minutes = Math.floor((diffMs % 3600000) / 60000);
            const seconds = Math.floor((diffMs % 60000) / 1000);

            DOM.sessionTimer.textContent = 
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        updateTimer();
        sessionTimerInterval = setInterval(updateTimer, 1000);
    }

    function handlePunchAction() {
        const todayLog = getTodayLog();
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const dateStr = now.toISOString().split('T')[0];

        if (!todayLog) {
            // --- CHECK IN ---
            // Calculate status (Present vs Late)
            const shiftStartParts = App.settings.workStartTime.split(':');
            const shiftStartMin = parseInt(shiftStartParts[0]) * 60 + parseInt(shiftStartParts[1]);
            const currentMin = now.getHours() * 60 + now.getMinutes();
            const lateDiff = currentMin - shiftStartMin;

            let status = "Present";
            let notes = DOM.punchNoteInput.value;
            if (lateDiff > App.settings.gracePeriod) {
                status = "Late";
                notes = notes ? notes + " | Checked in late" : "Late arrival";
            }

            // Location simulation
            let location = { lat: 37.7749, lng: -122.4194, address: "HQ Office (San Francisco)" };
            if (Math.random() < 0.3) {
                location = { lat: 37.8044, lng: -122.2711, address: "Remote (Oakland, CA)" };
                notes = notes ? notes + " | Remote" : "Working remotely";
            }

            const newLog = {
                id: `LOG_${dateStr.replace(/-/g, '')}_${App.currentUserId}`,
                employeeId: App.currentUserId,
                date: dateStr,
                status: status,
                checkIn: timeStr,
                checkOut: null,
                breakDuration: 0,
                notes: notes,
                location: location
            };

            // Update state
            App.logs.push(newLog);
            App.saveLogs(App.logs);

            // Update user status
            updateEmployeeStatus(App.currentUserId, "active");

            // Add Activity timeline
            addActivityLog("Check-In", `${App.getCurrentEmployee().name} checked in at ${timeStr}.`, "success");

            // UI Refresh
            syncPunchUI();
            updateDashboardStats();
            renderTeamTracker();
        } else if (todayLog.checkIn && !todayLog.checkOut) {
            // --- CHECK OUT ---
            // If on break, resume first
            if (todayLog.status === "On Break") {
                handleBreakAction(); // Ends break
            }

            // Perform check out
            const activeLog = getTodayLog(); // Reload latest
            activeLog.checkOut = timeStr;
            activeLog.notes = DOM.punchNoteInput.value ? DOM.punchNoteInput.value : activeLog.notes;
            
            App.saveLogs(App.logs);

            // Update user status
            updateEmployeeStatus(App.currentUserId, "offline");

            // Add Activity timeline
            addActivityLog("Check-Out", `${App.getCurrentEmployee().name} checked out at ${timeStr}.`, "danger");

            // UI Refresh
            syncPunchUI();
            updateDashboardStats();
            renderTeamTracker();
        }
    }

    function handleBreakAction() {
        const todayLog = getTodayLog();
        if (!todayLog || todayLog.checkOut) return;

        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

        if (todayLog.status !== "On Break") {
            // --- GO ON BREAK ---
            todayLog.status = "On Break";
            todayLog.breakStartedAt = now.toISOString(); // Store timestamp
            
            App.saveLogs(App.logs);
            updateEmployeeStatus(App.currentUserId, "break");
            addActivityLog("Break Start", `${App.getCurrentEmployee().name} went on break at ${timeStr}.`, "warning");
        } else {
            // --- RESUME WORK ---
            const breakStarted = new Date(todayLog.breakStartedAt);
            const durationMins = Math.round((now - breakStarted) / 60000);
            
            // Restore previous check-in status
            const shiftStartParts = App.settings.workStartTime.split(':');
            const checkInParts = todayLog.checkIn.split(':');
            const checkInMinutes = parseInt(checkInParts[0]) * 60 + parseInt(checkInParts[1]);
            const shiftStartMinutes = parseInt(shiftStartParts[0]) * 60 + parseInt(shiftStartParts[1]);
            
            todayLog.status = (checkInMinutes - shiftStartMinutes > App.settings.gracePeriod) ? "Late" : "Present";
            todayLog.breakDuration = (todayLog.breakDuration || 0) + durationMins;
            delete todayLog.breakStartedAt;

            App.saveLogs(App.logs);
            updateEmployeeStatus(App.currentUserId, "active");
            addActivityLog("Break End", `${App.getCurrentEmployee().name} returned from break. Duration: ${durationMins}m.`, "info");
        }

        syncPunchUI();
        renderTeamTracker();
    }

    function updateEmployeeStatus(empId, status) {
        const employees = App.employees.map(emp => {
            if (emp.id === empId) emp.status = status;
            return emp;
        });
        App.saveEmployees(employees);
    }

    // ----------------------------------------------------
    // SYSTEM STATS & KPI CALCULATIONS
    // ----------------------------------------------------
    function updateDashboardStats() {
        const userLogs = App.getEmployeeLogs(App.currentUserId);
        
        // 1. Total Worked Hours
        let totalMinutes = 0;
        let presentDays = 0;
        let lateDays = 0;

        userLogs.forEach(log => {
            if (log.checkIn && log.checkOut) {
                const inParts = log.checkIn.split(':');
                const outParts = log.checkOut.split(':');
                
                const inMins = parseInt(inParts[0]) * 60 + parseInt(inParts[1]);
                const outMins = parseInt(outParts[0]) * 60 + parseInt(outParts[1]);
                
                let duration = outMins - inMins - (log.breakDuration || 0);
                totalMinutes += Math.max(0, duration);
            }
            
            if (log.status === "Present" || log.status === "Late") presentDays++;
            if (log.status === "Late") lateDays++;
        });

        const totalHours = (totalMinutes / 60).toFixed(1);
        DOM.statsHoursWorked.textContent = `${totalHours}h`;

        // 2. Attendance Rate
        const totalPotentialDays = Math.max(1, userLogs.filter(l => l.status !== "On Leave").length);
        const rate = Math.round((presentDays / totalPotentialDays) * 100);
        DOM.statsAttendanceRate.textContent = `${rate}%`;

        // 3. Late Days
        DOM.statsLateDays.textContent = `${lateDays}d`;

        // 4. Leave Balance (Mocked - 15 total allowed per year, count how many leaves taken in logs)
        const leavesTaken = userLogs.filter(log => log.status === "On Leave").length;
        DOM.statsLeaveBalance.textContent = `${Math.max(0, 15 - leavesTaken)}d`;
    }

    // ----------------------------------------------------
    // TEAM LIVE TRACKER & SYSTEM ACTIVITIES
    // ----------------------------------------------------
    function renderTeamTracker() {
        DOM.teamTrackerList.innerHTML = '';
        
        App.employees.forEach(emp => {
            // Find employee's attendance entry for today
            const todayStr = new Date().toISOString().split('T')[0];
            const log = App.logs.find(l => l.employeeId === emp.id && l.date === todayStr);

            let statusLabel = "OFFLINE";
            let statusDotClass = "status-dot-offline";
            let timeLogLabel = "Checked Out";
            let timeLogVal = log && log.checkOut ? log.checkOut.substring(0, 5) : "--:--";
            let valClass = "";

            if (emp.status === "active") {
                statusLabel = "WORKING";
                statusDotClass = "status-dot-active";
                timeLogLabel = "Checked In";
                timeLogVal = log && log.checkIn ? log.checkIn.substring(0, 5) : "--:--";
                if (log && log.status === "Late") {
                    valClass = "late";
                }
            } else if (emp.status === "break") {
                statusLabel = "ON BREAK";
                statusDotClass = "status-dot-break";
                timeLogLabel = "Break duration";
                timeLogVal = log ? `${log.breakDuration || 0} mins` : "--";
            }

            const item = document.createElement('div');
            item.className = 'team-member-card';
            item.innerHTML = `
                <div class="member-info-section">
                    <div class="member-avatar-wrapper">
                        <div class="member-avatar initials-avatar ${getAvatarColorClass(emp.id)}">${getInitials(emp.name)}</div>
                        <span class="status-indicator-dot ${statusDotClass}"></span>
                    </div>
                    <div class="member-name-role">
                        <span class="member-name">${emp.name}</span>
                        <span class="member-role">${emp.role}</span>
                    </div>
                </div>
                <div class="member-time-log">
                    <span class="member-log-label">${timeLogLabel}</span>
                    <span class="member-log-time ${valClass}">${timeLogVal}</span>
                </div>
            `;
            DOM.teamTrackerList.appendChild(item);
        });
    }

    function addActivityLog(type, text, theme) {
        const activities = JSON.parse(localStorage.getItem("attendance_activities") || "[]");
        const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        
        activities.unshift({ type, text, time, theme });
        
        // Keep max 10
        if (activities.length > 10) activities.pop();
        
        localStorage.setItem("attendance_activities", JSON.stringify(activities));
        renderRecentActivity();
    }

    function renderRecentActivity() {
        DOM.recentActivityTimeline.innerHTML = '';
        const activities = JSON.parse(localStorage.getItem("attendance_activities") || "[]");

        if (activities.length === 0) {
            DOM.recentActivityTimeline.innerHTML = '<span class="loc-label" style="text-align: center; display: block; padding: 10px;">No recent actions logged today.</span>';
            return;
        }

        activities.forEach(act => {
            const item = document.createElement('div');
            item.className = 'timeline-item';
            item.innerHTML = `
                <span class="timeline-dot ${act.theme}"></span>
                <div class="timeline-content">
                    <span class="timeline-title">${act.type}</span>
                    <span class="timeline-desc">${act.text} <span style="color: var(--text-muted); font-size: 10px;">(${act.time})</span></span>
                </div>
            `;
            DOM.recentActivityTimeline.appendChild(item);
        });
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
            const matchesSearch = emp.name.toLowerCase().includes(searchVal) || emp.role.toLowerCase().includes(searchVal);
            
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
            
            const badgeClass = log.status.toLowerCase().replace(' ', '-');
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="display: flex; align-items: center; gap: 10px;">
                    <div class="log-avatar initials-avatar ${getAvatarColorClass(emp.id)}" style="width: 28px; height: 28px; border-radius: 50%;">${getInitials(emp.name)}</div>
                    <div>
                        <div style="font-weight: 600;">${emp.name}</div>
                        <div style="font-size: 10px; color: var(--text-muted);">${emp.role}</div>
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
        csvContent += "Employee Name,Role,Date,Check-In,Check-Out,Break Duration (Mins),Status,Location,Notes\n";

        filteredLogs.forEach(log => {
            const emp = App.employees.find(e => e.id === log.employeeId);
            const name = emp ? emp.name : 'Unknown';
            const role = emp ? emp.role : 'Unknown';
            const location = log.location ? log.location.address.replace(/,/g, ' ') : '';
            const notes = log.notes ? log.notes.replace(/,/g, ' ') : '';

            csvContent += `"${name}","${role}","${log.date}","${log.checkIn || ''}","${log.checkOut || ''}",${log.breakDuration || 0},"${log.status}","${location}","${notes}"\n`;
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
    // CALENDAR MONTH VIEW GRID
    // ----------------------------------------------------
    function renderCalendar() {
        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();

        // Label
        DOM.calendarMonthLabel.textContent = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        // Clear grid
        DOM.calendarGrid.innerHTML = '';

        // Get first day of month and last day of month
        const firstDayIdx = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();
        const prevMonthTotalDays = new Date(year, month, 0).getDate();

        // Render previous month blank padding days
        for (let i = firstDayIdx - 1; i >= 0; i--) {
            const cell = document.createElement('div');
            cell.className = 'calendar-day-cell other-month';
            cell.innerHTML = `<span class="calendar-day-number">${prevMonthTotalDays - i}</span>`;
            DOM.calendarGrid.appendChild(cell);
        }

        // Render actual days of current month
        for (let day = 1; day <= totalDays; day++) {
            const dayStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const cell = document.createElement('div');
            cell.className = 'calendar-day-cell';
            
            // Check logs for current selected employee on this day
            const log = App.logs.find(l => l.employeeId === App.currentUserId && l.date === dayStr);

            let statusClass = '';
            let statusDot = '';
            
            // Check if day is weekend
            const dayOfWeek = new Date(year, month, day).getDay();
            const isWeekend = App.settings.weeklyOffDays.includes(dayOfWeek);

            if (log) {
                statusClass = log.status.replace(' ', '-'); // Present, Late, Absent, On-Leave
                statusDot = `<div class="calendar-day-status ${statusClass}" title="${log.status}"></div>`;
            } else if (isWeekend) {
                statusDot = `<div class="calendar-day-status Weekend" title="Weekly Off"></div>`;
            }

            cell.innerHTML = `
                <span class="calendar-day-number">${day}</span>
                ${statusDot}
            `;

            // Open Detail Modal on Click
            cell.addEventListener('click', () => openCalendarDayDetails(dayStr, log, isWeekend));
            DOM.calendarGrid.appendChild(cell);
        }
    }

    function openCalendarDayDetails(dateStr, log, isWeekend) {
        DOM.modalDayTitle.textContent = `Log Details: ${dateStr}`;
        const container = DOM.modalDetailsContent;
        container.innerHTML = '';

        if (log) {
            const badgeClass = log.status.toLowerCase().replace(' ', '-');
            container.innerHTML = `
                <div class="modal-detail-row">
                    <span class="modal-detail-label">Status</span>
                    <span class="modal-detail-value"><span class="status-badge ${badgeClass}">${log.status}</span></span>
                </div>
                <div class="modal-detail-row">
                    <span class="modal-detail-label">Check-In Time</span>
                    <span class="modal-detail-value">${log.checkIn || '--:--'}</span>
                </div>
                <div class="modal-detail-row">
                    <span class="modal-detail-label">Check-Out Time</span>
                    <span class="modal-detail-value">${log.checkOut || '--:--'}</span>
                </div>
                <div class="modal-detail-row">
                    <span class="modal-detail-label">Break Duration</span>
                    <span class="modal-detail-value">${log.breakDuration || 0} minutes</span>
                </div>
                <div class="modal-detail-row">
                    <span class="modal-detail-label">Location Tag</span>
                    <span class="modal-detail-value">${log.location ? log.location.address : 'HQ Office'}</span>
                </div>
                <div class="modal-detail-row" style="flex-direction: column; align-items: flex-start; gap: 6px;">
                    <span class="modal-detail-label">Notes</span>
                    <span class="modal-detail-value" style="font-weight: normal; font-style: italic; line-height: 1.4;">${log.notes || 'No entry notes.'}</span>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px 0;">
                    <svg viewBox="0 0 24 24" width="48" height="48" stroke="var(--text-muted)" stroke-width="1.5" fill="none" style="margin-bottom: 12px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <p style="font-weight: 600; font-size: 14px;">No shift logged on this day.</p>
                    <p style="color: var(--text-muted); font-size: 12px; margin-top: 4px;">
                        ${isWeekend ? 'This day was a configured weekly off (weekend).' : 'The employee was marked Absent / had no activity logged.'}
                    </p>
                </div>
            `;
        }

        DOM.calendarDetailsModal.classList.add('active');
    }

    // ----------------------------------------------------
    // ANALYTICS & SVG CHARTS RENDERING
    // ----------------------------------------------------
    function renderAnalytics() {
        const userLogs = App.getEmployeeLogs(App.currentUserId);
        
        let present = 0;
        let late = 0;
        let absent = 0;
        let leave = 0;
        
        userLogs.forEach(l => {
            if (l.status === 'Present') present++;
            else if (l.status === 'Late') late++;
            else if (l.status === 'Absent') absent++;
            else if (l.status === 'On Leave') leave++;
        });

        const total = present + late + absent + leave || 1;
        
        // Compute Percentages
        const presentPct = (present / total) * 100;
        const latePct = (late / total) * 100;
        const absentPct = (absent / total) * 100;

        DOM.donutCenterRate.textContent = `${Math.round(presentPct + latePct)}%`;

        // SVG circle perimeter is 2 * PI * r = 2 * 3.14159 * 80 = 502.65
        const circumference = 502.65;
        
        // Present Circle
        const presentDash = (present / total) * circumference;
        DOM.donutChartPresent.style.strokeDasharray = `${presentDash} ${circumference}`;
        
        // Late Circle (Offset)
        const lateDash = (late / total) * circumference;
        DOM.donutChartLate.style.strokeDasharray = `${lateDash} ${circumference}`;
        DOM.donutChartLate.style.strokeDashoffset = `-${presentDash}`;

        // Absent Circle (Offset)
        const absentDash = (absent / total) * circumference;
        DOM.donutChartAbsent.style.strokeDasharray = `${absentDash} ${circumference}`;
        DOM.donutChartAbsent.style.strokeDashoffset = `-${presentDash + lateDash}`;

        // KPI Section Math
        let totalMinutes = 0;
        let shiftLogsCount = 0;
        userLogs.forEach(log => {
            if (log.checkIn && log.checkOut) {
                const inParts = log.checkIn.split(':');
                const outParts = log.checkOut.split(':');
                const inMins = parseInt(inParts[0]) * 60 + parseInt(inParts[1]);
                const outMins = parseInt(outParts[0]) * 60 + parseInt(outParts[1]);
                totalMinutes += Math.max(0, outMins - inMins - (log.breakDuration || 0));
                shiftLogsCount++;
            }
        });

        const avgHrsVal = shiftLogsCount > 0 ? (totalMinutes / (shiftLogsCount * 60)).toFixed(1) : '0.0';
        DOM.kpiAvgHours.textContent = `${avgHrsVal} hours/day`;
        DOM.kpiAvgHoursStatus.textContent = parseFloat(avgHrsVal) >= 8.0 ? 'Optimal' : 'Short Hours';
        DOM.kpiAvgHoursStatus.className = `status-badge ${parseFloat(avgHrsVal) >= 8.0 ? 'present' : 'late'}`;

        const onTimeRateVal = present + late > 0 ? Math.round((present / (present + late)) * 100) : 0;
        DOM.kpiOnTimeRate.textContent = `${onTimeRateVal}% on-time`;
        DOM.kpiOnTimeStatus.textContent = onTimeRateVal >= 90 ? 'Excellent' : 'Needs Work';
        DOM.kpiOnTimeStatus.className = `status-badge ${onTimeRateVal >= 90 ? 'present' : 'late'}`;

        DOM.kpiTotalDays.textContent = `${userLogs.length} logs`;

        // Render custom bar chart weekly
        renderWeeklyBarChart(userLogs);
    }

    function renderWeeklyBarChart(logs) {
        DOM.analyticsBarChart.innerHTML = '';
        
        // Group logs into last 5 weeks
        const weeks = [
            { label: 'Wk 1', mins: 0, count: 0 },
            { label: 'Wk 2', mins: 0, count: 0 },
            { label: 'Wk 3', mins: 0, count: 0 },
            { label: 'Wk 4', mins: 0, count: 0 },
            { label: 'Wk 5', mins: 0, count: 0 }
        ];

        // Fill weekly bins mock math
        logs.forEach((log, index) => {
            if (log.checkIn && log.checkOut) {
                const inParts = log.checkIn.split(':');
                const outParts = log.checkOut.split(':');
                const duration = (parseInt(outParts[0]) * 60 + parseInt(outParts[1])) - (parseInt(inParts[0]) * 60 + parseInt(inParts[1])) - (log.breakDuration || 0);
                
                // Distribute evenly across 5 weeks based on logs count
                const bin = Math.min(4, Math.floor(index / (logs.length / 5)));
                weeks[bin].mins += duration;
                weeks[bin].count++;
            }
        });

        weeks.forEach(wk => {
            const avgHrs = wk.count > 0 ? (wk.mins / (wk.count * 60)) : 0;
            // Target is 8 hours daily. Max height scale at 10 hours.
            const heightPct = Math.min(100, Math.round((avgHrs / 10) * 100));

            const col = document.createElement('div');
            col.className = 'bar-column';
            col.innerHTML = `
                <span class="member-log-time" style="font-size: 10px;">${avgHrs.toFixed(1)}h</span>
                <div class="bar-fill-wrapper">
                    <div class="bar-fill" style="height: ${heightPct}%;"></div>
                </div>
                <span class="bar-label">${wk.label}</span>
            `;
            DOM.analyticsBarChart.appendChild(col);
        });
    }

    // ----------------------------------------------------
    // SETTINGS PANEL
    // ----------------------------------------------------
    function loadSettingsInputs() {
        DOM.settingStartTime.value = App.settings.workStartTime;
        DOM.settingEndTime.value = App.settings.workEndTime;
        DOM.settingGracePeriod.value = App.settings.gracePeriod;
        DOM.settingLocationTrack.checked = App.settings.allowSimulatedGeo;
    }

    function saveConfigSettings() {
        const config = {
            workStartTime: DOM.settingStartTime.value,
            workEndTime: DOM.settingEndTime.value,
            gracePeriod: parseInt(DOM.settingGracePeriod.value) || 0,
            weeklyOffDays: App.settings.weeklyOffDays,
            holidays: App.settings.holidays,
            allowSimulatedGeo: DOM.settingLocationTrack.checked
        };

        App.saveSettings(config);
        
        // Notify
        addActivityLog("Config Updated", "Company working hours and settings updated.", "info");
        alert("System attendance settings saved successfully.");
        
        // Re-read current check-ins in case settings altered late calculations
        syncPunchUI();
    }

    function resetLocalStorage() {
        if (confirm("Are you sure you want to clear all attendance logs, employees, and config settings? This will reload default mock logs.")) {
            localStorage.clear();
            window.location.reload();
        }
    }

    // Initialize on page load
    document.addEventListener("DOMContentLoaded", init);
})();
