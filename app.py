from models import db, Book
from flask import Flask, request, jsonify, render_template, redirect, url_for, session
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import pickle
import numpy as np
from sqlalchemy import func, desc
from sqlalchemy.sql import text

app = Flask(__name__)

# Database Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+mysqlconnector://root:123456789@127.0.0.1:3306/book_recommendation?charset=utf8mb4&collation=utf8mb4_unicode_ci'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = '1234'  # Change this to a secure secret key

# Set the secret key for session management
app.secret_key = app.config['JWT_SECRET_KEY']

db.init_app(app)
jwt = JWTManager(app)

# Load recommendation models
popular_df = pickle.load(open('results/popular.pkl', 'rb'))
pt = pickle.load(open('results/pt.pkl', 'rb'))
books = pickle.load(open('results/books.pkl', 'rb'))
similarity_scores = pickle.load(open('results/similarity_scores.pkl', 'rb'))

# Models


class User(db.Model):
    __tablename__ = 'users'
    user_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum('admin', 'student'), nullable=False)
    created_at = db.Column(db.TIMESTAMP, default=datetime.utcnow)


class BorrowedBook(db.Model):
    __tablename__ = 'borrowed_books'
    borrow_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey(
        'users.user_id'), nullable=False)
    ISBN = db.Column(db.String(20, collation='utf8mb4_unicode_ci'), db.ForeignKey(
        'books.ISBN', onupdate='CASCADE', ondelete='CASCADE'), nullable=False)
    borrow_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    due_date = db.Column(db.Date, nullable=False)
    return_date = db.Column(db.Date)
    fine = db.Column(db.Float, default=0)

# Authentication routes


@app.route('/')
def index():
    return render_template('login.html')


@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()

        if not data:
            # Handle form data if not JSON
            data = request.form.to_dict()

        required_fields = ['name', 'email', 'password', 'role']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400

        # Check if email already exists
        existing_user = User.query.filter_by(email=data['email']).first()
        if existing_user:
            return jsonify({'error': 'Email already exists'}), 400

        # Hash the password
        password_hash = generate_password_hash(data['password'])

        # Create new user
        new_user = User(
            name=data['name'],
            email=data['email'],
            password_hash=password_hash,
            role=data['role']
        )

        db.session.add(new_user)
        db.session.commit()

        return jsonify({
            'message': 'User registered successfully',
            'user_id': new_user.user_id
        }), 201
    except Exception as e:
        db.session.rollback()
        print(f"Registration error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return render_template('login.html')

    # Check content type
    if request.headers.get('Content-Type') != 'application/json':
        return jsonify({'error': 'Content-Type must be application/json'}), 415

    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Invalid email or password'}), 401

    # Create JWT token with user information
    access_token = create_access_token(identity={
        'user_id': user.user_id,
        'name': user.name,
        'email': user.email,
        'role': user.role
    })

    # Return token and user information
    return jsonify({
        'access_token': access_token,
        'user': {
            'user_id': user.user_id,
            'name': user.name,
            'email': user.email,
            'role': user.role
        }
    }), 200

# Dashboard routes


@app.route('/')
def home():
    return render_template('login.html')


@app.route('/admin/dashboard')
def admin_dashboard():
    return render_template('admin.html')


@app.route('/student/dashboard')
def student_dashboard():
    return render_template('student.html')

# Book management routes (Admin only)


@app.route('/admin/books', methods=['GET'])
@jwt_required()
def get_all_books():
    current_user = get_jwt_identity()
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    books_list = Book.query.all()
    return jsonify([{
        'isbn': book.ISBN,
        'title': book.Book_Title,
        'author': book.Book_Author,
        'year': book.Year_Of_Publication,
        'publisher': book.Publisher
    } for book in books_list])


@app.route('/api/admin/borrowed-books', methods=['GET'])
@jwt_required()
def get_borrowed_books():
    try:
        current_user = get_jwt_identity()
        if current_user['role'] != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403

        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', '').strip()
        status = request.args.get('status', 'all')

        # Build base query
        query = db.session.query(
            BorrowedBook, Book, User
        ).join(
            Book, BorrowedBook.ISBN == Book.ISBN
        ).join(
            User, BorrowedBook.user_id == User.user_id
        )

        # Apply status filter
        if status == 'borrowed':
            query = query.filter(BorrowedBook.return_date == None)
        elif status == 'returned':
            query = query.filter(BorrowedBook.return_date != None)
        elif status == 'overdue':
            query = query.filter(
                BorrowedBook.return_date == None,
                BorrowedBook.due_date < datetime.utcnow().date()
            )

        # Apply search filter
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                db.or_(
                    User.name.like(search_term),
                    Book.Book_Title.like(search_term)
                )
            )

        # Get total count before pagination
        total_items = query.count()

        # Apply pagination
        query = query.order_by(BorrowedBook.borrow_date.desc())
        paginated_items = query.paginate(
            page=page, per_page=per_page, error_out=False)

        # Format the results
        borrowed_books = []
        for borrow, book, user in paginated_items.items:
            is_overdue = not borrow.return_date and borrow.due_date < datetime.utcnow().date()
            borrowed_books.append({
                'borrow_id': borrow.borrow_id,
                'user_id': user.user_id,
                'student_name': user.name,
                'book_title': book.Book_Title,
                'isbn': book.ISBN,
                'borrow_date': borrow.borrow_date.strftime('%Y-%m-%d'),
                'due_date': borrow.due_date.strftime('%Y-%m-%d'),
                'return_date': borrow.return_date.strftime('%Y-%m-%d') if borrow.return_date else None,
                'fine': borrow.fine,
                'status': 'Returned' if borrow.return_date else ('Overdue' if is_overdue else 'Borrowed')
            })

        return jsonify({
            'borrowed_books': borrowed_books,
            'pagination': {
                'total': total_items,
                'page': page,
                'per_page': per_page,
                'total_pages': (total_items + per_page - 1) // per_page
            }
        }), 200
    except Exception as e:
        print(f"Error in get_borrowed_books: {str(e)}")
        return jsonify({'error': 'Failed to fetch borrowed books'}), 500


@app.route('/api/admin/borrowed-books/<int:borrow_id>/return', methods=['POST'])
@jwt_required()
def mark_book_returned(borrow_id):
    try:
        current_user = get_jwt_identity()
        if current_user['role'] != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403

        # Get the borrowed book record
        borrowed_book = BorrowedBook.query.get(borrow_id)
        if not borrowed_book:
            return jsonify({'error': 'Borrowed book record not found'}), 404

        if borrowed_book.return_date:
            return jsonify({'error': 'Book is already marked as returned'}), 400

        # Calculate fine if book is overdue
        today = datetime.utcnow().date()
        fine = 0
        if today > borrowed_book.due_date:
            days_overdue = (today - borrowed_book.due_date).days
            fine = days_overdue * 1  # $1 per day fine

        # Update return date and fine
        borrowed_book.return_date = today
        borrowed_book.fine = fine

        db.session.commit()

        return jsonify({
            'message': 'Book marked as returned successfully',
            'fine': fine
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error marking book as returned: {str(e)}")
        return jsonify({'error': 'Failed to mark book as returned'}), 500

# Student book routes


@app.route('/api/student/borrow-book', methods=['POST'])
@jwt_required()
def borrow_book_api():
    try:
        current_user = get_jwt_identity()
        if current_user['role'] != 'student':
            return jsonify({'error': 'Unauthorized'}), 403

        data = request.get_json()
        if 'isbn' not in data:
            return jsonify({'error': 'ISBN is required'}), 400

        # Check if the book exists
        book = Book.query.filter_by(ISBN=data['isbn']).first()
        if not book:
            return jsonify({'error': 'Book not found'}), 404

        # Check if already borrowed
        existing_borrow = BorrowedBook.query.filter_by(
            ISBN=data['isbn'],
            user_id=current_user['user_id'],
            return_date=None
        ).first()

        if existing_borrow:
            return jsonify({'error': 'You have already borrowed this book'}), 400

        # Create a borrow record
        borrow_date = datetime.utcnow()
        # Set due date to 1 week from now
        due_date = borrow_date + timedelta(days=7)

        borrowed_book = BorrowedBook(
            ISBN=data['isbn'],
            user_id=current_user['user_id'],
            borrow_date=borrow_date,
            due_date=due_date
        )

        db.session.add(borrowed_book)
        db.session.commit()

        return jsonify({
            'message': 'Book borrowed successfully',
            'borrowed_book': {
                'isbn': borrowed_book.ISBN,
                'borrow_date': borrowed_book.borrow_date.strftime('%Y-%m-%d'),
                'due_date': borrowed_book.due_date.strftime('%Y-%m-%d'),
                'book_title': book.Book_Title,
                'book_author': book.Book_Author
            }
        }), 200
    except Exception as e:
        print(f"Error in borrow book: {str(e)}")
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@app.route('/api/student/return-book/<int:borrow_id>', methods=['POST'])
@jwt_required()
def return_book(borrow_id):
    try:
        current_user = get_jwt_identity()
        user_id = current_user['user_id']

        # Get the borrowed book record
        borrowed_book = BorrowedBook.query.filter_by(
            borrow_id=borrow_id,
            user_id=user_id,
            return_date=None
        ).first()

        if not borrowed_book:
            return jsonify({'error': 'Borrowed book record not found'}), 404

        # Calculate fine if book is overdue
        today = datetime.now().date()
        fine = 0
        if today > borrowed_book.due_date:
            days_overdue = (today - borrowed_book.due_date).days
            fine = days_overdue * 1  # $1 per day fine

        # Update return date and fine
        borrowed_book.return_date = today
        borrowed_book.fine = fine

        db.session.commit()

        return jsonify({
            'message': 'Book returned successfully',
            'fine': fine
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Student API routes


@app.route('/api/student/profile', methods=['GET'])
@jwt_required()
def get_student_profile_api():
    try:
        # Get current user from JWT token
        current_user = get_jwt_identity()

        if not current_user or 'user_id' not in current_user:
            return jsonify({'error': 'Invalid user information'}), 401

        # Get student details
        user = User.query.filter_by(user_id=current_user['user_id']).first()

        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Return user info
        return jsonify({
            'user_id': user.user_id,
            'name': user.name,
            'email': user.email,
            'role': user.role,
            'created_at': user.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/student/borrowed-history', methods=['GET'])
@jwt_required()
def get_borrowed_history():
    try:
        current_user = get_jwt_identity()
        user_id = current_user['user_id']

        # Get currently borrowed books
        current_borrowed = db.session.query(
            BorrowedBook,
            Book.Book_Title.label('book_title'),
            Book.Book_Author.label('book_author')
        ).join(Book, BorrowedBook.ISBN == Book.ISBN)\
            .filter(BorrowedBook.user_id == user_id)\
            .filter(BorrowedBook.return_date.is_(None))\
            .all()

        # Get borrowing history
        history = db.session.query(
            BorrowedBook,
            Book.Book_Title.label('book_title'),
            Book.Book_Author.label('book_author')
        ).join(Book, BorrowedBook.ISBN == Book.ISBN)\
            .filter(BorrowedBook.user_id == user_id)\
            .filter(BorrowedBook.return_date.isnot(None))\
            .order_by(BorrowedBook.return_date.desc())\
            .all()

        return jsonify({
            'current_borrowed': [{
                'borrow_id': book.BorrowedBook.borrow_id,
                'book_title': book.book_title,
                'book_author': book.book_author,
                'borrow_date': book.BorrowedBook.borrow_date.strftime('%Y-%m-%d'),
                'due_date': book.BorrowedBook.due_date.strftime('%Y-%m-%d')
            } for book in current_borrowed],
            'history': [{
                'book_title': book.book_title,
                'book_author': book.book_author,
                'borrow_date': book.BorrowedBook.borrow_date.strftime('%Y-%m-%d'),
                'return_date': book.BorrowedBook.return_date.strftime('%Y-%m-%d'),
                'fine': book.BorrowedBook.fine
            } for book in history]
        }), 200

        if not current_user or 'user_id' not in current_user:
            return jsonify({'error': 'Invalid user information'}), 401

        # Get borrowed books with joined Book data
        borrowed_records = db.session.query(BorrowedBook, Book).join(
            Book, BorrowedBook.ISBN == Book.ISBN
        ).filter(
            BorrowedBook.user_id == current_user['user_id']
        ).all()

        # Format the response
        borrowed_books = []
        for borrow, book in borrowed_records:
            borrowed_books.append({
                'borrow_id': borrow.borrow_id,
                'isbn': book.ISBN,
                'title': book.Book_Title,
                'author': book.Book_Author,
                'publisher': book.Publisher,
                'year': book.Year_Of_Publication,
                'image_url': book.Image_URL_M,
                'borrow_date': borrow.borrow_date.strftime('%Y-%m-%d'),
                'due_date': borrow.due_date.strftime('%Y-%m-%d'),
                'return_date': borrow.return_date.strftime('%Y-%m-%d') if borrow.return_date else None,
                'fine': borrow.fine
            })

        return jsonify({
            'status': 'success',
            'borrowed_books': borrowed_books
        }), 200
    except Exception as e:
        print(f"Error in borrowed books: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@app.route('/api/student/recommendations', methods=['GET'])
@jwt_required()
def get_student_recommendations_api():
    current_user = get_jwt_identity()
    if current_user['role'] != 'student':
        return jsonify({'error': 'Unauthorized'}), 403

    # Get user's borrowing history
    borrowed_books = BorrowedBook.query.filter_by(
        user_id=current_user['user_id']
    ).join(Book).all()

    # Get books in similar categories/by same authors
    borrowed_authors = set(book.Book_Author for book in borrowed_books)
    recommended_books = Book.query.filter(
        Book.Book_Author.in_(borrowed_authors),
        ~Book.ISBN.in_([book.ISBN for book in borrowed_books])
    ).limit(5).all()

    # If not enough recommendations, add some popular books
    if len(recommended_books) < 5:
        popular_books = Book.query.filter(
            ~Book.ISBN.in_(
                [book.ISBN for book in borrowed_books + recommended_books])
        ).order_by(func.random()).limit(5 - len(recommended_books)).all()
        recommended_books.extend(popular_books)

    return jsonify({
        'recommendations': [{
            'isbn': book.ISBN,
            'title': book.Book_Title,
            'author': book.Book_Author,
            'year': book.Year_Of_Publication,
            'publisher': book.Publisher,
            'image_url_s': book.Image_URL_S,
            'image_url_m': book.Image_URL_M,
            'image_url_l': book.Image_URL_L
        } for book in recommended_books]
    }), 200

# Book recommendation routes


@app.route('/recommendations/popular', methods=['GET'])
@jwt_required()
def get_popular_books():
    return jsonify({
        'books': [
            {
                'title': title,
                'author': author,
                'image': image,
                'votes': int(votes),
                'rating': float(rating)
            }
            for title, author, image, votes, rating in zip(
                popular_df['Book-Title'].values,
                popular_df['Book-Author'].values,
                popular_df['Image-URL-M'].values,
                popular_df['num_ratings'].values,
                popular_df['avg_rating'].values
            )
        ]
    })


@app.route('/recommendations/similar', methods=['POST'])
@jwt_required()
def get_similar_books():
    data = request.get_json()
    if 'book_title' not in data:
        return jsonify({'error': 'Book title is required'}), 400

    try:
        # Find the book in the recommendation system
        book_title = data['book_title']
        if book_title not in pt.index:
            return jsonify({'books': []}), 200

        index = np.where(pt.index == book_title)[0][0]
        similar_items = sorted(
            list(enumerate(similarity_scores[index])),
            key=lambda x: x[1],
            reverse=True
        )[1:5]  # Get top 4 similar books

        recommendations = []
        for i in similar_items:
            temp_df = books[books['Book-Title'] == pt.index[i[0]]]
            recommendations.append({
                'title': temp_df['Book-Title'].values[0],
                'author': temp_df['Book-Author'].values[0],
                'image': temp_df['Image-URL-M'].values[0]
            })

        return jsonify({'recommendations': recommendations})
    except Exception as e:
        return jsonify({'error': 'Book not found in recommendation system'}), 404


@app.route('/api/books/recommendations/popular', methods=['GET'])
def popular_recommendations_api():
    try:
        # Get data from the popular_df pickle file
        books_data = []

        # Convert pickle data to list of dictionaries
        for _, row in popular_df.iterrows():
            books_data.append({
                'isbn': row['ISBN'] if 'ISBN' in row else '',
                'title': row['Book-Title'],
                'author': row['Book-Author'],
                'image_url': row['Image-URL-M'],
                # Use actual num_ratings from pickle
                'votes': int(row['num_ratings']),
                # Use actual avg_rating from pickle
                'rating': float(row['avg_rating'])
            })

        return jsonify({
            'status': 'success',
            'books': books_data
        }), 200
    except Exception as e:
        print(f"Error in popular books API: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e),
            'books': []
        }), 200

# Book search and details endpoints


@app.route('/api/books/search', methods=['GET'])
@jwt_required()
def search_books():
    query = request.args.get('query', '')
    page = int(request.args.get('page', 1))
    per_page = 12

    if not query:
        return jsonify({'error': 'Search query is required'}), 400

    # Search in title, author, and publisher
    search_query = f"%{query}%"
    books_query = Book.query.filter(
        db.or_(
            Book.Book_Title.like(search_query),
            Book.Book_Author.like(search_query),
            Book.Publisher.like(search_query)
        )
    ).paginate(page=page, per_page=per_page, error_out=False)

    books_list = [{
        'isbn': book.ISBN,
        'title': book.Book_Title,
        'author': book.Book_Author,
        'year': book.Year_Of_Publication,
        'publisher': book.Publisher,
        'image_url_s': book.Image_URL_S,
        'image_url_m': book.Image_URL_M,
        'image_url_l': book.Image_URL_L
    } for book in books_query.items]

    return jsonify({
        'books': books_list,
        'totalItems': books_query.total,
        'totalPages': books_query.pages,
        'currentPage': page
    })


@app.route('/api/books/<string:isbn>', methods=['GET'])
@jwt_required()
def get_book_details(isbn):
    book = Book.query.filter_by(ISBN=isbn).first()
    if not book:
        return jsonify({'error': 'Book not found'}), 404

    current_user = get_jwt_identity()

    # Check if book is already borrowed by this user
    is_borrowed = False
    if current_user['role'] == 'student':
        is_borrowed = BorrowedBook.query.filter_by(
            ISBN=isbn,
            user_id=current_user['user_id'],
            return_date=None
        ).first() is not None

    return jsonify({
        'isbn': book.ISBN,
        'title': book.Book_Title,
        'author': book.Book_Author,
        'year': book.Year_Of_Publication,
        'publisher': book.Publisher,
        'image_url_s': book.Image_URL_S,
        'image_url_m': book.Image_URL_M,
        'image_url_l': book.Image_URL_L,
        'is_borrowed': is_borrowed
    })


@app.route('/api/books/<string:isbn>/similar', methods=['GET'])
@jwt_required()
def get_book_similar(isbn):
    book = Book.query.filter_by(ISBN=isbn).first()
    if not book:
        return jsonify({'error': 'Book not found'}), 404

    try:
        # Find the book in the recommendation system
        book_title = book.Book_Title
        if book_title not in pt.index:
            return jsonify({'books': []}), 200

        index = np.where(pt.index == book_title)[0][0]
        similar_items = sorted(
            list(enumerate(similarity_scores[index])),
            key=lambda x: x[1],
            reverse=True
        )[1:7]  # Get top 6 similar books

        similar_books = []
        for i in similar_items:
            temp_df = books[books['Book-Title'] == pt.index[i[0]]]
            if not temp_df.empty:
                similar_books.append({
                    'isbn': temp_df['ISBN'].values[0],
                    'title': temp_df['Book-Title'].values[0],
                    'author': temp_df['Book-Author'].values[0],
                    'image_url_s': temp_df['Image-URL-S'].values[0],
                    'image_url_m': temp_df['Image-URL-M'].values[0],
                    'image_url_l': temp_df['Image-URL-L'].values[0]
                })

        return jsonify({'books': similar_books})
    except Exception as e:
        return jsonify({'error': str(e), 'books': []}), 200


@app.route('/api/books/recent', methods=['GET'])
@jwt_required()
def get_recent_books():
    # Get 6 most recently added books
    recent_books = Book.query.order_by(Book.ISBN.desc()).limit(20).all()

    books_list = [{
        'isbn': book.ISBN,
        'title': book.Book_Title,
        'author': book.Book_Author,
        'year': book.Year_Of_Publication,
        'publisher': book.Publisher,
        'image_url_s': book.Image_URL_S,
        'image_url_m': book.Image_URL_M,
        'image_url_l': book.Image_URL_L
    } for book in recent_books]

    return jsonify({'books': books_list})


@app.route('/api/books/popular', methods=['GET'])
def get_popular_books_api():
    try:
        books_data = []

        # Use popular_df from pickle file instead of database query
        for _, row in popular_df.iterrows():
            # Get book from database to ensure we have ISBN
            book = Book.query.filter_by(
                Book_Title=row['Book-Title'], Book_Author=row['Book-Author']).first()
            isbn = book.ISBN if book else ''

            books_data.append({
                'isbn': isbn,
                'title': row['Book-Title'],
                'author': row['Book-Author'],
                'image_url': row['Image-URL-M'],
                'votes': int(row['num_ratings']),
                'rating': float(row['avg_rating']),
                'year': book.Year_Of_Publication if book else '',
                'publisher': book.Publisher if book else ''
            })

        return jsonify({
            'status': 'success',
            'books': books_data[:20]  # Limit to 10 books
        }), 200
    except Exception as e:
        print(f"Error in popular books API: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e),
            'books': []
        }), 200


@app.route('/api/books/recommendations/personalized', methods=['GET'])
@jwt_required()
def get_personalized_recommendations():
    current_user = get_jwt_identity()
    if current_user['role'] != 'student':
        return jsonify({'error': 'Unauthorized'}), 403

    # Get books borrowed by the student
    borrowed_books = db.session.query(Book).join(
        BorrowedBook, BorrowedBook.ISBN == Book.ISBN
    ).filter(
        BorrowedBook.user_id == current_user['user_id']
    ).all()

    # If no books borrowed, return empty list
    if not borrowed_books:
        return jsonify({'books': []})

    # Get recommendations based on borrowed books
    recommendations = []
    # Use up to 3 borrowed books for recommendations
    for book in borrowed_books[:3]:
        try:
            book_title = book.Book_Title
            if book_title in pt.index:
                index = np.where(pt.index == book_title)[0][0]
                similar_items = sorted(
                    list(enumerate(similarity_scores[index])),
                    key=lambda x: x[1],
                    reverse=True
                )[1:3]  # Get 2 similar books for each borrowed book

                for i in similar_items:
                    temp_df = books[books['Book-Title'] == pt.index[i[0]]]
                    if not temp_df.empty:
                        # Check if already in recommendations
                        isbn = temp_df['ISBN'].values[0]
                        if not any(r.get('isbn') == isbn for r in recommendations):
                            recommendations.append({
                                'isbn': isbn,
                                'title': temp_df['Book-Title'].values[0],
                                'author': temp_df['Book-Author'].values[0],
                                'image_url_s': temp_df['Image-URL-S'].values[0],
                                'image_url_m': temp_df['Image-URL-M'].values[0],
                                'image_url_l': temp_df['Image-URL-L'].values[0]
                            })
        except Exception:
            continue

    return jsonify({'books': recommendations})


@app.route('/api/books/recommendations/popular', methods=['GET'])
@jwt_required()
def get_popular_recommendations():
    # Return the popular books as recommendations
    return get_popular_books_api()

# Admin dashboard API endpoints


@app.route('/api/admin/dashboard-stats', methods=['GET'])
@jwt_required()
def get_admin_dashboard_stats():
    current_user = get_jwt_identity()
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    # Total books
    total_books = Book.query.count()

    # Total students
    total_students = User.query.filter_by(role='student').count()

    # Total borrowed books
    total_borrowed = BorrowedBook.query.count()

    # Currently borrowed books
    currently_borrowed = BorrowedBook.query.filter_by(return_date=None).count()

    # Overdue books
    overdue_books = BorrowedBook.query.filter(
        BorrowedBook.return_date == None,
        BorrowedBook.due_date < datetime.utcnow().date()
    ).count()

    # Total fines collected
    total_fines = db.session.query(
        db.func.sum(BorrowedBook.fine)).scalar() or 0

    return jsonify({
        'total_books': total_books,
        'total_students': total_students,
        'total_borrowed': total_borrowed,
        'currently_borrowed': currently_borrowed,
        'overdue_books': overdue_books,
        'total_fines': float(total_fines)
    })


@app.route('/api/admin/borrowing-trends', methods=['GET'])
@jwt_required()
def get_borrowing_trends():
    current_user = get_jwt_identity()
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    try:
        # Get the last 8 weeks of data
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(weeks=8)

        # Generate week labels
        weeks = []
        current_date = start_date
        while current_date <= end_date:
            week_end = min(current_date + timedelta(days=6), end_date)
            weeks.append({
                'start': current_date,
                'end': week_end,
                'label': f"{current_date.strftime('%d %b')} - {week_end.strftime('%d %b')}"
            })
            current_date += timedelta(days=7)

        # Get borrowed and returned books per week
        borrowed_counts = []
        returned_counts = []

        for week in weeks:
            # Count borrowed books
            borrowed = BorrowedBook.query.filter(
                BorrowedBook.borrow_date >= week['start'],
                BorrowedBook.borrow_date <= week['end']
            ).count()
            borrowed_counts.append(borrowed)

            # Count returned books
            returned = BorrowedBook.query.filter(
                BorrowedBook.return_date >= week['start'],
                BorrowedBook.return_date <= week['end']
            ).count()
            returned_counts.append(returned)

        return jsonify({
            'labels': [week['label'] for week in weeks],
            'borrowed': borrowed_counts,
            'returned': returned_counts
        })
    except Exception as e:
        print(f"Error getting borrowing trends: {str(e)}")
        return jsonify({'error': 'Failed to fetch borrowing trends'}), 500


@app.route('/api/admin/recent-activities', methods=['GET'])
@jwt_required()
def get_recent_activities():
    current_user = get_jwt_identity()
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    try:
        # Get all activities (both borrows and returns)
        activities = []

        # Get all borrows
        borrows = db.session.query(
            BorrowedBook, Book, User
        ).join(
            Book, BorrowedBook.ISBN == Book.ISBN
        ).join(
            User, BorrowedBook.user_id == User.user_id
        ).order_by(
            BorrowedBook.borrow_date.desc()
        ).all()

        for borrow, book, user in borrows:
            # Add borrow activity
            activities.append({
                'date': borrow.borrow_date.strftime('%Y-%m-%d %H:%M:%S'),
                'user_id': user.user_id,
                'student_name': user.name,
                'isbn': book.ISBN,
                'book_title': book.Book_Title,
                'action': 'borrow'
            })

            # Add return activity if book was returned
            if borrow.return_date:
                activities.append({
                    'date': borrow.return_date.strftime('%Y-%m-%d %H:%M:%S'),
                    'user_id': user.user_id,
                    'student_name': user.name,
                    'isbn': book.ISBN,
                    'book_title': book.Book_Title,
                    'action': 'return'
                })

        # Sort all activities by date, most recent first
        activities.sort(key=lambda x: x['date'], reverse=True)

        return jsonify({
            'activities': activities
        })
    except Exception as e:
        print(f"Error getting recent activities: {str(e)}")
        return jsonify({'error': 'Failed to fetch recent activities'}), 500


@app.route('/api/admin/students', methods=['GET'])
@jwt_required()
def get_all_students():
    current_user = get_jwt_identity()
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    # Get pagination parameters
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    search = request.args.get('search', '').strip()

    # Build query
    query = User.query.filter_by(role='student')

    # Apply search if provided
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            db.or_(
                User.name.like(search_term),
                User.email.like(search_term)
            )
        )

    # Get paginated results
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    total = pagination.total
    students = pagination.items

    # Get borrowed books count for each student
    student_data = []
    for student in students:
        borrowed_count = BorrowedBook.query.filter_by(
            user_id=student.user_id).count()
        student_data.append({
            'user_id': student.user_id,
            'name': student.name,
            'email': student.email,
            'created_at': student.created_at.strftime('%Y-%m-%d'),
            'books_borrowed': borrowed_count
        })

    return jsonify({
        'students': student_data,
        'pagination': {
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page
        }
    }), 200


@app.route('/api/admin/student/<int:user_id>/borrowed-books', methods=['GET'])
@jwt_required()
def get_student_borrowed_books_admin(user_id):
    current_user = get_jwt_identity()
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    # Check if student exists
    student = User.query.filter_by(user_id=user_id, role='student').first()
    if not student:
        return jsonify({'error': 'Student not found'}), 404

    # Get borrowed books
    borrowed_query = db.session.query(
        BorrowedBook, Book
    ).join(
        Book, BorrowedBook.ISBN == Book.ISBN
    ).filter(
        BorrowedBook.user_id == user_id
    ).all()

    borrowed_books = [{
        'borrow_id': borrow.borrow_id,
        'book_title': book.Book_Title,
        'book_author': book.Book_Author,
        'isbn': borrow.ISBN,
        'borrow_date': borrow.borrow_date.strftime('%Y-%m-%d'),
        'due_date': borrow.due_date.strftime('%Y-%m-%d'),
        'return_date': borrow.return_date.strftime('%Y-%m-%d') if borrow.return_date else None,
        'fine': borrow.fine,
        'status': 'Returned' if borrow.return_date else ('Overdue' if borrow.due_date < datetime.utcnow().date() else 'Borrowed')
    } for borrow, book in borrowed_query]

    return jsonify({'borrowed_books': borrowed_books})


@app.route('/api/admin/books/add', methods=['POST'])
@jwt_required()
def add_book():
    current_user = get_jwt_identity()
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    data = request.get_json()

    required_fields = ['isbn', 'title', 'author', 'year', 'publisher']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    # Check if book already exists
    existing_book = Book.query.filter_by(ISBN=data['isbn']).first()
    if existing_book:
        return jsonify({'error': 'Book with this ISBN already exists'}), 409

    # Create new book with current timestamp for date_added
    new_book = Book(
        ISBN=data['isbn'],
        Book_Title=data['title'],
        Book_Author=data['author'],
        Year_Of_Publication=data['year'],
        Publisher=data['publisher'],
        Image_URL_S=data.get('image_url_s', ''),
        Image_URL_M=data.get('image_url_m', ''),
        Image_URL_L=data.get('image_url_l', ''),
        date_added=datetime.utcnow()  # Explicitly set the date_added
    )

    try:
        db.session.add(new_book)
        db.session.commit()
        return jsonify({
            'message': 'Book added successfully',
            'book': {
                'isbn': new_book.ISBN,
                'title': new_book.Book_Title,
                'author': new_book.Book_Author,
                'year': new_book.Year_Of_Publication,
                'publisher': new_book.Publisher,
                'date_added': new_book.date_added.strftime('%Y-%m-%d %H:%M:%S')
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@app.route('/api/admin/books/edit/<string:isbn>', methods=['PUT'])
@jwt_required()
def edit_book(isbn):
    current_user = get_jwt_identity()
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    book = Book.query.filter_by(ISBN=isbn).first()
    if not book:
        return jsonify({'error': 'Book not found'}), 404

    data = request.get_json()

    # Update book fields
    if 'title' in data:
        book.Book_Title = data['title']
    if 'author' in data:
        book.Book_Author = data['author']
    if 'year' in data:
        book.Year_Of_Publication = data['year']
    if 'publisher' in data:
        book.Publisher = data['publisher']
    if 'image_url_s' in data:
        book.Image_URL_S = data['image_url_s']
    if 'image_url_m' in data:
        book.Image_URL_M = data['image_url_m']
    if 'image_url_l' in data:
        book.Image_URL_L = data['image_url_l']

    try:
        db.session.commit()
        return jsonify({'message': 'Book updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@app.route('/api/admin/books/delete/<string:isbn>', methods=['DELETE'])
@jwt_required()
def delete_book(isbn):
    current_user = get_jwt_identity()
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    book = Book.query.filter_by(ISBN=isbn).first()
    if not book:
        return jsonify({'error': 'Book not found'}), 404

    try:
        # Check if cascade delete is requested
        cascade = request.args.get('cascade', 'false').lower() == 'true'

        if cascade:
            # First delete all ratings for this book
            db.session.execute(
                text('DELETE FROM ratings WHERE ISBN = :isbn'), {'isbn': isbn})

        # Now delete the book
        db.session.delete(book)
        db.session.commit()
        return jsonify({'message': 'Book deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@app.route('/api/admin/books', methods=['GET'])
@jwt_required()
def get_admin_books():
    try:
        current_user = get_jwt_identity()
        if current_user['role'] != 'admin':
            return jsonify({'error': 'Unauthorized access'}), 403

        # Get all books with pagination
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)

        # Apply filters if provided
        query = Book.query

        if 'search' in request.args and request.args['search']:
            search_term = f"%{request.args['search']}%"
            query = query.filter(
                db.or_(
                    Book.Book_Title.like(search_term),
                    Book.Book_Author.like(search_term),
                    Book.ISBN.like(search_term)
                )
            )

        # Order by
        order_by = request.args.get('order_by', 'Book_Title')
        order_dir = request.args.get('order_dir', 'asc')

        # Handle date_added special case
        if order_by == 'date_added':
            order_attr = Book.date_added
        else:
            # Make sure the attribute exists on the Book model
            try:
                order_attr = getattr(Book, order_by)
            except AttributeError:
                order_attr = Book.Book_Title  # Default fallback

        if order_dir == 'desc':
            query = query.order_by(desc(order_attr))
        else:
            query = query.order_by(order_attr)

        # Get paginated results
        pagination = query.paginate(
            page=page, per_page=per_page, error_out=False)
        total = pagination.total
        books = pagination.items

        # Format the results
        book_list = []
        for book in books:
            date_added_str = None
            if book.date_added:
                date_added_str = book.date_added.strftime('%Y-%m-%d %H:%M:%S')

            book_list.append({
                'isbn': book.ISBN,
                'title': book.Book_Title,
                'author': book.Book_Author,
                'publisher': book.Publisher,
                'year': book.Year_Of_Publication,
                'image_url_s': book.Image_URL_S,
                'image_url_m': book.Image_URL_M,
                'image_url_l': book.Image_URL_L,
                'date_added': date_added_str
            })

        return jsonify({
            'books': book_list,
            'pagination': {
                'total': total,
                'page': page,
                'per_page': per_page,
                'pages': (total + per_page - 1) // per_page
            }
        }), 200

    except Exception as e:
        print(f"Error in admin books API: {str(e)}")
        return jsonify({
            'error': str(e)
        }), 500


@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# Additional API endpoints for student dashboard


@app.route('/api/student/dashboard-stats', methods=['GET'])
@jwt_required()
def get_student_dashboard_stats():
    current_user = get_jwt_identity()
    if current_user['role'] != 'student':
        return jsonify({'error': 'Unauthorized'}), 403

    # Currently borrowed books
    currently_borrowed = BorrowedBook.query.filter_by(
        user_id=current_user['user_id'],
        return_date=None
    ).count()

    # Total borrowed books
    total_borrowed = BorrowedBook.query.filter_by(
        user_id=current_user['user_id']
    ).count()

    # Overdue books
    overdue_books = BorrowedBook.query.filter(
        BorrowedBook.user_id == current_user['user_id'],
        BorrowedBook.return_date == None,
        BorrowedBook.due_date < datetime.utcnow().date()
    ).count()

    return jsonify({
        'currently_borrowed': currently_borrowed,
        'total_borrowed': total_borrowed,
        'overdue_books': overdue_books
    })


@app.route('/api/student/borrowed-books', methods=['GET'])
@jwt_required()
def get_student_borrowed_books():
    current_user = get_jwt_identity()
    if current_user['role'] != 'student':
        return jsonify({'error': 'Unauthorized'}), 403

    # Get current borrowed books
    current_borrowed_query = db.session.query(
        BorrowedBook, Book
    ).join(
        Book, BorrowedBook.ISBN == Book.ISBN
    ).filter(
        BorrowedBook.user_id == current_user['user_id'],
        BorrowedBook.return_date == None
    ).all()

    current_borrowed = [{
        'borrow_id': borrow.borrow_id,
        'book_title': book.Book_Title,
        'book_author': book.Book_Author,
        'isbn': borrow.ISBN,
        'borrow_date': borrow.borrow_date.strftime('%Y-%m-%d'),
        'due_date': borrow.due_date.strftime('%Y-%m-%d')
    } for borrow, book in current_borrowed_query]

    # Get borrowing history
    history_query = db.session.query(
        BorrowedBook, Book
    ).join(
        Book, BorrowedBook.ISBN == Book.ISBN
    ).filter(
        BorrowedBook.user_id == current_user['user_id'],
        BorrowedBook.return_date != None
    ).all()

    history = [{
        'borrow_id': borrow.borrow_id,
        'book_title': book.Book_Title,
        'book_author': book.Book_Author,
        'isbn': borrow.ISBN,
        'borrow_date': borrow.borrow_date.strftime('%Y-%m-%d'),
        'return_date': borrow.return_date.strftime('%Y-%m-%d'),
        'fine': borrow.fine
    } for borrow, book in history_query]

    return jsonify({
        'current_borrowed': current_borrowed,
        'history': history
    })


@app.route('/api/admin/students/<int:user_id>', methods=['GET'])
@jwt_required()
def get_student_details(user_id):
    current_user = get_jwt_identity()
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    # Get student details
    student = User.query.filter_by(user_id=user_id, role='student').first()
    if not student:
        return jsonify({'error': 'Student not found'}), 404

    # Get borrowed books count
    borrowed_count = BorrowedBook.query.filter_by(user_id=user_id).count()

    return jsonify({
        'user_id': student.user_id,
        'name': student.name,
        'email': student.email,
        'created_at': student.created_at.strftime('%Y-%m-%d'),
        'books_borrowed': borrowed_count
    })


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
