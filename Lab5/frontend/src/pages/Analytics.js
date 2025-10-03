import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  DollarSign,
  Target,
  Activity,
  BarChart3,
  PieChart
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
  Legend
} from 'recharts';
import { dashboardAPI, employeesAPI, projectsAPI } from '../services/api';
import toast from 'react-hot-toast';

const Analytics = () => {
  const [stats, setStats] = useState({
    total_employees: 0,
    total_projects: 0,
    active_projects: 0,
    avg_performance: 0
  });
  const [departmentStats, setDepartmentStats] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const [statsResponse, departmentsResponse, employeesResponse, projectsResponse] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getDepartmentStats(),
        employeesAPI.getAll({ per_page: 100 }),
        projectsAPI.getAll()
      ]);
      
      setStats(statsResponse.data);
      setDepartmentStats(departmentsResponse.data);
      setEmployees(employeesResponse.data.employees);
      setProjects(projectsResponse.data);
    } catch (error) {
      toast.error('Failed to load analytics data');
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  // Performance distribution data
  const performanceData = [
    { range: '0-20%', count: employees.filter(emp => emp.performance_score >= 0 && emp.performance_score <= 20).length },
    { range: '21-40%', count: employees.filter(emp => emp.performance_score > 20 && emp.performance_score <= 40).length },
    { range: '41-60%', count: employees.filter(emp => emp.performance_score > 40 && emp.performance_score <= 60).length },
    { range: '61-80%', count: employees.filter(emp => emp.performance_score > 60 && emp.performance_score <= 80).length },
    { range: '81-100%', count: employees.filter(emp => emp.performance_score > 80 && emp.performance_score <= 100).length },
  ];

  // Project status distribution
  const projectStatusData = [
    { status: 'Planning', count: projects.filter(proj => proj.status === 'Planning').length },
    { status: 'In Progress', count: projects.filter(proj => proj.status === 'In Progress').length },
    { status: 'Completed', count: projects.filter(proj => proj.status === 'Completed').length },
    { status: 'On Hold', count: projects.filter(proj => proj.status === 'On Hold').length },
  ];

  // Salary vs Performance correlation
  const salaryPerformanceData = employees.map(emp => ({
    name: `${emp.first_name} ${emp.last_name}`.substring(0, 10),
    salary: emp.salary,
    performance: emp.performance_score,
    department: emp.department
  })).slice(0, 10);

  // Monthly trends (based on real data)
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Calculate trends based on hire dates and project creation dates
  const monthlyTrends = months.slice(0, currentMonth + 1).map((month, index) => {
    const targetMonth = new Date(currentYear, index, 1);
    const nextMonth = new Date(currentYear, index + 1, 1);
    
    // Count employees hired before or during this month
    const employeesByMonth = employees.filter(emp => {
      if (!emp.hire_date) return false;
      const hireDate = new Date(emp.hire_date);
      return hireDate < nextMonth;
    }).length;
    
    // Count projects created before or during this month
    const projectsByMonth = projects.filter(proj => {
      if (!proj.created_at) return false;
      const createdDate = new Date(proj.created_at);
      return createdDate < nextMonth;
    }).length;
    
    // Calculate average performance for employees hired up to this month
    const avgPerformance = employeesByMonth > 0 
      ? employees.filter(emp => {
          if (!emp.hire_date) return false;
          const hireDate = new Date(emp.hire_date);
          return hireDate < nextMonth;
        }).reduce((sum, emp) => sum + (emp.performance_score || 0), 0) / employeesByMonth
      : 0;
    
    return {
      month,
      employees: employeesByMonth,
      projects: projectsByMonth,
      performance: Math.round(avgPerformance)
    };
  });

  const topPerformers = employees
    .sort((a, b) => b.performance_score - a.performance_score)
    .slice(0, 5);

  const topDepartments = departmentStats
    .sort((a, b) => b.avg_salary - a.avg_salary)
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_employees}</p>
              <p className="text-sm text-green-600">+12% from last month</p>
            </div>
            <div className="bg-blue-500 rounded-lg p-3">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Projects</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active_projects}</p>
              <p className="text-sm text-green-600">+8% from last month</p>
            </div>
            <div className="bg-green-500 rounded-lg p-3">
              <Target className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Performance</p>
              <p className="text-2xl font-bold text-gray-900">{stats.avg_performance}%</p>
              <p className="text-sm text-green-600">+5% from last month</p>
            </div>
            <div className="bg-purple-500 rounded-lg p-3">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Salary</p>
              <p className="text-2xl font-bold text-gray-900">
                ${Math.round(departmentStats.reduce((acc, dept) => acc + dept.avg_salary, 0) / departmentStats.length || 0).toLocaleString()}
              </p>
              <p className="text-sm text-green-600">+3% from last month</p>
            </div>
            <div className="bg-orange-500 rounded-lg p-3">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employee Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Employee Distribution by Department</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={departmentStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="employee_count" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Performance Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Score Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={performanceData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ range, count }) => `${range}: ${count}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {performanceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={projectStatusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Salary vs Performance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Salary vs Performance Correlation</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={salaryPerformanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="salary" 
                stackId="1" 
                stroke="#8884d8" 
                fill="#8884d8" 
              />
              <Area 
                yAxisId="right"
                type="monotone" 
                dataKey="performance" 
                stackId="2" 
                stroke="#82ca9d" 
                fill="#82ca9d" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Trends */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trends</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyTrends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="employees" stroke="#3B82F6" name="Employees" />
            <Line yAxisId="right" type="monotone" dataKey="projects" stroke="#10B981" name="Projects" />
            <Line yAxisId="right" type="monotone" dataKey="performance" stroke="#F59E0B" name="Avg Performance" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top Performers & Departments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
          <div className="space-y-3">
            {topPerformers.map((employee, index) => (
              <div key={employee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-white">
                      {employee.first_name[0]}{employee.last_name[0]}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {employee.first_name} {employee.last_name}
                    </p>
                    <p className="text-xs text-gray-500">{employee.position}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{employee.performance_score}%</p>
                  <p className="text-xs text-gray-500">#{index + 1}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Departments by Salary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Departments by Average Salary</h3>
          <div className="space-y-3">
            {topDepartments.map((dept, index) => (
              <div key={dept.department} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-white">#{index + 1}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{dept.department}</p>
                    <p className="text-xs text-gray-500">{dept.employee_count} employees</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">${dept.avg_salary.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">avg salary</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;

