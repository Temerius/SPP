import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Upload, Users, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import { employeesAPI } from '../services/api';
import toast from 'react-hot-toast';
import EmployeeModal from '../components/EmployeeModal';

const EmployeeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchEmployee();
  }, [id]);

  const fetchEmployee = async () => {
    try {
      setLoading(true);
      const response = await employeesAPI.getById(id);
      setEmployee(response.data);
    } catch (error) {
      toast.error('Failed to load employee details');
      console.error('Error fetching employee:', error);
      navigate('/employees');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmployee = async (id, employeeData) => {
    try {
      await employeesAPI.update(id, employeeData);
      toast.success('Employee updated successfully');
      setIsEditModalOpen(false);
      fetchEmployee();
    } catch (error) {
      toast.error('Failed to update employee');
      console.error('Error updating employee:', error);
    }
  };

  const handleAvatarUpload = async (file) => {
    try {
      await employeesAPI.uploadAvatar(id, file);
      toast.success('Avatar uploaded successfully');
      fetchEmployee();
    } catch (error) {
      toast.error('Failed to upload avatar');
      console.error('Error uploading avatar:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">Employee not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/employees')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {employee.first_name} {employee.last_name}
            </h1>
            <p className="text-gray-600">{employee.position}</p>
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
        {/* Employee Info Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              <div className="relative inline-block">
                {employee.avatar ? (
                  <img
                    className="w-32 h-32 rounded-full mx-auto"
                    src={`http://localhost:5000/uploads/avatars/${employee.avatar}`}
                    alt={`${employee.first_name} ${employee.last_name}`}
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gray-300 flex items-center justify-center mx-auto">
                    <span className="text-2xl font-medium text-gray-700">
                      {employee.first_name[0]}{employee.last_name[0]}
                    </span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      handleAvatarUpload(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                  id="avatar-upload"
                />
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700"
                >
                  <Upload className="w-4 h-4" />
                </label>
              </div>
              <h3 className="mt-4 text-xl font-semibold text-gray-900">
                {employee.first_name} {employee.last_name}
              </h3>
              <p className="text-gray-600">{employee.position}</p>
              <p className="text-sm text-gray-500">{employee.department}</p>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Hire Date</p>
                  <p className="font-medium text-gray-900">
                    {new Date(employee.hire_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <DollarSign className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Salary</p>
                  <p className="font-medium text-gray-900">
                    ${employee.salary.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <TrendingUp className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Performance Score</p>
                  <p className="font-medium text-gray-900">{employee.performance_score}%</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Active Projects</p>
                  <p className="font-medium text-gray-900">{employee.projects.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {employee.skills && employee.skills.length > 0 ? (
                employee.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No skills listed</p>
              )}
            </div>
          </div>
        </div>

        {/* Projects */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Projects</h3>
            {employee.projects && employee.projects.length > 0 ? (
              <div className="space-y-4">
                {employee.projects.map((project) => (
                  <div key={project.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{project.name}</h4>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        project.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                        project.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        project.status === 'Planning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {project.status}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Progress: {project.progress}%</span>
                    </div>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No active projects</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <EmployeeModal
          employee={employee}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleUpdateEmployee}
        />
      )}
    </div>
  );
};

export default EmployeeDetail;


