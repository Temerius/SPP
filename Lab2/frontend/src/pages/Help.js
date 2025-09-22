import React, { useState } from 'react';
import { 
  Search, 
  Book, 
  MessageCircle, 
  Mail, 
  Phone, 
  FileText,
  Video,
  Download,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

const Help = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const faqData = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: Book,
      items: [
        {
          question: 'How do I add a new employee?',
          answer: 'To add a new employee, go to the Employees page and click the "Add Employee" button. Fill in the required information including name, email, position, department, hire date, and salary.'
        },
        {
          question: 'How do I create a new project?',
          answer: 'Navigate to the Projects page and click "Add Project". Enter the project name, description, status, priority, and other details. You can assign team members later.'
        },
        {
          question: 'How do I assign employees to projects?',
          answer: 'Go to the project detail page and click the "+" button next to "Team Members". Select employees from the list to assign them to the project.'
        }
      ]
    },
    {
      id: 'employees',
      title: 'Employee Management',
      icon: FileText,
      items: [
        {
          question: 'How do I upload an employee avatar?',
          answer: 'In the employee list or detail page, click the upload icon next to an employee\'s name. Select an image file and it will be automatically resized and uploaded.'
        },
        {
          question: 'How do I update employee performance scores?',
          answer: 'Edit an employee\'s profile and update the performance score field. This will be reflected in the dashboard analytics.'
        },
        {
          question: 'How do I search for employees?',
          answer: 'Use the search bar on the Employees page to find employees by name or email. You can also filter by department.'
        }
      ]
    },
    {
      id: 'projects',
      title: 'Project Management',
      icon: Video,
      items: [
        {
          question: 'How do I track project progress?',
          answer: 'Update the progress percentage in the project details. This will be reflected in the progress bar and analytics.'
        },
        {
          question: 'What project statuses are available?',
          answer: 'Projects can be set to: Planning, In Progress, Completed, or On Hold. Update the status to reflect the current state.'
        },
        {
          question: 'How do I remove an employee from a project?',
          answer: 'In the project detail page, click the remove button next to the employee\'s name in the team members section.'
        }
      ]
    }
  ];

  const contactMethods = [
    {
      title: 'Email Support',
      description: 'Get help via email within 24 hours',
      icon: Mail,
      contact: 'support@hrmanagement.com'
    },
    {
      title: 'Phone Support',
      description: 'Speak with our support team',
      icon: Phone,
      contact: '+1 (555) 123-4567'
    },
    {
      title: 'Live Chat',
      description: 'Chat with support in real-time',
      icon: MessageCircle,
      contact: 'Available 9 AM - 6 PM EST'
    }
  ];

  const resources = [
    {
      title: 'User Manual',
      description: 'Complete guide to using HR Management Pro',
      icon: FileText,
      download: true
    },
    {
      title: 'Video Tutorials',
      description: 'Step-by-step video guides',
      icon: Video,
      download: false
    },
    {
      title: 'API Documentation',
      description: 'Technical documentation for developers',
      icon: Book,
      download: true
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Help & Support</h1>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search help articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FAQ Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Frequently Asked Questions</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {faqData.map((section) => {
                  const Icon = section.icon;
                  const isExpanded = expandedSections[section.id];
                  
                  return (
                    <div key={section.id} className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className="w-5 h-5 text-blue-600" />
                          <span className="font-medium text-gray-900">{section.title}</span>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      
                      {isExpanded && (
                        <div className="border-t border-gray-200 p-4 bg-gray-50">
                          <div className="space-y-4">
                            {section.items.map((item, index) => (
                              <div key={index} className="space-y-2">
                                <h4 className="font-medium text-gray-900">{item.question}</h4>
                                <p className="text-sm text-gray-600">{item.answer}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Contact & Resources */}
        <div className="space-y-6">
          {/* Contact Support */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Support</h3>
            <div className="space-y-4">
              {contactMethods.map((method, index) => {
                const Icon = method.icon;
                return (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Icon className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">{method.title}</p>
                      <p className="text-sm text-gray-600">{method.description}</p>
                      <p className="text-sm text-blue-600 font-medium">{method.contact}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Resources */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resources</h3>
            <div className="space-y-3">
              {resources.map((resource, index) => {
                const Icon = resource.icon;
                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Icon className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">{resource.title}</p>
                        <p className="text-sm text-gray-600">{resource.description}</p>
                      </div>
                    </div>
                    {resource.download && (
                      <button className="text-blue-600 hover:text-blue-800">
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full text-left px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                Reset Password
              </button>
              <button className="w-full text-left px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                Export Data
              </button>
              <button className="w-full text-left px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                System Status
              </button>
              <button className="w-full text-left px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                Feature Request
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Version</p>
            <p className="font-medium text-gray-900">HR Management Pro v1.0.0</p>
          </div>
          <div>
            <p className="text-gray-600">Last Updated</p>
            <p className="font-medium text-gray-900">{new Date().toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-gray-600">Support Status</p>
            <p className="font-medium text-green-600">Active</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;

