# 📚 Library Management System

![Python](https://img.shields.io/badge/Python-3.10%2B-blue)
![Flask](https://img.shields.io/badge/Flask-2.3.3-green)
![MySQL](https://img.shields.io/badge/MySQL-8.0%2B-orange)

A modern library management system with separate admin/student interfaces, book recommendations, and analytics.

## Table of Contents
- [Features](#-features)
- [Demo](#-demo)
- [Installation](#-installation)
- [Tech Stack](#-tech-stack)
- [API Docs](#-api-documentation)
- [Deployment](#-deployment)

## 🚀 Features

### Admin Portal
| Feature | Description |
|---------|-------------|
| Book Management | CRUD operations for library inventory |
| User Management | Manage student accounts and permissions |
| Analytics Dashboard | Visualize borrowing trends and statistics |
| Fine Calculation | Automatic overdue book penalties |

### Student Portal
| Feature | Description |
|---------|-------------|
| Book Search | Find books by title/author/ISBN |
| Borrow History | Track current/past borrows |
| Recommendations | Personalized book suggestions |
| Profile Management | Update personal details |

## 📸 Demo

<!-- Add screenshot section -->
![Admin Dashboard](/screenshots/dashboard.png) *Admin Interface*

![Student Portal](/screenshots/student-view.png) *Student Interface*

## 💻 Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Python/Flask |
| Frontend | Bootstrap 5 |
| Database | MySQL |
| ORM | SQLAlchemy |
| Auth | JWT |
| Deployment | Gunicorn/Nginx |

## Installation

1. Clone the repository:

```bash
git clone [repository-url]
cd library-management-system
```

2. Create and activate a virtual environment:

```bash
python -m venv venv

# On Windows:
venv\Scripts\activate.ps1  # For PowerShell
# OR
venv\Scripts\activate.bat  # For Command Prompt

# On Unix/MacOS:
source venv/bin/activate
```

3. Install dependencies:

### Important Note for Python 3.13 Users

If you're using Python 3.13, you'll need to install compatible versions of SQLAlchemy and Flask-SQLAlchemy:

```bash
pip install -r requirements.txt
pip install SQLAlchemy==1.4.50 Flask-SQLAlchemy==2.5.1
```

For Python 3.10-3.12 users:

```bash
pip install -r requirements.txt
```

4. Configure the database:

The default configuration uses MySQL with the following connection string:

```python
# In app.py
SQLALCHEMY_DATABASE_URI = 'mysql+mysqlconnector://root:123456789@127.0.0.1:3306/book_recommendation?charset=utf8mb4&collation=utf8mb4_unicode_ci'
```

You should update this to match your MySQL installation:

```python
SQLALCHEMY_DATABASE_URI = 'mysql+mysqlconnector://username:password@localhost:3306/book_recommendation?charset=utf8mb4&collation=utf8mb4_unicode_ci'
```

5. Create the database:

```sql
CREATE DATABASE IF NOT EXISTS book_recommendation CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

6. Initialize the database:

```bash
python
>>> from app import app, db
>>> with app.app_context():
>>>     db.create_all()
```

7. Run the application:

```bash
python app.py
```

The application will be available at http://127.0.0.1:5000

## How to Run the Application

After completing the installation and database setup steps:

1. **Set up environment variables** (optional):
   ```bash
   set FLASK_APP=app.py
   set FLASK_ENV=development  # for development mode
   ```

2. **Run the Flask development server**:
   ```bash
   flask run
   ```
   This will start the server at `http://localhost:5000`

3. **Access the application**:
   - Open your web browser and go to `http://localhost:5000`
   - Admin login: Use the admin credentials you created
   - Student login: Register as a new student or use existing credentials

4. **Alternative production deployment**:
   For production, you can use Gunicorn (included in requirements):
   ```bash
   gunicorn -w 4 -b :5000 app:app
   ```

5. **Testing the API**:
   The API endpoints can be tested using tools like Postman or curl.
   See the API Documentation section for available endpoints.

## API Documentation

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

## Project Structure

```
library-management-system/
├── app.py                 # Main application file
├── models.py             # Database models
├── requirements.txt      # Project dependencies
├── results/              # Recommendation model files
│   ├── books.pkl        # Serialized books data
│   ├── popular.pkl      # Popular books model
│   ├── pt.pkl           # Pivot table for recommendations
│   └── similarity_scores.pkl # Book similarity matrix
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

## Deployment

For production deployment, you can use Gunicorn (included in requirements):

```bash
gunicorn -w 4 -b :5000 app:app
```

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
