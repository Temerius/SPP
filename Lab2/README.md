# HR Management Pro 🚀

A modern, full-stack HR management system built with Flask REST API and React SPA. This application provides comprehensive employee and project management capabilities with a beautiful, responsive interface.

## ✨ Features

### 🎯 Core Functionality
- **Employee Management**: Complete CRUD operations for employee data
- **Project Management**: Create, update, and track projects with team assignments
- **Real-time Dashboard**: Analytics and insights with interactive charts
- **File Upload**: Avatar uploads with automatic image optimization
- **Search & Filtering**: Advanced search and filtering capabilities
- **Responsive Design**: Mobile-first design with Tailwind CSS

### 🛠️ Technical Features
- **REST API**: Proper HTTP methods and status codes
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: Ready for JWT implementation
- **File Handling**: Multipart/form-data file uploads
- **Modern UI**: React with hooks and modern patterns
- **Docker**: Complete containerization setup

## 🏗️ Architecture

```
HR Management Pro/
├── backend/                 # Flask REST API
│   ├── app.py              # Main application
│   ├── requirements.txt    # Python dependencies
│   └── Dockerfile          # Backend container
├── frontend/               # React SPA
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   └── App.js         # Main app component
│   ├── package.json       # Node dependencies
│   └── Dockerfile         # Frontend container
├── docker-compose.yml     # Multi-container setup
└── README.md             # This file
```

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hr-management-pro
   ```

2. **Start the application**
   ```bash
   docker-compose up --build
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Database: localhost:5432

## 📊 Database Schema

### Employees Table
- Personal information (name, email, position)
- Department and salary data
- Performance metrics and skills
- Avatar file handling

### Projects Table
- Project details (name, description, status)
- Timeline and budget information
- Priority and progress tracking
- Many-to-many relationship with employees

## 🔧 API Endpoints

### Employees
- `GET /api/employees` - List employees with pagination
- `GET /api/employees/{id}` - Get employee details
- `POST /api/employees` - Create new employee
- `PUT /api/employees/{id}` - Update employee
- `DELETE /api/employees/{id}` - Deactivate employee
- `POST /api/employees/{id}/avatar` - Upload avatar

### Projects
- `GET /api/projects` - List all projects
- `GET /api/projects/{id}` - Get project details
- `POST /api/projects` - Create new project
- `PUT /api/projects/{id}` - Update project
- `POST /api/projects/{id}/employees` - Assign employee
- `DELETE /api/projects/{id}/employees/{emp_id}` - Remove employee

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/departments` - Get department analytics

## 🎨 UI Components

### Pages
- **Dashboard**: Analytics overview with charts and metrics
- **Employees**: Employee list with search, filter, and CRUD operations
- **Projects**: Project management with team assignment
- **Employee Detail**: Individual employee profiles with projects
- **Project Detail**: Project overview with team management

### Components
- **Modal Forms**: Reusable forms for employee and project creation/editing
- **Navigation**: Sidebar and top navigation
- **Charts**: Interactive charts using Recharts
- **File Upload**: Drag-and-drop avatar uploads

## 🔒 Security Features

- CORS configuration for cross-origin requests
- File type validation for uploads
- Input validation and sanitization
- Proper error handling and logging

## 📱 Responsive Design

- Mobile-first approach with Tailwind CSS
- Responsive grid layouts
- Touch-friendly interface elements
- Optimized for all screen sizes

## 🚀 Performance Optimizations

- Image optimization and resizing
- Lazy loading for large datasets
- Efficient database queries with pagination
- Optimized bundle size with React

## 🛠️ Development

### Backend Development
```bash
cd backend
pip install -r requirements.txt
python app.py
```

### Frontend Development
```bash
cd frontend
npm install
npm start
```

### Database Migrations
```bash
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
```

## 📈 Future Enhancements

- [ ] User authentication and authorization
- [ ] Advanced analytics and reporting
- [ ] Email notifications
- [ ] Mobile app (React Native)
- [ ] Advanced search with Elasticsearch
- [ ] Real-time notifications with WebSockets
- [ ] Performance reviews and goal tracking
- [ ] Time tracking and attendance
- [ ] Document management system

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Team

Built with ❤️ for modern HR management needs.

---

**HR Management Pro** - Streamlining workforce management in the digital age! 🎯


