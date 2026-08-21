// Attendance Sheet Mock Data & State Management
window.AttendanceApp = window.AttendanceApp || {};

(function() {
    // 1. Initial Employees List
    const defaultEmployees = [
        {
            id: "EMP001",
            name: "Yashwanth",
            role: "Project Manager",
            email: "yashwanth@company.com",
            avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
            status: "active", // active, break, offline
            joinedDate: "2024-01-15"
        },
        {
            id: "EMP002",
            name: "Harish",
            role: "Lead Engineer",
            email: "harish@company.com",
            avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
            status: "active",
            joinedDate: "2024-02-10"
        },
        {
            id: "EMP003",
            name: "Shahid",
            role: "UI/UX Designer",
            email: "shahid@company.com",
            avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150",
            status: "break",
            joinedDate: "2024-03-22"
        },
        {
            id: "EMP004",
            name: "Shivkumar",
            role: "Software Engineer",
            email: "shivkumar@company.com",
            avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150",
            status: "offline",
            joinedDate: "2024-05-01"
        },
        {
            id: "EMP005",
            name: "Deepali",
            role: "QA Specialist",
            email: "deepali@company.com",
            avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
            status: "offline",
            joinedDate: "2024-06-18"
        },
        {
            id: "EMP006",
            name: "Avinash",
            role: "DevOps Engineer",
            email: "avinash@company.com",
            avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
            status: "offline",
            joinedDate: "2024-07-05"
        },
        {
            id: "EMP007",
            name: "Mohammed Ateef",
            role: "Backend Developer",
            email: "ateef@company.com",
            avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150",
            status: "active",
            joinedDate: "2024-08-01"
        },
        {
            id: "EMP008",
            name: "Arun",
            role: "Business Analyst",
            email: "arun@company.com",
            avatar: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150",
            status: "offline",
            joinedDate: "2024-08-15"
        }
    ];

    // 2. Default System Settings
    const defaultSettings = {
        workStartTime: "09:00", // 24h format
        workEndTime: "18:00",
        gracePeriod: 15, // in minutes
        weeklyOffDays: [0, 6], // 0: Sunday, 6: Saturday
        holidays: [
            { date: "2026-01-01", name: "New Year's Day" },
            { date: "2026-07-04", name: "Independence Day" },
            { date: "2026-12-25", name: "Christmas Day" }
        ],
        allowSimulatedGeo: true
    };

    // Helper: Generate logs for the last N days
    function generateMockLogs(employees, settings, daysCount = 30) {
        const logs = [];
        const today = new Date();
        const startHour = parseInt(settings.workStartTime.split(":")[0]);
        const startMinute = parseInt(settings.workStartTime.split(":")[1]);
        const endHour = parseInt(settings.workEndTime.split(":")[0]);
        
        for (let i = daysCount; i >= 0; i--) {
            const currentDate = new Date(today);
            currentDate.setDate(today.getDate() - i);
            
            // Format YYYY-MM-DD
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayOfWeek = currentDate.getDay();
            
            const isWeekend = settings.weeklyOffDays.includes(dayOfWeek);
            const holiday = settings.holidays.find(h => h.date === dateStr);
            
            if (isWeekend || holiday) {
                // Occasionally add a weekend/holiday overtime log (very rare)
                continue;
            }

            employees.forEach(emp => {
                // 90% attendance probability for work days
                const rand = Math.random();
                let status = "Present";
                let checkInTime = null;
                let checkOutTime = null;
                let breakDuration = 0; // in minutes
                let notes = "";
                let location = { lat: 37.7749, lng: -122.4194, address: "HQ Office (San Francisco)" };

                if (rand < 0.05) {
                    status = "Absent";
                } else if (rand < 0.15) {
                    status = "On Leave";
                    notes = "Approved Annual Leave";
                } else {
                    // Present or Late
                    // Determine check-in time
                    const checkInOffset = Math.floor(Math.random() * 80) - 30; // -30 mins to +50 mins
                    const arrivalTime = new Date(currentDate);
                    arrivalTime.setHours(startHour, startMinute + checkInOffset, Math.floor(Math.random() * 60));
                    
                    const timeDiff = checkInOffset; // difference in minutes from Shift Start
                    if (timeDiff > settings.gracePeriod) {
                        status = "Late";
                        notes = "Traffic delay / Personal morning errand";
                    }

                    checkInTime = arrivalTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    
                    // Determine check-out time (8-9 hours later)
                    const departureTime = new Date(arrivalTime);
                    const hoursWorked = 7.5 + Math.random() * 2; // 7.5 to 9.5 hours
                    departureTime.setMinutes(arrivalTime.getMinutes() + Math.round(hoursWorked * 60));
                    
                    checkOutTime = departureTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

                    // Break duration (30 to 60 mins)
                    breakDuration = 30 + Math.floor(Math.random() * 30);
                    
                    // 15% chance of remote work location
                    if (Math.random() < 0.15) {
                        location = { lat: 37.8044, lng: -122.2711, address: "Remote (Oakland, CA)" };
                        notes = notes ? notes + " | WFH" : "Working from Home";
                    }
                }

                logs.push({
                    id: `LOG_${dateStr.replace(/-/g, '')}_${emp.id}`,
                    employeeId: emp.id,
                    date: dateStr,
                    status: status,
                    checkIn: checkInTime,
                    checkOut: checkOutTime,
                    breakDuration: breakDuration,
                    notes: notes,
                    location: location
                });
            });
        }
        return logs;
    }

    // Initialize or load state
    function loadState() {
        let employees = localStorage.getItem("attendance_employees");
        let settings = localStorage.getItem("attendance_settings");
        let logs = localStorage.getItem("attendance_logs");
        let currentUserId = localStorage.getItem("attendance_current_user_id");

        let needReset = false;
        if (employees) {
            try {
                const parsedEmployees = JSON.parse(employees);
                // Reset local storage state if employee count or any name does not match current code config
                if (parsedEmployees.length !== defaultEmployees.length || 
                    parsedEmployees.some((emp, idx) => emp.name !== defaultEmployees[idx]?.name)) {
                    needReset = true;
                }
            } catch (e) {
                needReset = true;
            }
        }

        if (!employees || needReset) {
            employees = defaultEmployees;
            localStorage.setItem("attendance_employees", JSON.stringify(employees));
            
            settings = defaultSettings;
            localStorage.setItem("attendance_settings", JSON.stringify(settings));
            
            logs = generateMockLogs(employees, settings, 30);
            localStorage.setItem("attendance_logs", JSON.stringify(logs));
            
            currentUserId = employees[0].id;
            localStorage.setItem("attendance_current_user_id", currentUserId);
            
            localStorage.removeItem("attendance_activities");
        } else {
            employees = JSON.parse(employees);
            settings = JSON.parse(settings);
            logs = JSON.parse(logs);
        }

        return { employees, settings, logs, currentUserId };
    }

    // Export API
    const state = loadState();
    window.AttendanceApp.employees = state.employees;
    window.AttendanceApp.settings = state.settings;
    window.AttendanceApp.logs = state.logs;
    window.AttendanceApp.currentUserId = state.currentUserId;

    // State update helpers
    window.AttendanceApp.saveEmployees = function(employeesList) {
        window.AttendanceApp.employees = employeesList;
        localStorage.setItem("attendance_employees", JSON.stringify(employeesList));
    };

    window.AttendanceApp.saveSettings = function(settingsObj) {
        window.AttendanceApp.settings = settingsObj;
        localStorage.setItem("attendance_settings", JSON.stringify(settingsObj));
    };

    window.AttendanceApp.saveLogs = function(logsList) {
        window.AttendanceApp.logs = logsList;
        localStorage.setItem("attendance_logs", JSON.stringify(logsList));
    };

    window.AttendanceApp.setCurrentUser = function(userId) {
        window.AttendanceApp.currentUserId = userId;
        localStorage.setItem("attendance_current_user_id", userId);
    };

    // Calculate logs helper
    window.AttendanceApp.getEmployeeLogs = function(userId) {
        return window.AttendanceApp.logs.filter(log => log.employeeId === userId);
    };

    window.AttendanceApp.getCurrentEmployee = function() {
        return window.AttendanceApp.employees.find(e => e.id === window.AttendanceApp.currentUserId);
    };

    console.log("AttendanceApp State initialized.", {
        employeesCount: window.AttendanceApp.employees.length,
        logsCount: window.AttendanceApp.logs.length,
        currentUser: window.AttendanceApp.getCurrentEmployee().name
    });
})();
