# Library Management System

A modern, full-stack library management system built with Flask and Bootstrap, featuring separate interfaces for administrators and students.

## Features

### Admin Dashboard

- **Book Management**
  - Add, edit, and delete books
  - Track book inventory
  - Manage book details (ISBN, title, author, publisher, etc.)
  - Upload and manage book cover images
- **Student Management**
  - View and manage student accounts
  - Track student borrowing history
  - Monitor overdue books and fines
- **Borrowing System**
  - Process book borrowing and returns
  - Automatic fine calculation for overdue books
  - Track borrowing trends and statistics
- **Analytics Dashboard**
  - Real-time statistics and metrics
  - Borrowing trends visualization
  - Popular books tracking
  - Recent activities log

### Student Interface

- **Book Discovery**
  - Browse available books
  - Search by title, author, or ISBN
  - View book details and availability
  - Personalized book recommendations
- **Account Management**
  - Track currently borrowed books
  - View borrowing history
  - Check due dates and fines
  - Receive notifications for due dates

## Technical Stack

### Backend

- **Framework**: Flask (Python)
- **Database**: MySQL
- **Authentication**: JWT (JSON Web Tokens)
- **API**: RESTful architecture

### Frontend

- **Framework**: Bootstrap 5
- **JavaScript**: Vanilla JS with modern ES6+ features
- **CSS**: Custom styling with responsive design
- **Icons**: Font Awesome

### Features

- **Security**: JWT-based authentication
- **Responsive Design**: Mobile-first approach
- **Real-time Updates**: Dynamic content loading
- **Error Handling**: Comprehensive error management
- **Data Validation**: Both client and server-side validation

## Installation

1. Clone the repository:

```bash
git clone [repository-url]
cd library-management-system
```

2. Create and activate a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Configure the database:

```bash
# Update database configuration in app.py
SQLALCHEMY_DATABASE_URI = 'mysql+mysqlconnector://username:password@localhost/database_name'
```

5. Initialize the database:

```bash
python
>>> from app import app, db
>>> with app.app_context():
>>>     db.create_all()
```

6. Run the application:

```bash
python app.py
```

## Project Structure

```
library-management-system/
├── app.py                 # Main application file
├── models.py             # Database models
├── requirements.txt      # Project dependencies
├── static/
│   ├── css/             # Custom CSS styles
│   ├── js/              # JavaScript files
│   └── images/          # Image assets
└── templates/
    ├── admin.html       # Admin dashboard template
    ├── base.html        # Base template
    ├── login.html       # Login page template
    └── student.html     # Student dashboard template
```

## API Endpoints

### Authentication

- `POST /login` - User login
- `POST /register` - User registration
- `GET /logout` - User logout

### Admin Routes

- `GET /api/admin/dashboard-stats` - Dashboard statistics
- `GET /api/admin/books` - Get all books
- `POST /api/admin/books/add` - Add new book
- `PUT /api/admin/books/edit/<isbn>` - Edit book
- `DELETE /api/admin/books/delete/<isbn>` - Delete book
- `GET /api/admin/students` - Get all students
- `GET /api/admin/borrowed-books` - Get borrowed books

### Student Routes

- `GET /api/student/dashboard-stats` - Student dashboard statistics
- `GET /api/student/borrowed-books` - Get student's borrowed books
- `POST /api/student/borrow-book` - Borrow a book
- `POST /api/student/return-book/<borrow_id>` - Return a book

## Recent Updates

### UI Improvements

- Enhanced sidebar navigation with responsive design
- Improved book card layouts
- Standardized image sizes for consistency
- Added smooth animations and transitions
- Implemented professional color scheme

### Functionality Enhancements

- Added book recommendation system
- Implemented real-time search functionality
- Enhanced error handling and user notifications
- Added pagination for large data sets
- Improved modal interactions

### Security Updates

- Implemented JWT authentication
- Added role-based access control
- Enhanced input validation
- Improved error handling and logging

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Acknowledgments

- Bootstrap for the frontend framework
- Flask for the backend framework
- Font Awesome for icons
- All contributors who have helped shape this project
