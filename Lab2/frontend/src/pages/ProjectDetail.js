import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Plus, Users, Calendar, DollarSign } from 'lucide-react';
import { projectsAPI, employeesAPI } from '../services/api';
import toast from 'react-hot-toast';
import ProjectModal from '../components/ProjectModal';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [availableEmployees, setAvailableEmployees] = useState([]);

  useEffect(() => {
    fetchProject();
    fetchEmployees();
  }, [id]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await projectsAPI.getById(id);
      setProject(response.data);
    } catch (error) {
      toast.error('Failed to load project details');
      console.error('Error fetching project:', error);
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await employeesAPI.getAll({ per_page: 100 });
      setEmployees(response.data.employees);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleUpdateProject = async (id, projectData) => {
    try {
      await projectsAPI.update(id, projectData);
      toast.success('Project updated successfully');
      setIsEditModalOpen(false);
      fetchProject();
    } catch (error) {
      toast.error('Failed to update project');
      console.error('Error updating project:', error);
    }
  };

  const handleAssignEmployee = async (employeeId) => {
    try {
      await projectsAPI.assignEmployee(id, employeeId);
      toast.success('Employee assigned to project successfully');
      setIsAssignModalOpen(false);
      fetchProject();
    } catch (error) {
      toast.error('Failed to assign employee');
      console.error('Error assigning employee:', error);
    }
  };

  const handleRemoveEmployee = async (employeeId) => {
    if (window.confirm('Are you sure you want to remove this employee from the project?')) {
      try {
        await projectsAPI.removeEmployee(id, employeeId);
        toast.success('Employee removed from project successfully');
        fetchProject();
      } catch (error) {
        toast.error('Failed to remove employee');
        console.error('Error removing employee:', error);
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Planning': return 'bg-yellow-100 text-yellow-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'On Hold': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">Project not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/projects')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
            <div className="flex items-center space-x-4 mt-2">
              <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(project.status)}`}>
                {project.status}
              </span>
              <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getPriorityColor(project.priority)}`}>
                {project.priority}
              </span>
            </div>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Edit className="w-4 h-4" />
            <span>Edit</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Description</h3>
            <p className="text-gray-700">{project.description || 'No description provided'}</p>
          </div>

          {/* Project Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Start Date</p>
                    <p className="font-medium text-gray-900">
                      {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'TBD'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">End Date</p>
                    <p className="font-medium text-gray-900">
                      {project.end_date ? new Date(project.end_date).toLocaleDateString() : 'TBD'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                {project.budget && (
                  <div className="flex items-center space-x-3">
                    <DollarSign className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Budget</p>
                      <p className="font-medium text-gray-900">
                        ${project.budget.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Progress</p>
                    <p className="font-medium text-gray-900">{project.progress}%</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${project.progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Team Members */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
              <button
                onClick={() => setIsAssignModalOpen(true)}
                className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {project.employees && project.employees.length > 0 ? (
              <div className="space-y-3">
                {project.employees.map((employee) => (
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
                    <button
                      onClick={() => handleRemoveEmployee(employee.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Users className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">No team members assigned</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <ProjectModal
          project={project}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleUpdateProject}
        />
      )}

      {/* Assign Employee Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Assign Team Member</h3>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {employees
                .filter(emp => !project.employees?.some(projEmp => projEmp.id === emp.id))
                .map((employee) => (
                  <div
                    key={employee.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
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
                        <p className="text-xs text-gray-500">{employee.position} • {employee.department}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAssignEmployee(employee.id)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Assign
                    </button>
                  </div>
                ))}
            </div>
            <div className="flex justify-end pt-4">
              <button
                onClick={() => setIsAssignModalOpen(false)}
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

export default ProjectDetail;


