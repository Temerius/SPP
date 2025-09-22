import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Filter, Edit, Trash2, Eye, Upload, UserPlus } from 'lucide-react';
import { employeesAPI, projectsAPI } from '../services/api';
import toast from 'react-hot-toast';
import EmployeeModal from '../components/EmployeeModal';

const Employees = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    fetchEmployees();
    fetchProjects();
  }, [currentPage, departmentFilter]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (currentPage === 1) {
        fetchEmployees();
      } else {
        setCurrentPage(1);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        per_page: 10,
        search: searchTerm,
        department: departmentFilter
      };
      const response = await employeesAPI.getAll(params);
      setEmployees(response.data.employees);
      setTotalPages(response.data.pages);
    } catch (error) {
      toast.error('Failed to load employees');
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleCreateEmployee = async (employeeData) => {
    try {
      await employeesAPI.create(employeeData);
      toast.success('Employee created successfully');
      setIsModalOpen(false);
      fetchEmployees();
    } catch (error) {
      toast.error('Failed to create employee');
      console.error('Error creating employee:', error);
    }
  };

  const handleUpdateEmployee = async (id, employeeData) => {
    try {
      await employeesAPI.update(id, employeeData);
      toast.success('Employee updated successfully');
      setIsModalOpen(false);
      setEditingEmployee(null);
      fetchEmployees();
    } catch (error) {
      toast.error('Failed to update employee');
      console.error('Error updating employee:', error);
    }
  };

  const handleDeleteEmployee = async (id) => {
    const employee = employees.find(emp => emp.id === id);
    const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : 'this employee';
    
    if (window.confirm(`Are you sure you want to deactivate ${employeeName}?\n\nThis action will:\n- Remove them from all projects\n- Archive their profile\n- Keep their data for reporting\n\nThis action cannot be undone.`)) {
      try {
        await employeesAPI.delete(id);
        toast.success(`${employeeName} has been deactivated successfully`);
        fetchEmployees();
      } catch (error) {
        toast.error('Failed to deactivate employee');
        console.error('Error deleting employee:', error);
      }
    }
  };

  const handleAvatarUpload = async (id, file) => {
    try {
      await employeesAPI.uploadAvatar(id, file);
      toast.success('Avatar uploaded successfully');
      fetchEmployees();
    } catch (error) {
      toast.error('Failed to upload avatar');
      console.error('Error uploading avatar:', error);
    }
  };

  const openEditModal = (employee) => {
    setEditingEmployee(employee);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
  };

  const openAssignModal = (employee) => {
    setSelectedEmployee(employee);
    setIsAssignModalOpen(true);
  };

  const closeAssignModal = () => {
    setIsAssignModalOpen(false);
    setSelectedEmployee(null);
  };

  const handleAssignToProject = async (projectId) => {
    try {
      await projectsAPI.assignEmployee(projectId, selectedEmployee.id);
      toast.success(`${selectedEmployee.first_name} ${selectedEmployee.last_name} assigned to project successfully`);
      closeAssignModal();
      fetchEmployees(); // Refresh to update project counts
    } catch (error) {
      toast.error('Failed to assign employee to project');
      console.error('Error assigning employee:', error);
    }
  };

  const departments = [...new Set(employees.map(emp => emp.department))];

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
        <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Employee</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Projects
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {employee.avatar ? (
                          <img
                            className="h-10 w-10 rounded-full"
                            src={`http://localhost:5000/uploads/avatars/${employee.avatar}`}
                            alt={`${employee.first_name} ${employee.last_name}`}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {employee.first_name[0]}{employee.last_name[0]}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {employee.first_name} {employee.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{employee.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{employee.position}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {employee.department}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm text-gray-900">{employee.performance_score}%</div>
                      <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${employee.performance_score}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.projects_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => openAssignModal(employee)}
                        className="text-green-600 hover:text-green-900"
                        title="Assign to project"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(employee)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit employee"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteEmployee(employee.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Deactivate employee"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files[0]) {
                            handleAvatarUpload(employee.id, e.target.files[0]);
                          }
                        }}
                        className="hidden"
                        id={`avatar-${employee.id}`}
                      />
                      <label
                        htmlFor={`avatar-${employee.id}`}
                        className="text-gray-600 hover:text-gray-900 cursor-pointer"
                        title="Upload avatar"
                      >
                        <Upload className="w-4 h-4" />
                      </label>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing page <span className="font-medium">{currentPage}</span> of{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Employee Modal */}
      {isModalOpen && (
        <EmployeeModal
          employee={editingEmployee}
          onClose={closeModal}
          onSave={editingEmployee ? handleUpdateEmployee : handleCreateEmployee}
        />
      )}

      {/* Assign to Project Modal */}
      {isAssignModalOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                Assign {selectedEmployee.first_name} {selectedEmployee.last_name} to Project
              </h3>
              <button
                onClick={closeAssignModal}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {projects
                .filter(proj => !proj.employees?.some(emp => emp.id === selectedEmployee.id))
                .map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{project.name}</p>
                      <p className="text-sm text-gray-500">{project.description}</p>
                      <div className="flex items-center space-x-4 mt-1 text-xs text-gray-400">
                        <span>Status: {project.status}</span>
                        <span>Priority: {project.priority}</span>
                        <span>Progress: {project.progress}%</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAssignToProject(project.id)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Assign
                    </button>
                  </div>
                ))}
              {projects.filter(proj => !proj.employees?.some(emp => emp.id === selectedEmployee.id)).length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No available projects to assign</p>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-4">
              <button
                onClick={closeAssignModal}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
