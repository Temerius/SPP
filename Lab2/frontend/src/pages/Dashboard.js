import React, { useState, useEffect } from 'react';
import { Users, FolderKanban, TrendingUp, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { dashboardAPI, employeesAPI } from '../services/api';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [stats, setStats] = useState({
    total_employees: 0,
    total_projects: 0,
    active_projects: 0,
    avg_performance: 0
  });
  const [departmentStats, setDepartmentStats] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsResponse, departmentsResponse, employeesResponse] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getDepartmentStats(),
        employeesAPI.getAll({ per_page: 4 })
      ]);
      
      setStats(statsResponse.data);
      setDepartmentStats(departmentsResponse.data);
      setEmployees(employeesResponse.data.employees);
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  const statCards = [
    {
      title: 'Total Employees',
      value: stats.total_employees,
      icon: Users,
      color: 'bg-blue-500',
      change: '+12%',
      changeType: 'positive'
    },
    {
      title: 'Active Projects',
      value: stats.active_projects,
      icon: FolderKanban,
      color: 'bg-green-500',
      change: '+8%',
      changeType: 'positive'
    },
    {
      title: 'Avg Performance',
      value: `${stats.avg_performance}%`,
      icon: TrendingUp,
      color: 'bg-purple-500',
      change: '+5%',
      changeType: 'positive'
    },
    {
      title: 'Total Projects',
      value: stats.total_projects,
      icon: DollarSign,
      color: 'bg-orange-500',
      change: '+3%',
      changeType: 'positive'
    }
  ];

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
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 card-hover">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{card.value}</p>
                  <p className={`text-sm mt-1 ${card.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                    {card.change} from last month
                  </p>
                </div>
                <div className={`${card.color} rounded-lg p-3`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Employees by Department</h3>
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

        {/* Average Salary by Department */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Average Salary by Department</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={departmentStats}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ department, avg_salary }) => `${department}: $${avg_salary.toLocaleString()}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="avg_salary"
              >
                {departmentStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {employees.length > 0 ? (
            employees.slice(0, 4).map((employee, index) => (
              <div key={employee.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Employee {employee.is_active ? 'updated' : 'deactivated'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {employee.first_name} {employee.last_name} • {employee.position}
                  </p>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(employee.created_at || Date.now()).toLocaleDateString()}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No recent activity</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
