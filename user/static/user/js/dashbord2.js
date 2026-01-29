

class AdminDashboard {
    constructor() {
        this.charts = {};
        this.data = {
            userActivity: [],

        };

        this.init();
    }

    init() {
        this.setupChartControls();
        this.loadDashboardData();
        this.initializeCharts();
        this.setupRefreshInterval();
        this.setupQuickActions();
    }
    async loadVitalsData(period = 7) {
        const response = await fetch(`/api/vitals/?period=${period}`);
        const data = await response.json();
        this.data.vitals = data;
    }

    setupChartControls() {
        const chartButtons = document.querySelectorAll('.chart-btn');
        chartButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove active class from all buttons
                chartButtons.forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                e.target.classList.add('active');

                // Update chart based on selected period
                const period = e.target.dataset.period;
                this.updateActivityChart(period);
            });
        });
    }

    loadDashboardData() {
        // Simulate API calls to load dashboard data
        this.loadUserActivityData();

    }

    loadUserActivityData() {
        // Mock user activity data
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        this.data.userActivity = days.map(day => ({
            day,
            activeUsers: Math.floor(Math.random() * 100),
            newUsers: Math.floor(Math.random() * 70),
            fileUploads: Math.floor(Math.random() * 70),
            apiCalls: Math.floor(Math.random() * 100)
        }));
    }



    loadFileTypeData() {
        this.data.fileTypeData = {
            labels: ['PDF', 'DICOM', 'JPEG', 'MP4', 'TXT', 'Other'],
            datasets: [{
                label: 'File Types',
                data: [12000, 18000, 8000, 3000, 2000, 293],
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                borderColor: 'rgb(59, 130, 246)',
                borderWidth: 1
            }]
        };
    }

    initializeCharts() {
        this.initializeActivityChart();

    }

    async initializeActivityChart() {
        await this.loadVitalsData(); // load default 7 days

        const ctx = document.getElementById('activityChart').getContext('2d');

        this.charts.activity = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.data.vitals.labels,
                datasets: [
                    {
                        label: 'Heart Rate',
                        data: this.data.vitals.heart_rate,
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Blood Sugar',
                        data: this.data.vitals.blood_sugar,
                        borderColor: 'rgb(54, 162, 235)',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Weight',
                        data: this.data.vitals.weight,
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
            }
        });
    }


    async updateActivityChart(period) {
        await this.loadVitalsData(period);

        const chart = this.charts.activity;
        chart.data.labels = this.data.vitals.labels;
        chart.data.datasets[0].data = this.data.vitals.heart_rate;
        chart.data.datasets[1].data = this.data.vitals.blood_sugar;
        chart.data.datasets[2].data = this.data.vitals.weight;

        chart.update();
    }


    updateActivityList() {
        const activityList = document.querySelector('.activity-list');
        if (!activityList) return;

        // Add timestamp formatting to existing items
        const timeElements = activityList.querySelectorAll('.activity-time');
        timeElements.forEach((element, index) => {
            if (this.data.recentActivity[index]) {
                element.textContent = this.formatTimeAgo(this.data.recentActivity[index].timestamp);
            }
        });
    }

    updateSystemStatus() {
        const statusItems = document.querySelectorAll('.status-item');
        const metrics = this.data.systemMetrics;

        // Update system status values with real data
        statusItems.forEach(item => {
            const label = item.querySelector('.status-label').textContent.toLowerCase();
            const valueElement = item.querySelector('.status-value');

            if (label.includes('api')) {
                valueElement.textContent = 'Online';
                valueElement.className = 'status-value online';
            } else if (label.includes('database')) {
                valueElement.textContent = 'Healthy';
                valueElement.className = 'status-value online';
            } else if (label.includes('storage')) {
                valueElement.textContent = `${metrics.diskUsage}% Used`;
                valueElement.className = metrics.diskUsage > 80 ? 'status-value error' : 'status-value warning';
            } else if (label.includes('backup')) {
                valueElement.textContent = 'Active';
                valueElement.className = 'status-value online';
            }
        });
    }





    // API simulation methods
    async simulateAPICall(endpoint, delay = 1000) {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    success: true,
                    data: `Mock data from ${endpoint}`,
                    timestamp: new Date().toISOString()
                });
            }, delay);
        });
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminDashboard = new AdminDashboard();
});

// Handle canvas resizing
window.addEventListener('resize', () => {
    if (window.adminDashboard && window.adminDashboard.charts) {
        Object.values(window.adminDashboard.charts).forEach(chart => {
            if (chart) chart.resize();
        });
    }
});

// Export for use in other modules
window.AdminDashboard = AdminDashboard;
